/**
 * TTC ETA Edge Function
 *
 * Fetches real-time arrival predictions for TTC stops:
 * - Surface vehicles (buses/streetcars): NextBus API
 * - Subway stations: TTC NTAS API (Next Train Arrival System)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// TTC NextBus API endpoint (UMO IQ public feed)
const TTC_NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

// TTC NTAS API for real-time subway arrivals
const TTC_NTAS_API = 'https://ntas.ttc.ca/api/ntas/get-next-train-time';

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
// Subway ETA (TTC NTAS API - Real-time Train Arrivals)
// ============================================================================

/**
 * TTC NTAS stop codes for subway stations
 * Format: stopCode1|stopCode2 (one per direction/platform)
 * 
 * Data sourced from TTC website subway station pages
 */
const SUBWAY_STOP_CODES: Record<string, string> = {
	// Line 1 - Yonge-University
	'finch': '14111|14944',
	'north york centre': '13790|13789',
	'sheppard-yonge': '13859|13860|13861|13862', // Interchange station
	'york mills': '13791|13792',
	'lawrence': '13794|13793',
	'eglinton': '13795|13796',
	'davisville': '13798|13797',
	'st clair': '13800|13799',
	'summerhill': '13802|13801',
	'rosedale': '13803|13804',
	'bloor-yonge': '13863|13864|13755|13756', // Interchange station
	'wellesley': '13806|13805',
	'college': '13807|13808',
	'tmu': '13809|13810', // Formerly Dundas
	'dundas': '13809|13810', // Alias for TMU
	'queen': '13811|13812',
	'king': '13814|13813',
	'union': '13816|13815',
	'st andrew': '13817|13818',
	'osgoode': '13819|13820',
	'st patrick': '13822|13821',
	'queens park': '13823|13824',
	"queen's park": '13823|13824',
	'museum': '13825|13826',
	'st george': '13857|13858|13855|13856', // Interchange station
	'spadina': '13853|13854|13852|13851', // Interchange station
	'dupont': '13827|13828',
	'st clair west': '13829|13830',
	'cedarvale': '13831|13832', // Formerly Eglinton West
	'eglinton west': '13831|13832', // Alias for Cedarvale
	'glencairn': '13834|13833',
	'lawrence west': '13835|13836',
	'yorkdale': '13838|13837',
	'wilson': '13839|13840',
	'sheppard west': '14110|14945', // Formerly Downsview
	'downsview': '14110|14945', // Alias for Sheppard West
	'downsview park': '15665|15664',
	'finch west': '15658|15659|16324|16323', // Interchange with Line 6
	'york university': '15667|15666',
	'pioneer village': '15657|15656',
	'highway 407': '15660|15661',
	'vaughan metropolitan centre': '15663|15662',
	
	// Line 2 - Bloor-Danforth
	'kipling': '13785|14948',
	'islington': '13783|13784',
	'royal york': '13781|13782',
	'old mill': '13779|13780',
	'jane': '13777|13778',
	'runnymede': '13775|13776',
	'high park': '13774|13773',
	'keele': '13771|13772',
	'dundas west': '13770|13769',
	'lansdowne': '13767|13768',
	'dufferin': '13766|13765',
	'ossington': '13763|13764',
	'christie': '13761|13762',
	'bathurst': '13760|13759',
	'bay': '13758|13757',
	'sherbourne': '13753|13754',
	'castle frank': '13752|13751',
	'broadview': '13750|13749',
	'chester': '13747|13748',
	'pape': '13746|13745',
	'donlands': '13744|13743',
	'greenwood': '13742|13741',
	'coxwell': '13739|13740',
	'woodbine': '13738|13737',
	'main street': '13736|13735',
	'victoria park': '13733|13734',
	'warden': '13732|13731',
	'kennedy': '14947|13865', // Interchange station
	
	// Line 4 - Sheppard
	'don mills': '14949|14109',
	'leslie': '13848|13847',
	'bessarion': '13846|13845',
	'bayview': '13844|13843',
	
	// Line 6 - Eglinton Crosstown (stations for future use)
	// Note: Line 6 opens in 2025, stop codes included for readiness
	'humber college': '16290|16289',
	'westmore': '16291|16292',
	'martin grove': '16293|16294',
	'albion': '16295|16296',
	'stevenson': '16298|16297',
	'mount olive': '16300|16299',
	'rowntree mills': '16302|16301',
	'pearldale': '16304|16303',
	'duncanwoods': '16306|16305',
	'milvan rumike': '16307|16308',
	'emery': '16309|16310',
	'signet arrow': '16312|16311',
	'norfinch oakdale': '16313|16314',
	'jane and finch': '16315|16316',
	'driftwood': '16317|16318',
	'tobermory': '16319|16320',
	'sentinel': '16321|16322'
};

/**
 * Clean and normalize station name for lookup
 */
function normalizeStationName(name: string): string {
	return name
		.toLowerCase()
		.trim()
		// Remove direction info
		.replace(/\s*-\s*(eastbound|westbound|northbound|southbound)\s+platform.*$/i, '')
		.replace(/\s+(eastbound|westbound|northbound|southbound)\s+platform$/i, '')
		.replace(/\s*-\s*subway(\s+platform)?$/i, '')
		// Remove "station" suffix
		.replace(/\s+station$/i, '')
		.trim();
}

/**
 * Get NTAS stop codes for a station
 */
function getStationStopCodes(stationName: string): string | null {
	const normalized = normalizeStationName(stationName);
	
	// Direct lookup
	if (SUBWAY_STOP_CODES[normalized]) {
		return SUBWAY_STOP_CODES[normalized];
	}
	
	// Fuzzy match - check if station name is contained in any key
	for (const [key, codes] of Object.entries(SUBWAY_STOP_CODES)) {
		if (normalized.includes(key) || key.includes(normalized)) {
			return codes;
		}
	}
	
	return null;
}

/**
 * NTAS API response structure
 */
interface NTASArrival {
	line: string;
	direction: string;
	nextTrains: string; // "0, 4, 11" format
	directionText: string;
	stopCode: string;
}

/**
 * Fetch real-time subway arrivals from TTC NTAS API
 */
async function fetchSubwayETA(
	stationName: string,
	stopId: string,
	filterRoute?: string
): Promise<ETAResponse> {
	const stopCodes = getStationStopCodes(stationName);
	
	if (!stopCodes) {
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: 'Station not found in NTAS database'
		};
	}

	try {
		// NTAS API expects stop codes in URL path
		const url = `${TTC_NTAS_API}/${encodeURIComponent(stopCodes)}`;
		
		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'TTC-Alerts-PWA/1.0'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				return {
					stopId,
					predictions: [],
					timestamp: new Date().toISOString(),
					error: 'No real-time data available'
				};
			}
			throw new Error(`NTAS API returned ${response.status}`);
		}

		const data: NTASArrival[] = await response.json();
		
		if (!data || data.length === 0) {
			return {
				stopId,
				stopTitle: stationName,
				predictions: [],
				timestamp: new Date().toISOString()
			};
		}

		// Convert NTAS response to our prediction format
		const predictions: Prediction[] = [];
		
		for (const arrival of data) {
			// Filter by route if specified (e.g., "Line 1", "Line 2")
			if (filterRoute) {
				const routeLine = `Line ${arrival.line}`;
				if (!routeLine.toLowerCase().includes(filterRoute.toLowerCase()) &&
				    !filterRoute.toLowerCase().includes(arrival.line)) {
					continue;
				}
			}
			
			// Parse arrival times: "0, 4, 11" -> [0, 4, 11]
			const arrivals = arrival.nextTrains
				.split(',')
				.map(t => parseInt(t.trim(), 10))
				.filter(n => !isNaN(n) && n >= 0);
			
			if (arrivals.length > 0) {
				// Determine line name
				const lineNames: Record<string, string> = {
					'1': 'Line 1 Yonge-University',
					'2': 'Line 2 Bloor-Danforth',
					'4': 'Line 4 Sheppard',
					'6': 'Line 6 Eglinton Crosstown'
				};
				
				predictions.push({
					route: `Line ${arrival.line}`,
					routeTitle: lineNames[arrival.line] || `Line ${arrival.line}`,
					direction: arrival.directionText,
					arrivals,
					isLive: true // NTAS provides real-time data!
				});
			}
		}

		// Sort by first arrival time
		predictions.sort((a, b) => (a.arrivals[0] ?? 999) - (b.arrivals[0] ?? 999));

		return {
			stopId,
			stopTitle: stationName,
			predictions,
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		console.error('Subway ETA fetch error:', error);
		return {
			stopId,
			predictions: [],
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : 'Failed to fetch subway arrivals'
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
