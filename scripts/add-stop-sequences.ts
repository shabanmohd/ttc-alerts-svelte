/**
 * Add stop sequence data to ttc-stops.json from GTFS stop_times.txt
 * 
 * This script extracts the stop_sequence from GTFS stop_times.txt and adds it
 * to each stop in ttc-stops.json, enabling proper stop ordering on route pages.
 * 
 * Usage: npx tsx scripts/add-stop-sequences.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TTCStop {
	id: string;
	name: string;
	lat: number;
	lon: number;
	routes: string[];
	type: string;
	dir?: string;
	seq?: Record<string, Record<string, number>>; // route -> direction -> sequence
}

interface Trip {
	tripId: string;
	routeId: string;
	directionId: string; // 0 or 1
}

interface StopTime {
	tripId: string;
	stopId: string;
	stopSequence: number;
}

const GTFS_DIR = path.join(__dirname, 'gtfs');
const STOPS_FILE = path.join(__dirname, '..', 'static', 'data', 'ttc-stops.json');

async function readCSV<T>(filePath: string, parser: (cols: string[]) => T | null): Promise<T[]> {
	const results: T[] = [];
	const fileStream = fs.createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity
	});

	let isFirst = true;
	for await (const line of rl) {
		if (isFirst) {
			isFirst = false;
			continue; // Skip header
		}
		const cols = line.split(',');
		const parsed = parser(cols);
		if (parsed) results.push(parsed);
	}

	return results;
}

async function main() {
	console.log('📊 Adding stop sequences from GTFS data...\n');

	// Load existing stops
	const stopsData = JSON.parse(fs.readFileSync(STOPS_FILE, 'utf-8')) as TTCStop[];
	console.log(`Loaded ${stopsData.length} stops from ttc-stops.json`);

	// Create a map for quick lookup
	const stopsMap = new Map<string, TTCStop>();
	for (const stop of stopsData) {
		stopsMap.set(stop.id, stop);
	}

	// Read trips.txt to get route and direction for each trip
	console.log('Reading trips.txt...');
	const trips = await readCSV<Trip>(
		path.join(GTFS_DIR, 'trips.txt'),
		(cols) => ({
			tripId: cols[2],
			routeId: cols[0],
			directionId: cols[5]
		})
	);
	console.log(`Loaded ${trips.length} trips`);

	// Create trip -> route/direction map
	const tripInfo = new Map<string, { routeId: string; directionId: string }>();
	for (const trip of trips) {
		tripInfo.set(trip.tripId, { routeId: trip.routeId, directionId: trip.directionId });
	}

	// Read stop_times.txt - this is the big file
	console.log('Reading stop_times.txt (this may take a moment)...');
	const stopTimes = await readCSV<StopTime>(
		path.join(GTFS_DIR, 'stop_times.txt'),
		(cols) => ({
			tripId: cols[0],
			stopId: cols[3],
			stopSequence: parseInt(cols[4], 10)
		})
	);
	console.log(`Loaded ${stopTimes.length} stop times`);

	// Build sequence map: stopId -> routeId -> directionId -> max sequence
	// We track the MAX sequence for each stop on each route/direction because
	// different trips may have different sequences (short-turns vs full trips)
	// and we want the full trip sequence
	console.log('Processing stop sequences...');
	const sequenceMap = new Map<string, Map<string, Map<string, number>>>();

	for (const st of stopTimes) {
		const info = tripInfo.get(st.tripId);
		if (!info) continue;

		// Get or create route map for this stop
		if (!sequenceMap.has(st.stopId)) {
			sequenceMap.set(st.stopId, new Map());
		}
		const routeMap = sequenceMap.get(st.stopId)!;

		// Get or create direction map for this route
		if (!routeMap.has(info.routeId)) {
			routeMap.set(info.routeId, new Map());
		}
		const directionMap = routeMap.get(info.routeId)!;

		// Store the sequence (use the most common/latest sequence seen)
		// For stops that appear in multiple trips, they should have the same sequence
		// within the same direction
		const currentSeq = directionMap.get(info.directionId);
		if (currentSeq === undefined || st.stopSequence > currentSeq) {
			// Keep track of sequences - for now just use the value
			// Actually, we want the sequence from the longest trip (fullest route)
			directionMap.set(info.directionId, st.stopSequence);
		}
	}

	// Now we need to normalize sequences - find the longest trip for each route/direction
	// and use those sequences
	console.log('Normalizing sequences to use longest trips...');

	// Group stop times by route/direction and find the longest trip
	const tripLengths = new Map<string, Map<string, Map<string, number>>>(); // route -> dir -> tripId -> count

	for (const st of stopTimes) {
		const info = tripInfo.get(st.tripId);
		if (!info) continue;

		const key = `${info.routeId}-${info.directionId}`;
		if (!tripLengths.has(info.routeId)) {
			tripLengths.set(info.routeId, new Map());
		}
		const dirMap = tripLengths.get(info.routeId)!;
		if (!dirMap.has(info.directionId)) {
			dirMap.set(info.directionId, new Map());
		}
		const tripMap = dirMap.get(info.directionId)!;
		tripMap.set(st.tripId, (tripMap.get(st.tripId) || 0) + 1);
	}

	// Find the longest trip for each route/direction
	const longestTrips = new Map<string, string>(); // "routeId-directionId" -> tripId

	for (const [routeId, dirMap] of tripLengths) {
		for (const [dirId, tripMap] of dirMap) {
			let maxCount = 0;
			let longestTripId = '';
			for (const [tripId, count] of tripMap) {
				if (count > maxCount) {
					maxCount = count;
					longestTripId = tripId;
				}
			}
			longestTrips.set(`${routeId}-${dirId}`, longestTripId);
		}
	}

	console.log(`Found longest trips for ${longestTrips.size} route-direction combinations`);

	// Build the final sequence map using only the longest trips
	const finalSequenceMap = new Map<string, Map<string, Map<string, number>>>();

	for (const st of stopTimes) {
		const info = tripInfo.get(st.tripId);
		if (!info) continue;

		const key = `${info.routeId}-${info.directionId}`;
		const longestTripId = longestTrips.get(key);
		
		// Only use sequences from the longest trip
		if (st.tripId !== longestTripId) continue;

		if (!finalSequenceMap.has(st.stopId)) {
			finalSequenceMap.set(st.stopId, new Map());
		}
		const routeMap = finalSequenceMap.get(st.stopId)!;

		if (!routeMap.has(info.routeId)) {
			routeMap.set(info.routeId, new Map());
		}
		const directionMap = routeMap.get(info.routeId)!;

		directionMap.set(info.directionId, st.stopSequence);
	}

	// Apply sequences to stops
	console.log('Applying sequences to stops...');
	let stopsUpdated = 0;

	for (const [stopId, routeMap] of finalSequenceMap) {
		const stop = stopsMap.get(stopId);
		if (!stop) continue;

		// Convert direction IDs to direction labels
		const seq: Record<string, Record<string, number>> = {};

		for (const [routeId, dirMap] of routeMap) {
			// Only add sequence if this route is in the stop's route list
			if (!stop.routes.includes(routeId)) continue;

			seq[routeId] = {};
			for (const [dirId, seqNum] of dirMap) {
				// Direction 0 = usually the "main" direction (e.g., East for east-west routes)
				// Direction 1 = the reverse direction
				const dirLabel = dirId === '0' ? 'main' : 'reverse';
				seq[routeId][dirLabel] = seqNum;
			}
		}

		if (Object.keys(seq).length > 0) {
			stop.seq = seq;
			stopsUpdated++;
		}
	}

	console.log(`Updated ${stopsUpdated} stops with sequence data`);

	// Write updated stops
	fs.writeFileSync(STOPS_FILE, JSON.stringify(stopsData, null, 2));
	console.log(`\n✅ Wrote updated stops to ${STOPS_FILE}`);

	// Also update the build directory
	const buildStopsFile = path.join(__dirname, '..', 'build', 'data', 'ttc-stops.json');
	if (fs.existsSync(path.dirname(buildStopsFile))) {
		fs.writeFileSync(buildStopsFile, JSON.stringify(stopsData));
		console.log(`✅ Also updated ${buildStopsFile}`);
	}

	// Show sample
	const sampleStop = stopsMap.get('14709');
	if (sampleStop) {
		console.log('\nSample stop (14709 - Kennedy Station):');
		console.log(JSON.stringify(sampleStop, null, 2));
	}
}

main().catch(console.error);
