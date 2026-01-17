/**
 * TTC Stop Sequence Scraper
 *
 * Fetches sequential stop data for bus and streetcar routes from the TTC website.
 * Uses Playwright to render the JavaScript-powered schedule pages and extract stop codes.
 *
 * Usage:
 *   npx tsx scripts/scrape-ttc-stop-sequences.ts [--routes=1,2,3] [--output=path/to/output.json]
 *
 * Options:
 *   --routes    Comma-separated list of route numbers to scrape (default: all bus/streetcar routes)
 *   --output    Output file path (default: static/data/ttc-route-stop-orders.json)
 *   --dry-run   Don't write output, just print results
 *   --delay     Delay between requests in ms (default: 1000)
 */

import { chromium, type Browser, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// TTC route page URL pattern: /routes-and-schedules/{routeNumber}/{directionIndex}
// directionIndex: 0 = first direction, 1 = second direction (varies by route)
const TTC_BASE_URL = 'https://www.ttc.ca/routes-and-schedules';

// Parse command line arguments
function parseArgs(): {
	routes?: string[];
	output: string;
	dryRun: boolean;
	delay: number;
} {
	const args = process.argv.slice(2);
	const config = {
		routes: undefined as string[] | undefined,
		output: 'static/data/ttc-route-stop-orders.json',
		dryRun: false,
		delay: 1000
	};

	for (const arg of args) {
		if (arg.startsWith('--routes=')) {
			config.routes = arg.replace('--routes=', '').split(',');
		} else if (arg.startsWith('--output=')) {
			config.output = arg.replace('--output=', '');
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

	// Sort numerically (handle string route IDs like "301")
	return routes.sort((a, b) => {
		const numA = parseInt(a, 10);
		const numB = parseInt(b, 10);
		if (isNaN(numA) && isNaN(numB)) return a.localeCompare(b);
		if (isNaN(numA)) return 1;
		if (isNaN(numB)) return -1;
		return numA - numB;
	});
}

// Extract stop codes from a loaded TTC route page
async function extractStopCodes(page: Page): Promise<string[]> {
	// Wait for stop list to render
	try {
		await page.waitForSelector('.StopButton_Code__aGirT', { timeout: 10000 });
	} catch {
		console.warn('    No stops found on page (timeout)');
		return [];
	}

	const stopCodes = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('.StopButton_Code__aGirT')).map((el) =>
			(el as HTMLElement).innerText.trim()
		);
	});

	return stopCodes;
}

// Extract direction label from the page
async function extractDirectionLabel(page: Page): Promise<string> {
	const label = await page.evaluate(() => {
		// Try to find the direction from the RouteDetails heading
		// Look for elements with direction info like "East - 116 Morningside towards Finch"
		const routeHeading =
			(document.querySelector('[class*="RouteDetails"] h1') as HTMLElement | null)?.innerText ||
			(document.querySelector('h1') as HTMLElement | null)?.innerText ||
			'';

		// Try to extract "East" or "West" from the beginning of the heading
		const dirPrefixMatch = routeHeading.match(/^(East|West|North|South)\s*[-–]/i);
		if (dirPrefixMatch) {
			const dir = dirPrefixMatch[1].toLowerCase();
			if (dir === 'east') return 'Eastbound';
			if (dir === 'west') return 'Westbound';
			if (dir === 'north') return 'Northbound';
			if (dir === 'south') return 'Southbound';
		}

		// Try to find direction from "towards X" pattern
		const towardsMatch = routeHeading.match(/towards\s+(.+)/i);
		if (towardsMatch) {
			const dest = towardsMatch[1].trim();
			return dest;
		}

		// Try to find a LocationToggle or direction indicator
		const toggleText =
			document.querySelector('[class*="LocationToggle"]')?.getAttribute('aria-label') || '';
		if (toggleText.toLowerCase().includes('east')) return 'Eastbound';
		if (toggleText.toLowerCase().includes('west')) return 'Westbound';
		if (toggleText.toLowerCase().includes('north')) return 'Northbound';
		if (toggleText.toLowerCase().includes('south')) return 'Southbound';

		// Fallback: check URL for direction index
		const url = window.location.href;
		const dirMatch = url.match(/\/(\d+)$/);
		if (dirMatch) {
			return dirMatch[1] === '0' ? 'Direction_0' : 'Direction_1';
		}

		return 'Unknown';
	});

	return label;
}

// Normalize direction to standard Eastbound/Westbound/Northbound/Southbound
function normalizeDirection(rawDirection: string, routeNumber: string): string {
	// If already a standard direction, return it
	if (['Eastbound', 'Westbound', 'Northbound', 'Southbound'].includes(rawDirection)) {
		return rawDirection;
	}

	const lower = rawDirection.toLowerCase();

	// Check for cardinal directions in the destination
	if (lower.includes('east')) return 'Eastbound';
	if (lower.includes('west')) return 'Westbound';
	if (lower.includes('north')) return 'Northbound';
	if (lower.includes('south')) return 'Southbound';

	// Known terminal mappings for common routes
	const terminalMappings: Record<string, Record<string, string>> = {
		'116': {
			'kennedy': 'Westbound',
			'finch': 'Eastbound'
		},
		'501': {
			'long branch': 'Westbound',
			'neville': 'Eastbound'
		},
		'504': {
			'dundas west': 'Westbound',
			'broadview': 'Eastbound'
		},
		'505': {
			'dundas': 'Westbound',
			'broadview': 'Eastbound'
		},
		'506': {
			'main': 'Eastbound',
			'high park': 'Westbound'
		},
		'509': {
			'union': 'Northbound',
			'exhibition': 'Southbound'
		},
		'510': {
			'union': 'Southbound',
			'spadina': 'Northbound'
		},
		'511': {
			'exhibition': 'Southbound',
			'bathurst': 'Northbound'
		},
		'512': {
			'st. clair': 'Westbound',
			'st clair': 'Westbound'
		}
	};

	const routeMappings = terminalMappings[routeNumber];
	if (routeMappings) {
		for (const [terminal, direction] of Object.entries(routeMappings)) {
			if (lower.includes(terminal)) {
				return direction;
			}
		}
	}

	// If direction has Direction_ prefix, it's a fallback - keep it for debugging
	if (rawDirection.startsWith('Direction_')) {
		return rawDirection;
	}

	// If we can't determine, return the raw direction with first letter capitalized
	return rawDirection.charAt(0).toUpperCase() + rawDirection.slice(1);
}

// Scrape stops for a single route
async function scrapeRoute(
	browser: Browser,
	routeNumber: string,
	delay: number
): Promise<Record<string, string[]>> {
	const result: Record<string, string[]> = {};
	const page = await browser.newPage();

	try {
		// Try direction index 0 first
		const url0 = `${TTC_BASE_URL}/${routeNumber}/0`;
		console.log(`  Loading ${url0}...`);
		await page.goto(url0, { waitUntil: 'domcontentloaded', timeout: 60000 });

		// Wait for React to hydrate and load stop data - try waiting for the stop list
		try {
			await page.waitForSelector('.StopButton_Code__aGirT', { timeout: 15000 });
		} catch {
			// If stop list doesn't appear, wait a bit longer anyway
			await page.waitForTimeout(5000);
		}

		const stopCodes0 = await extractStopCodes(page);
		const rawDirection0 = await extractDirectionLabel(page);
		const direction0 = normalizeDirection(rawDirection0, routeNumber);

		if (stopCodes0.length > 0) {
			console.log(`    ${direction0}: ${stopCodes0.length} stops`);
			result[direction0] = stopCodes0;
		}

		// Wait between requests
		await page.waitForTimeout(delay);

		// Try switching direction using the button
		const switchButton = await page.$('button:has-text("Switch Direction")');
		if (switchButton) {
			await switchButton.click();
			// Wait for content to update
			try {
				await page.waitForTimeout(3000);
			} catch {
				// Continue even if waiting fails
			}

			const stopCodes1 = await extractStopCodes(page);
			const rawDirection1 = await extractDirectionLabel(page);
			const direction1 = normalizeDirection(rawDirection1, routeNumber);

			if (stopCodes1.length > 0 && direction1 !== direction0) {
				console.log(`    ${direction1}: ${stopCodes1.length} stops`);
				result[direction1] = stopCodes1;
			}
		} else {
			// Try loading direction 1 directly
			const url1 = `${TTC_BASE_URL}/${routeNumber}/1`;
			console.log(`  Loading ${url1}...`);
			await page.goto(url1, { waitUntil: 'domcontentloaded', timeout: 60000 });
			try {
				await page.waitForSelector('.StopButton_Code__aGirT', { timeout: 15000 });
			} catch {
				await page.waitForTimeout(5000);
			}

			const stopCodes1 = await extractStopCodes(page);
			const rawDirection1 = await extractDirectionLabel(page);
			const direction1 = normalizeDirection(rawDirection1, routeNumber);

			if (stopCodes1.length > 0 && direction1 !== direction0) {
				console.log(`    ${direction1}: ${stopCodes1.length} stops`);
				result[direction1] = stopCodes1;
			}
		}
	} catch (error) {
		console.error(`  Error scraping route ${routeNumber}:`, error);
	} finally {
		await page.close();
	}

	return result;
}

// Main function
async function main() {
	const config = parseArgs();
	console.log('TTC Stop Sequence Scraper');
	console.log('=========================');
	console.log(`Output: ${config.output}`);
	console.log(`Dry run: ${config.dryRun}`);
	console.log(`Delay: ${config.delay}ms`);
	console.log();

	// Get routes to scrape
	const allRoutes = await getAllRouteNumbers();
	const routes = config.routes || allRoutes;
	console.log(`Routes to scrape: ${routes.length}`);
	console.log();

	// Load existing data if present
	let existingData: Record<string, Record<string, string[]>> = {};
	if (fs.existsSync(config.output)) {
		try {
			existingData = JSON.parse(fs.readFileSync(config.output, 'utf-8'));
			console.log(`Loaded existing data with ${Object.keys(existingData).length} routes`);
		} catch {
			console.warn('Could not load existing data, starting fresh');
		}
	}

	// Launch browser
	const browser = await chromium.launch({ headless: true });

	try {
		const result: Record<string, Record<string, string[]>> = { ...existingData };

		for (let i = 0; i < routes.length; i++) {
			const routeNumber = routes[i];
			console.log(`[${i + 1}/${routes.length}] Route ${routeNumber}`);

			const routeData = await scrapeRoute(browser, routeNumber, config.delay);

			if (Object.keys(routeData).length > 0) {
				result[routeNumber] = routeData;
			}

			// Add delay between routes
			if (i < routes.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, config.delay));
			}
		}

		// Sort routes numerically in output
		const sortedResult: Record<string, Record<string, string[]>> = {};
		const sortedKeys = Object.keys(result).sort((a, b) => {
			const numA = parseInt(a, 10);
			const numB = parseInt(b, 10);
			if (isNaN(numA) && isNaN(numB)) return a.localeCompare(b);
			if (isNaN(numA)) return 1;
			if (isNaN(numB)) return -1;
			return numA - numB;
		});

		for (const key of sortedKeys) {
			sortedResult[key] = result[key];
		}

		// Output results
		if (config.dryRun) {
			console.log();
			console.log('=== DRY RUN RESULTS ===');
			console.log(JSON.stringify(sortedResult, null, 2));
		} else {
			// Write to output file
			const outputPath = path.resolve(process.cwd(), config.output);
			fs.writeFileSync(outputPath, JSON.stringify(sortedResult, null, 2));
			console.log();
			console.log(`Wrote ${Object.keys(sortedResult).length} routes to ${outputPath}`);

			// Also update src/lib/data copy if output is static/data
			// Note: Data is now only in static/data (lazy-loaded at runtime)
			// No longer need to copy to src/lib/data
			if (false && config.output.includes('static/data/ttc-route-stop-orders.json')) {
				const srcPath = path.resolve(process.cwd(), 'src/lib/data/ttc-route-stop-orders.json');
				fs.writeFileSync(srcPath, JSON.stringify(sortedResult, null, 2));
				console.log(`Wrote copy to ${srcPath}`);
			}
		}

		console.log();
		console.log('Done!');
	} finally {
		await browser.close();
	}
}

main().catch(console.error);
