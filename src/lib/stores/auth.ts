/**
 * Auth Store for TTC Alerts PWA
 * 
 * Custom WebAuthn-based authentication system.
 * Uses username + biometrics instead of email/password.
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
} from '$lib/services/webauthn';
import { migratePreferencesToUser, loadPreferences } from './preferences';

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
          
          // Load user preferences
          await loadPreferences();
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
     * Sign up with username and biometrics
     */
    async signUp(username: string): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const result = await register(username);

        // Store session
        storeSession(result.sessionToken);

        update(s => ({
          ...s,
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          sessionToken: result.sessionToken,
          error: null,
        }));

        // Migrate device preferences to user account
        await migratePreferencesToUser(result.user.id);
        await loadPreferences();

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
     * Sign in with username and biometrics
     */
    async signIn(username: string): Promise<{ success: boolean; error?: string }> {
      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const result = await authenticate(username);

        // Store session
        storeSession(result.sessionToken);

        update(s => ({
          ...s,
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          sessionToken: result.sessionToken,
          error: null,
        }));

        // Load user preferences
        await loadPreferences();

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
    async recover(username: string, recoveryCode: string): Promise<{ 
      success: boolean; 
      remainingCodes?: number; 
      error?: string 
    }> {
      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const result = await recoverWithCode(username, recoveryCode);

        // Store session
        storeSession(result.sessionToken);

        update(s => ({
          ...s,
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          sessionToken: result.sessionToken,
          error: null,
        }));

        // Load user preferences
        await loadPreferences();

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
      
      // Reload device preferences
      loadPreferences();
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

export const userName = derived(user, $user => $user?.displayName ?? $user?.username ?? null);
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

export async function signUp(username: string): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  return authStore.signUp(username);
}

export async function signIn(username: string): Promise<{ success: boolean; error?: string }> {
  return authStore.signIn(username);
}

export async function recover(username: string, recoveryCode: string): Promise<{ success: boolean; remainingCodes?: number; error?: string }> {
  return authStore.recover(username, recoveryCode);
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
