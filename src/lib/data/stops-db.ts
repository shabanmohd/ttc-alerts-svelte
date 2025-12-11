/**
 * TTC Stops Database using IndexedDB via Dexie.js
 *
 * This module provides:
 * - Local storage of 9,000+ TTC stops
 * - Fast fuzzy search by name
 * - Geolocation-based nearby stop search
 * - Automatic data loading and versioning
 */

import Dexie, { type Table } from 'dexie';

// Stop data structure matching our transformed GTFS data
export interface TTCStop {
	id: string;
	name: string;
	lat: number;
	lon: number;
	routes: string[];
	type: 'subway' | 'streetcar' | 'bus';
	dir?: string; // Direction (e.g., "Eastbound", "Westbound") - only present if stop serves single direction
	seq?: Record<string, Record<string, number>>; // Stop sequence per route per direction (subway/LRT only)
	// e.g., { "Line 1": { "0": 17, "1": 16 } } means this stop is 17th on direction 0, 16th on direction 1
}

// Dexie database class
class TTCStopsDatabase extends Dexie {
	stops!: Table<TTCStop, string>;

	constructor() {
		super('TTCStopsDB');

		// Define schema with indexes
		this.version(1).stores({
			// Primary key is id, index on name for search
			stops: 'id, name, type'
		});
	}
}

// Singleton database instance
export const db = new TTCStopsDatabase();

// Track initialization state
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Data version - increment when stops data changes to force reload
const DATA_VERSION = '2025-01-15-subway-seq-v3';

/**
 * Initialize the stops database, loading data if needed
 */
export async function initStopsDB(): Promise<void> {
	if (isInitialized) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			// Check if we need to load/update data
			const storedVersion = localStorage.getItem('ttc-stops-version');
			const count = await db.stops.count();

			if (storedVersion !== DATA_VERSION || count === 0) {
				console.log('🔄 Loading TTC stops data...');
				await loadStopsData();
				localStorage.setItem('ttc-stops-version', DATA_VERSION);
			} else {
				console.log(`✅ TTC stops database ready (${count} stops)`);
			}

			isInitialized = true;
		} catch (error) {
			console.error('❌ Failed to initialize stops database:', error);
			throw error;
		}
	})();

	return initPromise;
}

/**
 * Load stops data from static JSON file
 */
async function loadStopsData(): Promise<void> {
	const response = await fetch('/data/ttc-stops.json');
	if (!response.ok) {
		throw new Error(`Failed to fetch stops data: ${response.status}`);
	}

	const stops: TTCStop[] = await response.json();
	console.log(`📦 Loaded ${stops.length} stops from JSON`);

	// Clear existing data and bulk insert
	await db.stops.clear();
	await db.stops.bulkAdd(stops);

	console.log(`✅ Stored ${stops.length} stops in IndexedDB`);
}

/**
 * Search stops by name or ID (fuzzy search)
 * Subway stations are boosted to appear higher in results
 */
export async function searchStops(query: string, limit = 20): Promise<TTCStop[]> {
	if (!query || query.length < 2) return [];

	const normalizedQuery = query.toLowerCase().trim();

	// Get all stops and filter (Dexie doesn't support LIKE queries)
	// For better performance with large datasets, we use a compound approach
	const stops = await db.stops.toArray();

	// Score and filter stops - with defensive checks for malformed data
	// Supports searching by name OR stop ID
	// Subway stations get a boost to appear higher in results
	const scored = stops
		.filter((stop) => stop && typeof stop.name === 'string' && stop.name.trim())
		.map((stop) => {
			const baseScore = getSearchScore(stop.name.toLowerCase().trim(), stop.id, normalizedQuery);
			// Boost subway stations by 25 points (they're often what users want)
			const typeBonus = stop.type === 'subway' ? 25 : 0;
			return {
				stop,
				score: baseScore + typeBonus
			};
		})
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);

	return scored.map((item) => item.stop);
}

/**
 * Calculate search relevance score
 * Supports searching by name OR stop ID
 */
function getSearchScore(name: string | undefined | null, stopId: string, query: string): number {
	// Safety check for undefined/null names
	if (!name || typeof name !== 'string') return 0;

	// Exact stop ID match (highest priority)
	if (stopId === query) return 150;
	
	// Stop ID starts with query (high priority for numeric searches)
	if (stopId.startsWith(query)) return 120;

	// Exact name match
	if (name === query) return 100;

	// Name starts with query
	if (name.startsWith(query)) return 80;

	// Word starts with query
	const words = name.split(/\s+/);
	for (const word of words) {
		if (word.startsWith(query)) return 60;
	}

	// Contains query
	if (name.includes(query)) return 40;

	// Check if all query words are in the name
	const queryWords = query.split(/\s+/);
	const allWordsMatch = queryWords.every((qw) => name.includes(qw));
	if (allWordsMatch) return 30;

	return 0;
}

/**
 * Find stops near a location
 */
export async function findNearbyStops(
	lat: number,
	lon: number,
	radiusKm = 0.5,
	limit = 10
): Promise<(TTCStop & { distance: number })[]> {
	const stops = await db.stops.toArray();

	// Calculate distance and filter
	const withDistance = stops
		.map((stop) => ({
			...stop,
			distance: haversineDistance(lat, lon, stop.lat, stop.lon)
		}))
		.filter((stop) => stop.distance <= radiusKm)
		.sort((a, b) => a.distance - b.distance)
		.slice(0, limit);

	return withDistance;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(deg: number): number {
	return deg * (Math.PI / 180);
}

/**
 * Get a stop by ID
 */
export async function getStop(id: string): Promise<TTCStop | undefined> {
	return db.stops.get(id);
}

/**
 * Get stops by type
 */
export async function getStopsByType(type: TTCStop['type']): Promise<TTCStop[]> {
	return db.stops.where('type').equals(type).toArray();
}

/**
 * Get stops served by a specific route
 * Routes are stored as-is: "Line 1", "Line 2", "501", "7", etc.
 */
export async function getStopsByRoute(routeNumber: string): Promise<TTCStop[]> {
	const stops = await db.stops.toArray();
	return stops.filter((stop) => stop.routes.includes(routeNumber));
}

/**
 * Get database statistics
 */
export async function getStopsStats(): Promise<{
	total: number;
	subway: number;
	streetcar: number;
	bus: number;
}> {
	const [total, subway, streetcar, bus] = await Promise.all([
		db.stops.count(),
		db.stops.where('type').equals('subway').count(),
		db.stops.where('type').equals('streetcar').count(),
		db.stops.where('type').equals('bus').count()
	]);

	return { total, subway, streetcar, bus };
}

// ============================================================================
// Route-specific functions for enhanced route page
// ============================================================================

/**
 * Standard direction labels used for grouping
 */
export const DIRECTION_LABELS = {
	EASTBOUND: 'Eastbound',
	WESTBOUND: 'Westbound',
	NORTHBOUND: 'Northbound',
	SOUTHBOUND: 'Southbound',
	// Line 1 terminals
	TOWARDS_VMC: 'Towards VMC',  // Line 1: Finch → Union → VMC
	TOWARDS_FINCH: 'Towards Finch',  // Line 1: VMC → Union → Finch
	// Line 2 terminals
	TOWARDS_KENNEDY: 'Towards Kennedy',  // Line 2: Kipling → Kennedy
	TOWARDS_KIPLING: 'Towards Kipling',  // Line 2: Kennedy → Kipling
	// Line 4 terminals
	TOWARDS_DON_MILLS: 'Towards Don Mills',  // Line 4: Sheppard-Yonge → Don Mills
	TOWARDS_SHEPPARD_YONGE: 'Towards Sheppard-Yonge',  // Line 4: Don Mills → Sheppard-Yonge
	// Line 6 terminals
	TOWARDS_FINCH_WEST: 'Towards Finch West',  // Line 6: Humber College → Finch West
	TOWARDS_HUMBER_COLLEGE: 'Towards Humber College',  // Line 6: Finch West → Humber College
	UNKNOWN: 'All Stops'
} as const;

export type DirectionLabel = (typeof DIRECTION_LABELS)[keyof typeof DIRECTION_LABELS] | string;

/**
 * Direction badge colors (matches DESIGN_SYSTEM.md)
 */
export const DIRECTION_COLORS: Record<string, string> = {
	// Cardinal directions
	Eastbound: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
	Westbound: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
	Northbound: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
	Southbound: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
	// Line 1: North/South-ish but U-shaped
	'Towards VMC': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
	'Towards Finch': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
	// Line 2: East/West
	'Towards Kennedy': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
	'Towards Kipling': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
	// Line 4: East/West (but shorter)
	'Towards Don Mills': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
	'Towards Sheppard-Yonge': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
	// Line 6: East/West
	'Towards Finch West': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
	'Towards Humber College': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
	'All Stops': 'bg-muted text-muted-foreground'
};

/**
 * Group of stops for a specific direction
 */
export interface DirectionGroup {
	direction: DirectionLabel;
	stops: TTCStop[];
	colorClass: string;
}

/**
 * Subway line headsigns for direction tabs
 * Maps route name + GTFS direction ID to user-friendly terminal station labels
 */
const SUBWAY_DIRECTION_LABELS: Record<string, Record<string, DirectionLabel>> = {
	'Line 1': {
		'0': 'Towards VMC' as DirectionLabel,  // Finch → Union → VMC
		'1': 'Towards Finch' as DirectionLabel  // VMC → Union → Finch
	},
	'Line 2': {
		'0': 'Towards Kennedy' as DirectionLabel,  // Kipling → Kennedy
		'1': 'Towards Kipling' as DirectionLabel   // Kennedy → Kipling
	},
	'Line 4': {
		'0': 'Towards Don Mills' as DirectionLabel,  // Sheppard-Yonge → Don Mills
		'1': 'Towards Sheppard-Yonge' as DirectionLabel   // Don Mills → Sheppard-Yonge
	},
	'Line 6': {
		'0': 'Towards Finch West' as DirectionLabel,  // Humber College → Finch West
		'1': 'Towards Humber College' as DirectionLabel   // Finch West → Humber College
	}
};

/**
 * Get stops for a route, grouped by direction
 *
 * This function:
 * 1. Fetches all stops for a route
 * 2. Groups them by direction
 *    - For subway/LRT: Uses GTFS direction ID (handles U-shaped routes like Line 1)
 *    - For bus/streetcar: Uses the `dir` field or extracts from name
 * 3. Orders stops within each group by sequence (subway) or lat/lon (bus/streetcar)
 *
 * @param routeNumber - The route number (e.g., "501", "7", "Line 1")
 * @returns Array of DirectionGroups with stops ordered by route position
 */
export async function getStopsByRouteGroupedByDirection(
	routeNumber: string
): Promise<DirectionGroup[]> {
	// Get all stops for this route
	const stops = await getStopsByRoute(routeNumber);

	if (stops.length === 0) {
		return [];
	}

	// Check if this is a subway/LRT line with sequence data
	const hasSubwaySequence = stops.some(s => 
		s.seq && s.seq[routeNumber] && Object.keys(s.seq[routeNumber]).length > 0
	);

	if (hasSubwaySequence) {
		// Use GTFS direction-based grouping for subway/LRT
		return getSubwayDirectionGroups(stops, routeNumber);
	}

	// Standard grouping by platform/stop direction for bus/streetcar
	return getBusDirectionGroups(stops, routeNumber);
}

/**
 * Group subway/LRT stops by GTFS direction ID
 * This handles complex routes like Line 1's U-shape correctly
 */
function getSubwayDirectionGroups(stops: TTCStop[], routeNumber: string): DirectionGroup[] {
	const groups: DirectionGroup[] = [];
	const directionLabels = SUBWAY_DIRECTION_LABELS[routeNumber] || {};
	
	// Group by GTFS direction ID ('0' or '1')
	const dir0Stops: TTCStop[] = [];
	const dir1Stops: TTCStop[] = [];
	
	for (const stop of stops) {
		if (!stop.seq || !stop.seq[routeNumber]) continue;
		
		const seqData = stop.seq[routeNumber];
		if (seqData['0'] !== undefined) {
			dir0Stops.push(stop);
		}
		if (seqData['1'] !== undefined) {
			dir1Stops.push(stop);
		}
	}
	
	// Sort by sequence
	dir0Stops.sort((a, b) => (a.seq![routeNumber]['0'] || 0) - (b.seq![routeNumber]['0'] || 0));
	dir1Stops.sort((a, b) => (a.seq![routeNumber]['1'] || 0) - (b.seq![routeNumber]['1'] || 0));
	
	// Add Direction 0 group
	if (dir0Stops.length > 0) {
		const label = directionLabels['0'] || 'Direction 1' as DirectionLabel;
		groups.push({
			direction: label,
			stops: dir0Stops,
			colorClass: getDirectionColor(label)
		});
	}
	
	// Add Direction 1 group
	if (dir1Stops.length > 0) {
		const label = directionLabels['1'] || 'Direction 2' as DirectionLabel;
		groups.push({
			direction: label,
			stops: dir1Stops,
			colorClass: getDirectionColor(label)
		});
	}
	
	return groups;
}

/**
 * Group bus/streetcar stops by their direction field or name
 */
function getBusDirectionGroups(stops: TTCStop[], routeNumber: string): DirectionGroup[] {
	const directionMap = new Map<DirectionLabel, TTCStop[]>();

	for (const stop of stops) {
		let dir: DirectionLabel;
		if (stop.dir) {
			dir = normalizeDirection(stop.dir);
		} else if (stop.type === 'subway') {
			dir = extractDirectionFromName(stop.name);
		} else {
			dir = DIRECTION_LABELS.UNKNOWN;
		}

		if (!directionMap.has(dir)) {
			directionMap.set(dir, []);
		}
		directionMap.get(dir)!.push(stop);
	}

	const groups: DirectionGroup[] = [];
	const directionOrder: DirectionLabel[] = [
		DIRECTION_LABELS.EASTBOUND,
		DIRECTION_LABELS.WESTBOUND,
		DIRECTION_LABELS.NORTHBOUND,
		DIRECTION_LABELS.SOUTHBOUND,
		DIRECTION_LABELS.UNKNOWN
	];

	for (const dir of directionOrder) {
		const dirStops = directionMap.get(dir);
		if (dirStops && dirStops.length > 0) {
			const sortedStops = sortStopsByPosition(dirStops, dir, routeNumber);
			groups.push({
				direction: dir,
				stops: sortedStops,
				colorClass: DIRECTION_COLORS[dir]
			});
		}
	}

	return groups;
}

/**
 * Get color class for a direction label
 */
function getDirectionColor(label: DirectionLabel): string {
	// Check standard colors first
	if (DIRECTION_COLORS[label]) {
		return DIRECTION_COLORS[label];
	}
	
	// Custom colors for subway-specific labels
	if (label.includes('VMC') || label.includes('Finch')) {
		return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
	}
	
	return 'bg-muted text-muted-foreground';
}

/**
 * Normalize a direction string to standard label
 */
function normalizeDirection(dir: string | undefined): DirectionLabel {
	if (!dir) return DIRECTION_LABELS.UNKNOWN;

	const normalized = dir.toLowerCase().trim();

	if (normalized.includes('east')) return DIRECTION_LABELS.EASTBOUND;
	if (normalized.includes('west')) return DIRECTION_LABELS.WESTBOUND;
	if (normalized.includes('north')) return DIRECTION_LABELS.NORTHBOUND;
	if (normalized.includes('south')) return DIRECTION_LABELS.SOUTHBOUND;

	// Handle abbreviations
	if (normalized === 'e' || normalized === 'eb') return DIRECTION_LABELS.EASTBOUND;
	if (normalized === 'w' || normalized === 'wb') return DIRECTION_LABELS.WESTBOUND;
	if (normalized === 'n' || normalized === 'nb') return DIRECTION_LABELS.NORTHBOUND;
	if (normalized === 's' || normalized === 'sb') return DIRECTION_LABELS.SOUTHBOUND;

	return DIRECTION_LABELS.UNKNOWN;
}

/**
 * Extract direction from a stop name (used for subway stations)
 * e.g., "Finch Station - Northbound Platform" → Northbound
 *       "Kennedy Station - Subway Platform" → Unknown (generic platform)
 */
function extractDirectionFromName(name: string): DirectionLabel {
	const normalized = name.toLowerCase();
	
	if (normalized.includes('northbound')) return DIRECTION_LABELS.NORTHBOUND;
	if (normalized.includes('southbound')) return DIRECTION_LABELS.SOUTHBOUND;
	if (normalized.includes('eastbound')) return DIRECTION_LABELS.EASTBOUND;
	if (normalized.includes('westbound')) return DIRECTION_LABELS.WESTBOUND;
	
	return DIRECTION_LABELS.UNKNOWN;
}

/**
 * Sort stops by route order
 * 
 * For subway/LRT stops with sequence data, use the GTFS stop_sequence
 * which provides the correct route order (important for U-shaped routes like Line 1).
 * 
 * For bus/streetcar stops, use geographic position (latitude/longitude).
 */
function sortStopsByPosition(stops: TTCStop[], direction: DirectionLabel, routeNumber?: string): TTCStop[] {
	const sorted = [...stops];
	
	// Check if these stops have sequence data for this route
	const hasSequenceData = routeNumber && sorted.some(s => 
		s.seq && s.seq[routeNumber] && Object.keys(s.seq[routeNumber]).length > 0
	);
	
	if (hasSequenceData && routeNumber) {
		// Sort by sequence number (use any available direction's sequence)
		// Since each platform only belongs to one direction, we just need to find
		// the sequence value that exists for this stop on this route
		sorted.sort((a, b) => {
			const seqA = getStopSequence(a, routeNumber);
			const seqB = getStopSequence(b, routeNumber);
			
			// If both have sequences, sort by sequence
			if (seqA !== null && seqB !== null) {
				return seqA - seqB;
			}
			// Stops without sequence go to the end
			if (seqA === null) return 1;
			if (seqB === null) return -1;
			return 0;
		});
		
		return sorted;
	}

	// Fall back to geographic sorting for bus/streetcar routes
	switch (direction) {
		case DIRECTION_LABELS.EASTBOUND:
			// West to East: sort by longitude ascending
			sorted.sort((a, b) => a.lon - b.lon);
			break;
		case DIRECTION_LABELS.WESTBOUND:
			// East to West: sort by longitude descending
			sorted.sort((a, b) => b.lon - a.lon);
			break;
		case DIRECTION_LABELS.NORTHBOUND:
			// South to North: sort by latitude ascending
			sorted.sort((a, b) => a.lat - b.lat);
			break;
		case DIRECTION_LABELS.SOUTHBOUND:
			// North to South: sort by latitude descending
			sorted.sort((a, b) => b.lat - a.lat);
			break;
		default:
			// For unknown direction, sort by name alphabetically
			sorted.sort((a, b) => a.name.localeCompare(b.name));
	}

	return sorted;
}

/**
 * Get the stop sequence for a stop on a specific route
 * Returns the first available sequence value (since each platform only has one direction)
 */
function getStopSequence(stop: TTCStop, routeNumber: string): number | null {
	if (!stop.seq || !stop.seq[routeNumber]) return null;
	
	const directionSeqs = stop.seq[routeNumber];
	const keys = Object.keys(directionSeqs);
	
	if (keys.length === 0) return null;
	
	// Return the first (and typically only) sequence value
	return directionSeqs[keys[0]];
}

/**
 * Get the primary directions for a route (e.g., ["Eastbound", "Westbound"])
 * Useful for determining if a route is primarily E/W or N/S
 */
export async function getRouteDirections(routeNumber: string): Promise<DirectionLabel[]> {
	const groups = await getStopsByRouteGroupedByDirection(routeNumber);
	return groups.map((g) => g.direction);
}

/**
 * Get the center point of all stops for a route (for map centering)
 */
export async function getRouteCenterPoint(
	routeNumber: string
): Promise<{ lat: number; lon: number } | null> {
	const stops = await getStopsByRoute(routeNumber);

	if (stops.length === 0) return null;

	const sumLat = stops.reduce((sum, s) => sum + s.lat, 0);
	const sumLon = stops.reduce((sum, s) => sum + s.lon, 0);

	return {
		lat: sumLat / stops.length,
		lon: sumLon / stops.length
	};
}

/**
 * Get the bounding box of all stops for a route (for map fitting)
 */
export async function getRouteBounds(routeNumber: string): Promise<{
	north: number;
	south: number;
	east: number;
	west: number;
} | null> {
	const stops = await getStopsByRoute(routeNumber);

	if (stops.length === 0) return null;

	return {
		north: Math.max(...stops.map((s) => s.lat)),
		south: Math.min(...stops.map((s) => s.lat)),
		east: Math.max(...stops.map((s) => s.lon)),
		west: Math.min(...stops.map((s) => s.lon))
	};
}
