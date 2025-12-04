/**
 * Auth Store for TTC Alerts PWA
 * 
 * Custom WebAuthn-based authentication system.
 * Uses display name + biometrics instead of email/password.
 * 
 * Works with existing Supabase schema:
 * - user_profiles (linked to auth.users)
 * - webauthn_credentials
 * - recovery_codes
 */

import { writable, derived } from 'svelte/store';
import type { AuthUser, AuthState } from '$lib/types/auth';
import {
  register,
  authenticate,
  recoverWithCode,
  validateSession,
  storeSession,
  clearSession,
  getDeviceId,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  findUserByDisplayName,
  userHasCredentials,
} from '$lib/services/webauthn';

// ============================================
// Store State
// ============================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  sessionToken: null,
  deviceId: '',
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    /**
     * Initialize auth state on app load
     */
    async init() {
      update(s => ({ ...s, isLoading: true, deviceId: getDeviceId() }));

      try {
        // Validate existing session
        const result = await validateSession();

        if (result.valid && result.user) {
          update(s => ({
            ...s,
            user: result.user!,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
        } else {
          update(s => ({
            ...s,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error('Auth init error:', error);
        update(s => ({
          ...s,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }));
      }
    },

    /**
     * Sign up with display name and biometrics
     */
    async signUp(displayName: string): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const result = await register(displayName);

        // Store session
        storeSession(result.user.id, result.sessionToken);

        update(s => ({
          ...s,
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          sessionToken: result.sessionToken,
          error: null,
        }));

        return { 
          success: true, 
          recoveryCodes: result.recoveryCodes 
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sign up failed';
        update(s => ({ ...s, isLoading: false, error: message }));
        return { success: false, error: message };
      }
    },

    /**
     * Sign in with display name and biometrics
     */
    async signIn(displayName: string): Promise<{ success: boolean; error?: string }> {
      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        // Find user by display name
        const userData = await findUserByDisplayName(displayName);
        if (!userData) {
          throw new Error('User not found. Please check your name or create an account.');
        }

        // Check if user has credentials
        const hasCredentials = await userHasCredentials(userData.id);
        if (!hasCredentials) {
          throw new Error('No passkeys found. Please use a recovery code.');
        }

        // Authenticate with WebAuthn
        const result = await authenticate(userData.id);

        // Store session
        storeSession(result.user.id, result.sessionToken);

        update(s => ({
          ...s,
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          sessionToken: result.sessionToken,
          error: null,
        }));

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sign in failed';
        update(s => ({ ...s, isLoading: false, error: message }));
        return { success: false, error: message };
      }
    },

    /**
     * Sign in with recovery code
     */
    async recover(displayName: string, recoveryCode: string): Promise<{ 
      success: boolean; 
      remainingCodes?: number; 
      error?: string 
    }> {
      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        // Find user by display name
        const userData = await findUserByDisplayName(displayName);
        if (!userData) {
          throw new Error('User not found. Please check your name.');
        }

        const result = await recoverWithCode(userData.id, recoveryCode);

        // Store session
        storeSession(result.user.id, result.sessionToken);

        update(s => ({
          ...s,
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          sessionToken: result.sessionToken,
          error: null,
        }));

        return { 
          success: true, 
          remainingCodes: result.remainingCodes 
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Recovery failed';
        update(s => ({ ...s, isLoading: false, error: message }));
        return { success: false, error: message };
      }
    },

    /**
     * Sign out
     */
    signOut() {
      clearSession();
      set({
        ...initialState,
        isLoading: false,
        deviceId: getDeviceId(),
      });
    },

    /**
     * Clear error
     */
    clearError() {
      update(s => ({ ...s, error: null }));
    },

    /**
     * Set error
     */
    setError(error: string) {
      update(s => ({ ...s, error }));
    },
  };
}

export const authStore = createAuthStore();

// ============================================
// Derived Stores (for backward compatibility)
// ============================================

export const user = derived(authStore, $auth => $auth.user);
export const isAuthenticated = derived(authStore, $auth => $auth.isAuthenticated);
export const isLoading = derived(authStore, $auth => $auth.isLoading);
export const authError = derived(authStore, $auth => $auth.error);

export const userName = derived(user, $user => $user?.displayName ?? null);
export const userInitial = derived(userName, $name => $name?.charAt(0).toUpperCase() ?? 'U');

// Legacy compatibility
export const session = writable(null);
export const userEmail = derived(user, () => null);
export const userAvatar = derived(user, () => null);

// ============================================
// Capability Checks
// ============================================

export const webAuthnSupported = writable(false);
export const biometricsAvailable = writable(false);

// Check capabilities on load (browser only)
if (typeof window !== 'undefined') {
  webAuthnSupported.set(isWebAuthnSupported());
  isPlatformAuthenticatorAvailable().then(available => {
    biometricsAvailable.set(available);
  });
}

// ============================================
// Convenience Functions
// ============================================

export function clearAuthError(): void {
  authStore.clearError();
}

export async function initAuth(): Promise<void> {
  await authStore.init();
}

export async function signUp(displayName: string): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  return authStore.signUp(displayName);
}

export async function signIn(displayName: string): Promise<{ success: boolean; error?: string }> {
  return authStore.signIn(displayName);
}

export async function recover(displayName: string, recoveryCode: string): Promise<{ success: boolean; remainingCodes?: number; error?: string }> {
  return authStore.recover(displayName, recoveryCode);
}

export function signOut(): void {
  authStore.signOut();
}

// No-op subscription for compatibility
export function subscribeToAuth(): () => void {
  return () => {};
}

// Legacy OAuth functions - return errors since we use WebAuthn
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  return { error: new Error('Please use biometric authentication instead.') };
}

export async function signInWithOAuth(): Promise<{ error: Error | null }> {
  return { error: new Error('Please use biometric authentication instead.') };
}

export async function signInWithMagicLink(): Promise<{ error: Error | null }> {
  return { error: new Error('Please use biometric authentication instead.') };
}

export async function resetPassword(): Promise<{ error: Error | null }> {
  return { error: new Error('Please use recovery codes instead.') };
}
