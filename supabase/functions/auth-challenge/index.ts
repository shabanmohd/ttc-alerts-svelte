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

    const { username } = await req.json();

    // Validate username
    if (!username || !/^[a-z0-9_]{3,30}$/.test(username.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Invalid username format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUsername = username.toLowerCase();

    // Find user by username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', normalizedUsername)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's credentials
    const { data: credentials, error: credError } = await supabase
      .from('webauthn_credentials')
      .select('id, transports')
      .eq('user_id', user.id);

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
        type: 'authentication',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    // Clean up old challenges
    await supabase
      .from('webauthn_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString());

    const rpId = Deno.env.get('WEBAUTHN_RP_ID') || 'localhost';

    // Return WebAuthn authentication options
    return new Response(
      JSON.stringify({
        publicKey: {
          challenge: base64UrlEncode(new TextEncoder().encode(challenge)),
          rpId,
          allowCredentials: credentials.map(cred => ({
            type: 'public-key',
            id: cred.id,
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
