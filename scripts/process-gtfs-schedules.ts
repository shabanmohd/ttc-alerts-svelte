/**
 * Process TTC GTFS data to extract first departure times per stop per route
 * 
 * This script creates a compact lookup table for showing "next scheduled bus"
 * when real-time data isn't available (e.g., off-hours).
 * 
 * Usage: npx ts-node scripts/process-gtfs-schedules.ts
 * 
 * Output: static/data/ttc-schedules.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GTFS_DIR = path.join(__dirname, 'gtfs');
const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'ttc-schedules.json');

// ============================================
// Types
// ============================================

interface Trip {
  tripId: string;
  routeId: string;
  serviceId: string;
  directionId: string;
  headsign: string;
}

interface StopTime {
  tripId: string;
  stopId: string;
  arrivalTime: string; // HH:MM:SS format
}

interface ServiceCalendar {
  serviceId: string;
  days: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  startDate: string;
  endDate: string;
}

// Service type: 'weekday', 'saturday', 'sunday'
type ServiceType = 'weekday' | 'saturday' | 'sunday';

// Output structure: stopId -> routeId -> serviceType -> firstDeparture (HH:MM)
interface ScheduleLookup {
  [stopId: string]: {
    [routeId: string]: {
      weekday?: string;
      saturday?: string;
      sunday?: string;
    };
  };
}

// ============================================
// Helpers
// ============================================

async function readCSV<T>(filename: string, transform: (row: string[]) => T | null): Promise<T[]> {
  const filepath = path.join(GTFS_DIR, filename);
  const results: T[] = [];
  
  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    const row = parseCSVLine(line);
    const item = transform(row);
    if (item) results.push(item);
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

/**
 * Determine service type from calendar entry
 */
function getServiceType(calendar: ServiceCalendar): ServiceType | null {
  const { days } = calendar;
  
  // Weekday service (Mon-Fri, not Sat/Sun)
  if (days.monday && days.tuesday && days.wednesday && days.thursday && days.friday && !days.saturday && !days.sunday) {
    return 'weekday';
  }
  
  // Saturday only
  if (!days.monday && !days.tuesday && !days.wednesday && !days.thursday && !days.friday && days.saturday && !days.sunday) {
    return 'saturday';
  }
  
  // Sunday only
  if (!days.monday && !days.tuesday && !days.wednesday && !days.thursday && !days.friday && !days.saturday && days.sunday) {
    return 'sunday';
  }
  
  return null;
}

/**
 * Format time as HH:MM (handle times > 24:00 for overnight service)
 */
function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const normalizedHours = hours % 24;
  return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Convert HH:MM:SS to minutes since midnight for comparison
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// ============================================
// Main Processing
// ============================================

async function main() {
  console.log('🚌 Processing TTC GTFS data...\n');
  
  // 1. Load calendar.txt to map service_id to day type
  console.log('Loading calendar.txt...');
  const calendars = await readCSV<ServiceCalendar>('calendar.txt', (row) => ({
    serviceId: row[0],
    days: {
      monday: row[1] === '1',
      tuesday: row[2] === '1',
      wednesday: row[3] === '1',
      thursday: row[4] === '1',
      friday: row[5] === '1',
      saturday: row[6] === '1',
      sunday: row[7] === '1',
    },
    startDate: row[8],
    endDate: row[9],
  }));
  
  // Create service_id -> serviceType map
  const serviceTypeMap = new Map<string, ServiceType>();
  for (const cal of calendars) {
    const type = getServiceType(cal);
    if (type) {
      serviceTypeMap.set(cal.serviceId, type);
    }
  }
  console.log(`  Found ${calendars.length} service calendars, ${serviceTypeMap.size} with clear day types\n`);
  
  // 2. Load trips.txt to map trip_id to route_id and service_id
  console.log('Loading trips.txt...');
  const trips = await readCSV<Trip>('trips.txt', (row) => ({
    routeId: row[0],
    serviceId: row[1],
    tripId: row[2],
    headsign: row[3],
    directionId: row[5],
  }));
  
  // Create trip_id -> Trip map
  const tripMap = new Map<string, Trip>();
  for (const trip of trips) {
    tripMap.set(trip.tripId, trip);
  }
  console.log(`  Loaded ${trips.length} trips\n`);
  
  // 3. Process stop_times.txt (streaming because it's large)
  console.log('Processing stop_times.txt (this may take a minute)...');
  
  // Track first departure per stop per route per service type
  const schedules: ScheduleLookup = {};
  let processedLines = 0;
  
  const filepath = path.join(GTFS_DIR, 'stop_times.txt');
  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    
    processedLines++;
    if (processedLines % 1000000 === 0) {
      console.log(`  Processed ${(processedLines / 1000000).toFixed(1)}M lines...`);
    }
    
    const row = parseCSVLine(line);
    const tripId = row[0];
    const arrivalTime = row[1];
    const stopId = row[3];
    
    // Look up the trip to get route and service info
    const trip = tripMap.get(tripId);
    if (!trip) continue;
    
    // Get the service type for this trip
    const serviceType = serviceTypeMap.get(trip.serviceId);
    if (!serviceType) continue;
    
    // Initialize structures if needed
    if (!schedules[stopId]) {
      schedules[stopId] = {};
    }
    if (!schedules[stopId][trip.routeId]) {
      schedules[stopId][trip.routeId] = {};
    }
    
    // Only keep the earliest departure for each service type
    const currentFirst = schedules[stopId][trip.routeId][serviceType];
    if (!currentFirst || timeToMinutes(arrivalTime) < timeToMinutes(currentFirst + ':00')) {
      schedules[stopId][trip.routeId][serviceType] = formatTime(arrivalTime);
    }
  }
  
  console.log(`  Processed ${processedLines.toLocaleString()} stop time entries\n`);
  
  // 4. Count statistics
  const stopCount = Object.keys(schedules).length;
  let routeStopCombos = 0;
  for (const stopId in schedules) {
    routeStopCombos += Object.keys(schedules[stopId]).length;
  }
  
  console.log(`📊 Statistics:`);
  console.log(`  - Unique stops: ${stopCount.toLocaleString()}`);
  console.log(`  - Route-stop combinations: ${routeStopCombos.toLocaleString()}\n`);
  
  // 5. Save output
  console.log('Writing output file...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Write minified JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(schedules));
  
  const fileSizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  console.log(`✅ Saved to ${OUTPUT_FILE} (${fileSizeKB} KB)\n`);
  
  console.log('Done! 🎉');
}

main().catch(console.error);
