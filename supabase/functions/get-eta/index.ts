/**
 * TTC ETA Edge Function
 *
 * Fetches real-time arrival predictions for TTC stops:
 * - Surface vehicles (buses/streetcars): NextBus API
 * - Subway stations: MyTTC API
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// TTC NextBus API endpoint (UMO IQ public feed)
const TTC_NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

// MyTTC API for subway schedules (HTTP only)
const MYTTC_API = 'http://myttc.ca';

interface Prediction {
	route: string;
	routeTitle: string;
	direction: string;
	arrivals: number[]; // Minutes until arrival
	isLive: boolean; // true if real-time GPS data, false if scheduled
	scheduledTime?: string; // AM/PM format for scheduled predictions
}

interface ETAResponse {
	stopId: string;
	stopTitle?: string;
	predictions: Prediction[];
	timestamp: string;
	error?: string;
	fromCache?: boolean;
}

/**
 * Parse the NextBus API response into our prediction format
 */
function parsePredictions(data: any): { predictions: Prediction[]; stopTitle?: string } {
	const predictions: Prediction[] = [];
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
				// Calculate the scheduled arrival time
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
// Subway ETA (MyTTC API)
// ============================================================================

/**
 * Station name overrides for MyTTC API
 * Maps our station names to MyTTC URI format
 */
const STATION_URI_OVERRIDES: Record<string, string> = {
	// Stations with special naming in MyTTC
	'st andrew': 'st_andrew_station',
	'st george': 'st_george_station',
	'st clair': 'st_clair_station',
	'st clair west': 'st_clair_west_station',
	'st patrick': 'st_patrick_station',
	// TMU was renamed from Dundas
	'tmu': 'dundas_station',
	'tmu station': 'dundas_station',
	// Queen's Park
	"queen's park": 'queens_park_station',
	'queens park': 'queens_park_station',
	// Vaughan stations
	'vaughan metropolitan centre': 'vaughan_metropolitan_centre_station',
	'highway 407': 'highway_407_station',
	// Scarborough RT replacements (now buses, but keep for reference)
	'scarborough centre': 'scarborough_centre_station'
};

/**
 * Line 6 stations - not available in MyTTC yet
 */
const LINE_6_STATIONS = new Set([
	'finch west',
	'humber college',
	'highway 27',
	'woodbine racetrack'
]);

/**
 * Subway route patterns for matching MyTTC routes
 */
const SUBWAY_ROUTE_MAP: Record<string, { pattern: RegExp; displayName: string }> = {
	'Line 1': { pattern: /yonge-university.*subway/i, displayName: 'Line 1 Yonge-University' },
	'Line 2': { pattern: /bloor-danforth.*subway/i, displayName: 'Line 2 Bloor-Danforth' },
	'Line 4': { pattern: /sheppard.*subway/i, displayName: 'Line 4 Sheppard' }
};

/**
 * Convert station name to MyTTC URI format
 */
function stationNameToMyTTCUri(stationName: string): string | null {
	// Clean up the station name
	let cleaned = stationName.toLowerCase().trim();
	
	// Remove platform direction info
	cleaned = cleaned.replace(/\s*-\s*(eastbound|westbound|northbound|southbound)\s+platform.*$/i, '');
	cleaned = cleaned.replace(/\s+(eastbound|westbound|northbound|southbound)\s+platform$/i, '');
	cleaned = cleaned.replace(/\s*-\s*subway(\s+platform)?$/i, '');
	
	// Remove "station" suffix if present
	cleaned = cleaned.replace(/\s+station$/i, '');
	cleaned = cleaned.trim();
	
	// Check for override
	const override = STATION_URI_OVERRIDES[cleaned];
	if (override) {
		return override;
	}
	
	// Check for Line 6 (not available)
	for (const station of LINE_6_STATIONS) {
		if (cleaned.includes(station) || station.includes(cleaned)) {
			return null;
		}
	}
	
	// Convert to URI format: lowercase, replace spaces/hyphens with underscores
	const uri = cleaned
		.replace(/['']/g, '')
		.replace(/[\s-]+/g, '_')
		.replace(/[^a-z0-9_]/g, '');
	
	return `${uri}_station`;
}

/**
 * Check if a station is on Line 6
 */
function isLine6Station(stationName: string): boolean {
	const cleaned = stationName.toLowerCase();
	for (const station of LINE_6_STATIONS) {
		if (cleaned.includes(station)) {
			return true;
		}
	}
	return false;
}

/**
 * Extract direction from MyTTC shape string
 */
function extractSubwayDirection(shape: string): string {
	const match = shape.match(/To\s+(.+?)(?:\s+Station)?$/i);
	if (match) {
		let direction = match[1].trim().replace(/\s+Station$/i, '');
		return `Towards ${direction}`;
	}
	return shape;
}

/**
 * Calculate minutes until departure from Unix timestamp
 */
function calculateMinutesUntil(timestamp: number): number {
	const now = Math.floor(Date.now() / 1000);
	return Math.max(0, Math.floor((timestamp - now) / 60));
}

interface MyTTCStopTime {
	service_id: number;
	departure_time: string;
	departure_timestamp: number;
	shape: string;
}

interface MyTTCRoute {
	route_group_id: string;
	uri: string;
	name: string;
	stop_times: MyTTCStopTime[];
}

interface MyTTCStop {
	agency: string;
	uri: string;
	name: string;
	routes: MyTTCRoute[];
}

interface MyTTCResponse {
	name: string;
	uri: string;
	stops: MyTTCStop[];
	time: number;
}

/**
 * Parse MyTTC subway response into predictions
 */
function parseSubwayPredictions(
	data: MyTTCResponse,
	filterRoute?: string
): { predictions: Prediction[]; stopTitle: string } {
	const predictions: Prediction[] = [];
	const stopTitle = data.name;

	for (const stop of data.stops) {
		// Only process subway platform stops
		if (!stop.uri.includes('platform') && !stop.uri.includes('subway')) {
			continue;
		}

		for (const route of stop.routes) {
			// Skip if filtering by route and this doesn't match
			if (filterRoute) {
				const routeConfig = SUBWAY_ROUTE_MAP[filterRoute];
				if (routeConfig && !routeConfig.pattern.test(route.uri)) {
					continue;
				}
			}

			// Determine which line this is
			let routeName = route.name;
			let routeId = '';
			for (const [lineId, config] of Object.entries(SUBWAY_ROUTE_MAP)) {
				if (config.pattern.test(route.uri)) {
					routeName = config.displayName;
					routeId = lineId;
					break;
				}
			}

			// Group stop times by direction
			const directionGroups = new Map<string, MyTTCStopTime[]>();
			for (const stopTime of route.stop_times) {
				const direction = extractSubwayDirection(stopTime.shape);
				const existing = directionGroups.get(direction) || [];
				existing.push(stopTime);
				directionGroups.set(direction, existing);
			}

			// Create predictions for each direction
			for (const [direction, stopTimes] of directionGroups) {
				const arrivals = stopTimes
					.slice(0, 3)
					.map((st) => calculateMinutesUntil(st.departure_timestamp))
					.filter((mins) => mins >= 0 && mins < 120);

				if (arrivals.length > 0) {
					const scheduledTime = stopTimes[0].departure_time
						.replace('a', ' AM')
						.replace('p', ' PM');

					predictions.push({
						route: routeId || route.uri,
						routeTitle: routeName,
						direction,
						arrivals,
						isLive: false, // Subway times are scheduled, not GPS
						scheduledTime
					});
				}
			}
		}
	}

	// Sort by first arrival time
	predictions.sort((a, b) => (a.arrivals[0] ?? 999) - (b.arrivals[0] ?? 999));

	return { predictions, stopTitle };
}

/**
 * Fetch subway ETA from MyTTC API
 */
async function fetchSubwayETA(
	stationName: string,
	stopId: string,
	filterRoute?: string
): Promise<ETAResponse> {
	// Check Line 6
	if (isLine6Station(stationName)) {
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: 'Line 6 schedules not yet available'
		};
	}

	const stationUri = stationNameToMyTTCUri(stationName);
	if (!stationUri) {
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: 'Station not supported'
		};
	}

	try {
		const url = `${MYTTC_API}/${stationUri}.json`;
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'TTC-Alerts-PWA/1.0'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				return {
					stopId,
					predictions: [],
					timestamp: new Date().toISOString(),
					error: 'Station not found in schedule database'
				};
			}
			throw new Error(`MyTTC API returned ${response.status}`);
		}

		const data: MyTTCResponse = await response.json();
		const { predictions, stopTitle } = parseSubwayPredictions(data, filterRoute);

		return {
			stopId,
			stopTitle,
			predictions,
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		console.error('Subway ETA fetch error:', error);
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : 'Failed to fetch subway times'
		};
	}
}

serve(async (req: Request) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders });
	}

	// Only allow POST requests
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		const body = await req.json();
		const { stopId, type, stationName, filterRoute } = body;

		if (!stopId) {
			return new Response(JSON.stringify({ error: 'stopId is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Handle subway stations
		if (type === 'subway' && stationName) {
			const result = await fetchSubwayETA(stationName, stopId, filterRoute);
			return new Response(JSON.stringify(result), {
				status: 200,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=30'
				}
			});
		}

		// Fetch predictions from TTC NextBus API (surface vehicles)
		const url = `${TTC_NEXTBUS_API}?command=predictions&a=ttc&stopId=${encodeURIComponent(stopId)}`;

		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'TTC-Alerts-PWA/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`NextBus API returned ${response.status}`);
		}

		const data = await response.json();

		// Check for API error
		if (data.Error) {
			const errorMsg = typeof data.Error === 'string' ? data.Error : data.Error.content || 'Unknown error';
			return new Response(
				JSON.stringify({
					stopId,
					predictions: [],
					timestamp: new Date().toISOString(),
					error: errorMsg
				} as ETAResponse),
				{
					status: 200, // Return 200 with error in body for graceful client handling
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json',
						'Cache-Control': 'public, max-age=30'
					}
				}
			);
		}

		// Parse predictions
		const { predictions, stopTitle } = parsePredictions(data);

		const result: ETAResponse = {
			stopId,
			stopTitle,
			predictions,
			timestamp: new Date().toISOString()
		};

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=30' // Cache for 30 seconds
			}
		});
	} catch (error) {
		console.error('ETA fetch error:', error);

		return new Response(
			JSON.stringify({
				error: 'Failed to fetch predictions',
				details: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			}
		);
	}
});
