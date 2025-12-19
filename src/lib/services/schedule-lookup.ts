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
  weekday?: string;  // First departure time HH:MM
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
  tomorrowLabel?: string; // e.g., "Tomorrow (Saturday)"
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
 * Get tomorrow's date
 */
function getTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
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
  const todayFirst = getFirstDeparture(stopId, routeId, todayType);
  
  // Check if today's service is still upcoming
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
  
  // Service for today has ended or passed - show tomorrow's first departure
  const tomorrow = getTomorrow();
  const tomorrowType = getServiceDayType(tomorrow);
  const tomorrowFirst = getFirstDeparture(stopId, routeId, tomorrowType);
  
  if (tomorrowFirst) {
    // Check if tomorrow is a holiday
    const tomorrowHoliday = getTTCHoliday(tomorrow);
    const tomorrowDayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
    
    let tomorrowLabel = `Tomorrow (${tomorrowDayName})`;
    if (tomorrowHoliday) {
      tomorrowLabel = `Tomorrow (${tomorrowHoliday.name})`;
    }
    
    return {
      time: formatTo12Hour(tomorrowFirst),
      dayType: getDayTypeLabel(tomorrowType),
      isToday: false,
      tomorrowLabel
    };
  }
  
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
