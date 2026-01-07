/**
 * Build Information
 * 
 * This file is automatically updated during the build process.
 * DO NOT EDIT MANUALLY - changes will be overwritten.
 */

export const BUILD_INFO = {
  version: '1.5.1-beta',
  timestamp: '2026-01-07T22:26:22.794Z',
  buildId: 'mk4l8cej'
} as const;

// Formatted version string for display
export function getVersionString(): string {
  const date = new Date(BUILD_INFO.timestamp);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '.');
  // Use first 7 chars of buildId for short hash
  const shortId = BUILD_INFO.buildId.slice(0, 7);
  return `v${BUILD_INFO.version} · Build ${dateStr}-${shortId}`;
}
