/**
 * Store for TTC route changes data
 *
 * Fetches and caches route changes from the TTC website.
 */

import { writable, derived } from "svelte/store";
import {
  fetchRouteChanges,
  isRouteChangeActive,
  type RouteChange,
} from "$lib/services/route-changes";

// Store for all route changes
const routeChangesInternal = writable<RouteChange[]>([]);

// Store for loading state
export const routeChangesLoading = writable(false);

// Store for error state
export const routeChangesError = writable<string | null>(null);

// Derived store for active/upcoming route changes only
export const routeChanges = derived(routeChangesInternal, ($changes) =>
  $changes.filter(isRouteChangeActive)
);

// Track if we've already fetched
let hasFetched = false;

/**
 * Load route changes from TTC website
 */
export async function loadRouteChanges(force = false): Promise<void> {
  // Don't refetch unless forced
  if (hasFetched && !force) return;

  routeChangesLoading.set(true);
  routeChangesError.set(null);

  try {
    const changes = await fetchRouteChanges();
    routeChangesInternal.set(changes);
    hasFetched = true;
  } catch (error) {
    console.error("Failed to load route changes:", error);
    routeChangesError.set("Failed to load route changes");
  } finally {
    routeChangesLoading.set(false);
  }
}

/**
 * Get count of active route changes
 */
export const routeChangesCount = derived(
  routeChanges,
  ($changes) => $changes.length
);
