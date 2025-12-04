import { writable, derived, get } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { UserPreferences, DevicePreferences } from '$lib/types/database';

// Device fingerprint for anonymous users
let deviceFingerprint: string | null = null;

async function getDeviceFingerprint(): Promise<string> {
  if (deviceFingerprint) return deviceFingerprint;
  
  // Simple fingerprint based on browser characteristics
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('TTC Alerts', 2, 2);
  }
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ];
  
  // Simple hash
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  deviceFingerprint = 'dev_' + Math.abs(hash).toString(36);
  return deviceFingerprint;
}

// Preferences state
export const preferences = writable<UserPreferences | DevicePreferences | null>(null);
export const isLoading = writable(true);
export const isSaving = writable(false);
export const userId = writable<string | null>(null);

// Default preferences
const defaultPreferences = {
  transport_modes: [],
  routes: [],
  alert_types: ['disruption', 'delay', 'detour'],
  schedule: null,
  push_enabled: false
};

// Load preferences (checks user auth, then device)
export async function loadPreferences() {
  isLoading.set(true);
  
  try {
    // Check for authenticated user first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      userId.set(user.id);
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        preferences.set(data);
        return;
      }
    }
    
    // Fall back to device preferences
    const fingerprint = await getDeviceFingerprint();
    const { data } = await supabase
      .from('device_preferences')
      .select('*')
      .eq('device_fingerprint', fingerprint)
      .single();
    
    if (data) {
      preferences.set(data);
    } else {
      // Create default device preferences
      preferences.set({
        device_fingerprint: fingerprint,
        ...defaultPreferences
      } as DevicePreferences);
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
    preferences.set(defaultPreferences as any);
  } finally {
    isLoading.set(false);
  }
}

// Save preferences
export async function savePreferences(updates: {
  modes?: string[];
  routes?: string[];
  alertTypes?: string[];
  schedules?: Array<{ days: string[]; startTime: string; endTime: string }>;
  pushEnabled?: boolean;
}) {
  isSaving.set(true);
  
  try {
    const currentUserId = get(userId);
    const current = get(preferences);
    
    // Transform to database format
    const dbUpdates: any = {};
    if (updates.modes !== undefined) dbUpdates.transport_modes = updates.modes;
    if (updates.routes !== undefined) dbUpdates.routes = updates.routes;
    if (updates.alertTypes !== undefined) dbUpdates.alert_types = updates.alertTypes;
    if (updates.schedules !== undefined) dbUpdates.schedule = updates.schedules;
    if (updates.pushEnabled !== undefined) dbUpdates.push_enabled = updates.pushEnabled;
    
    if (currentUserId) {
      // Save to user_preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: currentUserId,
          ...current,
          ...dbUpdates,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } else {
      // Save to device_preferences
      const fingerprint = await getDeviceFingerprint();
      const { error } = await supabase
        .from('device_preferences')
        .upsert({
          device_fingerprint: fingerprint,
          ...current,
          ...dbUpdates,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    }
    
    preferences.update(p => ({ ...p, ...dbUpdates } as any));
    return { success: true };
  } catch (error) {
    console.error('Error saving preferences:', error);
    return { success: false, error };
  } finally {
    isSaving.set(false);
  }
}

// Migrate device preferences to user account
export async function migratePreferencesToUser(newUserId: string) {
  try {
    const fingerprint = await getDeviceFingerprint();
    const { data: devicePrefs } = await supabase
      .from('device_preferences')
      .select('*')
      .eq('device_fingerprint', fingerprint)
      .single();
    
    if (devicePrefs) {
      // Copy to user preferences
      await supabase.from('user_preferences').upsert({
        user_id: newUserId,
        transport_modes: devicePrefs.transport_modes,
        routes: devicePrefs.routes,
        alert_types: devicePrefs.alert_types,
        schedule: devicePrefs.schedule,
        push_enabled: devicePrefs.push_enabled
      });
      
      // Update store
      userId.set(newUserId);
      await loadPreferences();
    }
  } catch (error) {
    console.error('Error migrating preferences:', error);
  }
}

// Derived stores for convenience
export const modes = derived(preferences, $p => $p?.transport_modes ?? []);
export const transportModes = modes; // Alias for backwards compatibility
export const routes = derived(preferences, $p => $p?.routes ?? []);
export const alertTypes = derived(preferences, $p => $p?.alert_types ?? []);
export const schedules = derived(preferences, $p => {
  const schedule = ($p as any)?.schedule;
  if (!schedule) return [];
  if (Array.isArray(schedule)) return schedule;
  return [schedule];
});
export const pushEnabled = derived(preferences, $p => $p?.push_enabled ?? false);

// Reset preferences to defaults
export async function resetPreferences() {
  isSaving.set(true);
  
  try {
    const currentUserId = get(userId);
    
    if (currentUserId) {
      // Reset user preferences
      const { error } = await supabase
        .from('user_preferences')
        .update({
          ...defaultPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUserId);
      
      if (error) throw error;
    } else {
      // Reset device preferences
      const fingerprint = await getDeviceFingerprint();
      const { error } = await supabase
        .from('device_preferences')
        .update({
          ...defaultPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('device_fingerprint', fingerprint);
      
      if (error) throw error;
    }
    
    preferences.set({ ...defaultPreferences } as any);
    return { success: true };
  } catch (error) {
    console.error('Error resetting preferences:', error);
    return { success: false, error };
  } finally {
    isSaving.set(false);
  }
}
