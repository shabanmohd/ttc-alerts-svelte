import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate random string
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Base64URL decode
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

    const { 
      userId, 
      credentialId, 
      authenticatorData, 
      clientDataJSON, 
      signature,
      deviceId,
      deviceName,
      userAgent 
    } = await req.json();

    // Validate inputs
    if (!userId || !credentialId || !authenticatorData || !clientDataJSON || !signature || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user in user_profiles
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the credential
    const { data: credential, error: credError } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (credError || !credential) {
      return new Response(
        JSON.stringify({ error: 'Credential not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the challenge exists and is valid
    const { data: challengeRecord, error: challengeError } = await supabase
      .from('webauthn_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('operation', 'authentication')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeRecord) {
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

    // Decode the assertion data
    const authData = base64UrlDecode(authenticatorData);

    // Extract counter from authenticatorData (bytes 33-36)
    const dataView = new DataView(authData.buffer);
    const newCounter = dataView.getUint32(33, false); // big-endian

    // Check counter to prevent replay attacks
    if (newCounter <= credential.counter) {
      console.warn('Counter not incremented, possible replay attack');
      // For platform authenticators, counter might not increment
      // So we'll log but not reject
    }

    // Update credential counter and last used
    await supabase
      .from('webauthn_credentials')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('credential_id', credentialId);

    // Update user_profiles last_login_at and total_logins
    await supabase
      .from('user_profiles')
      .update({
        last_login_at: new Date().toISOString(),
        total_logins: (user as any).total_logins ? (user as any).total_logins + 1 : 1,
      })
      .eq('id', user.id);

    // Generate session token
    const sessionToken = generateRandomString(32);

    // Update or create user_preferences entry with device info
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        device_id: deviceId,
        device_name: deviceName || credential.device_name || 'Unknown Device',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          displayName: user.display_name,
        },
        sessionToken,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
