/**
 * ETA Store for TTC Alerts PWA
 *
 * Manages real-time arrival predictions:
 * - Fetches ETAs for all bookmarked stops
 * - Auto-refreshes every 30 seconds (visibility-aware)
 * - Handles loading and error states
 * - Caches last successful response for offline display
 */

import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase';
import { bookmarks, type BookmarkedStop } from '$lib/stores/bookmarks';
import { isVisible } from '$lib/stores/visibility';

// ============================================
// Types
// ============================================

export interface ETAPrediction {
	route: string;
	routeTitle: string;
	direction: string;
	arrivals: number[]; // Minutes until arrival
	isLive: boolean; // true if real-time GPS data, false if scheduled
	scheduledTime?: string; // AM/PM format for scheduled predictions
}

export interface StopETA {
	stopId: string;
	stopName: string;
	predictions: ETAPrediction[];
	lastUpdated: Date;
	isLoading: boolean;
	error?: string;
}

interface ETAState {
	stops: Map<string, StopETA>;
	isRefreshing: boolean;
	lastRefreshTime: Date | null;
}

// ============================================
// Constants
// ============================================

const REFRESH_INTERVAL_MS = 30_000; // 30 seconds
const CACHE_KEY = 'eta-cache';

// ============================================
// Helper Functions
// ============================================

/**
 * Load cached ETA data from localStorage
 */
function loadCache(): Map<string, StopETA> {
	if (!browser) return new Map();

	try {
		const cached = localStorage.getItem(CACHE_KEY);
		if (!cached) return new Map();

		const parsed = JSON.parse(cached);
		const map = new Map<string, StopETA>();

		for (const [key, value] of Object.entries(parsed)) {
			const eta = value as StopETA;
			// Restore Date objects
			eta.lastUpdated = new Date(eta.lastUpdated);
			map.set(key, eta);
		}

		return map;
	} catch {
		return new Map();
	}
}

/**
 * Save ETA data to localStorage cache
 */
function saveCache(stops: Map<string, StopETA>) {
	if (!browser) return;

	try {
		const obj: Record<string, StopETA> = {};
		stops.forEach((value, key) => {
			obj[key] = value;
		});
		localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
	} catch {
		// Ignore storage errors
	}
}

/**
 * Fetch ETA for a single stop from the Edge Function
 */
async function fetchStopETA(stop: BookmarkedStop): Promise<StopETA> {
	const baseETA: StopETA = {
		stopId: stop.id,
		stopName: stop.name,
		predictions: [],
		lastUpdated: new Date(),
		isLoading: false
	};

	try {
		const { data, error } = await supabase.functions.invoke('get-eta', {
			body: { stopId: stop.id }
		});

		if (error) {
			console.error(`ETA fetch error for stop ${stop.id}:`, error);
			return {
				...baseETA,
				error: 'Unable to load predictions'
			};
		}

		// Check for API-level error in response
		if (data?.error) {
			return {
				...baseETA,
				error: data.error
			};
		}

		return {
			...baseETA,
			stopName: data?.stopTitle || stop.name,
			predictions: data?.predictions || []
		};
	} catch (err) {
		console.error(`ETA fetch exception for stop ${stop.id}:`, err);
		return {
			...baseETA,
			error: 'Network error'
		};
	}
}

// ============================================
// Store
// ============================================

function createETAStore() {
	// Initialize with cached data
	const initialStops = loadCache();

	const { subscribe, set, update } = writable<ETAState>({
		stops: initialStops,
		isRefreshing: false,
		lastRefreshTime: null
	});

	let refreshInterval: ReturnType<typeof setInterval> | null = null;
	let isAutoRefreshEnabled = false;

	/**
	 * Fetch ETAs for all bookmarked stops
	 */
	async function refreshAll() {
		const stops = get(bookmarks);

		if (stops.length === 0) {
			update((state) => ({
				...state,
				stops: new Map(),
				isRefreshing: false,
				lastRefreshTime: new Date()
			}));
			return;
		}

		// Set loading state for all stops
		update((state) => {
			const newStops = new Map(state.stops);
			for (const stop of stops) {
				const existing = newStops.get(stop.id);
				newStops.set(stop.id, {
					...(existing || {
						stopId: stop.id,
						stopName: stop.name,
						predictions: [],
						lastUpdated: new Date()
					}),
					isLoading: true
				});
			}
			return { ...state, stops: newStops, isRefreshing: true };
		});

		// Fetch all ETAs in parallel
		const results = await Promise.all(stops.map((stop) => fetchStopETA(stop)));

		// Update store with results
		update((state) => {
			const newStops = new Map<string, StopETA>();

			for (const eta of results) {
				newStops.set(eta.stopId, eta);
			}

			// Save to cache
			saveCache(newStops);

			return {
				stops: newStops,
				isRefreshing: false,
				lastRefreshTime: new Date()
			};
		});
	}

	/**
	 * Fetch ETA for a single stop (useful for manual refresh)
	 */
	async function refreshStop(stopId: string) {
		const stops = get(bookmarks);
		const stop = stops.find((s) => s.id === stopId);
		if (!stop) return;

		// Set loading state
		update((state) => {
			const newStops = new Map(state.stops);
			const existing = newStops.get(stopId);
			if (existing) {
				newStops.set(stopId, { ...existing, isLoading: true });
			}
			return { ...state, stops: newStops };
		});

		// Fetch ETA
		const eta = await fetchStopETA(stop);

		// Update store
		update((state) => {
			const newStops = new Map(state.stops);
			newStops.set(stopId, eta);
			saveCache(newStops);
			return { ...state, stops: newStops };
		});
	}

	/**
	 * Start auto-refresh (visibility-aware)
	 */
	function startAutoRefresh() {
		if (!browser || isAutoRefreshEnabled) return;

		isAutoRefreshEnabled = true;

		// Initial fetch
		refreshAll();

		// Set up interval
		refreshInterval = setInterval(() => {
			// Only refresh if tab is visible
			if (get(isVisible)) {
				refreshAll();
			}
		}, REFRESH_INTERVAL_MS);

		// Also refresh when tab becomes visible again
		const unsubscribeVisibility = isVisible.subscribe((visible) => {
			if (visible && isAutoRefreshEnabled) {
				// Check if we need to refresh (more than 30s since last refresh)
				const state = get({ subscribe });
				const timeSinceRefresh = state.lastRefreshTime
					? Date.now() - state.lastRefreshTime.getTime()
					: Infinity;

				if (timeSinceRefresh > REFRESH_INTERVAL_MS) {
					refreshAll();
				}
			}
		});

		// Return cleanup function
		return () => {
			unsubscribeVisibility();
		};
	}

	/**
	 * Stop auto-refresh
	 */
	function stopAutoRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
		isAutoRefreshEnabled = false;
	}

	/**
	 * Clear all cached data
	 */
	function clearCache() {
		if (browser) {
			localStorage.removeItem(CACHE_KEY);
		}
		set({
			stops: new Map(),
			isRefreshing: false,
			lastRefreshTime: null
		});
	}

	/**
	 * Get ETA for a specific stop
	 */
	function getStopETA(stopId: string): StopETA | undefined {
		return get({ subscribe }).stops.get(stopId);
	}

	/**
	 * Add loading placeholders for newly bookmarked stops.
	 * This immediately shows the stop in the UI with a loading state.
	 */
	function addLoadingPlaceholders(stops: BookmarkedStop[]) {
		update((state) => {
			const newStops = new Map(state.stops);
			for (const stop of stops) {
				// Only add if not already in store
				if (!newStops.has(stop.id)) {
					newStops.set(stop.id, {
						stopId: stop.id,
						stopName: stop.name,
						predictions: [],
						lastUpdated: new Date(),
						isLoading: true
					});
				}
			}
			return { ...state, stops: newStops };
		});
	}

	/**
	 * Remove stops from the ETA store (when unbookmarked)
	 */
	function removeStops(stopIds: string[]) {
		update((state) => {
			const newStops = new Map(state.stops);
			for (const id of stopIds) {
				newStops.delete(id);
			}
			saveCache(newStops);
			return { ...state, stops: newStops };
		});
	}

	return {
		subscribe,
		refreshAll,
		refreshStop,
		startAutoRefresh,
		stopAutoRefresh,
		clearCache,
		getStopETA,
		addLoadingPlaceholders,
		removeStops
	};
}

export const etaStore = createETAStore();

// ============================================
// Bookmark Subscription
// ============================================

/**
 * Subscribe to bookmark changes to immediately show loading state
 * for newly added stops and fetch their ETAs.
 */
if (browser) {
	let previousStopIds = new Set<string>();

	bookmarks.subscribe((stops) => {
		const currentStopIds = new Set(stops.map((s) => s.id));

		// Find newly added stops
		const newStops = stops.filter((s) => !previousStopIds.has(s.id));

		if (newStops.length > 0) {
			// Immediately add loading placeholders for new stops
			etaStore.addLoadingPlaceholders(newStops);

			// Fetch ETAs for new stops only
			newStops.forEach((stop) => {
				etaStore.refreshStop(stop.id);
			});
		}

		// Find removed stops
		const removedIds = [...previousStopIds].filter((id) => !currentStopIds.has(id));
		if (removedIds.length > 0) {
			etaStore.removeStops(removedIds);
		}

		previousStopIds = currentStopIds;
	});
}

// ============================================
// Derived Stores
// ============================================

/**
 * Array of all ETAs for easy iteration
 */
export const etaList = derived(etaStore, ($state) => {
	return Array.from($state.stops.values());
});

/**
 * Whether any ETA is currently loading
 */
export const isAnyLoading = derived(etaStore, ($state) => {
	return $state.isRefreshing || Array.from($state.stops.values()).some((eta) => eta.isLoading);
});

/**
 * Time since last refresh in seconds (for display)
 */
export const secondsSinceRefresh = derived(etaStore, ($state) => {
	if (!$state.lastRefreshTime) return null;
	return Math.floor((Date.now() - $state.lastRefreshTime.getTime()) / 1000);
});
