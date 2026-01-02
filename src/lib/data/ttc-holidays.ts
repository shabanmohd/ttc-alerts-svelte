/**
 * TTC Holiday Schedule Data
 * 
 * This file contains the official TTC holiday schedule.
 * Update annually by providing the new TTC holiday page URL.
 * 
 * Source: https://www.ttc.ca/riding-the-ttc/Updates/holiday-service
 * Last Updated: January 2026
 * 
 * Service Levels:
 * - "sunday": Regular Sunday service (subway starts ~8 AM)
 * - "holiday": Sunday schedule but starts earlier (~6 AM)
 */

export type TTCServiceLevel = 'sunday' | 'holiday';

export interface TTCHoliday {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Holiday name */
  name: string;
  /** Holiday name in French */
  nameFr: string;
  /** TTC service level for this day */
  service: TTCServiceLevel;
}

/**
 * TTC Holiday Schedule
 * 
 * To update for a new year:
 * 1. Visit the TTC holiday page (link below)
 * 2. Add new year's holidays to this array
 * 3. Optionally remove holidays more than 1 year old
 */
export const TTC_HOLIDAYS: TTCHoliday[] = [
  // 2025 Holidays
  { date: '2025-01-01', name: "New Year's Day", nameFr: 'Jour de l\'An', service: 'sunday' },
  { date: '2025-02-17', name: 'Family Day', nameFr: 'Jour de la famille', service: 'holiday' },
  { date: '2025-04-18', name: 'Good Friday', nameFr: 'Vendredi saint', service: 'holiday' },
  { date: '2025-05-19', name: 'Victoria Day', nameFr: 'Fête de la Reine', service: 'holiday' },
  { date: '2025-07-01', name: 'Canada Day', nameFr: 'Fête du Canada', service: 'holiday' },
  { date: '2025-08-04', name: 'Simcoe Day', nameFr: 'Jour de Simcoe', service: 'holiday' },
  { date: '2025-09-01', name: 'Labour Day', nameFr: 'Fête du travail', service: 'holiday' },
  { date: '2025-10-13', name: 'Thanksgiving Day', nameFr: 'Action de grâce', service: 'holiday' },
  { date: '2025-12-25', name: 'Christmas Day', nameFr: 'Jour de Noël', service: 'sunday' },
  { date: '2025-12-26', name: 'Boxing Day', nameFr: 'Lendemain de Noël', service: 'holiday' },
  
  // 2026 Holidays (from TTC holiday page)
  { date: '2026-01-01', name: "New Year's Day", nameFr: 'Jour de l\'An', service: 'sunday' },
  { date: '2026-02-16', name: 'Family Day', nameFr: 'Jour de la famille', service: 'holiday' },
  { date: '2026-04-03', name: 'Good Friday', nameFr: 'Vendredi saint', service: 'holiday' },
  { date: '2026-05-18', name: 'Victoria Day', nameFr: 'Fête de la Reine', service: 'holiday' },
  { date: '2026-07-01', name: 'Canada Day', nameFr: 'Fête du Canada', service: 'holiday' },
  { date: '2026-08-03', name: 'Civic Holiday', nameFr: 'Congé civique', service: 'holiday' },
  { date: '2026-09-07', name: 'Labour Day', nameFr: 'Fête du travail', service: 'holiday' },
  { date: '2026-10-12', name: 'Thanksgiving Day', nameFr: 'Action de grâce', service: 'holiday' },
  { date: '2026-12-25', name: 'Christmas Day', nameFr: 'Jour de Noël', service: 'sunday' },
  { date: '2026-12-26', name: 'Boxing Day', nameFr: 'Lendemain de Noël', service: 'holiday' },
  
  // 2027 Holidays (from TTC holiday page)
  { date: '2027-01-01', name: "New Year's Day", nameFr: 'Jour de l\'An', service: 'sunday' },
];

/**
 * Official TTC Holiday Schedule Page
 * Update this if the URL changes
 */
export const TTC_HOLIDAY_SCHEDULE_URL = 'https://www.ttc.ca/riding-the-ttc/Updates/holiday-service';

/**
 * Get today's date in YYYY-MM-DD format (Toronto timezone)
 */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

/**
 * Get tomorrow's date in YYYY-MM-DD format (Toronto timezone)
 */
export function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

/**
 * Check if a date string matches a TTC holiday
 * @returns The holiday object if found, null otherwise
 */
export function getHolidayForDate(dateString: string): TTCHoliday | null {
  return TTC_HOLIDAYS.find(h => h.date === dateString) || null;
}

/**
 * Get today's holiday (if any)
 */
export function getTodayHoliday(): TTCHoliday | null {
  return getHolidayForDate(getTodayDateString());
}

/**
 * Get tomorrow's holiday (if any)
 */
export function getTomorrowHoliday(): TTCHoliday | null {
  return getHolidayForDate(getTomorrowDateString());
}

/**
 * Check if today or tomorrow is a TTC holiday
 * Returns holidays for both days (could be both during Christmas/Boxing Day)
 */
export function getUpcomingHolidays(): { today: TTCHoliday | null; tomorrow: TTCHoliday | null } {
  return {
    today: getTodayHoliday(),
    tomorrow: getTomorrowHoliday()
  };
}

/**
 * Get the localStorage key for dismissing a holiday banner
 */
export function getHolidayDismissKey(holiday: TTCHoliday): string {
  return `ttc-holiday-dismissed-${holiday.date}`;
}

/**
 * Check if user has dismissed the banner for a specific holiday
 */
export function isHolidayDismissed(holiday: TTCHoliday): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(getHolidayDismissKey(holiday)) === 'true';
}

/**
 * Dismiss the banner for a specific holiday
 */
export function dismissHoliday(holiday: TTCHoliday): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(getHolidayDismissKey(holiday), 'true');
}
