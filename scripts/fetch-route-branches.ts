/**
 * TTC Route Branches Fetcher
 *
 * Fetches route configuration from NextBus API to extract branch and direction data.
 * This provides proper branch identifiers (102A, 102B, etc.) and their stop sequences.
 *
 * Usage:
 *   npx tsx scripts/fetch-route-branches.ts [--routes=1,2,3] [--output=path/to/output.json]
 *
 * Output structure:
 *   {
 *     "102": {
 *       "North": {
 *         "branches": {
 *           "102D": { "title": "towards Major Mackenzie", "stops": ["25010", "7405", ...] },
 *           "102C": { "title": "towards Steeles via Dynamic Dr", "stops": ["25010", ...] }
 *         }
 *       },
 *       "South": {
 *         "branches": {
 *           "102": { "title": "towards Warden Station", "stops": ["15193", ...] },
 *           "102C": { "title": "towards Warden Station via Dynamic Dr", "stops": ["24493", ...] }
 *         }
 *       }
 *     }
 *   }
 */

import * as fs from 'fs';
import * as path from 'path';

const NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

// Parse command line arguments
function parseArgs(): {
	routes?: string[];
	output: string;
	labelsOutput: string;
	dryRun: boolean;
	delay: number;
} {
	const args = process.argv.slice(2);
	const config = {
		routes: undefined as string[] | undefined,
		output: 'static/data/ttc-route-stop-orders.json',
		labelsOutput: 'static/data/ttc-direction-labels.json',
		dryRun: false,
		delay: 300 // 300ms between requests to be nice to the API
	};

	for (const arg of args) {
		if (arg.startsWith('--routes=')) {
			config.routes = arg.replace('--routes=', '').split(',');
		} else if (arg.startsWith('--output=')) {
			config.output = arg.replace('--output=', '');
		} else if (arg.startsWith('--labels-output=')) {
			config.labelsOutput = arg.replace('--labels-output=', '');
		} else if (arg === '--dry-run') {
			config.dryRun = true;
		} else if (arg.startsWith('--delay=')) {
			config.delay = parseInt(arg.replace('--delay=', ''), 10);
		}
	}

	return config;
}

// Get all bus and streetcar route numbers from GTFS routes.txt
async function getAllRouteNumbers(): Promise<string[]> {
	const routesPath = path.join(process.cwd(), 'scripts/gtfs/routes.txt');
	const content = fs.readFileSync(routesPath, 'utf-8');
	const lines = content.split('\n');
	const header = lines[0].split(',');
	const routeIdIdx = header.indexOf('route_id');
	const routeTypeIdx = header.indexOf('route_type');

	const routes: string[] = [];
	for (let i = 1; i < lines.length; i++) {
		const cols = lines[i].split(',');
		if (!cols[routeIdIdx]) continue;

		const routeType = cols[routeTypeIdx];
		// route_type: 0 = streetcar/tram, 3 = bus
		// Skip subway (1) and other types
		if (routeType === '0' || routeType === '3') {
			routes.push(cols[routeIdIdx]);
		}
	}

	// Sort numerically
	return routes.sort((a, b) => {
		const numA = parseInt(a, 10);
		const numB = parseInt(b, 10);
		if (isNaN(numA) && isNaN(numB)) return a.localeCompare(b);
		if (isNaN(numA)) return 1;
		if (isNaN(numB)) return -1;
		return numA - numB;
	});
}

interface NextBusDirection {
	tag: string;
	title: string;
	name: string; // "North", "South", "East", "West"
	branch: string; // "102", "102C", "102D"
	useForUI: string;
	stop: Array<{ tag: string }>;
}

interface NextBusRouteConfig {
	route: {
		tag: string;
		title: string;
		direction: NextBusDirection | NextBusDirection[];
		stop: Array<{
			tag: string;
			stopId: string;
			title: string;
			lat: string;
			lon: string;
		}>;
	};
}

interface BranchInfo {
	title: string; // "towards Major Mackenzie"
	stops: string[];
}

interface DirectionInfo {
	branches: Record<string, BranchInfo>;
}

interface RouteData {
	[direction: string]: DirectionInfo; // "North", "South", "East", "West"
}

/**
 * Extract destination from NextBus title
 * e.g., "North - 102d Markham Rd towards Major Mackenzie" -> "towards Major Mackenzie"
 */
function extractDestination(title: string): string {
	const match = title.match(/towards\s+(.+)$/i);
	if (match) {
		return `Towards ${match[1]}`;
	}
	// Fallback: try to extract after the dash
	const dashMatch = title.match(/-\s*\d+\w?\s+[^-]+\s+(.+)$/);
	if (dashMatch) {
		return dashMatch[1];
	}
	return title;
}

/**
 * Normalize direction name to standard format
 */
function normalizeDirection(name: string): string {
	const lower = name.toLowerCase().trim();
	if (lower === 'north') return 'Northbound';
	if (lower === 'south') return 'Southbound';
	if (lower === 'east') return 'Eastbound';
	if (lower === 'west') return 'Westbound';
	return name;
}

/**
 * Fetch route configuration from NextBus API
 */
async function fetchRouteConfig(routeNumber: string): Promise<NextBusRouteConfig | null> {
	const url = `${NEXTBUS_API}?command=routeConfig&a=ttc&r=${routeNumber}`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.warn(`  ⚠️ HTTP ${response.status} for route ${routeNumber}`);
			return null;
		}
		const data = await response.json();
		if (!data.route) {
			console.warn(`  ⚠️ No route data for ${routeNumber}`);
			return null;
		}
		return data as NextBusRouteConfig;
	} catch (error) {
		console.error(`  ❌ Error fetching route ${routeNumber}:`, error);
		return null;
	}
}

/**
 * Process a single route's data
 */
function processRouteData(config: NextBusRouteConfig): RouteData {
	const routeData: RouteData = {};

	// Handle both single direction and array of directions
	const directions = Array.isArray(config.route.direction)
		? config.route.direction
		: config.route.direction
			? [config.route.direction]
			: [];

	for (const dir of directions) {
		if (dir.useForUI !== 'true') continue;

		const normalizedDir = normalizeDirection(dir.name);
		const branchId = dir.branch || config.route.tag;
		const destination = extractDestination(dir.title);
		const stops = dir.stop.map((s) => s.tag);

		// Initialize direction if needed
		if (!routeData[normalizedDir]) {
			routeData[normalizedDir] = { branches: {} };
		}

		// Add branch
		routeData[normalizedDir].branches[branchId] = {
			title: destination,
			stops
		};
	}

	return routeData;
}

/**
 * Convert route data to legacy flat format for backward compatibility
 * This produces the format expected by stops-db.ts
 */
function toLegacyStopOrders(
	allRouteData: Record<string, RouteData>
): Record<string, Record<string, string[]>> {
	const legacy: Record<string, Record<string, string[]>> = {};

	for (const [routeNum, routeData] of Object.entries(allRouteData)) {
		legacy[routeNum] = {};

		for (const [direction, dirInfo] of Object.entries(routeData)) {
			const branchKeys = Object.keys(dirInfo.branches);

			if (branchKeys.length === 1) {
				// Single branch - use simple direction key
				legacy[routeNum][direction] = dirInfo.branches[branchKeys[0]].stops;
			} else {
				// Multiple branches - add suffix for each
				let suffix = 1;
				for (const branchId of branchKeys) {
					const key = suffix === 1 ? direction : `${direction}${suffix}`;
					legacy[routeNum][key] = dirInfo.branches[branchId].stops;
					suffix++;
				}
			}
		}
	}

	return legacy;
}

/**
 * Generate direction labels from route data
 */
function generateDirectionLabels(
	allRouteData: Record<string, RouteData>
): Record<string, Record<string, string>> {
	const labels: Record<string, Record<string, string>> = {};

	for (const [routeNum, routeData] of Object.entries(allRouteData)) {
		labels[routeNum] = {};

		for (const [direction, dirInfo] of Object.entries(routeData)) {
			const branchKeys = Object.keys(dirInfo.branches);

			if (branchKeys.length === 1) {
				// Single branch - use simple direction key
				labels[routeNum][direction] = dirInfo.branches[branchKeys[0]].title;
			} else {
				// Multiple branches - add suffix for each
				let suffix = 1;
				for (const branchId of branchKeys) {
					const key = suffix === 1 ? direction : `${direction}${suffix}`;
					labels[routeNum][key] = dirInfo.branches[branchId].title;
					suffix++;
				}
			}
		}
	}

	return labels;
}

/**
 * Generate new enhanced format with branch info
 */
function generateEnhancedFormat(
	allRouteData: Record<string, RouteData>
): Record<
	string,
	{
		directions: Record<
			string,
			{
				branches: Array<{
					id: string;
					title: string;
					stops: string[];
				}>;
			}
		>;
	}
> {
	const enhanced: Record<
		string,
		{
			directions: Record<
				string,
				{
					branches: Array<{
						id: string;
						title: string;
						stops: string[];
					}>;
				}
			>;
		}
	> = {};

	for (const [routeNum, routeData] of Object.entries(allRouteData)) {
		enhanced[routeNum] = { directions: {} };

		for (const [direction, dirInfo] of Object.entries(routeData)) {
			enhanced[routeNum].directions[direction] = {
				branches: Object.entries(dirInfo.branches).map(([id, info]) => ({
					id,
					title: info.title,
					stops: info.stops
				}))
			};
		}
	}

	return enhanced;
}

// Main function
async function main() {
	const config = parseArgs();
	console.log('TTC Route Branches Fetcher');
	console.log('==========================');
	console.log(`Output: ${config.output}`);
	console.log(`Labels: ${config.labelsOutput}`);
	console.log(`Dry run: ${config.dryRun}`);
	console.log(`Delay: ${config.delay}ms`);
	console.log();

	// Get routes to fetch
	const allRoutes = await getAllRouteNumbers();
	const routes = config.routes || allRoutes;
	console.log(`Routes to fetch: ${routes.length}`);
	console.log();

	const allRouteData: Record<string, RouteData> = {};
	let successCount = 0;
	let failCount = 0;

	for (let i = 0; i < routes.length; i++) {
		const routeNumber = routes[i];
		process.stdout.write(`[${i + 1}/${routes.length}] Route ${routeNumber}...`);

		const routeConfig = await fetchRouteConfig(routeNumber);

		if (routeConfig) {
			const routeData = processRouteData(routeConfig);
			if (Object.keys(routeData).length > 0) {
				allRouteData[routeNumber] = routeData;
				const branchCount = Object.values(routeData).reduce(
					(sum, d) => sum + Object.keys(d.branches).length,
					0
				);
				console.log(` ✅ ${Object.keys(routeData).length} directions, ${branchCount} branches`);
				successCount++;
			} else {
				console.log(' ⚠️ No directions found');
				failCount++;
			}
		} else {
			console.log(' ❌ Failed');
			failCount++;
		}

		// Delay between requests
		if (i < routes.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, config.delay));
		}
	}

	console.log();
	console.log(`Results: ${successCount} successful, ${failCount} failed`);
	console.log();

	// Sort routes numerically
	const sortedRouteData: Record<string, RouteData> = {};
	const sortedKeys = Object.keys(allRouteData).sort((a, b) => {
		const numA = parseInt(a, 10);
		const numB = parseInt(b, 10);
		if (isNaN(numA) && isNaN(numB)) return a.localeCompare(b);
		if (isNaN(numA)) return 1;
		if (isNaN(numB)) return -1;
		return numA - numB;
	});

	for (const key of sortedKeys) {
		sortedRouteData[key] = allRouteData[key];
	}

	if (config.dryRun) {
		console.log('=== DRY RUN - Enhanced Format Sample (Route 102) ===');
		const enhanced = generateEnhancedFormat(sortedRouteData);
		if (enhanced['102']) {
			console.log(JSON.stringify(enhanced['102'], null, 2));
		}
		console.log();
		console.log('=== DRY RUN - Legacy Format Sample (Route 102) ===');
		const legacy = toLegacyStopOrders(sortedRouteData);
		if (legacy['102']) {
			console.log(JSON.stringify(legacy['102'], null, 2));
		}
	} else {
		// Generate both formats
		const legacyStopOrders = toLegacyStopOrders(sortedRouteData);
		const directionLabels = generateDirectionLabels(sortedRouteData);
		const enhancedFormat = generateEnhancedFormat(sortedRouteData);

		// Write legacy stop orders (backward compatible)
		const stopOrdersPath = path.resolve(process.cwd(), config.output);
		fs.writeFileSync(stopOrdersPath, JSON.stringify(legacyStopOrders, null, 2));
		console.log(`✅ Wrote legacy stop orders to ${stopOrdersPath}`);

		// Copy to src/lib/data
		const srcStopOrdersPath = stopOrdersPath.replace('static/data', 'src/lib/data');
		if (srcStopOrdersPath !== stopOrdersPath) {
			fs.writeFileSync(srcStopOrdersPath, JSON.stringify(legacyStopOrders, null, 2));
			console.log(`✅ Wrote copy to ${srcStopOrdersPath}`);
		}

		// Write direction labels
		const labelsPath = path.resolve(process.cwd(), config.labelsOutput);
		fs.writeFileSync(labelsPath, JSON.stringify(directionLabels, null, 2));
		console.log(`✅ Wrote direction labels to ${labelsPath}`);

		// Copy direction labels to src/lib/data (still bundled, small file ~29KB)
		const srcLabelsPath = labelsPath.replace('static/data', 'src/lib/data');
		if (srcLabelsPath !== labelsPath) {
			fs.writeFileSync(srcLabelsPath, JSON.stringify(directionLabels, null, 2));
			console.log(`✅ Wrote copy to ${srcLabelsPath}`);
		}

		// Write enhanced format to static/data (lazy-loaded at runtime, ~500KB)
		const enhancedPath = path.resolve(process.cwd(), 'static/data/ttc-route-branches.json');
		fs.writeFileSync(enhancedPath, JSON.stringify(enhancedFormat, null, 2));
		console.log(`✅ Wrote enhanced branch data to ${enhancedPath}`);
		
		// Note: No longer copying to src/lib/data - data is lazy-loaded from static/data
	}

	console.log();
	console.log('Done!');
}

main().catch(console.error);
