/**
 * Bookmarks Store for TTC Alerts PWA
 * 
 * Manages bookmarked stops using localStorage only
 * Max 10 bookmarked stops
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { TTCStop } from '$lib/data/stops-db';
import type { BookmarkedStop } from '$lib/types/database';

// Re-export type for convenience
export type { BookmarkedStop };

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'bookmarked-stops';
const MAX_BOOKMARKS = 10;

// ============================================
// Store
// ============================================

function createBookmarksStore() {
  // Load initial state from localStorage
  const stored = browser ? localStorage.getItem(STORAGE_KEY) : null;
  const initial: BookmarkedStop[] = stored ? JSON.parse(stored) : [];

  const { subscribe, set, update } = writable<BookmarkedStop[]>(initial);

  // Persist to localStorage
  function persist(stops: BookmarkedStop[]) {
    if (browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
    }
  }

  return {
    subscribe,

    /**
     * Add a stop to bookmarks
     */
    add: (stop: TTCStop | BookmarkedStop) => {
      update((stops) => {
        // Check max limit
        if (stops.length >= MAX_BOOKMARKS) {
          console.warn(`Cannot add bookmark: max ${MAX_BOOKMARKS} reached`);
          return stops;
        }
        
        // Check if already bookmarked
        if (stops.some((s) => s.id === stop.id)) {
          return stops;
        }

        const newStop: BookmarkedStop = {
          id: stop.id,
          name: stop.name,
          routes: stop.routes.slice(0, 5), // Limit routes stored
        };

        const newStops = [...stops, newStop];
        persist(newStops);
        return newStops;
      });
    },

    /**
     * Remove a stop from bookmarks
     */
    remove: (stopId: string) => {
      update((stops) => {
        const newStops = stops.filter((s) => s.id !== stopId);
        if (newStops.length !== stops.length) {
          persist(newStops);
        }
        return newStops;
      });
    },

    /**
     * Toggle bookmark status
     */
    toggle: (stop: TTCStop | BookmarkedStop) => {
      const current = get({ subscribe });
      if (current.some((s) => s.id === stop.id)) {
        bookmarks.remove(stop.id);
      } else {
        bookmarks.add(stop);
      }
    },

    /**
     * Check if a stop is bookmarked
     */
    isBookmarked: (stopId: string): boolean => {
      const current = get({ subscribe });
      return current.some((s) => s.id === stopId);
    },

    /**
     * Clear all bookmarks
     */
    clear: () => {
      set([]);
      persist([]);
    },

    /**
     * Reorder bookmarks (for drag-and-drop)
     */
    reorder: (fromIndex: number, toIndex: number) => {
      update((stops) => {
        const newStops = [...stops];
        const [removed] = newStops.splice(fromIndex, 1);
        newStops.splice(toIndex, 0, removed);
        persist(newStops);
        return newStops;
      });
    },
  };
}

export const bookmarks = createBookmarksStore();

// ============================================
// Derived Stores
// ============================================

// Count of bookmarked stops
export const bookmarkCount = {
  subscribe: (fn: (value: number) => void) => {
    return bookmarks.subscribe((stops) => fn(stops.length));
  }
};

// Check if at max capacity
export const isAtMaxBookmarks = {
  subscribe: (fn: (value: boolean) => void) => {
    return bookmarks.subscribe((stops) => fn(stops.length >= MAX_BOOKMARKS));
  }
};
