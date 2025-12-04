/**
 * TTC ETA Edge Function
 *
 * Fetches real-time arrival predictions from the TTC NextBus API
 * Returns next arrivals for all routes serving a given stop
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// TTC NextBus API endpoint (UMO IQ public feed)
const TTC_NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

interface Prediction {
	route: string;
	routeTitle: string;
	direction: string;
	arrivals: number[]; // Minutes until arrival
}

interface ETAResponse {
	stopId: string;
	stopTitle?: string;
	predictions: Prediction[];
	timestamp: string;
	error?: string;
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

			// Extract arrival times (limit to 3)
			const arrivals = preds
				.slice(0, 3)
				.map((p: any) => parseInt(p.minutes, 10))
				.filter((m: number) => !isNaN(m));

			if (arrivals.length > 0) {
				predictions.push({
					route: pred.routeTag || '',
					routeTitle: pred.routeTitle || pred.routeTag || '',
					direction: dir.title || '',
					arrivals
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
		const { stopId } = body;

		if (!stopId) {
			return new Response(JSON.stringify({ error: 'stopId is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Fetch predictions from TTC NextBus API
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
