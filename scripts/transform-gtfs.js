#!/usr/bin/env node

/**
 * Transform TTC GTFS data into a compact JSON file for the stop search feature.
 * 
 * Usage: node scripts/transform-gtfs.js /path/to/gtfs/folder
 * 
 * This script:
 * 1. Reads stops.txt, routes.txt, trips.txt, and stop_times.txt
 * 2. Maps routes to stops
 * 3. Outputs a compact JSON file with stop data
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

  // Build trip_id -> route_id map
  const tripToRoute = new Map();
  for (const trip of trips) {
    tripToRoute.set(trip.trip_id, trip.route_id);
  }

  // Build stop_id -> Set of route names
  console.log('🔗 Mapping routes to stops...');
  const stopRoutes = new Map();
  for (const st of stopTimes) {
    const routeId = tripToRoute.get(st.trip_id);
    if (routeId) {
      const routeInfo = routeMap.get(routeId);
      if (routeInfo) {
        if (!stopRoutes.has(st.stop_id)) {
          stopRoutes.set(st.stop_id, new Set());
        }
        stopRoutes.get(st.stop_id).add(routeInfo.name);
      }
    }
  }

  // Determine stop type based on routes that serve it
  function getStopType(stopId) {
    const routeNames = stopRoutes.get(stopId);
    if (!routeNames) return 'bus';
    
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
      const routes = stopRoutes.get(stop.stop_id);
      return {
        id: stop.stop_id,
        name: stop.stop_name,
        lat: parseFloat(stop.stop_lat),
        lon: parseFloat(stop.stop_lon),
        routes: routes ? [...routes].sort((a, b) => {
          // Sort numerically where possible
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        }) : [],
        type: getStopType(stop.stop_id),
      };
    })
    .filter(stop => stop.routes.length > 0); // Only include stops with routes

  console.log(`✅ Processed ${ttcStops.length} stops with routes`);

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
