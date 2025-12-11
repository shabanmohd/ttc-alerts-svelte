/**
 * Subway ETA Service for TTC Alerts PWA
 *
 * Fetches real-time subway arrival predictions via the Edge Function proxy.
 * The Edge Function calls the TTC NTAS (Next Train Arrival System) API.
 *
 * Supports Lines 1, 2, 4, and 6 (when Line 6 opens in 2025).
 * Provides real-time countdown data like "0 min, 4 min, 11 min".
 */

import { supabase } from '$lib/supabase';
import type { ETAPrediction, ETAResponse } from './nextbus';

// Cache configuration
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// ============================================================================
// In-memory cache
// ============================================================================

interface CacheEntry {
	data: ETAResponse;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): ETAResponse | null {
	const entry = cache.get(key);
	if (!entry) return null;

	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}

	return { ...entry.data, fromCache: true };
}

function setCache(key: string, data: ETAResponse): void {
	cache.set(key, {
		data,
		expiresAt: Date.now() + CACHE_TTL_MS
	});
}

export function clearSubwayCache(): void {
	cache.clear();
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if a stop is a subway station
 */
export function isSubwayStop(stopType: string): boolean {
	return stopType === 'subway';
}

/**
 * Check if a route is a subway line
 */
export function isSubwayLine(route: string): boolean {
	return /^Line\s+[1246]$/i.test(route);
}

/**
 * Check if a station is on Line 6 (will be available when line opens)
 * Line 6 Finch West LRT opens in 2025
 */
function isLine6Station(stationName: string): boolean {
	const name = stationName.toLowerCase();
	const line6Stations = [
		'finch west', 'humber college', 'westmore', 'martin grove', 'albion',
		'stevenson', 'mount olive', 'rowntree mills', 'pearldale', 'duncanwoods',
		'milvan rumike', 'emery', 'signet arrow', 'norfinch oakdale', 'jane and finch',
		'driftwood', 'tobermory', 'sentinel'
	];
	return line6Stations.some(s => name.includes(s));
}

/**
 * Fetch ETA predictions for a subway station via Edge Function
 *
 * @param stationName - Station name (e.g., "Finch Station", "Bloor-Yonge Station")
 * @param stopId - Original stop ID
 * @param filterRoute - Optional: filter predictions to a specific line (e.g., "Line 1")
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns ETAResponse with predictions or error
 */
export async function fetchSubwayETA(
	stationName: string,
	stopId: string,
	filterRoute?: string,
	forceRefresh = false
): Promise<ETAResponse> {
	// Note: Line 6 stations have NTAS codes ready for when the line opens
	// The API will return empty predictions until service starts

	// Create cache key
	const cacheKey = `subway:${stopId}:${filterRoute || 'all'}`;

	// Check cache first (unless forcing refresh)
	if (!forceRefresh) {
		const cached = getCached(cacheKey);
		if (cached) {
			return { ...cached, stopId };
		}
	}

	try {
		// Call Edge Function with subway parameters
		const { data, error } = await supabase.functions.invoke('get-eta', {
			body: {
				stopId,
				type: 'subway',
				stationName,
				filterRoute
			}
		});

		if (error) {
			console.error(`Subway ETA fetch error for ${stationName}:`, error);
			return {
				stopId,
				predictions: [],
				timestamp: new Date().toISOString(),
				error: 'Unable to load subway times'
			};
		}

		// Check for API-level error in response
		if (data?.error) {
			return {
				stopId,
				predictions: data.predictions || [],
				timestamp: data.timestamp || new Date().toISOString(),
				error: data.error
			};
		}

		const result: ETAResponse = {
			stopId,
			stopTitle: data?.stopTitle || stationName,
			predictions: data?.predictions || [],
			timestamp: data?.timestamp || new Date().toISOString()
		};

		// Cache successful response
		setCache(cacheKey, result);

		return result;
	} catch (err) {
		console.error(`Subway ETA fetch exception for ${stationName}:`, err);
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: 'Network error'
		};
	}
}

/**
 * Get subway lines that serve a station based on route data
 */
export function getSubwayLinesAtStation(routes: string[]): string[] {
	return routes.filter((r) => isSubwayLine(r));
}
