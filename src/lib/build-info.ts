/**
 * Build information utilities
 * Provides version and build metadata
 */

// Version from package.json, can be overridden at build time
const APP_VERSION = "1.0.0";

// Build timestamp - set at build time via Vite's define
const BUILD_DATE = __BUILD_DATE__ ?? new Date().toISOString().split("T")[0];

// Git commit hash - set at build time
const COMMIT_HASH = __COMMIT_HASH__ ?? "dev";

/**
 * Returns a formatted version string for display
 * @example "v1.0.0 (abc1234) - Jan 8, 2026"
 */
export function getVersionString(): string {
  const shortHash = COMMIT_HASH.slice(0, 7);
  
  // Format build date nicely
  const date = new Date(BUILD_DATE);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  
  return `v${APP_VERSION} (${shortHash}) - ${formattedDate}`;
}

/**
 * Returns full build info object
 */
export function getBuildInfo() {
  return {
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    commitHash: COMMIT_HASH,
  };
}

// Type declarations for Vite define replacements
declare const __BUILD_DATE__: string | undefined;
declare const __COMMIT_HASH__: string | undefined;
