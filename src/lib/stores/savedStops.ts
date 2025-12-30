/**
 * Saved Stops Store for rideTO PWA
 * 
 * Uses IndexedDB for robust local storage
 * No cloud sync - uses Export/Import for backup
 * Max 20 saved stops per user
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { stopsStorage, type SavedStop } from '$lib/services/storage';

// Re-export type for convenience
export type { SavedStop };

// ============================================
// Constants
// ============================================

const MAX_SAVED_STOPS = 20;

// ============================================
// Store
// ============================================

function createSavedStopsStore() {
  const { subscribe, set, update } = writable<SavedStop[]>([]);
  let initialized = false;

  // Initialize from IndexedDB
  async function init() {
    if (!browser || initialized) return;
    
    try {
      const stops = await stopsStorage.getAll();
      // Sort by savedAt descending (newest first)
      stops.sort((a, b) => b.savedAt - a.savedAt);
      set(stops);
      initialized = true;
    } catch (error) {
      console.error('Failed to load saved stops:', error);
    }
  }

  // Auto-initialize
  if (browser) {
    init();
  }

  return {
    subscribe,

    /**
     * Initialize the store (call on app startup)
     */
    init,

    /**
     * Add a stop to saved stops
     */
    async add(stop: { id: string; name: string; routes: string[] }): Promise<boolean> {
      const current = get({ subscribe });
      
      // Check max limit
      if (current.length >= MAX_SAVED_STOPS) {
        console.warn(`Cannot add stop: max ${MAX_SAVED_STOPS} reached`);
        return false;
      }
      
      // Check if already saved
      if (current.some((s) => s.id === stop.id)) {
        console.warn('Stop already saved');
        return false;
      }

      try {
        await stopsStorage.save({
          id: stop.id,
          name: stop.name,
          routes: stop.routes.slice(0, 5) // Limit routes stored
        });

        // Update local state
        const saved = await stopsStorage.get(stop.id);
        if (saved) {
          update((stops) => [saved, ...stops]);
        }
        
        return true;
      } catch (error) {
        console.error('Failed to save stop:', error);
        return false;
      }
    },

    /**
     * Remove a stop from saved stops
     */
    async remove(stopId: string): Promise<boolean> {
      try {
        await stopsStorage.remove(stopId);
        update((stops) => stops.filter((s) => s.id !== stopId));
        return true;
      } catch (error) {
        console.error('Failed to remove stop:', error);
        return false;
      }
    },

    /**
     * Toggle saved status
     */
    async toggle(stop: { id: string; name: string; routes: string[] }): Promise<boolean> {
      const current = get({ subscribe });
      if (current.some((s) => s.id === stop.id)) {
        return this.remove(stop.id);
      } else {
        return this.add(stop);
      }
    },

    /**
     * Check if a stop is saved
     */
    isSaved(stopId: string): boolean {
      const current = get({ subscribe });
      return current.some((s) => s.id === stopId);
    },

    /**
     * Clear all saved stops
     */
    async clear(): Promise<boolean> {
      try {
        await stopsStorage.clear();
        set([]);
        return true;
      } catch (error) {
        console.error('Failed to clear stops:', error);
        return false;
      }
    },

    /**
     * Get count of saved stops
     */
    get count(): number {
      return get({ subscribe }).length;
    },

    /**
     * Check if at max capacity
     */
    get isAtMax(): boolean {
      return get({ subscribe }).length >= MAX_SAVED_STOPS;
    }
  };
}

export const savedStops = createSavedStopsStore();

// ============================================
// Derived Values (reactive)
// ============================================

// Count of saved stops
export const savedStopsCount = {
  subscribe: (fn: (value: number) => void) => {
    return savedStops.subscribe((stops) => fn(stops.length));
  }
};

// Check if at max capacity
export const isAtMaxSavedStops = {
  subscribe: (fn: (value: boolean) => void) => {
    return savedStops.subscribe((stops) => fn(stops.length >= MAX_SAVED_STOPS));
  }
};
