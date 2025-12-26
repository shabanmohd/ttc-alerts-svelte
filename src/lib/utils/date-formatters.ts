/**
 * Date and time formatting utilities for consistent display across the app.
 * Centralizes formatting logic to avoid duplication and ensure consistency.
 */

/**
 * Format time string (HH:MM or HH:MM:SS) to 12-hour format.
 * @param timeStr - Time string like "14:30" or "14:30:00"
 * @returns Formatted time like "2:30 PM" or null if invalid
 * @example formatTimeDisplay("14:30") // "2:30 PM"
 * @example formatTimeDisplay("09:00") // "9:00 AM"
 */
export function formatTimeDisplay(timeStr: string | null): string | null {
	if (!timeStr) return null;
	const [hours, minutes] = timeStr.split(':').map(Number);
	if (isNaN(hours) || isNaN(minutes)) return null;
	const period = hours >= 12 ? 'PM' : 'AM';
	const hour12 = hours % 12 || 12;
	return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format date string to readable format (Mon, Jan 15).
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date like "Mon, Jan 15"
 * @example formatDateDisplay("2025-01-15") // "Wed, Jan 15"
 */
export function formatDateDisplayFull(dateStr: string): string {
	if (!dateStr) return '';
	const date = new Date(dateStr + 'T00:00:00');
	if (isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Format date string to short format (Jan 15).
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date like "Jan 15"
 * @example formatDateDisplay("2025-01-15") // "Jan 15"
 */
export function formatDateDisplay(dateStr: string): string {
	if (!dateStr) return '';
	const date = new Date(dateStr + 'T00:00:00');
	if (isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Format date range for display.
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Range like "Jan 15 – Jan 17" or just "Jan 15" if same day
 * @example formatDateRange("2025-01-15", "2025-01-17") // "Jan 15 – Jan 17"
 * @example formatDateRange("2025-01-15", "2025-01-15") // "Jan 15"
 */
export function formatDateRange(startDate: string, endDate: string): string {
	const start = new Date(startDate + 'T00:00:00');
	const end = new Date(endDate + 'T00:00:00');

	if (isNaN(start.getTime()) || isNaN(end.getTime())) {
		return `${startDate} - ${endDate}`;
	}

	const startStr = start.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	});
	const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

	return startDate === endDate ? startStr : `${startStr} – ${endStr}`;
}

/**
 * Format timestamp to relative time (e.g., "5 min ago", "2 hours ago").
 * Falls back to absolute date for older timestamps.
 * @param dateStr - ISO timestamp string
 * @param translations - Optional i18n translations object with time.* keys
 * @returns Relative time string
 * @example formatRelativeTime("2025-01-15T10:30:00Z") // "5 min ago"
 */
export function formatRelativeTime(
	dateStr: string,
	translations?: {
		justNow?: string;
		minutesAgo?: (count: number) => string;
		hoursAgo?: (count: number) => string;
		daysAgo?: (count: number) => string;
	}
): string {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return '';

	const now = new Date();
	const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

	// Use translations if provided, otherwise use English defaults
	const justNow = translations?.justNow ?? 'Just now';
	const minutesAgo = translations?.minutesAgo ?? ((n: number) => `${n} min ago`);
	const hoursAgo = translations?.hoursAgo ?? ((n: number) => `${n} hour${n === 1 ? '' : 's'} ago`);
	const daysAgo = translations?.daysAgo ?? ((n: number) => `${n} day${n === 1 ? '' : 's'} ago`);

	if (diff < 0) return justNow;
	if (diff < 60) return justNow;
	if (diff < 3600) {
		const mins = Math.floor(diff / 60);
		return minutesAgo(mins);
	}
	if (diff < 86400) {
		const hours = Math.floor(diff / 3600);
		return hoursAgo(hours);
	}
	const days = Math.floor(diff / 86400);
	if (days < 7) return daysAgo(days);

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format maintenance schedule info string.
 * Combines start/end dates and times into a readable string.
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param startTime - Optional start time (HH:MM)
 * @param endTime - Optional end time (HH:MM)
 * @returns Formatted schedule string
 * @example formatMaintenanceSchedule("2025-01-15", "2025-01-17", "22:00", "05:00")
 * // "10:00 PM – Jan 15 to Jan 17 – 5:00 AM"
 */
export function formatMaintenanceSchedule(
	startDate: string,
	endDate: string,
	startTime?: string | null,
	endTime?: string | null
): string {
	const parts: string[] = [];

	// Add start time if available
	const formattedStartTime = formatTimeDisplay(startTime ?? null);
	if (formattedStartTime) {
		parts.push(formattedStartTime);
	}

	// Add date range
	parts.push(formatDateRange(startDate, endDate));

	// Add end time if available
	const formattedEndTime = formatTimeDisplay(endTime ?? null);
	if (formattedEndTime) {
		parts.push(formattedEndTime);
	}

	return parts.join(' – ');
}
