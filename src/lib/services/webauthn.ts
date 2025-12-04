/**
 * WebAuthn Service for TTC Alerts PWA
 * 
 * Handles WebAuthn credential registration and authentication
 * using the browser's built-in biometric capabilities.
 * 
 * Uses existing Supabase schema:
 * - user_profiles (linked to auth.users)
 * - webauthn_credentials (credential_id as PK)
 * - webauthn_challenges (operation, device_fingerprint)
 * - recovery_codes (used boolean)
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
export async function startRegistration(displayName: string): Promise<RegistrationOptions> {
  const response = await fetch(`${FUNCTIONS_URL}/auth-register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action: 'start',
      displayName: displayName.trim(),
      deviceId: getDeviceId(),
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
  displayName: string,
  credential: PublicKeyCredential
): Promise<RegistrationResult> {
  const attestationResponse = credential.response as AuthenticatorAttestationResponse;
  
  // Extract credential data
  const credentialData: WebAuthnCredential = {
    credentialId: credential.id,
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
      displayName: displayName.trim(),
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
export async function register(displayName: string): Promise<RegistrationResult> {
  // Check WebAuthn support
  if (!await isPlatformAuthenticatorAvailable()) {
    throw new Error('Biometric authentication is not available on this device');
  }

  // Get registration options from server
  const options = await startRegistration(displayName);

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
  return completeRegistration(displayName, credential);
}

// ============================================
// Authentication (Sign In)
// ============================================

/**
 * Get authentication challenge from server
 */
export async function getAuthenticationChallenge(userId: string): Promise<AuthenticationOptions> {
  const response = await fetch(`${FUNCTIONS_URL}/auth-challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId,
      deviceId: getDeviceId(),
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
  userId: string,
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
      userId,
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
export async function authenticate(userId: string): Promise<AuthenticationResult> {
  // Get authentication options from server
  const options = await getAuthenticationChallenge(userId);

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
  return verifyAuthentication(userId, credential);
}

// ============================================
// Recovery
// ============================================

/**
 * Sign in with a recovery code
 */
export async function recoverWithCode(
  userId: string,
  recoveryCode: string
): Promise<RecoveryResult> {
  const response = await fetch(`${FUNCTIONS_URL}/auth-recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId,
      recoveryCode: recoveryCode.trim(),
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
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

const SESSION_USER_KEY = 'ttc_user_id';
const SESSION_TOKEN_KEY = 'ttc_session_token';

/**
 * Store session (userId + token)
 */
export function storeSession(userId: string, sessionToken: string): void {
  localStorage.setItem(SESSION_USER_KEY, userId);
  localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
}

/**
 * Get stored user ID
 */
export function getStoredUserId(): string | null {
  return localStorage.getItem(SESSION_USER_KEY);
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
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Validate current session with server
 */
export async function validateSession(): Promise<SessionValidationResult> {
  const userId = getStoredUserId();
  const deviceId = getDeviceId();

  if (!userId) {
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
        userId,
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
// User Lookup
// ============================================

/**
 * Find user by display name (for sign-in)
 * Returns user ID if found, null otherwise
 */
export async function findUserByDisplayName(displayName: string): Promise<{ id: string; displayName: string } | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .ilike('display_name', displayName.trim())
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Cast data to expected shape
  const userData = data as { id: string; display_name: string };
  
  return {
    id: userData.id,
    displayName: userData.display_name,
  };
}

/**
 * Check if user has WebAuthn credentials
 */
export async function userHasCredentials(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    console.error('Credential check error:', error);
    return false;
  }

  return data !== null && data.length > 0;
}

/**
 * Validate display name format
 */
export function isValidDisplayName(displayName: string): boolean {
  const trimmed = displayName.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
}

/**
 * Get display name validation error message
 */
export function getDisplayNameError(displayName: string): string | null {
  const trimmed = displayName.trim();
  
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters';
  }
  
  if (trimmed.length > 50) {
    return 'Name must be 50 characters or less';
  }
  
  return null;
}
