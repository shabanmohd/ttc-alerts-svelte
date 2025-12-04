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

// Data version - increment when stops data changes
const DATA_VERSION = '2025-01-05';

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
 * Search stops by name (fuzzy search)
 */
export async function searchStops(query: string, limit = 20): Promise<TTCStop[]> {
	if (!query || query.length < 2) return [];

	const normalizedQuery = query.toLowerCase().trim();

	// Get all stops and filter (Dexie doesn't support LIKE queries)
	// For better performance with large datasets, we use a compound approach
	const stops = await db.stops.toArray();

	// Score and filter stops - with defensive checks for malformed data
	const scored = stops
		.filter((stop) => stop && typeof stop.name === 'string' && stop.name.trim())
		.map((stop) => ({
			stop,
			score: getSearchScore(stop.name.toLowerCase().trim(), normalizedQuery)
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);

	return scored.map((item) => item.stop);
}

/**
 * Calculate search relevance score
 */
function getSearchScore(name: string | undefined | null, query: string): number {
	// Safety check for undefined/null names
	if (!name || typeof name !== 'string') return 0;

	// Exact match
	if (name === query) return 100;

	// Starts with query
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
