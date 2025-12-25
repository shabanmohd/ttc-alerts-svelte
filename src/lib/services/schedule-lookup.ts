/**
 * TTC Schedule Lookup Service
 * 
 * Provides static schedule data for when real-time ETA isn't available.
 * Uses pre-processed GTFS data from /data/ttc-schedules.json
 */

import { browser } from '$app/environment';
import { getTTCHoliday } from '$lib/utils/ttc-service-info';

// ============================================
// Types
// ============================================

export interface RouteSchedule {
  weekday?: string;    // First AM departure time HH:MM
  weekdayPM?: string;  // First PM departure (after 3PM) for express routes
  saturday?: string;
  sunday?: string;
}

export interface StopSchedules {
  [routeId: string]: RouteSchedule;
}

export interface ScheduleData {
  [stopId: string]: StopSchedules;
}

export interface NextDepartureInfo {
  time: string;           // e.g., "5:31 AM"
  dayType: string;        // e.g., "weekday", "Saturday", "Sunday"
  isToday: boolean;       // Whether this departure is today or tomorrow
  tomorrowLabel?: string; // e.g., "Tomorrow (Saturday)" or "Friday Dec 27"
  nextWeekdayLabel?: string; // e.g., "Monday" - for express routes on weekends
  isPM?: boolean;         // Whether this is an evening/PM departure
  noWeekendService?: boolean; // Express routes don't run on weekends
  daysUntilService?: number; // Days until next service (for routes with gaps)
}

// PM period starts at 3PM (15:00)
const PM_START_HOUR = 15;
const PM_START_MINUTES = PM_START_HOUR * 60;

// Express bus routes (9xx series) - run only during peak hours
function isExpressRoute(routeId: string): boolean {
  const routeNum = parseInt(routeId, 10);
  return routeNum >= 900 && routeNum <= 999;
}

// ============================================
// Schedule Data Cache
// ============================================

let scheduleData: ScheduleData | null = null;
let loadPromise: Promise<ScheduleData> | null = null;

/**
 * Load schedule data (cached after first load)
 */
export async function loadScheduleData(): Promise<ScheduleData> {
  if (scheduleData) return scheduleData;
  
  if (loadPromise) return loadPromise;
  
  loadPromise = (async () => {
    if (!browser) return {};
    
    try {
      const response = await fetch('/data/ttc-schedules.json');
      if (!response.ok) throw new Error('Failed to load schedule data');
      scheduleData = await response.json();
      return scheduleData!;
    } catch (error) {
      console.error('Failed to load TTC schedule data:', error);
      return {};
    }
  })();
  
  return loadPromise;
}

/**
 * Preload schedule data (call during app initialization)
 */
export function preloadScheduleData(): void {
  loadScheduleData();
}

// ============================================
// Day Type Helpers
// ============================================

/**
 * Determine the service day type for a given date
 * Considers holidays which typically run on Sunday schedule
 */
export function getServiceDayType(date: Date = new Date()): 'weekday' | 'saturday' | 'sunday' {
  const day = date.getDay();
  const holiday = getTTCHoliday(date);
  
  // Holidays typically run Sunday schedule
  if (holiday) {
    return 'sunday';
  }
  
  // Sunday = 0, Saturday = 6
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
}

/**
 * Get the display label for a day type
 */
export function getDayTypeLabel(dayType: 'weekday' | 'saturday' | 'sunday'): string {
  switch (dayType) {
    case 'weekday': return 'Weekday';
    case 'saturday': return 'Saturday';
    case 'sunday': return 'Sunday';
  }
}

/**
 * Format time from 24h (HH:MM) to 12h (h:mm AM/PM)
 */
export function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Parse time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// ============================================
// Schedule Query Functions
// ============================================

/**
 * Get the first scheduled departure for a route at a stop
 * Returns the appropriate time based on day type
 */
export function getFirstDeparture(
  stopId: string,
  routeId: string,
  dayType: 'weekday' | 'saturday' | 'sunday'
): string | null {
  if (!scheduleData) return null;
  
  const stopSchedules = scheduleData[stopId];
  if (!stopSchedules) return null;
  
  const routeSchedule = stopSchedules[routeId];
  if (!routeSchedule) return null;
  
  return routeSchedule[dayType] || null;
}

/**
 * Get all first departures for a stop (all routes)
 */
export function getStopFirstDepartures(
  stopId: string,
  dayType: 'weekday' | 'saturday' | 'sunday'
): Map<string, string> {
  const result = new Map<string, string>();
  
  if (!scheduleData) return result;
  
  const stopSchedules = scheduleData[stopId];
  if (!stopSchedules) return result;
  
  for (const [routeId, schedule] of Object.entries(stopSchedules)) {
    const time = schedule[dayType];
    if (time) {
      result.set(routeId, time);
    }
  }
  
  return result;
}

/**
 * Get the next scheduled departure considering current time
 * Returns info about when the next bus will come
 * 
 * For express routes (9xx), also checks PM schedule when:
 * - It's a weekday
 * - Current time is past the AM first departure
 * - There's an evening service available
 */
export function getNextScheduledDeparture(
  stopId: string,
  routeId: string
): NextDepartureInfo | null {
  if (!scheduleData) return null;
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentMinutes = timeToMinutes(currentTime);
  
  // Get today's service type and first departure
  const todayType = getServiceDayType(now);
  const stopSchedules = scheduleData[stopId];
  if (!stopSchedules) return null;
  
  const routeSchedule = stopSchedules[routeId];
  if (!routeSchedule) return null;
  
  // Express routes don't run on weekends - show next weekday's first departure
  if (isExpressRoute(routeId) && (todayType === 'saturday' || todayType === 'sunday')) {
    // Get the weekday first departure time
    const weekdayFirst = routeSchedule['weekday'] || null;
    if (weekdayFirst) {
      // Calculate next Monday
      const daysUntilMonday = todayType === 'saturday' ? 2 : 1;
      const nextMonday = new Date(now);
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      const mondayLabel = nextMonday.toLocaleDateString('en-US', { weekday: 'long' });
      
      return {
        time: formatTo12Hour(weekdayFirst),
        dayType: 'Weekday',
        isToday: false,
        noWeekendService: true,
        nextWeekdayLabel: mondayLabel
      };
    }
    
    // Fallback if no weekday schedule exists
    return {
      time: '',
      dayType: '',
      isToday: false,
      noWeekendService: true
    };
  }
  
  const todayFirst = routeSchedule[todayType] || null;
  
  // Check if today's AM service is still upcoming
  if (todayFirst) {
    const departureMinutes = timeToMinutes(todayFirst);
    if (departureMinutes > currentMinutes) {
      return {
        time: formatTo12Hour(todayFirst),
        dayType: getDayTypeLabel(todayType),
        isToday: true
      };
    }
  }
  
  // For express routes on weekdays, check PM schedule
  // This shows evening service when AM service has passed but evening hasn't started
  // Only show PM when we're in the mid-day gap (at least 2 hours after AM departure)
  if (todayType === 'weekday' && isExpressRoute(routeId) && routeSchedule.weekdayPM) {
    const pmDepartureMinutes = timeToMinutes(routeSchedule.weekdayPM);
    const amDepartureMinutes = todayFirst ? timeToMinutes(todayFirst) : 0;
    
    // Only show PM schedule if:
    // 1. Current time is after AM departure
    // 2. Current time is before PM departure
    // 3. At least 2 hours have passed since AM departure (to avoid early morning edge case)
    if (currentMinutes > amDepartureMinutes && currentMinutes < pmDepartureMinutes) {
      const hoursPastAM = (currentMinutes - amDepartureMinutes) / 60;
      if (hoursPastAM >= 2) {
        return {
          time: formatTo12Hour(routeSchedule.weekdayPM),
          dayType: 'Weekday (PM)',
          isToday: true,
          isPM: true
        };
      }
    }
  }
  
  // Service for today has ended or passed - look ahead for next available service
  // Check up to 7 days ahead to handle holidays and weekend gaps
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(0, 0, 0, 0);
    
    const futureType = getServiceDayType(futureDate);
    const futureFirst = getFirstDeparture(stopId, routeId, futureType);
    
    if (futureFirst) {
      const futureHoliday = getTTCHoliday(futureDate);
      const futureDayName = futureDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      let futureLabel: string;
      if (daysAhead === 1) {
        futureLabel = futureHoliday 
          ? `Tomorrow (${futureHoliday.name})` 
          : `Tomorrow (${futureDayName})`;
      } else {
        // For days further ahead, show the day name and optionally date
        const dateStr = futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        futureLabel = futureHoliday
          ? `${futureDayName} ${dateStr} (${futureHoliday.name})`
          : `${futureDayName} ${dateStr}`;
      }
      
      return {
        time: formatTo12Hour(futureFirst),
        dayType: getDayTypeLabel(futureType),
        isToday: false,
        tomorrowLabel: futureLabel,
        daysUntilService: daysAhead  // Add this info for UI display
      };
    }
  }
  
  // No service found within the next 7 days
  return null;
}

/**
 * Get the next scheduled departures for all routes at a stop
 */
export function getNextScheduledDeparturesForStop(
  stopId: string,
  routeIds: string[]
): Map<string, NextDepartureInfo> {
  const result = new Map<string, NextDepartureInfo>();
  
  for (const routeId of routeIds) {
    const info = getNextScheduledDeparture(stopId, routeId);
    if (info) {
      result.set(routeId, info);
    }
  }
  
  return result;
}

/**
 * Check if schedule data has been loaded
 */
export function isScheduleDataLoaded(): boolean {
  return scheduleData !== null;
}

/**
 * Get all route IDs that have schedules for a stop
 */
export function getRoutesForStop(stopId: string): string[] {
  if (!scheduleData) return [];
  
  const stopSchedules = scheduleData[stopId];
  if (!stopSchedules) return [];
  
  return Object.keys(stopSchedules);
}
