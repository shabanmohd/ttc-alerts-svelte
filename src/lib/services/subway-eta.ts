/**
 * Subway ETA Service for TTC Alerts PWA
 *
 * Fetches subway arrival predictions via the Edge Function proxy.
 * The Edge Function handles the MyTTC API call to bypass CORS restrictions.
 *
 * Supports Lines 1, 2, and 4. Line 6 is not yet available in MyTTC.
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
 * Check if a station is on Line 6 (not yet available in MyTTC)
 */
function isLine6Station(stationName: string): boolean {
	const name = stationName.toLowerCase();
	const line6Stations = ['finch west', 'humber college', 'highway 27', 'woodbine racetrack'];
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
	// Check if this is a Line 6 station (not available yet)
	if (isLine6Station(stationName)) {
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: 'Line 6 schedules not yet available'
		};
	}

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
