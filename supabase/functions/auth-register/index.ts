import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate recovery codes
function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % chars.length;
      code += chars[randomIndex];
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

// Generate random string
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Base64URL encode
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, username, credential, deviceId, deviceName, userAgent } = await req.json();

    // Validate username
    if (!username || !/^[a-z0-9_]{3,30}$/.test(username.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Invalid username. Use 3-30 lowercase letters, numbers, or underscores.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUsername = username.toLowerCase();

    // ============================================
    // Action: start - Generate registration challenge
    // ============================================
    if (action === 'start') {
      // Check if username exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', normalizedUsername)
        .single();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Username already taken' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate challenge
      const challenge = generateRandomString(32);
      const userId = crypto.randomUUID();

      // Store challenge (expires in 5 minutes)
      await supabase
        .from('webauthn_challenges')
        .insert({
          challenge,
          username: normalizedUsername,
          type: 'registration',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      // Return WebAuthn registration options
      const rpId = Deno.env.get('WEBAUTHN_RP_ID') || 'localhost';
      const rpName = Deno.env.get('WEBAUTHN_RP_NAME') || 'TTC Alerts';

      return new Response(
        JSON.stringify({
          publicKey: {
            challenge: base64UrlEncode(new TextEncoder().encode(challenge)),
            rp: {
              id: rpId,
              name: rpName,
            },
            user: {
              id: base64UrlEncode(new TextEncoder().encode(userId)),
              name: normalizedUsername,
              displayName: normalizedUsername,
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },   // ES256
              { type: 'public-key', alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred',
            },
            timeout: 60000,
            attestation: 'none',
          },
          userId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // Action: complete - Verify credential and create user
    // ============================================
    if (action === 'complete') {
      if (!credential || !deviceId) {
        return new Response(
          JSON.stringify({ error: 'Missing credential or deviceId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get and validate challenge
      const { data: challengeRecord } = await supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('username', normalizedUsername)
        .eq('type', 'registration')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!challengeRecord) {
        return new Response(
          JSON.stringify({ error: 'Challenge expired or not found. Please try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete used challenge
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('id', challengeRecord.id);

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          username: normalizedUsername,
          display_name: normalizedUsername,
        })
        .select()
        .single();

      if (userError) {
        console.error('User creation error:', userError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user. Username may already exist.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store WebAuthn credential
      const { error: credError } = await supabase
        .from('webauthn_credentials')
        .insert({
          id: credential.id,
          user_id: newUser.id,
          public_key: credential.publicKey,
          counter: credential.counter || 0,
          device_name: deviceName || 'Primary Device',
          transports: credential.transports || [],
        });

      if (credError) {
        console.error('Credential storage error:', credError);
        // Rollback user creation
        await supabase.from('users').delete().eq('id', newUser.id);
        return new Response(
          JSON.stringify({ error: 'Failed to store credential' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate and store recovery codes
      const recoveryCodes = generateRecoveryCodes(8);
      const recoveryCodeHashes = await Promise.all(
        recoveryCodes.map(async (code) => ({
          user_id: newUser.id,
          code_hash: await bcrypt.hash(code.replace('-', '')),
        }))
      );

      await supabase
        .from('recovery_codes')
        .insert(recoveryCodeHashes);

      // Create device session
      const sessionToken = generateRandomString(32);
      
      await supabase
        .from('device_sessions')
        .insert({
          user_id: newUser.id,
          device_id: deviceId,
          session_token: sessionToken,
          device_name: deviceName || 'Unknown Device',
          user_agent: userAgent || '',
        });

      // Create default preferences
      await supabase
        .from('user_preferences_v2')
        .insert({
          user_id: newUser.id,
        });

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            displayName: newUser.display_name,
          },
          sessionToken,
          recoveryCodes, // Show once, user must save these
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "start" or "complete".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
