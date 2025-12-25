/**
 * TTC Subway Station to Line Mapping
 *
 * This module provides comprehensive mapping between subway stations and their lines.
 * Useful for:
 * - Determining which lines serve a station
 * - Getting all stations on a specific line (in order)
 * - Identifying interchange stations
 * - Normalizing station names for search/matching
 */

export type SubwayLine = 'Line 1' | 'Line 2' | 'Line 4' | 'Line 6';

export interface SubwayLineInfo {
	id: SubwayLine;
	name: string;
	color: string;
	stations: string[];
}

/**
 * Line metadata with official names and brand colors
 */
export const SUBWAY_LINE_INFO: Record<SubwayLine, Omit<SubwayLineInfo, 'stations'>> = {
	'Line 1': {
		id: 'Line 1',
		name: 'Yonge-University',
		color: '#FFD500' // Yellow
	},
	'Line 2': {
		id: 'Line 2',
		name: 'Bloor-Danforth',
		color: '#00A94F' // Green
	},
	'Line 4': {
		id: 'Line 4',
		name: 'Sheppard',
		color: '#A91C97' // Purple
	},
	'Line 6': {
		id: 'Line 6',
		name: 'Finch West',
		color: '#D98A15' // Orange/Gold
	}
};

/**
 * Ordered station lists for each subway line
 * Stations are listed in geographic order (north-to-south for Line 1, west-to-east for Line 2, etc.)
 *
 * Note: Line 1 has two branches that split at St George:
 * - North: Finch to St George
 * - West: St George to Vaughan Metropolitan Centre
 */
export const LINE_STATIONS: Record<SubwayLine, string[]> = {
	'Line 1': [
		// Northern terminus to downtown
		'Finch',
		'North York Centre',
		'Sheppard-Yonge',
		'York Mills',
		'Lawrence',
		'Eglinton',
		'Davisville',
		'St Clair',
		'Summerhill',
		'Rosedale',
		'Bloor-Yonge', // Interchange with Line 2 (called "Bloor Station" in GTFS)
		'Wellesley',
		'College',
		'TMU', // Formerly Dundas
		'Queen',
		'King',
		'Union',
		'St Andrew',
		'Osgoode',
		'St Patrick',
		"Queen's Park",
		'Museum',
		'St George', // Interchange with Line 2, branch point
		'Spadina', // Interchange with Line 2
		'Dupont',
		'St Clair West',
		'Cedarvale', // Formerly Eglinton West
		'Glencairn',
		'Lawrence West',
		'Yorkdale',
		'Wilson',
		'Sheppard West', // Formerly Downsview
		'Downsview Park',
		'Finch West', // Not to be confused with Line 6 terminus
		'York University',
		'Pioneer Village',
		'Highway 407',
		'Vaughan Metropolitan Centre'
	],

	'Line 2': [
		// West to East
		'Kipling',
		'Islington',
		'Royal York',
		'Old Mill',
		'Jane',
		'Runnymede',
		'High Park',
		'Keele',
		'Dundas West',
		'Lansdowne',
		'Dufferin',
		'Ossington',
		'Christie',
		'Bathurst',
		'Spadina', // Interchange with Line 1
		'St George', // Interchange with Line 1
		'Bay',
		'Bloor-Yonge', // Interchange with Line 1 (called "Yonge Station" in GTFS)
		'Sherbourne',
		'Castle Frank',
		'Broadview',
		'Chester',
		'Pape',
		'Donlands',
		'Greenwood',
		'Coxwell',
		'Woodbine',
		'Main Street',
		'Victoria Park',
		'Warden',
		'Kennedy'
	],

	'Line 4': [
		// West to East (short line)
		'Sheppard-Yonge', // Interchange with Line 1
		'Bayview',
		'Bessarion',
		'Leslie',
		'Don Mills'
	],

	'Line 6': [
		// West to East (LRT, opened 2024)
		'Humber College',
		'Westmore',
		'Martin Grove',
		'Albion',
		'Stevenson',
		'Mount Olive',
		'Rowntree Mills',
		'Pearldale',
		'Duncanwoods',
		'Milvan Rumike',
		'Emery',
		'Signet Arrow',
		'Norfinch Oakdale',
		'Jane and Finch',
		'Driftwood',
		'Tobermory',
		'Sentinel',
		'Finch West' // Connection to Line 1 at Finch West station
	]
};

/**
 * Mapping from station name to the lines that serve it
 * Includes normalized names (without "Station" suffix)
 */
export const STATION_TO_LINES: Record<string, SubwayLine[]> = {};

// Build STATION_TO_LINES from LINE_STATIONS
for (const [line, stations] of Object.entries(LINE_STATIONS)) {
	for (const station of stations) {
		if (!STATION_TO_LINES[station]) {
			STATION_TO_LINES[station] = [];
		}
		STATION_TO_LINES[station].push(line as SubwayLine);
	}
}

/**
 * Interchange stations that serve multiple lines
 */
export const INTERCHANGE_STATIONS: Record<string, SubwayLine[]> = {
	'Bloor-Yonge': ['Line 1', 'Line 2'],
	'St George': ['Line 1', 'Line 2'],
	'Spadina': ['Line 1', 'Line 2'],
	'Sheppard-Yonge': ['Line 1', 'Line 4']
};

/**
 * Station name aliases for fuzzy matching
 * Maps alternate names to canonical names used in LINE_STATIONS
 *
 * Important: The GTFS data uses "Bloor Station" for Line 1 and "Yonge Station" for Line 2
 * but they're actually the same physical interchange (Bloor-Yonge)
 */
export const STATION_ALIASES: Record<string, string> = {
	// Bloor-Yonge complex (GTFS quirk)
	'Bloor': 'Bloor-Yonge',
	'Bloor Station': 'Bloor-Yonge',
	'Yonge': 'Bloor-Yonge',
	'Yonge Station': 'Bloor-Yonge',

	// Common alternate names
	'Dundas': 'TMU',
	'Dundas Station': 'TMU',
	'Ryerson': 'TMU',
	'Eglinton West': 'Cedarvale',
	'Downsview': 'Sheppard West',
	'Downsview Station': 'Sheppard West',

	// With "Station" suffix
	'Finch Station': 'Finch',
	'Union Station': 'Union',
	'St George Station': 'St George',
	'Spadina Station': 'Spadina',
	'Sheppard-Yonge Station': 'Sheppard-Yonge',
	'Kennedy Station': 'Kennedy',
	'Kipling Station': 'Kipling',
	'Don Mills Station': 'Don Mills',
	'Vaughan Metropolitan Centre Station': 'Vaughan Metropolitan Centre'
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize a station name by removing "Station" suffix and applying aliases
 */
export function normalizeStationName(name: string): string {
	// Remove " Station" suffix and platform info
	let normalized = name
		.replace(/ Station$/i, '')
		.replace(/ - (Northbound|Southbound|Eastbound|Westbound) Platform$/i, '')
		.replace(/ - Subway Platform$/i, '')
		.trim();

	// Check aliases
	if (STATION_ALIASES[normalized]) {
		return STATION_ALIASES[normalized];
	}
	if (STATION_ALIASES[name]) {
		return STATION_ALIASES[name];
	}

	return normalized;
}

/**
 * Get the subway lines that serve a station
 * @param stationName - Station name (with or without "Station" suffix)
 * @returns Array of line IDs, or empty array if not a subway station
 */
export function getStationLines(stationName: string): SubwayLine[] {
	const normalized = normalizeStationName(stationName);
	return STATION_TO_LINES[normalized] || [];
}

/**
 * Check if a station is an interchange (serves multiple lines)
 */
export function isInterchangeStation(stationName: string): boolean {
	const lines = getStationLines(stationName);
	return lines.length > 1;
}

/**
 * Get all stations on a specific line
 * @param line - Line ID (e.g., "Line 1")
 * @returns Array of station names in order, or empty array if invalid line
 */
export function getLineStations(line: SubwayLine): string[] {
	return LINE_STATIONS[line] || [];
}

/**
 * Get line metadata (name, color)
 */
export function getLineInfo(line: SubwayLine): SubwayLineInfo | null {
	const info = SUBWAY_LINE_INFO[line];
	if (!info) return null;

	return {
		...info,
		stations: LINE_STATIONS[line] || []
	};
}

/**
 * Check if a string is a valid subway line ID
 */
export function isSubwayLine(line: string): line is SubwayLine {
	return line in LINE_STATIONS;
}

/**
 * Get the terminus stations for a line
 * @returns [western/northern terminus, eastern/southern terminus]
 */
export function getLineTermini(line: SubwayLine): [string, string] | null {
	const stations = LINE_STATIONS[line];
	if (!stations || stations.length === 0) return null;

	return [stations[0], stations[stations.length - 1]];
}

/**
 * Find stations that match a search query
 * Searches by station name (partial match, case-insensitive)
 */
export function searchStations(query: string): Array<{ station: string; lines: SubwayLine[] }> {
	const normalizedQuery = query.toLowerCase().trim();
	const results: Array<{ station: string; lines: SubwayLine[] }> = [];

	for (const [station, lines] of Object.entries(STATION_TO_LINES)) {
		if (station.toLowerCase().includes(normalizedQuery)) {
			results.push({ station, lines });
		}
	}

	return results;
}

/**
 * Get the position/index of a station on a line
 * Useful for calculating "stations away" or determining direction of travel
 * @returns Index (0-based) or -1 if station not on line
 */
export function getStationIndex(station: string, line: SubwayLine): number {
	const normalized = normalizeStationName(station);
	const stations = LINE_STATIONS[line];
	if (!stations) return -1;

	return stations.indexOf(normalized);
}

/**
 * Calculate the number of stations between two stations on the same line
 * @returns Number of stations (positive = going towards end, negative = going towards start), or null if not on same line
 */
export function getStationDistance(
	fromStation: string,
	toStation: string,
	line: SubwayLine
): number | null {
	const fromIndex = getStationIndex(fromStation, line);
	const toIndex = getStationIndex(toStation, line);

	if (fromIndex === -1 || toIndex === -1) return null;

	return toIndex - fromIndex;
}
