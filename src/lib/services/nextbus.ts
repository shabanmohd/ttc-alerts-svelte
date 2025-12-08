/**
 * Client-side NextBus API Service
 *
 * Fetches real-time TTC arrival predictions directly from the NextBus API
 * This bypasses the Edge Function to avoid Supabase invocation limits
 *
 * Features:
 * - In-memory cache with 30s TTL
 * - Automatic timeout handling
 * - TypeScript interfaces matching Edge Function format
 */

// TTC NextBus API endpoint (UMO IQ public feed)
const TTC_NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

// Cache configuration
const CACHE_TTL_MS = 30 * 1000; // 30 seconds
const REQUEST_TIMEOUT_MS = 10 * 1000; // 10 seconds

// ============================================================================
// Types
// ============================================================================

export interface ETAPrediction {
	route: string;
	routeTitle: string;
	direction: string;
	arrivals: number[]; // Minutes until arrival
	isLive: boolean; // true if real-time GPS data
	scheduledTime?: string; // AM/PM format for scheduled predictions
}

export interface ETAResponse {
	stopId: string;
	stopTitle?: string;
	predictions: ETAPrediction[];
	timestamp: string;
	error?: string;
	fromCache?: boolean;
}

// Cache entry type
interface CacheEntry {
	data: ETAResponse;
	expiresAt: number;
}

// ============================================================================
// In-memory cache
// ============================================================================

const cache = new Map<string, CacheEntry>();

/**
 * Get cached response if still valid
 */
function getCached(stopId: string): ETAResponse | null {
	const entry = cache.get(stopId);
	if (!entry) return null;

	if (Date.now() > entry.expiresAt) {
		cache.delete(stopId);
		return null;
	}

	return { ...entry.data, fromCache: true };
}

/**
 * Store response in cache
 */
function setCache(stopId: string, data: ETAResponse): void {
	cache.set(stopId, {
		data,
		expiresAt: Date.now() + CACHE_TTL_MS
	});
}

/**
 * Clear all cached entries
 */
export function clearCache(): void {
	cache.clear();
}

/**
 * Clear cache for a specific stop
 */
export function clearStopCache(stopId: string): void {
	cache.delete(stopId);
}

// ============================================================================
// API Parsing
// ============================================================================

/**
 * Parse the NextBus API response into our prediction format
 */
function parsePredictions(data: any): { predictions: ETAPrediction[]; stopTitle?: string } {
	const predictions: ETAPrediction[] = [];
	let stopTitle: string | undefined;

	// Handle no predictions case
	if (!data.predictions) {
		return { predictions, stopTitle };
	}

	// Normalize to array (API returns object if single route, array if multiple)
	const predsArray = Array.isArray(data.predictions) ? data.predictions : [data.predictions];

	for (const pred of predsArray) {
		// Skip if no direction info (means no predictions for this route)
		if (!pred.direction) continue;

		// Capture stop title from first prediction
		if (!stopTitle && pred.stopTitle) {
			stopTitle = pred.stopTitle;
		}

		// Normalize directions to array
		const directions = Array.isArray(pred.direction) ? pred.direction : [pred.direction];

		for (const dir of directions) {
			// Skip if no predictions for this direction
			if (!dir.prediction) continue;

			// Normalize predictions to array
			const preds = Array.isArray(dir.prediction) ? dir.prediction : [dir.prediction];

			// Check if any prediction has epochTime (indicates live GPS data)
			const hasEpochTime = preds.some((p: any) => p.epochTime != null);

			// Extract arrival times (limit to 3)
			const arrivals = preds
				.slice(0, 3)
				.map((p: any) => parseInt(p.minutes, 10))
				.filter((m: number) => !isNaN(m));

			// For scheduled predictions, format the first arrival time in AM/PM
			let scheduledTime: string | undefined;
			if (!hasEpochTime && preds[0]?.epochTime == null && arrivals.length > 0) {
				const now = new Date();
				const arrivalDate = new Date(now.getTime() + arrivals[0] * 60 * 1000);
				scheduledTime = arrivalDate.toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				});
			}

			if (arrivals.length > 0) {
				predictions.push({
					route: pred.routeTag || '',
					routeTitle: pred.routeTitle || pred.routeTag || '',
					direction: dir.title || '',
					arrivals,
					isLive: hasEpochTime,
					scheduledTime
				});
			}
		}
	}

	// Sort predictions by route number/name
	predictions.sort((a, b) => {
		const aNum = parseInt(a.route, 10);
		const bNum = parseInt(b.route, 10);
		if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
		return a.route.localeCompare(b.route);
	});

	return { predictions, stopTitle };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetch ETA predictions for a stop (client-side, with caching)
 *
 * @param stopId - TTC stop ID
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns ETAResponse with predictions or error
 */
export async function fetchStopETA(stopId: string, forceRefresh = false): Promise<ETAResponse> {
	// Check cache first (unless forcing refresh)
	if (!forceRefresh) {
		const cached = getCached(stopId);
		if (cached) return cached;
	}

	// Create abort controller for timeout
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const url = `${TTC_NEXTBUS_API}?command=predictions&a=ttc&stopId=${encodeURIComponent(stopId)}`;

		const response = await fetch(url, {
			headers: {
				Accept: 'application/json'
			},
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`NextBus API returned ${response.status}`);
		}

		const data = await response.json();

		// Check for API error
		if (data.Error) {
			const errorMsg =
				typeof data.Error === 'string' ? data.Error : data.Error.content || 'Unknown error';

			const errorResponse: ETAResponse = {
				stopId,
				predictions: [],
				timestamp: new Date().toISOString(),
				error: errorMsg
			};

			// Don't cache errors
			return errorResponse;
		}

		// Parse predictions
		const { predictions, stopTitle } = parsePredictions(data);

		const result: ETAResponse = {
			stopId,
			stopTitle,
			predictions,
			timestamp: new Date().toISOString()
		};

		// Cache successful response
		setCache(stopId, result);

		return result;
	} catch (error) {
		clearTimeout(timeoutId);

		// Handle abort (timeout)
		if (error instanceof Error && error.name === 'AbortError') {
			return {
				stopId,
				predictions: [],
				timestamp: new Date().toISOString(),
				error: 'Request timed out'
			};
		}

		// Handle other errors
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : 'Failed to fetch predictions'
		};
	}
}

/**
 * Fetch ETA for multiple stops in parallel
 *
 * @param stopIds - Array of TTC stop IDs
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns Map of stopId to ETAResponse
 */
export async function fetchMultipleStopETAs(
	stopIds: string[],
	forceRefresh = false
): Promise<Map<string, ETAResponse>> {
	const results = new Map<string, ETAResponse>();

	// Fetch all in parallel
	const promises = stopIds.map(async (stopId) => {
		const eta = await fetchStopETA(stopId, forceRefresh);
		results.set(stopId, eta);
	});

	await Promise.all(promises);

	return results;
}

/**
 * Filter predictions for a specific route
 *
 * @param response - ETAResponse from fetchStopETA
 * @param routeId - Route ID to filter for
 * @returns Filtered predictions for that route only
 */
export function filterPredictionsForRoute(
	response: ETAResponse,
	routeId: string
): ETAPrediction[] {
	return response.predictions.filter((p) => p.route === routeId);
}
