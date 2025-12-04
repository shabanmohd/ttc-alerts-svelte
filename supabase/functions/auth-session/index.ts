import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // Validate inputs
    if (!userId || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or deviceId', valid: false }),
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
        JSON.stringify({ error: 'Invalid session', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has active credentials (meaning they're a valid WebAuthn user)
    const { data: credentials } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (!credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active credentials', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last login
    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        valid: true,
        user: {
          id: user.id,
          displayName: user.display_name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Session validation error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error', valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
