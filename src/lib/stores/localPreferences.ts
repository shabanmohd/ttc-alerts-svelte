/**
 * Local Preferences Store for TTC Alerts PWA
 * 
 * Simple local-only preferences using IndexedDB
 * No cloud sync - uses Export/Import for backup
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { preferencesStorage, type UserPreferences, DEFAULT_PREFERENCES } from '$lib/services/storage';
import { setLanguage } from '$lib/stores/language';

// Re-export types
export type { UserPreferences };
export { DEFAULT_PREFERENCES };

// ============================================
// Store
// ============================================

function createLocalPreferencesStore() {
  const { subscribe, set, update } = writable<UserPreferences>(DEFAULT_PREFERENCES);
  let initialized = false;

  // Initialize from IndexedDB
  async function init() {
    if (!browser || initialized) return;
    
    try {
      const prefs = await preferencesStorage.get();
      set(prefs);
      initialized = true;
      
      // Apply theme immediately
      applyTheme(prefs.theme);
      applyTextSize(prefs.textSize);
      applyReduceMotion(prefs.reduceMotion);
      applyLanguage(prefs.language);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  // Apply theme to document
  function applyTheme(theme: UserPreferences['theme']) {
    if (!browser) return;
    
    const root = document.documentElement;
    
    // Sync to localStorage for the blocking script in app.html
    localStorage.setItem('ttc-theme', theme);
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }

  // Apply text size to document
  function applyTextSize(size: UserPreferences['textSize']) {
    if (!browser) return;
    
    const root = document.documentElement;
    root.classList.remove('text-size-default', 'text-size-large', 'text-size-extra-large');
    root.classList.add(`text-size-${size}`);
  }

  // Apply reduce motion preference
  function applyReduceMotion(reduce: boolean) {
    if (!browser) return;
    
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', reduce);
  }

  // Apply language/locale
  function applyLanguage(lang: UserPreferences['language']) {
    if (!browser) return;
    setLanguage(lang as 'en' | 'fr');
  }

  // Auto-initialize
  if (browser) {
    init();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = get({ subscribe });
      if (current.theme === 'system') {
        applyTheme('system');
      }
    });
  }

  return {
    subscribe,

    /**
     * Initialize the store (call on app startup)
     */
    init,

    /**
     * Update a single preference
     */
    async updatePreference<K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K]
    ): Promise<boolean> {
      try {
        const current = get({ subscribe });
        const updated = { ...current, [key]: value };
        
        await preferencesStorage.save(updated);
        set(updated);
        
        // Apply changes immediately
        if (key === 'theme') applyTheme(value as UserPreferences['theme']);
        if (key === 'textSize') applyTextSize(value as UserPreferences['textSize']);
        if (key === 'reduceMotion') applyReduceMotion(value as boolean);
        if (key === 'language') applyLanguage(value as UserPreferences['language']);
        
        return true;
      } catch (error) {
        console.error('Failed to update preference:', error);
        return false;
      }
    },

    /**
     * Update multiple preferences at once
     */
    async updatePreferences(partial: Partial<UserPreferences>): Promise<boolean> {
      try {
        const current = get({ subscribe });
        const updated = { ...current, ...partial };
        
        await preferencesStorage.save(updated);
        set(updated);
        
        // Apply changes immediately
        if (partial.theme !== undefined) applyTheme(partial.theme);
        if (partial.textSize !== undefined) applyTextSize(partial.textSize);
        if (partial.reduceMotion !== undefined) applyReduceMotion(partial.reduceMotion);
        if (partial.language !== undefined) applyLanguage(partial.language);
        
        return true;
      } catch (error) {
        console.error('Failed to update preferences:', error);
        return false;
      }
    },

    /**
     * Reset all preferences to defaults
     */
    async reset(): Promise<boolean> {
      try {
        await preferencesStorage.reset();
        set(DEFAULT_PREFERENCES);
        
        // Apply defaults
        applyTheme(DEFAULT_PREFERENCES.theme);
        applyTextSize(DEFAULT_PREFERENCES.textSize);
        applyReduceMotion(DEFAULT_PREFERENCES.reduceMotion);
        
        return true;
      } catch (error) {
        console.error('Failed to reset preferences:', error);
        return false;
      }
    },

    /**
     * Get current preference value
     */
    getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
      return get({ subscribe })[key];
    }
  };
}

export const localPreferences = createLocalPreferencesStore();

// ============================================
// Convenience Accessors
// ============================================

// Current language
export const currentLanguage = {
  subscribe: (fn: (value: UserPreferences['language']) => void) => {
    return localPreferences.subscribe((prefs) => fn(prefs.language));
  }
};

// Current theme
export const currentTheme = {
  subscribe: (fn: (value: UserPreferences['theme']) => void) => {
    return localPreferences.subscribe((prefs) => fn(prefs.theme));
  }
};

// Current text size
export const currentTextSize = {
  subscribe: (fn: (value: UserPreferences['textSize']) => void) => {
    return localPreferences.subscribe((prefs) => fn(prefs.textSize));
  }
};

// Reduce motion preference
export const reduceMotion = {
  subscribe: (fn: (value: boolean) => void) => {
    return localPreferences.subscribe((prefs) => fn(prefs.reduceMotion));
  }
};
