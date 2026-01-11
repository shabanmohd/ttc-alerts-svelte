<script lang="ts">
  import { _ } from "svelte-i18n";
  import { ChevronDown, AlertTriangle } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import type { ThreadWithAlerts } from "$lib/types/database";

  interface RSZData {
    stopStart?: string;
    stopEnd?: string;
    direction?: string;
    source?: string;
  }

  interface RSZEntry {
    direction: string;
    stations: string;
    timestamp: string;
    alertId: string;
  }

  // Subway line colors - matching DESIGN_SYSTEM.md (WCAG 2.2 AA Compliant)
  const LINE_COLORS: Record<string, { color: string; textColor: string }> = {
    "1": { color: "#ffc524", textColor: "#000000" }, // TTC Yellow (Yonge-University)
    "2": { color: "#00853f", textColor: "#ffffff" }, // TTC Green (Bloor-Danforth)
    "4": { color: "#a12f7d", textColor: "#ffffff" }, // TTC Purple (Sheppard)
    "5": { color: "#d95319", textColor: "#ffffff" }, // TTC Orange (Eglinton)
    "6": { color: "#636569", textColor: "#ffffff" }, // TTC Grey (Finch West)
  };

  // Full line names for display (without "Line X" prefix since badge shows that)
  const LINE_NAMES: Record<string, string> = {
    "1": "Yonge-University",
    "2": "Bloor-Danforth",
    "4": "Sheppard",
    "5": "Eglinton",
    "6": "Finch West",
  };

  let { threads }: { threads: ThreadWithAlerts[] } = $props();

  let expandedSections = $state(new Set<string>(["1", "2"])); // Default expanded

  // Extract route NUMBER from thread (e.g., "1" from "Line 1" or ["Line 1"])
  function getRoute(thread: ThreadWithAlerts): string {
    const routes = thread.affected_routes;
    let routeStr = "";

    if (Array.isArray(routes) && routes.length > 0) {
      routeStr = routes[0];
    } else if (typeof routes === "string") {
      try {
        const parsed = JSON.parse(routes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          routeStr = parsed[0];
        } else {
          routeStr = routes;
        }
      } catch {
        routeStr = routes;
      }
    }

    // Extract just the number from "Line X" format
    const match = routeStr.match(/Line\s*(\d+)/i);
    if (match) {
      return match[1]; // Return just "1", "2", etc.
    }

    // If it's already just a number, return it
    if (/^\d+$/.test(routeStr)) {
      return routeStr;
    }

    return routeStr || "Unknown";
  }

  // Extract RSZ data from a thread
  function extractRSZEntries(thread: ThreadWithAlerts): RSZEntry[] {
    const entries: RSZEntry[] = [];

    // Get the latest alert from the thread
    const alerts = thread.alerts || [];
    for (const alert of alerts) {
      const rawData = alert.raw_data as RSZData | null;

      // First try raw_data (for Bluesky RSZ alerts)
      if (rawData?.stopStart && rawData?.stopEnd) {
        entries.push({
          direction: rawData.direction || "Unknown",
          stations: `${rawData.stopStart} → ${rawData.stopEnd}`,
          timestamp: alert.created_at || "",
          alertId: alert.alert_id,
        });
        continue;
      }

      // Parse from header_text/description_text (for TTC API RSZ alerts)
      // Format: "Line X: Subway trains will move slower than usual [direction] from [start] to [end] stations..."
      const text = alert.header_text || alert.description_text || "";

      // Match direction pattern: "northbound/southbound/eastbound/westbound from X to Y stations"
      const dirMatch = text.match(
        /(northbound|southbound|eastbound|westbound)\s+from\s+(.+?)\s+to\s+(.+?)\s+stations?/i
      );

      if (dirMatch) {
        const direction = dirMatch[1];
        const startStation = dirMatch[2].trim();
        const endStation = dirMatch[3].trim();

        entries.push({
          direction: direction,
          stations: `${startStation} → ${endStation}`,
          timestamp: alert.created_at || "",
          alertId: alert.alert_id,
        });
        continue;
      }

      // Fallback: Try to extract from "Affected Area:" line in description
      const affectedMatch = (alert.description_text || "").match(
        /Affected Area:\s*([^to\n]+?)\s+to\s+([^\n]+)/i
      );
      if (affectedMatch) {
        // Try to get direction from earlier in the text
        const dirFromText = text.match(
          /(northbound|southbound|eastbound|westbound)/i
        );
        entries.push({
          direction: dirFromText?.[1] || "Unknown",
          stations: `${affectedMatch[1].trim()} → ${affectedMatch[2].trim()}`,
          timestamp: alert.created_at || "",
          alertId: alert.alert_id,
        });
      }
    }

    return entries;
  }

  // Group all RSZ entries by route
  const groupedByRoute = $derived(() => {
    const groups = new Map<string, RSZEntry[]>();

    for (const thread of threads) {
      const route = getRoute(thread);
      const entries = extractRSZEntries(thread);

      if (entries.length > 0) {
        const existing = groups.get(route) || [];
        groups.set(route, [...existing, ...entries]);
      }
    }

    // Sort entries within each group by direction
    groups.forEach((entries, route) => {
      groups.set(
        route,
        entries.sort((a, b) => a.direction.localeCompare(b.direction))
      );
    });

    return groups;
  });

  // Get sorted routes (Line 1 before Line 2, etc.)
  const sortedRoutes = $derived(
    [...groupedByRoute().keys()].sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "99");
      const numB = parseInt(b.match(/\d+/)?.[0] || "99");
      return numA - numB;
    })
  );

  // Format direction for display (simplify compound directions) - ALL CAPS
  function formatDirection(dir: string): string {
    const lower = dir.toLowerCase();
    if (lower.includes("northbound")) return "NORTHBOUND";
    if (lower.includes("southbound")) return "SOUTHBOUND";
    if (lower.includes("eastbound")) return "EASTBOUND";
    if (lower.includes("westbound")) return "WESTBOUND";
    return dir.toUpperCase();
  }

  // Get Tailwind classes for direction badge (matching DESIGN_SYSTEM.md)
  function getDirectionClasses(dir: string): string {
    const lower = dir.toLowerCase();
    const baseClasses =
      "inline-flex items-center justify-center min-w-[95px] px-2 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wide";

    if (lower.includes("eastbound")) {
      return `${baseClasses} bg-sky-600/20 text-sky-700 dark:text-sky-400 border-sky-600/40`;
    }
    if (lower.includes("westbound")) {
      return `${baseClasses} bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/40`;
    }
    if (lower.includes("northbound")) {
      return `${baseClasses} bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40`;
    }
    if (lower.includes("southbound")) {
      return `${baseClasses} bg-rose-600/20 text-rose-700 dark:text-rose-400 border-rose-600/40`;
    }
    return `${baseClasses} bg-muted text-muted-foreground border-border`;
  }

  // Get line colors
  function getLineInfo(lineId: string) {
    return LINE_COLORS[lineId] || { color: "#666", textColor: "#fff" };
  }

  // Toggle accordion
  function toggleSection(lineId: string) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    expandedSections = newExpanded;
  }
</script>

<div class="rsz-container">
  {#each sortedRoutes as route}
    {@const entries = groupedByRoute().get(route) || []}
    {@const lineInfo = getLineInfo(route)}
    {@const isExpanded = expandedSections.has(route)}

    <article class="rsz-accordion-card" style="--line-color: {lineInfo.color}">
      <!-- Accordion Header (same style as alerts page) -->
      <button
        class="rsz-accordion-header"
        onclick={() => toggleSection(route)}
        aria-expanded={isExpanded}
      >
        <div
          class="rsz-top-border"
          style="background-color: {lineInfo.color}"
        ></div>
        <div class="rsz-header-body">
          <div class="rsz-header-left">
            <span
              class="rsz-line-badge"
              style="background-color: {lineInfo.color}; color: {lineInfo.textColor}"
            >
              <span class="badge-line-text">Line</span>
              <span class="badge-number">{route}</span>
            </span>
            <div class="rsz-line-info">
              <span class="rsz-line-name"
                >{LINE_NAMES[route] || `Line ${route}`}</span
              >
              <span class="rsz-label">{$_("alerts.reducedSpeedZone")}</span>
            </div>
          </div>
          <div class="rsz-header-right">
            <span class="rsz-zone-count">
              {entries.length}
              <span class="zone-label">{entries.length === 1 ? "zone" : "zones"}</span>
            </span>
            <ChevronDown
              class={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </div>
        </div>
      </button>

      <!-- Accordion Content -->
      <div class="rsz-accordion-content" class:expanded={isExpanded}>
        <div class="rsz-accordion-body">
          <!-- Table Header -->
          <div class="rsz-table-header">
            <div>Direction</div>
            <div>Stations</div>
          </div>

          <!-- Table Rows -->
          {#each entries as entry, i}
            <div
              class="rsz-table-row animate-fade-in"
              style="animation-delay: {i * 30}ms"
            >
              <div class="rsz-col-direction">
                <span class={getDirectionClasses(entry.direction)}>
                  {formatDirection(entry.direction)}
                </span>
              </div>
              <div class="rsz-col-stations">
                {entry.stations}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </article>
  {/each}
</div>

<style>
  .rsz-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .rsz-accordion-card {
    background: var(--card);
    border-radius: var(--radius);
    border: 2px solid hsl(var(--border));
    overflow: hidden;
  }

  .rsz-accordion-header {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .rsz-accordion-header:hover {
    background-color: hsl(var(--muted) / 0.3);
  }

  .rsz-top-border {
    height: 4px;
  }

  .rsz-header-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
  }

  .rsz-header-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .rsz-line-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    border-radius: 0.375rem;
    white-space: nowrap;
  }

  .badge-line-text {
    font-size: inherit;
    font-weight: inherit;
  }

  .badge-number {
    font-size: inherit;
    font-weight: inherit;
  }

  .rsz-line-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
  }

  .rsz-line-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    line-height: 1.2;
  }

  .rsz-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: hsl(45 93% 40%);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
  }

  :global(.dark) .rsz-label {
    color: hsl(45 93% 55%);
  }

  .rsz-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: hsl(var(--muted-foreground));
    flex-shrink: 0;
  }

  .rsz-zone-count {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  /* Mobile responsive adjustments */
  @media (max-width: 480px) {
    .rsz-header-body {
      padding: 0.75rem;
      gap: 0.5rem;
    }

    .rsz-header-left {
      flex: 1;
      min-width: 0; /* Allow shrinking */
    }

    .rsz-line-badge {
      flex-direction: column;
      min-width: 2.75rem;
      height: auto;
      padding: 0.375rem 0.5rem;
      gap: 0;
      font-size: 0.75rem;
    }

    .badge-line-text {
      line-height: 1.1;
    }

    .badge-number {
      font-size: 1.125rem;
      line-height: 1.1;
    }

    .rsz-line-info {
      min-width: 0; /* Allow text wrapping */
      flex: 1;
    }

    .rsz-line-name {
      font-size: 0.875rem;
      word-break: normal;
      overflow-wrap: break-word;
      hyphens: none;
    }

    .rsz-label {
      font-size: 0.625rem;
    }

    .rsz-zone-count {
      font-size: 0.875rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      line-height: 1.2;
    }

    .zone-label {
      font-size: 0.625rem;
      text-transform: uppercase;
    }
  }

  /* Zone label hidden on desktop, only shown in mobile column layout */
  .zone-label {
    display: none;
  }

  @media (max-width: 480px) {
    .zone-label {
      display: block;
    }
  }

  .rsz-accordion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
  }

  .rsz-accordion-content.expanded {
    max-height: 2000px;
    transition: max-height 0.5s ease-in;
  }

  .rsz-accordion-body {
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid hsl(var(--border));
  }

  .rsz-table-header {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 0.75rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border) / 0.5);
  }

  .rsz-table-row {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 0.75rem;
    padding: 0.5rem 0.5rem;
    font-size: 0.8125rem;
    border-bottom: 1px solid hsl(var(--border) / 0.3);
    align-items: center;
  }

  .rsz-table-row:last-child {
    border-bottom: none;
  }

  .rsz-col-direction {
    display: flex;
    align-items: center;
  }

  .rsz-col-stations {
    color: hsl(var(--foreground));
    font-weight: 500;
    font-size: 0.9375rem;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease forwards;
    opacity: 0;
  }
</style>
