#!/usr/bin/env node

/**
 * Extract TTC route shapes from GTFS shapes.txt
 * 
 * This creates a compact JSON file with polyline coordinates for each route,
 * optimized for rendering route lines on maps.
 * 
 * Usage: node scripts/extract-shapes.js /path/to/gtfs/folder
 * 
 * Output: static/data/ttc-shapes.json
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const gtfsPath = process.argv[2] || '/tmp/ttc-gtfs';
const outputPath = './static/data/ttc-shapes.json';

console.log(`📥 Reading GTFS data from: ${gtfsPath}`);

// Read and parse CSV files
function readCsv(filename) {
  const filepath = path.join(gtfsPath, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

/**
 * Simplify a polyline using Douglas-Peucker algorithm
 * Reduces point count while preserving shape
 */
function simplifyPolyline(points, tolerance = 0.0001) {
  if (points.length < 3) return points;
  
  // Find point with maximum distance from line between first and last
  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDistance) {
      maxDistance = d;
      maxIndex = i;
    }
  }
  
  // If max distance > tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyPolyline(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolyline(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d === 0) return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);
  return Math.abs(dy * point[0] - dx * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]) / d;
}

/**
 * Extract direction from trip headsign and GTFS direction_id
 * GTFS direction_id: 0 = outbound (first direction), 1 = inbound (return direction)
 */
function extractDirection(headsign, directionId) {
  if (!headsign) return directionId === '0' ? 'direction0' : 'direction1';
  
  const hs = headsign.toLowerCase();
  
  // Check for explicit cardinal directions
  if (hs.includes('eastbound') || hs.match(/\beast\b/)) return 'eastbound';
  if (hs.includes('westbound') || hs.match(/\bwest\b/) && !hs.includes('finch west')) return 'westbound';
  if (hs.includes('northbound') || hs.match(/\bnorth\b/)) return 'northbound';
  if (hs.includes('southbound') || hs.match(/\bsouth\b/)) return 'southbound';
  
  // Use direction_id with unique identifier per route/shape combination
  // This ensures we capture both directions even when headsign doesn't specify
  return directionId === '0' ? 'direction0' : 'direction1';
}

try {
  // Read routes to get route info
  console.log('📖 Reading routes.txt...');
  const routes = readCsv('routes.txt');
  const routeMap = new Map();
  for (const route of routes) {
    routeMap.set(route.route_id, route.route_short_name);
  }
  console.log(`   Found ${routes.length} routes`);

  // Read trips to map shape_id -> route
  console.log('📖 Reading trips.txt...');
  const trips = readCsv('trips.txt');
  
  // Build shape_id -> route info
  const shapeToRoute = new Map();
  for (const trip of trips) {
    if (trip.shape_id && !shapeToRoute.has(trip.shape_id)) {
      const routeName = routeMap.get(trip.route_id) || trip.route_id;
      const direction = extractDirection(trip.trip_headsign, trip.direction_id);
      shapeToRoute.set(trip.shape_id, { 
        route: routeName, 
        direction,
        headsign: trip.trip_headsign 
      });
    }
  }
  console.log(`   Mapped ${shapeToRoute.size} shapes to routes`);

  // Read shapes
  console.log('📖 Reading shapes.txt (this may take a moment)...');
  const shapes = readCsv('shapes.txt');
  console.log(`   Found ${shapes.length} shape points`);

  // Group shape points by shape_id
  console.log('🗺️  Grouping shape points...');
  const shapePoints = new Map();
  for (const point of shapes) {
    if (!shapePoints.has(point.shape_id)) {
      shapePoints.set(point.shape_id, []);
    }
    shapePoints.get(point.shape_id).push({
      seq: parseInt(point.shape_pt_sequence),
      lat: parseFloat(point.shape_pt_lat),
      lon: parseFloat(point.shape_pt_lon)
    });
  }

  // Sort points by sequence within each shape
  for (const [shapeId, points] of shapePoints) {
    points.sort((a, b) => a.seq - b.seq);
  }
  console.log(`   Grouped into ${shapePoints.size} shapes`);

  // Build route shapes - pick one shape per route/direction combination
  console.log('🎨 Building route shapes...');
  const routeShapes = {};
  
  // Track which route/direction combos we've processed
  const processed = new Set();
  
  for (const [shapeId, info] of shapeToRoute) {
    const key = `${info.route}-${info.direction}`;
    if (processed.has(key)) continue;
    
    const points = shapePoints.get(shapeId);
    if (!points || points.length < 2) continue;
    
    // Convert to [lat, lon] array
    let coords = points.map(p => [p.lat, p.lon]);
    
    // Simplify to reduce file size (tolerance ~3 meters at Toronto's latitude)
    // Using smaller tolerance for better accuracy on curves
    const originalCount = coords.length;
    coords = simplifyPolyline(coords, 0.00003);
    
    // Round coordinates to 6 decimal places (~0.1m precision)
    coords = coords.map(([lat, lon]) => [
      Math.round(lat * 1000000) / 1000000,
      Math.round(lon * 1000000) / 1000000
    ]);
    
    // Store by route number
    if (!routeShapes[info.route]) {
      routeShapes[info.route] = {};
    }
    
    routeShapes[info.route][info.direction] = {
      coords,
      pointCount: coords.length,
      originalPoints: originalCount,
      headsign: info.headsign
    };
    
    processed.add(key);
  }

  // Log summary
  console.log('\n📊 Route summary:');
  const routeNumbers = Object.keys(routeShapes).sort((a, b) => {
    const aNum = parseInt(a) || 0;
    const bNum = parseInt(b) || 0;
    return aNum - bNum;
  });
  
  let totalPoints = 0;
  for (const route of routeNumbers.slice(0, 10)) {
    const directions = Object.keys(routeShapes[route]);
    const dirSummary = directions.map(d => {
      const info = routeShapes[route][d];
      totalPoints += info.pointCount;
      return `${d}: ${info.pointCount} pts`;
    }).join(', ');
    console.log(`   Route ${route}: ${dirSummary}`);
  }
  if (routeNumbers.length > 10) {
    console.log(`   ... and ${routeNumbers.length - 10} more routes`);
  }

  // Calculate totals
  for (const route of routeNumbers.slice(10)) {
    for (const dir of Object.keys(routeShapes[route])) {
      totalPoints += routeShapes[route][dir].pointCount;
    }
  }
  console.log(`\n   Total: ${routeNumbers.length} routes, ${totalPoints} points`);

  // Write output
  const output = {
    version: new Date().toISOString().split('T')[0],
    generatedFrom: 'TTC GTFS shapes.txt',
    totalRoutes: routeNumbers.length,
    totalPoints,
    shapes: routeShapes
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\n✅ Written to ${outputPath} (${fileSizeKB} KB)`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
