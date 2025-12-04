import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { username, recoveryCode, deviceId, deviceName, userAgent } = await req.json();

    // Validate inputs
    if (!username || !recoveryCode || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUsername = username.toLowerCase();
    // Remove dashes and convert to uppercase for comparison
    const normalizedCode = recoveryCode.replace(/-/g, '').toUpperCase();

    // Find user
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

    // Get unused recovery codes
    const { data: recoveryCodes, error: codesError } = await supabase
      .from('recovery_codes')
      .select('*')
      .eq('user_id', user.id)
      .is('used_at', null);

    if (codesError || !recoveryCodes || recoveryCodes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recovery codes available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check each recovery code
    let validCode = null;
    for (const code of recoveryCodes) {
      const isValid = await bcrypt.compare(normalizedCode, code.code_hash);
      if (isValid) {
        validCode = code;
        break;
      }
    }

    if (!validCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid recovery code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    await supabase
      .from('recovery_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', validCode.id);

    // Count remaining codes
    const remainingCodes = recoveryCodes.length - 1;

    // Create session
    const sessionToken = generateRandomString(32);
    
    await supabase
      .from('device_sessions')
      .upsert({
        user_id: user.id,
        device_id: deviceId,
        session_token: sessionToken,
        device_name: deviceName || 'Recovery Device',
        user_agent: userAgent || '',
        last_active_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,device_id',
      });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
        },
        sessionToken,
        remainingCodes,
        needsNewCredential: true, // Prompt user to add new biometric
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Recovery error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
