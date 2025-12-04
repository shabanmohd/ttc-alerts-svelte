/**
 * WebAuthn Service for TTC Alerts PWA
 * 
 * Handles WebAuthn credential registration and authentication
 * using the browser's built-in biometric capabilities.
 */

import { supabase } from '$lib/supabase';
import type {
  RegistrationOptions,
  AuthenticationOptions,
  RegistrationResult,
  AuthenticationResult,
  RecoveryResult,
  SessionValidationResult,
  WebAuthnCredential,
} from '$lib/types/auth';

// Get Supabase Edge Functions URL
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ============================================
// Utility Functions
// ============================================

/**
 * Generate or retrieve a persistent device ID
 */
export function getDeviceId(): string {
  const DEVICE_ID_KEY = 'ttc_device_id';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Get device name based on user agent
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Unknown Device';
}

/**
 * Check if WebAuthn is supported on this device
 */
export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Check if platform authenticator (biometrics) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Base64URL encode an ArrayBuffer
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64URL decode to ArrayBuffer (for WebAuthn compatibility)
 */
function base64UrlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============================================
// Registration (Sign Up)
// ============================================

/**
 * Start the registration process - get challenge from server
 */
export async function startRegistration(username: string): Promise<RegistrationOptions> {
  const response = await fetch(`${FUNCTIONS_URL}/auth-register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action: 'start',
      username: username.toLowerCase().trim(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start registration');
  }

  return response.json();
}

/**
 * Complete registration with WebAuthn credential
 */
export async function completeRegistration(
  username: string,
  credential: PublicKeyCredential
): Promise<RegistrationResult> {
  const attestationResponse = credential.response as AuthenticatorAttestationResponse;
  
  // Extract credential data
  const credentialData: WebAuthnCredential = {
    id: credential.id,
    publicKey: base64UrlEncode(attestationResponse.getPublicKey()!),
    counter: 0,
    transports: attestationResponse.getTransports?.() || [],
  };

  const response = await fetch(`${FUNCTIONS_URL}/auth-register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action: 'complete',
      username: username.toLowerCase().trim(),
      credential: credentialData,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete registration');
  }

  return response.json();
}

/**
 * Register a new user with WebAuthn
 * Full flow: get challenge → create credential → verify
 */
export async function register(username: string): Promise<RegistrationResult> {
  // Check WebAuthn support
  if (!await isPlatformAuthenticatorAvailable()) {
    throw new Error('Biometric authentication is not available on this device');
  }

  // Get registration options from server
  const options = await startRegistration(username);

  // Create the credential using browser WebAuthn API
  const publicKeyOptions: CredentialCreationOptions = {
    publicKey: {
      challenge: base64UrlDecode(options.publicKey.challenge),
      rp: options.publicKey.rp,
      user: {
        id: base64UrlDecode(options.publicKey.user.id),
        name: options.publicKey.user.name,
        displayName: options.publicKey.user.displayName,
      },
      pubKeyCredParams: options.publicKey.pubKeyCredParams,
      authenticatorSelection: options.publicKey.authenticatorSelection,
      timeout: options.publicKey.timeout,
      attestation: options.publicKey.attestation,
    },
  };

  const credential = await navigator.credentials.create(publicKeyOptions);

  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw new Error('Failed to create credential');
  }

  // Complete registration on server
  return completeRegistration(username, credential);
}

// ============================================
// Authentication (Sign In)
// ============================================

/**
 * Get authentication challenge from server
 */
export async function getAuthenticationChallenge(username: string): Promise<AuthenticationOptions> {
  const response = await fetch(`${FUNCTIONS_URL}/auth-challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      username: username.toLowerCase().trim(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get authentication challenge');
  }

  return response.json();
}

/**
 * Verify authentication assertion with server
 */
export async function verifyAuthentication(
  username: string,
  credential: PublicKeyCredential
): Promise<AuthenticationResult> {
  const assertionResponse = credential.response as AuthenticatorAssertionResponse;

  const response = await fetch(`${FUNCTIONS_URL}/auth-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      username: username.toLowerCase().trim(),
      credentialId: credential.id,
      authenticatorData: base64UrlEncode(assertionResponse.authenticatorData),
      clientDataJSON: base64UrlEncode(assertionResponse.clientDataJSON),
      signature: base64UrlEncode(assertionResponse.signature),
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify authentication');
  }

  return response.json();
}

/**
 * Authenticate a user with WebAuthn
 * Full flow: get challenge → authenticate with biometrics → verify
 */
export async function authenticate(username: string): Promise<AuthenticationResult> {
  // Get authentication options from server
  const options = await getAuthenticationChallenge(username);

  // Prepare credential request options
  const publicKeyOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: base64UrlDecode(options.publicKey.challenge),
      rpId: options.publicKey.rpId,
      allowCredentials: options.publicKey.allowCredentials.map(cred => ({
        type: cred.type,
        id: base64UrlDecode(cred.id),
        transports: (cred.transports || []) as AuthenticatorTransport[],
      })),
      userVerification: options.publicKey.userVerification,
      timeout: options.publicKey.timeout,
    },
  };

  // Get the credential using browser WebAuthn API
  const credential = await navigator.credentials.get(publicKeyOptions);

  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw new Error('Failed to get credential');
  }

  // Verify on server
  return verifyAuthentication(username, credential);
}

// ============================================
// Recovery
// ============================================

/**
 * Sign in with a recovery code
 */
export async function recoverWithCode(
  username: string,
  recoveryCode: string
): Promise<RecoveryResult> {
  const response = await fetch(`${FUNCTIONS_URL}/auth-recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      username: username.toLowerCase().trim(),
      recoveryCode: recoveryCode.trim(),
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to recover account');
  }

  return response.json();
}

// ============================================
// Session Management
// ============================================

const SESSION_TOKEN_KEY = 'ttc_session_token';

/**
 * Store session token
 */
export function storeSession(sessionToken: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
}

/**
 * Get stored session token
 */
export function getStoredSession(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Clear session
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Validate current session with server
 */
export async function validateSession(): Promise<SessionValidationResult> {
  const sessionToken = getStoredSession();
  const deviceId = getDeviceId();

  if (!sessionToken) {
    return { valid: false };
  }

  try {
    const response = await fetch(`${FUNCTIONS_URL}/auth-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        sessionToken,
        deviceId,
      }),
    });

    if (!response.ok) {
      clearSession();
      return { valid: false };
    }

    return response.json();
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Network error' };
  }
}

/**
 * Sign out - clear local session
 */
export function signOut(): void {
  clearSession();
}

// ============================================
// Username Validation
// ============================================

/**
 * Check if username is available
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', normalized)
    .maybeSingle();

  if (error) {
    console.error('Username check error:', error);
    return false;
  }

  return !data; // Available if no user found
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(username.toLowerCase().trim());
}

/**
 * Get username validation error message
 */
export function getUsernameError(username: string): string | null {
  const normalized = username.toLowerCase().trim();
  
  if (normalized.length < 3) {
    return 'Username must be at least 3 characters';
  }
  
  if (normalized.length > 30) {
    return 'Username must be 30 characters or less';
  }
  
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  
  return null;
}
