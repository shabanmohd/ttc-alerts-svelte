/**
 * Lazy-loaded GTFS Route Data Service
 *
 * Provides on-demand loading of large route data files to reduce initial bundle size.
 * Data is cached in memory after first load.
 */

import type { RouteEnhancedData } from '$lib/data/stops-db';

// Type for route stop orders
export type RouteStopOrders = Record<string, Record<string, string[]>>;

// Cached data
let routeBranchesCache: Record<string, RouteEnhancedData> | null = null;
let routeStopOrdersCache: RouteStopOrders | null = null;

// Loading state to prevent duplicate fetches
let routeBranchesPromise: Promise<Record<string, RouteEnhancedData>> | null = null;
let routeStopOrdersPromise: Promise<RouteStopOrders> | null = null;

/**
 * Fetch and cache route branches data (512KB)
 * Contains detailed branch/stop information for each route
 */
export async function getRouteBranchesData(): Promise<Record<string, RouteEnhancedData>> {
	// Return cached data if available
	if (routeBranchesCache) {
		return routeBranchesCache;
	}

	// Return existing promise if already loading
	if (routeBranchesPromise) {
		return routeBranchesPromise;
	}

	// Fetch and cache
	routeBranchesPromise = fetch('/data/ttc-route-branches.json')
		.then((res) => {
			if (!res.ok) throw new Error(`Failed to load route branches: ${res.status}`);
			return res.json();
		})
		.then((data) => {
			routeBranchesCache = data;
			routeBranchesPromise = null;
			return data;
		})
		.catch((err) => {
			routeBranchesPromise = null;
			console.error('[route-data] Failed to load route branches:', err);
			throw err;
		});

	return routeBranchesPromise;
}

/**
 * Fetch and cache route stop orders data (277KB)
 * Contains stop sequence information for each route/direction
 */
export async function getRouteStopOrdersData(): Promise<RouteStopOrders> {
	// Return cached data if available
	if (routeStopOrdersCache) {
		return routeStopOrdersCache;
	}

	// Return existing promise if already loading
	if (routeStopOrdersPromise) {
		return routeStopOrdersPromise;
	}

	// Fetch and cache
	routeStopOrdersPromise = fetch('/data/ttc-route-stop-orders.json')
		.then((res) => {
			if (!res.ok) throw new Error(`Failed to load route stop orders: ${res.status}`);
			return res.json();
		})
		.then((data) => {
			routeStopOrdersCache = data;
			routeStopOrdersPromise = null;
			return data;
		})
		.catch((err) => {
			routeStopOrdersPromise = null;
			console.error('[route-data] Failed to load route stop orders:', err);
			throw err;
		});

	return routeStopOrdersPromise;
}

/**
 * Preload both data files in parallel
 * Call this when user navigates to routes section to warm the cache
 */
export async function preloadRouteData(): Promise<void> {
	await Promise.all([getRouteBranchesData(), getRouteStopOrdersData()]);
}

/**
 * Check if data is already cached
 */
export function isRouteDataCached(): boolean {
	return routeBranchesCache !== null && routeStopOrdersCache !== null;
}

/**
 * Clear cached data (for testing or memory management)
 */
export function clearRouteDataCache(): void {
	routeBranchesCache = null;
	routeStopOrdersCache = null;
}
