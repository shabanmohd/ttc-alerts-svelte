#!/usr/bin/env node
/**
 * Fetch sequential stop data from NextBus API for all TTC bus and streetcar routes
 * 
 * This script fetches the routeConfig for each route and extracts the ordered
 * stop sequences for each direction.
 * 
 * Usage: node scripts/fetch-route-sequences.cjs
 * Output: Updates static/data/ttc-route-stop-orders.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// All TTC bus and streetcar route numbers
const ALL_ROUTES = [
  // Streetcars (501-512)
  501, 503, 504, 505, 506, 509, 510, 511, 512,
  // Limited streetcars
  507, 508,
  // Night streetcars
  301, 304, 305, 306, 310, 312,
  
  // Regular buses (7-191)
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 51, 52, 53, 54, 55, 56, 57, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91,
  92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
  110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125,
  126, 127, 129, 130, 131, 132, 133, 134, 135, 149, 154, 160, 161, 162, 164, 165,
  166, 167, 168, 169, 171, 184, 185, 189, 191,
  
  // Night buses (300-series)
  300, 302, 307, 315, 320, 322, 324, 325, 329, 332, 334, 335, 336, 337, 339, 340,
  341, 343, 352, 353, 354, 363, 365, 384, 385, 386, 395, 396,
  
  // Community routes (400-series)
  400, 402, 403, 404, 405, 406,
  
  // Express routes (900-series)
  900, 902, 903, 904, 905, 924, 925, 927, 929, 935, 937, 938, 939, 941, 944, 945,
  952, 953, 954, 960, 968, 984, 985, 986, 989, 995, 996
];

const NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

/**
 * Fetch route configuration from NextBus API
 */
function fetchRouteConfig(routeNumber) {
  return new Promise((resolve, reject) => {
    const url = `${NEXTBUS_API}?command=routeConfig&a=ttc&r=${routeNumber}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.Error) {
            resolve(null); // Route not found in NextBus
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Parse error for route ${routeNumber}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Extract stop sequences from route config
 */
function extractStopSequences(routeConfig) {
  if (!routeConfig || !routeConfig.route) return null;
  
  const route = routeConfig.route;
  
  // Build tag -> stopId map
  const tagToStopId = {};
  const stops = Array.isArray(route.stop) ? route.stop : [route.stop];
  stops.forEach(stop => {
    if (stop && stop.tag && stop.stopId) {
      tagToStopId[stop.tag] = stop.stopId;
    }
  });
  
  // Extract direction sequences
  const directions = Array.isArray(route.direction) ? route.direction : [route.direction].filter(Boolean);
  const sequences = {};
  
  for (const dir of directions) {
    if (!dir || !dir.stop) continue;
    
    // Determine direction key from name
    let dirKey = dir.name || 'Unknown';
    
    // Normalize direction names
    if (dirKey.includes('North') || dirKey === 'North') dirKey = 'Northbound';
    else if (dirKey.includes('South') || dirKey === 'South') dirKey = 'Southbound';
    else if (dirKey.includes('East') || dirKey === 'East') dirKey = 'Eastbound';
    else if (dirKey.includes('West') || dirKey === 'West') dirKey = 'Westbound';
    else if (dirKey.includes('Loop')) dirKey = 'Loop';
    
    // Get ordered stop IDs
    const dirStops = Array.isArray(dir.stop) ? dir.stop : [dir.stop];
    const stopIds = dirStops
      .map(s => {
        const tag = s.tag || s;
        // Handle arrival tags (e.g., "14229_ar" -> "14229")
        const baseTag = tag.replace(/_ar$/, '');
        return tagToStopId[tag] || tagToStopId[baseTag] || null;
      })
      .filter(Boolean);
    
    // Only add if we have stops
    if (stopIds.length > 0) {
      // If direction already exists, use a numbered suffix
      if (sequences[dirKey]) {
        let suffix = 2;
        while (sequences[`${dirKey}${suffix}`]) suffix++;
        dirKey = `${dirKey}${suffix}`;
      }
      sequences[dirKey] = stopIds;
    }
  }
  
  return Object.keys(sequences).length > 0 ? sequences : null;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  console.log('🚌 Fetching TTC route sequences from NextBus API...\n');
  
  const results = {};
  const errors = [];
  const notFound = [];
  
  // Process routes with rate limiting
  for (let i = 0; i < ALL_ROUTES.length; i++) {
    const routeNum = ALL_ROUTES[i];
    process.stdout.write(`\r[${i + 1}/${ALL_ROUTES.length}] Fetching route ${routeNum}...`);
    
    try {
      const config = await fetchRouteConfig(routeNum);
      
      if (!config) {
        notFound.push(routeNum);
        continue;
      }
      
      const sequences = extractStopSequences(config);
      
      if (sequences) {
        results[routeNum] = sequences;
      } else {
        errors.push({ route: routeNum, error: 'No direction data' });
      }
    } catch (e) {
      errors.push({ route: routeNum, error: e.message });
    }
    
    // Rate limit: 100ms between requests
    await sleep(100);
  }
  
  console.log('\n');
  
  // Write results
  const outputPath = path.join(__dirname, '..', 'static', 'data', 'ttc-route-stop-orders.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  // Also copy to src/lib/data
  const srcOutputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'ttc-route-stop-orders.json');
  fs.writeFileSync(srcOutputPath, JSON.stringify(results, null, 2));
  
  // Summary
  console.log('=== SUMMARY ===');
  console.log(`✅ Routes processed: ${Object.keys(results).length}`);
  console.log(`⚠️  Routes not found: ${notFound.length}${notFound.length > 0 ? ' (' + notFound.join(', ') + ')' : ''}`);
  console.log(`❌ Errors: ${errors.length}${errors.length > 0 ? '\n' + errors.map(e => `   - Route ${e.route}: ${e.error}`).join('\n') : ''}`);
  console.log(`\n📁 Output written to:`);
  console.log(`   - ${outputPath}`);
  console.log(`   - ${srcOutputPath}`);
  
  // Show sample
  console.log('\n📊 Sample output (route 116):');
  if (results['116']) {
    console.log(JSON.stringify(results['116'], null, 2).split('\n').slice(0, 10).join('\n') + '\n   ...');
  }
}

main().catch(console.error);
