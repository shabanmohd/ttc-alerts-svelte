/**
 * Bookmarks Store for TTC Alerts PWA
 * 
 * Manages bookmarked stops:
 * - Local storage for anonymous users
 * - Supabase sync for authenticated users
 * - Max 10 bookmarked stops per user
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase';
import { user } from '$lib/stores/auth';
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

  // Track if we've synced with Supabase
  let hasSyncedWithServer = false;

  // Sync with Supabase when user changes
  if (browser) {
    user.subscribe(async (currentUser) => {
      if (currentUser && !hasSyncedWithServer) {
        // User just logged in - fetch their bookmarks from server
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('bookmarked_stops')
            .eq('user_id', currentUser.id)
            .single();

          if (!error && data) {
            // Cast to any to bypass strict typing (column not in generated types)
            const serverStops: BookmarkedStop[] = (data as { bookmarked_stops: BookmarkedStop[] }).bookmarked_stops || [];
            const localStops = get({ subscribe });
            
            // Merge: start with server, add local ones not on server
            const merged = [...serverStops];
            for (const local of localStops) {
              if (!merged.some(s => s.id === local.id) && merged.length < MAX_BOOKMARKS) {
                merged.push(local);
              }
            }
            
            set(merged);
            persistLocal(merged);
            
            // If we added local stops, sync back to server
            if (merged.length > serverStops.length) {
              await persistToServer(currentUser.id, merged);
            }
          }
          hasSyncedWithServer = true;
        } catch (err) {
          console.error('Failed to sync bookmarks:', err);
        }
      } else if (!currentUser) {
        // User logged out - keep local bookmarks but reset sync flag
        hasSyncedWithServer = false;
      }
    });
  }

  // Persist to localStorage
  function persistLocal(stops: BookmarkedStop[]) {
    if (browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
    }
  }

  // Persist to Supabase (for authenticated users)
  async function persistToServer(userId: string, stops: BookmarkedStop[]) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      await client
        .from('user_preferences')
        .upsert(
          { user_id: userId, bookmarked_stops: stops },
          { onConflict: 'user_id' }
        );
    } catch (err) {
      console.error('Failed to save bookmarks to server:', err);
    }
  }

  // Persist to both local and server
  async function persist(stops: BookmarkedStop[]) {
    persistLocal(stops);
    
    const currentUser = get(user);
    if (currentUser) {
      await persistToServer(currentUser.id, stops);
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
