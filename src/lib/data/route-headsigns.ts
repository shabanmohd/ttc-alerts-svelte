/**
 * Route headsigns data - maps route + direction to destination
 * Generated from GTFS trips.txt headsigns
 * 
 * Usage:
 *   import { getRouteHeadsign, getRouteDirectionLabel } from '$lib/data/route-headsigns';
 *   
 *   getRouteHeadsign('116', 'east');  // "Finch and Morningside"
 *   getRouteDirectionLabel('116', 'Eastbound');  // "Towards Finch and Morningside"
 */

import headsignsData from './route-headsigns.json';

type DirectionKey = 'east' | 'west' | 'north' | 'south';

interface RouteHeadsigns {
	[route: string]: Partial<Record<DirectionKey, string>>;
}

const headsigns: RouteHeadsigns = headsignsData;

/**
 * Get the destination headsign for a route in a given direction
 * @param route - Route number (e.g., "116", "501")
 * @param direction - Direction key (east, west, north, south)
 * @returns Destination name or null if not found
 */
export function getRouteHeadsign(route: string, direction: DirectionKey): string | null {
	const routeHeadsigns = headsigns[route];
	if (!routeHeadsigns) return null;
	return routeHeadsigns[direction] || null;
}

/**
 * Convert a direction label (e.g., "Eastbound") to a user-friendly destination label
 * (e.g., "Towards Kennedy Station")
 * 
 * @param route - Route number
 * @param directionLabel - Direction label like "Eastbound", "Westbound", etc.
 * @returns Label like "Towards Kennedy Station" or falls back to original direction
 */
export function getRouteDirectionLabel(route: string, directionLabel: string): string {
	// Map direction label to direction key
	const dirMap: Record<string, DirectionKey> = {
		'Eastbound': 'east',
		'Westbound': 'west',
		'Northbound': 'north',
		'Southbound': 'south',
	};
	
	const dirKey = dirMap[directionLabel];
	if (!dirKey) return directionLabel; // Return as-is if not a cardinal direction
	
	const destination = getRouteHeadsign(route, dirKey);
	if (destination) {
		return `Towards ${destination}`;
	}
	
	return directionLabel; // Fallback to original
}

/**
 * Get both direction labels for a route (for tabs)
 * Returns an object with direction labels mapped to their destination labels
 * 
 * @param route - Route number
 * @returns Object like { "Eastbound": "Towards Kennedy", "Westbound": "Towards Morningside" }
 */
export function getRouteDirectionLabels(route: string): Record<string, string> {
	const result: Record<string, string> = {};
	const routeHeadsigns = headsigns[route];
	
	if (!routeHeadsigns) return result;
	
	if (routeHeadsigns.east) {
		result['Eastbound'] = `Towards ${routeHeadsigns.east}`;
	}
	if (routeHeadsigns.west) {
		result['Westbound'] = `Towards ${routeHeadsigns.west}`;
	}
	if (routeHeadsigns.north) {
		result['Northbound'] = `Towards ${routeHeadsigns.north}`;
	}
	if (routeHeadsigns.south) {
		result['Southbound'] = `Towards ${routeHeadsigns.south}`;
	}
	
	return result;
}

export default headsigns;
