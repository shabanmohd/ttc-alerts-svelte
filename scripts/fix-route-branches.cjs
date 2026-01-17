/**
 * Fix Route Branches - Convert NextBus tags to GTFS stopIds
 * 
 * The ttc-route-branches.json also uses NextBus tag values for stop IDs.
 * This script converts them to GTFS stopIds using the same mapping from NextBus API.
 */

const fs = require('fs');
const path = require('path');

const NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

// Load existing branch data
const routeBranches = require('../static/data/ttc-route-branches.json');
const routes = Object.keys(routeBranches);

async function fetchRouteConfig(routeNumber) {
    const url = `${NEXTBUS_API}?command=routeConfig&a=ttc&r=${routeNumber}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to fetch route ${routeNumber}: ${response.status}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.warn(`Error fetching route ${routeNumber}: ${error.message}`);
        return null;
    }
}

async function buildTagToStopIdMap(routeNumber) {
    const config = await fetchRouteConfig(routeNumber);
    if (!config || !config.route || !config.route.stop) {
        return null;
    }
    
    const tagToStopId = new Map();
    for (const stop of config.route.stop) {
        if (stop.tag && stop.stopId) {
            tagToStopId.set(stop.tag, stop.stopId);
        }
    }
    
    return tagToStopId;
}

async function fixRouteBranches() {
    const fixedBranches = {};
    let totalRoutes = routes.length;
    let processed = 0;
    let fixed = 0;
    let failed = 0;
    
    console.log(`Processing ${totalRoutes} routes...`);
    
    for (const routeNumber of routes) {
        processed++;
        process.stdout.write(`\r[${processed}/${totalRoutes}] Processing route ${routeNumber}...`);
        
        const tagMap = await buildTagToStopIdMap(routeNumber);
        
        if (!tagMap || tagMap.size === 0) {
            // Keep original if we can't get mapping
            fixedBranches[routeNumber] = routeBranches[routeNumber];
            failed++;
            continue;
        }
        
        // Convert each branch's stop tags to stopIds
        const routeData = routeBranches[routeNumber];
        const fixedRouteData = { directions: {} };
        
        for (const [direction, dirData] of Object.entries(routeData.directions)) {
            fixedRouteData.directions[direction] = { branches: [] };
            
            for (const branch of dirData.branches) {
                const fixedStops = [];
                
                for (const tag of branch.stops) {
                    // Handle _ar suffix
                    const cleanTag = tag.replace(/_ar$/, '');
                    const suffix = tag.endsWith('_ar') ? '_ar' : '';
                    
                    const stopId = tagMap.get(cleanTag);
                    if (stopId) {
                        fixedStops.push(stopId + suffix);
                    } else {
                        // Keep original tag if no mapping found
                        fixedStops.push(tag);
                    }
                }
                
                fixedRouteData.directions[direction].branches.push({
                    id: branch.id,
                    title: branch.title,
                    stops: fixedStops
                });
            }
        }
        
        fixedBranches[routeNumber] = fixedRouteData;
        fixed++;
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n\nCompleted: ${fixed} routes fixed, ${failed} routes failed`);
    
    // Write updated file to static/data (lazy-loaded at runtime)
    const outputPath = path.join(__dirname, '../static/data/ttc-route-branches.json');
    fs.writeFileSync(outputPath, JSON.stringify(fixedBranches, null, 2));
    console.log(`Updated ${outputPath}`);
}

fixRouteBranches().catch(console.error);
