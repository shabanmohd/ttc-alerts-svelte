/**
 * Fix Route Stop Orders - Convert NextBus tags to GTFS stopIds
 * 
 * The ttc-route-stop-orders.json currently uses NextBus tag values,
 * but ttc-stops.json uses GTFS stopId values.
 * 
 * NextBus API provides both:
 * - stopId: GTFS stop ID (matches our ttc-stops.json)
 * - tag: NextBus internal ID (currently in ttc-route-stop-orders.json)
 * 
 * This script fetches the NextBus routeConfig for each route and
 * creates a mapping from tag -> stopId, then updates the route stop orders.
 */

const fs = require('fs');
const path = require('path');

const NEXTBUS_API = 'https://retro.umoiq.com/service/publicJSONFeed';

// Routes to process (all TTC bus and streetcar routes)
const routeStopOrders = require('../static/data/ttc-route-stop-orders.json');
const routes = Object.keys(routeStopOrders);

async function fetchRouteConfig(routeNumber) {
    const url = `${NEXTBUS_API}?command=routeConfig&a=ttc&r=${routeNumber}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.warn(`Failed to fetch route ${routeNumber}: ${response.status}`);
        return null;
    }
    return response.json();
}

async function buildTagToStopIdMap(routeNumber) {
    const config = await fetchRouteConfig(routeNumber);
    if (!config || !config.route || !config.route.stop) {
        console.warn(`No stop data for route ${routeNumber}`);
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

async function fixRouteStopOrders() {
    const fixedOrders = {};
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
            fixedOrders[routeNumber] = routeStopOrders[routeNumber];
            failed++;
            continue;
        }
        
        // Convert each direction's stop tags to stopIds
        const routeData = routeStopOrders[routeNumber];
        const fixedRouteData = {};
        
        for (const [direction, stopTags] of Object.entries(routeData)) {
            const fixedStops = [];
            
            for (const tag of stopTags) {
                // Handle _ar suffix (arrival stop marker)
                const cleanTag = tag.replace(/_ar$/, '');
                const suffix = tag.endsWith('_ar') ? '_ar' : '';
                
                const stopId = tagMap.get(cleanTag);
                if (stopId) {
                    fixedStops.push(stopId + suffix);
                } else {
                    // Keep original tag if no mapping found
                    fixedStops.push(tag);
                    console.warn(`\nNo mapping for tag ${tag} on route ${routeNumber}`);
                }
            }
            
            fixedRouteData[direction] = fixedStops;
        }
        
        fixedOrders[routeNumber] = fixedRouteData;
        fixed++;
        
        // Rate limit to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n\nCompleted: ${fixed} routes fixed, ${failed} routes failed`);
    
    // Write updated file to static/data (lazy-loaded at runtime)
    const outputPath = path.join(__dirname, '../static/data/ttc-route-stop-orders.json');
    fs.writeFileSync(outputPath, JSON.stringify(fixedOrders, null, 2));
    console.log(`Updated ${outputPath}`);
}

fixRouteStopOrders().catch(console.error);
