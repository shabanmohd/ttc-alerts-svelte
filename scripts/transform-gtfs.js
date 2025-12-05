#!/usr/bin/env node

/**
 * Transform TTC GTFS data into a compact JSON file for the stop search feature.
 * 
 * Usage: node scripts/transform-gtfs.js /path/to/gtfs/folder
 * 
 * This script:
 * 1. Reads stops.txt, routes.txt, trips.txt, and stop_times.txt
 * 2. Maps routes to stops with direction information
 * 3. Outputs a compact JSON file with stop data including direction
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const gtfsPath = process.argv[2] || '/tmp/ttc-gtfs';
const outputPath = process.argv[3] || './static/data/ttc-stops.json';

console.log(`📥 Reading GTFS data from: ${gtfsPath}`);

// Read and parse CSV files
function readCsv(filename) {
  const filepath = path.join(gtfsPath, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

// Route types from GTFS spec
const ROUTE_TYPES = {
  '0': 'streetcar',
  '1': 'subway',
  '2': 'rail',
  '3': 'bus',
};

/**
 * Extract direction from trip headsign
 * Examples:
 * - "East - 116 Morningside towards Finch" → "East"
 * - "West - 116 Morningside towards Kennedy" → "West"
 * - "Line 1 (Yonge-University) towards Vaughan" → null (subway, no cardinal direction)
 */
function extractDirectionFromHeadsign(headsign) {
  if (!headsign) return null;
  
  // Match "North/South/East/West - " at the start
  const match = headsign.match(/^(North|South|East|West)\s*-/i);
  if (match) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }
  
  // Match "Northbound/Southbound/Eastbound/Westbound" anywhere
  const boundMatch = headsign.match(/(North|South|East|West)bound/i);
  if (boundMatch) {
    return boundMatch[1].charAt(0).toUpperCase() + boundMatch[1].slice(1).toLowerCase();
  }
  
  return null;
}

try {
  // Read all files
  console.log('📖 Reading stops.txt...');
  const stops = readCsv('stops.txt');
  console.log(`   Found ${stops.length} stops`);

  console.log('📖 Reading routes.txt...');
  const routes = readCsv('routes.txt');
  console.log(`   Found ${routes.length} routes`);

  console.log('📖 Reading trips.txt...');
  const trips = readCsv('trips.txt');
  console.log(`   Found ${trips.length} trips`);

  console.log('📖 Reading stop_times.txt (this may take a moment)...');
  const stopTimes = readCsv('stop_times.txt');
  console.log(`   Found ${stopTimes.length} stop times`);

  // Build route_id -> route info map
  const routeMap = new Map();
  for (const route of routes) {
    routeMap.set(route.route_id, {
      name: route.route_short_name,
      type: ROUTE_TYPES[route.route_type] || 'bus',
    });
  }

  // Build trip_id -> { route_id, direction_id, direction } map
  console.log('🧭 Extracting direction information from trips...');
  const tripInfo = new Map();
  let tripsWithDirection = 0;
  for (const trip of trips) {
    const direction = extractDirectionFromHeadsign(trip.trip_headsign);
    if (direction) tripsWithDirection++;
    tripInfo.set(trip.trip_id, {
      routeId: trip.route_id,
      directionId: trip.direction_id,
      direction: direction,
    });
  }
  console.log(`   ${tripsWithDirection} trips have cardinal direction info`);

  // Build stop_id -> { routes: Set, directions: Set } map
  console.log('🔗 Mapping routes and directions to stops...');
  const stopData = new Map();
  for (const st of stopTimes) {
    const trip = tripInfo.get(st.trip_id);
    if (!trip) continue;
    
    const routeInfo = routeMap.get(trip.routeId);
    if (!routeInfo) continue;
    
    if (!stopData.has(st.stop_id)) {
      stopData.set(st.stop_id, {
        routes: new Set(),
        directions: new Set(),
      });
    }
    
    const data = stopData.get(st.stop_id);
    data.routes.add(routeInfo.name);
    
    // Add direction if available
    if (trip.direction) {
      data.directions.add(trip.direction);
    }
  }

  /**
   * Get primary direction for a stop
   * If a stop has only one direction, return it (e.g., "Eastbound")
   * If multiple or none, return null
   */
  function getPrimaryDirection(stopId) {
    const data = stopData.get(stopId);
    if (!data || data.directions.size === 0) return null;
    
    // If only one direction serves this stop, that's the primary direction
    if (data.directions.size === 1) {
      const dir = [...data.directions][0];
      return `${dir}bound`;
    }
    
    // Multiple directions - this is likely a terminal or complex stop
    // Return null, the UI can show multiple if needed
    return null;
  }

  // Determine stop type based on routes that serve it
  function getStopType(stopId) {
    const data = stopData.get(stopId);
    if (!data) return 'bus';
    
    const routeNames = data.routes;
    
    // Check if any subway lines serve this stop
    for (const routeName of routeNames) {
      const routeId = [...routeMap.entries()].find(([_, v]) => v.name === routeName)?.[0];
      if (routeId) {
        const routeInfo = routeMap.get(routeId);
        if (routeInfo?.type === 'subway') return 'subway';
      }
    }
    
    // Check for streetcar routes (500-series)
    for (const routeName of routeNames) {
      const num = parseInt(routeName, 10);
      if (num >= 500 && num < 600) return 'streetcar';
    }
    
    return 'bus';
  }

  // Transform stops data
  console.log('🔄 Transforming stops data...');
  const ttcStops = stops
    .filter(stop => stop.stop_id && stop.stop_name && stop.stop_lat && stop.stop_lon)
    .map(stop => {
      const data = stopData.get(stop.stop_id);
      const direction = getPrimaryDirection(stop.stop_id);
      
      const result = {
        id: stop.stop_id,
        name: stop.stop_name,
        lat: parseFloat(stop.stop_lat),
        lon: parseFloat(stop.stop_lon),
        routes: data ? [...data.routes].sort((a, b) => {
          // Sort numerically where possible
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        }) : [],
        type: getStopType(stop.stop_id),
      };
      
      // Only add direction if available (keeps JSON smaller)
      if (direction) {
        result.dir = direction;
      }
      
      return result;
    })
    .filter(stop => stop.routes.length > 0); // Only include stops with routes

  // Count stops with direction info
  const stopsWithDirection = ttcStops.filter(s => s.dir).length;
  console.log(`✅ Processed ${ttcStops.length} stops with routes`);
  console.log(`   🧭 ${stopsWithDirection} stops have direction info`);

  // Create output directory if needed
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  const output = JSON.stringify(ttcStops);
  fs.writeFileSync(outputPath, output);
  
  const sizeKB = Math.round(output.length / 1024);
  console.log(`📁 Wrote ${outputPath} (${sizeKB} KB)`);

  // Stats
  const subwayStops = ttcStops.filter(s => s.type === 'subway').length;
  const streetcarStops = ttcStops.filter(s => s.type === 'streetcar').length;
  const busStops = ttcStops.filter(s => s.type === 'bus').length;
  
  console.log('\n📊 Stop Statistics:');
  console.log(`   🚇 Subway: ${subwayStops}`);
  console.log(`   🚋 Streetcar: ${streetcarStops}`);
  console.log(`   🚌 Bus: ${busStops}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
