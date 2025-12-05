// Shared utilities for auth Edge Functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate a random string for tokens/challenges
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate recovery codes (8 codes, 8 chars each)
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I to avoid confusion
  
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % chars.length;
      code += chars[randomIndex];
    }
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

// Base64URL encoding/decoding
export function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Hash a string using SHA-256
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hashBuffer);
}

// Validate username format
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(username);
}

// Allowed origins for WebAuthn
const ALLOWED_ORIGINS = [
  'https://ttc-alerts-svelte.pages.dev',
  'https://version-b.ttc-alerts-svelte.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Get WebAuthn config based on request origin
export function getWebAuthnConfig(requestOrigin: string) {
  const origin = ALLOWED_ORIGINS.find((o) => o === requestOrigin);
  if (!origin) {
    // Fall back to env config for unknown origins
    return rpConfig;
  }

  const url = new URL(origin);
  const rpId = url.hostname;
  return {
    id: rpId,
    name: rpId.includes('version-b') ? 'TTC Alerts Beta' : 'TTC Alerts',
    origin,
  };
}

// WebAuthn Relying Party configuration (default/fallback)
export const rpConfig = {
  id: Deno.env.get('WEBAUTHN_RP_ID') || 'localhost',
  name: Deno.env.get('WEBAUTHN_RP_NAME') || 'TTC Alerts',
  origin: Deno.env.get('WEBAUTHN_ORIGIN') || 'http://localhost:5173',
};

// Response helpers
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function optionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}
