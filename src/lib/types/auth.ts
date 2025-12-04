// Auth types for custom WebAuthn authentication
// Uses displayName as primary identifier (no username/email)

export interface AuthUser {
  id: string;
  displayName: string;
}

export interface AuthSession {
  sessionToken: string;
  deviceId: string;
  user: AuthUser;
}

export interface RegistrationOptions {
  publicKey: {
    challenge: string;
    rp: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      name: string; // WebAuthn spec requires this, we use displayName
      displayName: string;
    };
    pubKeyCredParams: Array<{
      type: 'public-key';
      alg: number;
    }>;
    authenticatorSelection: {
      authenticatorAttachment: 'platform' | 'cross-platform';
      userVerification: 'required' | 'preferred' | 'discouraged';
      residentKey: 'required' | 'preferred' | 'discouraged';
    };
    timeout: number;
    attestation: 'none' | 'indirect' | 'direct';
  };
  userId: string;
}

export interface AuthenticationOptions {
  publicKey: {
    challenge: string;
    rpId: string;
    allowCredentials: Array<{
      type: 'public-key';
      id: string;
      transports?: string[];
    }>;
    userVerification: 'required' | 'preferred' | 'discouraged';
    timeout: number;
  };
  userId: string;
}

export interface RegistrationResult {
  success: boolean;
  user: AuthUser;
  sessionToken: string;
  recoveryCodes: string[];
}

export interface AuthenticationResult {
  success: boolean;
  user: AuthUser;
  sessionToken: string;
}

export interface RecoveryResult {
  success: boolean;
  user: AuthUser;
  sessionToken: string;
  remainingCodes: number;
  needsNewCredential: boolean;
}

export interface SessionValidationResult {
  valid: boolean;
  user?: AuthUser;
  error?: string;
}

export interface WebAuthnCredential {
  credentialId: string; // Matches database schema (credential_id as PK)
  publicKey: string;
  counter: number;
  transports?: string[];
}

export type AuthStep = 
  | 'displayName' // Changed from 'username'
  | 'biometric'
  | 'recovery'
  | 'recovery-codes'
  | 'success'
  | 'error';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionToken: string | null;
  deviceId: string;
}
