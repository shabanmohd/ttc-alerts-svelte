/**
 * TTC Service Information Utility
 * 
 * ============================================
 * ANNUAL UPDATE REQUIRED
 * ============================================
 * 
 * Update this file when TTC publishes new holiday schedules:
 * 🔗 https://www.ttc.ca/riding-the-ttc/Updates/Holiday-service
 * 
 * What to update:
 * 1. Add new HOLIDAYS_20XX record with the year's holiday dates
 * 2. Update the ALL_HOLIDAYS spread at the bottom
 * 3. Variable holidays change yearly: Family Day, Good Friday, Victoria Day, etc.
 * 4. Update SUSPENDED_LINES when lines are suspended/restored
 * 
 * Last updated: December 2024 (for 2024, 2025 & 2026 schedules)
 * 
 * ============================================
 * SERVICE HOURS SUMMARY
 * ============================================
 * 
 * Lines 1, 2, 4 (Subway):
 * - Mon-Sat: ~6am - ~2am
 * - Sunday: ~8am - ~2am
 * - Holidays: Sunday schedule starting ~6am (except Christmas/New Year's = full Sunday)
 * 
 * Line 6 Finch West (LRT):
 * ⚠️ CURRENTLY NOT IN SERVICE - 336 Finch West bus provides replacement service
 * (When operational: Weekday 5:30am-1:30am, Weekend 6/8am-1am, Holidays 7am-10pm)
 * 
 * Blue Night Network:
 * - 1:30am - 5:30am
 * - Every 30 minutes or better
 */

// ============================================
// Types
// ============================================

export interface TTCHoliday {
  name: string;
  /** 'sunday' = full Sunday service (subway ~8am), 'holiday' = Sunday schedule starting ~6am */
  type: 'holiday' | 'sunday';
}

export interface ServiceInfo {
  icon: 'moon' | 'clock' | 'alert';
  title: string;
  subtitle: string;
  frequency?: string;
  additionalInfo?: string;  // For displaying extra info on a separate line
}

// ============================================
// Service Hours by Line
// ============================================

/**
 * TTC Subway/LRT service hours by line
 * Source: https://www.ttc.ca/riding-the-ttc/Updates/Holiday-service
 */
export const LINE_SERVICE_HOURS = {
  // Lines 1, 2, 4: Traditional subway hours
  subway: {
    weekday: { start: 6, end: 2 },      // ~6am - ~2am (next day)
    saturday: { start: 6, end: 2 },     // ~6am - ~2am
    sunday: { start: 8, end: 2 },       // ~8am - ~2am
    holiday: { start: 6, end: 2 },      // ~6am (Sunday schedule but earlier start)
    sundayHoliday: { start: 8, end: 2 } // Christmas/New Year's: ~8am - ~2am
  },
  // Line 6 Finch West LRT: Different hours
  line6: {
    weekday: { start: 5.5, end: 1.5 },   // ~5:30am - ~1:30am
    saturday: { start: 6, end: 1.5 },    // ~6am - ~1:30am
    sunday: { start: 8, end: 1 },        // ~8am - ~1am
    holiday: { start: 7, end: 22 },      // 7am - 10pm (shuttle bus 10pm-1am)
    sundayHoliday: { start: 7.5, end: 22 } // 7:30am - 10pm (shuttle bus after)
  }
} as const;

/**
 * Currently suspended/non-operational lines
 * Update when lines are suspended or restored
 * 
 * Set to null when line is operational, or provide suspension info
 */
export const SUSPENDED_LINES: Record<string, { 
  message: string; 
  replacement?: string;
  normalHours?: string;
} | null> = {
  // ============================================
  // Line 1 Yonge-University - Set to null when operational
  // ============================================
  line1: null,
  // Example when suspended:
  // line1: {
  //   message: 'Line 1 Yonge-University is currently not in service.',
  //   replacement: 'Shuttle buses running between affected stations.',
  //   normalHours: 'When operational: First train ~6am Mon-Sat, ~8am Sun.'
  // },

  // ============================================
  // Line 2 Bloor-Danforth - Set to null when operational
  // ============================================
  line2: null,
  // Example when suspended:
  // line2: {
  //   message: 'Line 2 Bloor-Danforth is currently not in service.',
  //   replacement: 'Shuttle buses running between affected stations.',
  //   normalHours: 'When operational: First train ~6am Mon-Sat, ~8am Sun.'
  // },

  // ============================================
  // Line 4 Sheppard - Set to null when operational
  // ============================================
  line4: null,
  // Example when suspended:
  // line4: {
  //   message: 'Line 4 Sheppard is currently not in service.',
  //   replacement: '985 Sheppard East bus provides replacement service.',
  //   normalHours: 'When operational: First train ~6am Mon-Sat, ~8am Sun.'
  // },

  // ============================================
  // Line 6 Finch West LRT - OPERATIONAL (opened Dec 14, 2024)
  // ============================================
  line6: null,
  // Example when suspended:
  // line6: {
  //   message: 'Line 6 Finch West LRT is currently not in service.',
  //   replacement: '336 Finch West bus provides replacement service.',
  //   normalHours: 'When operational: First train ~5:30am weekdays, ~6am Sat, ~8am Sun.'
  // },
};

/**
 * Service frequency by day type (in minutes)
 * Source: TTC route pages - varies by line but these are typical subway frequencies
 */
export const SERVICE_FREQUENCY = {
  weekdayRushHour: '2-3',  // 6-9am, 3-7pm
  weekdayOffPeak: '4-5',
  saturday: '3-4',
  sunday: '4-5',
  holiday: '4-5',
  line6: {
    peak: '5',
    offPeak: '7-8',
    weekend: '10'
  }
} as const;

// ============================================
// Holiday Dates
// ============================================

/**
 * TTC Holiday schedule dates
 * IMPORTANT: Update annually! Variable holidays change each year.
 * 
 * Holiday types:
 * - 'sunday': Full Sunday service (subway starts ~8am) - Christmas, New Year's
 * - 'holiday': Sunday schedule but starts earlier (~6am) - All other holidays
 */
export const HOLIDAYS_2024: Record<string, TTCHoliday> = {
  '2024-01-01': { name: "New Year's Day", type: 'sunday' },
  '2024-02-19': { name: 'Family Day', type: 'holiday' },
  '2024-03-29': { name: 'Good Friday', type: 'holiday' },
  '2024-05-20': { name: 'Victoria Day', type: 'holiday' },
  '2024-07-01': { name: 'Canada Day', type: 'holiday' },
  '2024-08-05': { name: 'Simcoe Day', type: 'holiday' },
  '2024-09-02': { name: 'Labour Day', type: 'holiday' },
  '2024-10-14': { name: 'Thanksgiving', type: 'holiday' },
  '2024-12-25': { name: 'Christmas Day', type: 'sunday' },
  '2024-12-26': { name: 'Boxing Day', type: 'holiday' },
};

export const HOLIDAYS_2025: Record<string, TTCHoliday> = {
  '2025-01-01': { name: "New Year's Day", type: 'sunday' },
  '2025-02-17': { name: 'Family Day', type: 'holiday' },
  '2025-04-18': { name: 'Good Friday', type: 'holiday' },
  '2025-05-19': { name: 'Victoria Day', type: 'holiday' },
  '2025-07-01': { name: 'Canada Day', type: 'holiday' },
  '2025-08-04': { name: 'Simcoe Day', type: 'holiday' },
  '2025-09-01': { name: 'Labour Day', type: 'holiday' },
  '2025-10-13': { name: 'Thanksgiving', type: 'holiday' },
  '2025-12-25': { name: 'Christmas Day', type: 'sunday' },
  '2025-12-26': { name: 'Boxing Day', type: 'holiday' },
};

export const HOLIDAYS_2026: Record<string, TTCHoliday> = {
  '2026-01-01': { name: "New Year's Day", type: 'sunday' },
  '2026-02-16': { name: 'Family Day', type: 'holiday' },      // 3rd Monday Feb
  '2026-04-03': { name: 'Good Friday', type: 'holiday' },     // Varies
  '2026-05-18': { name: 'Victoria Day', type: 'holiday' },    // Monday before May 25
  '2026-07-01': { name: 'Canada Day', type: 'holiday' },
  '2026-08-03': { name: 'Simcoe Day', type: 'holiday' },      // 1st Monday Aug
  '2026-09-07': { name: 'Labour Day', type: 'holiday' },      // 1st Monday Sep
  '2026-10-12': { name: 'Thanksgiving', type: 'holiday' },    // 2nd Monday Oct
  '2026-12-25': { name: 'Christmas Day', type: 'sunday' },
  '2026-12-26': { name: 'Boxing Day', type: 'holiday' },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get today's date as YYYY-MM-DD string
 */
function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a given date is a TTC holiday
 * Returns holiday info or null if not a holiday
 */
export function getTTCHoliday(date: Date = new Date()): TTCHoliday | null {
  const dateStr = getDateString(date);
  const year = date.getFullYear();
  
  // Check the appropriate year's holidays
  if (year === 2024) {
    return HOLIDAYS_2024[dateStr] || null;
  } else if (year === 2025) {
    return HOLIDAYS_2025[dateStr] || null;
  } else if (year === 2026) {
    return HOLIDAYS_2026[dateStr] || null;
  }
  
  // For years not yet defined, check fixed holidays only
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if (month === 1 && day === 1) return { name: "New Year's Day", type: 'sunday' };
  if (month === 12 && day === 25) return { name: 'Christmas Day', type: 'sunday' };
  if (month === 12 && day === 26) return { name: 'Boxing Day', type: 'holiday' };
  if (month === 7 && day === 1) return { name: 'Canada Day', type: 'holiday' };
  
  return null;
}

/**
 * Check if the current time is during rush hour (weekdays 6-9am, 3-7pm)
 */
export function isRushHour(date: Date = new Date()): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  
  // Not rush hour on weekends
  if (day === 0 || day === 6) return false;
  
  // Morning rush: 6am-9am
  if (hour >= 6 && hour < 9) return true;
  
  // Evening rush: 3pm-7pm
  if (hour >= 15 && hour < 19) return true;
  
  return false;
}

/**
 * Determine if this is a Line 6 stop based on stop ID or route
 * Line 6 stop IDs: 16289-16324
 */
export function isLine6Stop(stopId: string, routes?: string[]): boolean {
  // Check by route
  if (routes?.includes('6')) return true;
  
  // Check by stop ID range
  const id = parseInt(stopId, 10);
  if (!isNaN(id) && id >= 16289 && id <= 16324) return true;
  
  return false;
}

/**
 * Determine which subway line a stop belongs to
 * Returns: 'line1' | 'line2' | 'line4' | 'line6' | null
 */
export function getSubwayLine(stopId: string, routes?: string[]): 'line1' | 'line2' | 'line4' | 'line6' | null {
  // Line 6 Finch West
  if (isLine6Stop(stopId, routes)) return 'line6';
  
  // Check by route name if provided
  if (routes) {
    if (routes.includes('1')) return 'line1';
    if (routes.includes('2')) return 'line2';
    if (routes.includes('4')) return 'line4';
  }
  
  // Default - could add stop ID ranges for other lines if needed
  // For now, return null and let the general subway logic handle it
  return null;
}

/**
 * Get subway start hour based on day and holiday
 */
export function getSubwayStartHour(
  date: Date = new Date(), 
  isLine6: boolean = false
): number {
  const day = date.getDay();
  const holiday = getTTCHoliday(date);
  
  const hours = isLine6 ? LINE_SERVICE_HOURS.line6 : LINE_SERVICE_HOURS.subway;
  
  // Sunday
  if (day === 0) {
    return holiday?.type === 'sunday' 
      ? hours.sundayHoliday.start 
      : hours.sunday.start;
  }
  
  // Holiday (not Sunday)
  if (holiday) {
    return holiday.type === 'sunday' 
      ? hours.sundayHoliday.start 
      : hours.holiday.start;
  }
  
  // Saturday
  if (day === 6) return hours.saturday.start;
  
  // Weekday
  return hours.weekday.start;
}

/**
 * Get service frequency text based on current time
 */
export function getServiceFrequency(
  date: Date = new Date(),
  isLine6: boolean = false
): string {
  const day = date.getDay();
  const holiday = getTTCHoliday(date);
  
  if (isLine6) {
    if (day === 0 || day === 6) {
      return `Line 6: Every ${SERVICE_FREQUENCY.line6.weekend} minutes.`;
    }
    if (isRushHour(date)) {
      return `Line 6: Every ${SERVICE_FREQUENCY.line6.peak} minutes.`;
    }
    return `Line 6: Every ${SERVICE_FREQUENCY.line6.offPeak} minutes.`;
  }
  
  // Subway Lines 1, 2, 4
  if (holiday) {
    return `${holiday.name}: Trains every ${SERVICE_FREQUENCY.holiday} minutes.`;
  }
  
  if (day === 0) {
    return `Sunday: Trains every ${SERVICE_FREQUENCY.sunday} minutes.`;
  }
  
  if (day === 6) {
    return `Saturday: Trains every ${SERVICE_FREQUENCY.saturday} minutes.`;
  }
  
  if (isRushHour(date)) {
    return `Rush hour: Trains every ${SERVICE_FREQUENCY.weekdayRushHour} minutes.`;
  }
  
  return `Off-peak: Trains every ${SERVICE_FREQUENCY.weekdayOffPeak} minutes.`;
}

/**
 * Get context-aware empty state message for ETA displays
 */
export function getEmptyStateMessage(
  isSubway: boolean = true,
  stopId?: string,
  routes?: string[]
): ServiceInfo {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();
  const holiday = getTTCHoliday(now);
  
  // Determine which subway line (if any)
  const subwayLine = stopId ? getSubwayLine(stopId, routes) : null;
  const isLine6 = subwayLine === 'line6';
  
  // Check for suspended lines FIRST
  if (subwayLine && SUSPENDED_LINES[subwayLine]) {
    const suspension = SUSPENDED_LINES[subwayLine];
    
    return {
      icon: 'alert',
      title: 'Line not in service',
      subtitle: suspension!.message,
      frequency: suspension!.replacement,
      additionalInfo: suspension!.normalHours,
    };
  }
  
  // Get subway start hour
  const startHour = getSubwayStartHour(now, isLine6);
  
  // Sunday
  const isSunday = day === 0;
  
  // Late night / early morning - service closed
  if (hour >= 2 && (hour < startHour || (hour === startHour && minutes < 30))) {
    let subtitle: string;
    
    if (isLine6) {
      subtitle = holiday
        ? `${holiday.name}: Line 6 starts ~${startHour}am. Shuttle bus runs overnight.`
        : isSunday
          ? 'Sunday: Line 6 starts ~8am. 336 Finch West runs overnight.'
          : 'Line 6 starts ~6am. 336 Finch West runs overnight.';
    } else if (isSubway) {
      subtitle = holiday
        ? `${holiday.name}: First trains ~${startHour}am.`
        : isSunday
          ? 'Sunday: First trains ~8am. Blue Night buses run overnight.'
          : 'First trains ~6am. Blue Night buses run overnight.';
    } else {
      subtitle = 'Blue Night (300-series) runs overnight.';
    }
    
    return {
      icon: 'moon',
      title: isSubway ? 'Subway closed' : 'Limited service',
      subtitle,
    };
  }
  
  // Service starting
  if (hour === Math.floor(startHour) && minutes < 30) {
    return {
      icon: 'clock',
      title: 'Service starting',
      subtitle: isSubway
        ? 'First trains arriving now. Refresh in a moment.'
        : 'First vehicles arriving now.',
    };
  }
  
  // Normal hours - no real-time data
  const frequency = isSubway 
    ? getServiceFrequency(now, isLine6) 
    : undefined;
  
  return {
    icon: 'alert',
    title: 'No real-time data',
    subtitle: 'Real-time data unavailable. Try refreshing.',
    frequency,
  };
}
