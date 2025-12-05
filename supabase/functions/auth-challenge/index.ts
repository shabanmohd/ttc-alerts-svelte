import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Allowed origins for WebAuthn
const ALLOWED_ORIGINS = [
  'https://ttc-alerts-svelte.pages.dev',
  'https://version-b.ttc-alerts-svelte.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Get rpId from request origin
function getRpIdFromOrigin(requestOrigin: string | null): string {
  if (requestOrigin) {
    const origin = ALLOWED_ORIGINS.find((o) => o === requestOrigin);
    if (origin) {
      return new URL(origin).hostname;
    }
  }
  return Deno.env.get('WEBAUTHN_RP_ID') || 'localhost';
}

// Generate random string
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Base64URL encode
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
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

    const { userId, deviceId } = await req.json();

    // Validate inputs - userId is required to find user's credentials
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by ID in user_profiles
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

    // Get user's active credentials
    const { data: credentials, error: credError } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (credError || !credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No credentials found for this user. Please use recovery code.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate challenge
    const challenge = generateRandomString(32);

    // Store challenge (expires in 5 minutes)
    await supabase
      .from('webauthn_challenges')
      .insert({
        challenge,
        user_id: user.id,
        operation: 'authentication',
        device_fingerprint: deviceId || null,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    // Clean up old challenges
    await supabase
      .from('webauthn_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Get rpId from request origin (multi-origin support)
    const rpId = getRpIdFromOrigin(req.headers.get('origin'));

    // Return WebAuthn authentication options
    return new Response(
      JSON.stringify({
        publicKey: {
          challenge: base64UrlEncode(new TextEncoder().encode(challenge)),
          rpId,
          allowCredentials: credentials.map(cred => ({
            type: 'public-key',
            id: cred.credential_id,
            transports: cred.transports || ['internal'],
          })),
          userVerification: 'required',
          timeout: 60000,
        },
        userId: user.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Challenge error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
