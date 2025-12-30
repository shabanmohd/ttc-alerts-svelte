/**
 * Saved Routes Store for rideTO PWA
 * 
 * Uses IndexedDB for robust local storage
 * No cloud sync - uses Export/Import for backup
 * Max 20 saved routes per user
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { routesStorage, type SavedRoute } from '$lib/services/storage';

// Re-export type for convenience
export type { SavedRoute };

// ============================================
// Constants
// ============================================

const MAX_SAVED_ROUTES = 20;

// ============================================
// Store
// ============================================

function createSavedRoutesStore() {
  const { subscribe, set, update } = writable<SavedRoute[]>([]);
  let initialized = false;

  // Initialize from IndexedDB
  async function init() {
    if (!browser || initialized) return;
    
    try {
      const routes = await routesStorage.getAll();
      // Sort by savedAt descending (newest first)
      routes.sort((a, b) => b.savedAt - a.savedAt);
      set(routes);
      initialized = true;
    } catch (error) {
      console.error('Failed to load saved routes:', error);
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
     * Add a route to saved routes
     */
    async add(route: { id: string; name: string; type: 'bus' | 'streetcar' | 'subway' }): Promise<boolean> {
      const current = get({ subscribe });
      
      // Check max limit
      if (current.length >= MAX_SAVED_ROUTES) {
        console.warn(`Cannot add route: max ${MAX_SAVED_ROUTES} reached`);
        return false;
      }
      
      // Check if already saved
      if (current.some((r) => r.id === route.id)) {
        console.warn('Route already saved');
        return false;
      }

      try {
        await routesStorage.save({
          id: route.id,
          name: route.name,
          type: route.type
        });

        // Update local state
        const saved = await routesStorage.get(route.id);
        if (saved) {
          update((routes) => [saved, ...routes]);
        }
        
        return true;
      } catch (error) {
        console.error('Failed to save route:', error);
        return false;
      }
    },

    /**
     * Remove a route from saved routes
     */
    async remove(routeId: string): Promise<boolean> {
      try {
        await routesStorage.remove(routeId);
        update((routes) => routes.filter((r) => r.id !== routeId));
        return true;
      } catch (error) {
        console.error('Failed to remove route:', error);
        return false;
      }
    },

    /**
     * Toggle saved status
     */
    async toggle(route: { id: string; name: string; type: 'bus' | 'streetcar' | 'subway' }): Promise<boolean> {
      const current = get({ subscribe });
      if (current.some((r) => r.id === route.id)) {
        return this.remove(route.id);
      } else {
        return this.add(route);
      }
    },

    /**
     * Check if a route is saved
     */
    isSaved(routeId: string): boolean {
      const current = get({ subscribe });
      return current.some((r) => r.id === routeId);
    },

    /**
     * Clear all saved routes
     */
    async clear(): Promise<boolean> {
      try {
        await routesStorage.clear();
        set([]);
        return true;
      } catch (error) {
        console.error('Failed to clear routes:', error);
        return false;
      }
    },

    /**
     * Get count of saved routes
     */
    get count(): number {
      return get({ subscribe }).length;
    },

    /**
     * Check if at max capacity
     */
    get isAtMax(): boolean {
      return get({ subscribe }).length >= MAX_SAVED_ROUTES;
    }
  };
}

export const savedRoutes = createSavedRoutesStore();

// ============================================
// Derived Values (reactive)
// ============================================

// Count of saved routes
export const savedRoutesCount = {
  subscribe: (fn: (value: number) => void) => {
    return savedRoutes.subscribe((routes) => fn(routes.length));
  }
};

// Check if at max capacity
export const isAtMaxSavedRoutes = {
  subscribe: (fn: (value: boolean) => void) => {
    return savedRoutes.subscribe((routes) => fn(routes.length >= MAX_SAVED_ROUTES));
  }
};
