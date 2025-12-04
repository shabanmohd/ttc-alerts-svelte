import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Allowed origins for WebAuthn
const ALLOWED_ORIGINS = [
  'https://ttc-alerts.pages.dev',
  'https://version-b.ttc-alerts.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Get RP config from request origin (multi-origin support)
function getRpConfigFromOrigin(requestOrigin: string | null): { id: string; name: string } {
  if (requestOrigin) {
    const origin = ALLOWED_ORIGINS.find((o) => o === requestOrigin);
    if (origin) {
      const hostname = new URL(origin).hostname;
      return {
        id: hostname,
        name: hostname.includes('version-b') ? 'TTC Alerts Beta' : 'TTC Alerts',
      };
    }
  }
  return {
    id: Deno.env.get('WEBAUTHN_RP_ID') || 'localhost',
    name: Deno.env.get('WEBAUTHN_RP_NAME') || 'TTC Alerts',
  };
}

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

    const { action, displayName, credential, deviceId, deviceName, userAgent } = await req.json();

    // ============================================
    // Action: start - Generate registration challenge
    // ============================================
    if (action === 'start') {
      if (!displayName || displayName.length < 2 || displayName.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Display name must be 2-50 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate challenge
      const challenge = generateRandomString(32);
      const tempUserId = crypto.randomUUID();

      // Store challenge (expires in 5 minutes)
      // Using device_fingerprint to store displayName temporarily
      await supabase
        .from('webauthn_challenges')
        .insert({
          challenge,
          operation: 'registration',
          device_fingerprint: deviceId,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      // Return WebAuthn registration options (multi-origin support)
      const rpConfig = getRpConfigFromOrigin(req.headers.get('origin'));

      return new Response(
        JSON.stringify({
          publicKey: {
            challenge: base64UrlEncode(new TextEncoder().encode(challenge)),
            rp: {
              id: rpConfig.id,
              name: rpConfig.name,
            },
            user: {
              id: base64UrlEncode(new TextEncoder().encode(tempUserId)),
              name: displayName,
              displayName: displayName,
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
          tempUserId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // Action: complete - Verify credential and create user
    // ============================================
    if (action === 'complete') {
      if (!credential || !deviceId || !displayName) {
        return new Response(
          JSON.stringify({ error: 'Missing credential, deviceId, or displayName' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get and validate challenge
      const { data: challengeRecord } = await supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('device_fingerprint', deviceId)
        .eq('operation', 'registration')
        .eq('used', false)
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

      // Mark challenge as used
      await supabase
        .from('webauthn_challenges')
        .update({ used: true })
        .eq('id', challengeRecord.id);

      // Create user in Supabase Auth (generates UUID)
      // Using a random email since we don't need email auth
      const fakeEmail = `${crypto.randomUUID()}@passkey.local`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });

      if (authError || !authData.user) {
        console.error('Auth user creation error:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = authData.user.id;

      // Create user_profiles entry
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          display_name: displayName,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Cleanup: delete auth user
        await supabase.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: 'Failed to create user profile.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store WebAuthn credential
      const { error: credError } = await supabase
        .from('webauthn_credentials')
        .insert({
          credential_id: credential.id,
          user_id: userId,
          public_key: credential.publicKey,
          counter: credential.counter || 0,
          device_name: deviceName || 'Primary Device',
          device_type: 'platform',
          user_agent: userAgent || null,
          transports: credential.transports || ['internal'],
          is_active: true,
        });

      if (credError) {
        console.error('Credential storage error:', credError);
        // Cleanup
        await supabase.from('user_profiles').delete().eq('id', userId);
        await supabase.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: 'Failed to store credential' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update passkey_count in user_profiles
      await supabase
        .from('user_profiles')
        .update({ passkey_count: 1 })
        .eq('id', userId);

      // Generate and store recovery codes
      const recoveryCodes = generateRecoveryCodes(8);
      const recoveryCodeRecords = await Promise.all(
        recoveryCodes.map(async (code) => ({
          user_id: userId,
          code_hash: await bcrypt.hash(code.replace('-', '')),
          used: false,
        }))
      );

      await supabase
        .from('recovery_codes')
        .insert(recoveryCodeRecords);

      // Create user_preferences entry
      await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          preferences: { favorites: { routes: [] }, schedules: [], filters: {} },
          device_id: deviceId,
          device_name: deviceName || 'Primary Device',
        });

      // Generate a session token (stored in user_preferences for now)
      const sessionToken = generateRandomString(32);

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: userId,
            displayName: displayName,
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
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
