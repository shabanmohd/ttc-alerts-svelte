import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { migratePreferencesToUser, loadPreferences } from './preferences';

// Auth state
export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);
export const isLoading = writable(true);
export const authError = writable<string | null>(null);

// Derived stores
export const isAuthenticated = derived(user, $user => !!$user);
export const userEmail = derived(user, $user => $user?.email ?? null);
export const userName = derived(user, $user => {
  if (!$user) return null;
  return $user.user_metadata?.full_name || 
         $user.user_metadata?.name || 
         $user.email?.split('@')[0] || 
         'User';
});
export const userAvatar = derived(user, $user => $user?.user_metadata?.avatar_url ?? null);
export const userInitial = derived(userName, $userName => {
  if (!$userName) return 'U';
  return $userName.charAt(0).toUpperCase();
});

// Clear auth error
export function clearAuthError(): void {
  authError.set(null);
}

// Initialize auth state
export async function initAuth(): Promise<void> {
  isLoading.set(true);
  
  try {
    // Get initial session
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    
    if (initialSession) {
      session.set(initialSession);
      user.set(initialSession.user);
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    authError.set('Failed to initialize authentication');
  } finally {
    isLoading.set(false);
  }
}

// Set up auth state listener
export function subscribeToAuth(): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, newSession) => {
      console.log('Auth state changed:', event);
      
      session.set(newSession);
      user.set(newSession?.user ?? null);
      
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Migrate device preferences to user account
        await migratePreferencesToUser(newSession.user.id);
        await loadPreferences();
      }
      
      if (event === 'SIGNED_OUT') {
        // Reload device preferences
        await loadPreferences();
      }
    }
  );
  
  return () => subscription.unsubscribe();
}

// Sign in with OAuth
export async function signInWithOAuth(provider: 'google' | 'github' | 'apple'): Promise<{ error: Error | null }> {
  authError.set(null);
  
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    const err = error as Error;
    authError.set(err.message);
    return { error: err };
  }
}

// Convenience function for Google sign in
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  return signInWithOAuth('google');
}

// Sign in with magic link
export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  authError.set(null);
  
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    const err = error as Error;
    authError.set(err.message);
    return { error: err };
  }
}

// Sign up with email and password
export async function signUp(email: string, password: string): Promise<{ error: Error | null }> {
  authError.set(null);
  
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    const err = error as Error;
    authError.set(err.message);
    return { error: err };
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
  authError.set(null);
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    const err = error as Error;
    authError.set(err.message);
    return { error: err };
  }
}

// Sign out
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    user.set(null);
    session.set(null);
  } catch (error) {
    console.error('Error signing out:', error);
    authError.set('Failed to sign out');
  }
}

// Reset password
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  authError.set(null);
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    const err = error as Error;
    authError.set(err.message);
    return { error: err };
  }
}
