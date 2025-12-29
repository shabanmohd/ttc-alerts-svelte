/**
 * TTC Routes Fetcher
 * 
 * Fetches route list from NextBus API and generates categorized route data.
 * Run weekly via GitHub Actions to keep routes current.
 * 
 * Usage: node scripts/fetch-routes.cjs
 * 
 * Output: static/data/ttc-routes.json and src/lib/data/ttc-routes.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed?command=routeList&a=ttc';

// Subway/LRT lines (manually maintained - not in NextBus API)
const SUBWAY_LINES = [
  { route: 'Line 1', name: 'Yonge-University' },
  { route: 'Line 2', name: 'Bloor-Danforth' },
  { route: 'Line 4', name: 'Sheppard' },
  { route: 'Line 5', name: 'Eglinton' },
  { route: 'Line 6', name: 'Finch West' }
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Parse route title to extract name
 * "7-Bathurst" -> "Bathurst"
 * "501-Queen" -> "Queen"
 */
function parseRouteName(title) {
  const match = title.match(/^\d+[A-Z]?-(.+)$/);
  return match ? match[1] : title;
}

/**
 * Categorize route by number
 */
function categorizeRoute(tag) {
  const num = parseInt(tag, 10);
  
  // Shuttles (800-899)
  if (num >= 800 && num <= 899) return 'shuttle';
  
  // Streetcars (500-599)
  if (num >= 500 && num <= 599) return 'streetcar';
  
  // Express (900-999)
  if (num >= 900 && num <= 999) return 'express';
  
  // Blue Night (300-399)
  if (num >= 300 && num <= 399) return 'night';
  
  // Community (400-499) - Note: Most are discontinued per NextBus
  if (num >= 400 && num <= 499) return 'community';
  
  // Regular buses (1-299)
  return 'bus';
}

/**
 * Determine if a night route is a streetcar replacement
 * Night streetcar routes: 301, 304, 305, 306, 310, 312
 */
function isNightStreetcar(tag) {
  const nightStreetcarRoutes = ['301', '304', '305', '306', '310', '312'];
  return nightStreetcarRoutes.includes(tag);
}

async function main() {
  console.log('🚌 Fetching TTC routes from NextBus API...\n');
  
  const data = await fetchJSON(NEXTBUS_API);
  console.log(`📦 Received ${data.route.length} routes from API\n`);
  
  // Categorize routes
  const categories = {
    subway: SUBWAY_LINES,
    streetcar: [],
    express: [],
    night: [],        // Night bus routes
    nightStreetcar: [], // Night streetcar replacement routes
    community: [],
    bus: [],
    shuttle: []
  };
  
  // Track stats
  const stats = {
    streetcar: 0,
    express: 0,
    night: 0,
    nightStreetcar: 0,
    community: 0,
    bus: 0,
    shuttle: 0
  };
  
  for (const route of data.route) {
    const { tag, title } = route;
    const name = parseRouteName(title);
    const category = categorizeRoute(tag);
    const routeObj = { route: tag, name };
    
    if (category === 'night' && isNightStreetcar(tag)) {
      categories.nightStreetcar.push(routeObj);
      stats.nightStreetcar++;
    } else if (category === 'night') {
      categories.night.push(routeObj);
      stats.night++;
    } else {
      categories[category].push(routeObj);
      stats[category]++;
    }
  }
  
  // Sort each category by route number
  for (const key of Object.keys(categories)) {
    if (key === 'subway') continue; // Keep subway order as-is
    categories[key].sort((a, b) => {
      const numA = parseInt(a.route, 10);
      const numB = parseInt(b.route, 10);
      return numA - numB;
    });
  }
  
  // Build output
  const output = {
    lastUpdated: new Date().toISOString(),
    source: 'NextBus API',
    categories
  };
  
  // Write to static/data
  const staticPath = path.join(__dirname, '..', 'static', 'data', 'ttc-routes.json');
  fs.writeFileSync(staticPath, JSON.stringify(output, null, 2));
  console.log(`✅ Written to ${staticPath}`);
  
  // Also copy to src/lib/data for imports
  const srcPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'ttc-routes.json');
  fs.writeFileSync(srcPath, JSON.stringify(output, null, 2));
  console.log(`✅ Written to ${srcPath}`);
  
  // Print stats
  console.log('\n📊 Route Statistics:');
  console.log(`  Subway/LRT: ${categories.subway.length} (manually maintained)`);
  console.log(`  Streetcar: ${stats.streetcar}`);
  console.log(`  Express: ${stats.express}`);
  console.log(`  Blue Night Bus: ${stats.night}`);
  console.log(`  Blue Night Streetcar: ${stats.nightStreetcar}`);
  console.log(`  Community: ${stats.community}`);
  console.log(`  Regular Bus: ${stats.bus}`);
  console.log(`  Shuttle: ${stats.shuttle}`);
  console.log(`  Total: ${data.route.length + categories.subway.length}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
