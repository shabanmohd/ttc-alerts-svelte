<script lang="ts">
  import { ChevronDown, ExternalLink } from "lucide-svelte";
  import RouteBadge from "./RouteBadge.svelte";
  import StatusBadge from "./StatusBadge.svelte";
  import { cn } from "$lib/utils";
  import { _ } from "svelte-i18n";
  import type { ThreadWithAlerts, Alert } from "$lib/types/database";

  let { thread, lineColor }: { thread: ThreadWithAlerts; lineColor?: string } =
    $props();

  let showEarlierUpdates = $state(false);

  /**
   * Format timestamp for display with relative time.
   */
  function formatTimestamp(dateStr: string): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 0) return $_("time.justNow");
    if (diff < 60) return $_("time.justNow");
    if (diff < 3600)
      return $_("time.minutesAgo", {
        values: { count: Math.floor(diff / 60) },
      });
    if (diff < 86400)
      return $_("time.hoursAgo", {
        values: { count: Math.floor(diff / 3600) },
      });
    const days = Math.floor(diff / 86400);
    if (days < 7) return $_("time.daysAgo", { values: { count: days } });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  /**
   * Check if any route is a subway line
   */
  function isSubwayRoute(routes: string[]): boolean {
    return routes.some(
      (route) => route.toLowerCase().startsWith("line") || /^[1-6]$/.test(route)
    );
  }

  /**
   * Get the main category from categories array for display priority.
   * For subway routes, DETOUR is never applicable (subways don't detour).
   */
  function getMainCategory(categories: unknown, routes: string[] = []): string {
    const cats = parseJsonArray(categories);
    const isSubway = isSubwayRoute(routes);

    // Priority order for display
    const priority = [
      "SERVICE_DISRUPTION",
      "SCHEDULED_CLOSURE",
      "DETOUR",
      "DELAY",
      "SERVICE_RESUMED",
      "PLANNED_SERVICE_DISRUPTION",
    ];

    for (const cat of priority) {
      // Skip DETOUR for subway routes - subways don't detour
      if (cat === "DETOUR" && isSubway) continue;
      if (cats.includes(cat)) return cat;
    }
    return cats[0] || "OTHER";
  }

  /**
   * Parse potentially double-encoded JSON arrays.
   */
  function parseJsonArray(data: unknown): string[] {
    if (!data) return [];
    if (Array.isArray(data)) return data as string[];
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed as string[];
      } catch {
        // Not valid JSON
      }
    }
    return [];
  }

  /**
   * Extract route name from header text (e.g., "306 Carlton: Detour..." -> "306 Carlton")
   */
  function extractRouteName(headerText: string, routeNumber: string): string {
    if (!headerText) return routeNumber;

    // Handle "Line X" subway routes - extract "Line X Yonge-University" format
    if (routeNumber.toLowerCase().startsWith("line")) {
      // Match "Line 1 Yonge-University" or similar - stop at ":" or " Regular" or " Delays"
      const lineMatch = headerText.match(
        /^(Line \d+[^:]+?)(?::|[\s]+Regular|[\s]+Delays|[\s]+No\s)/i
      );
      if (lineMatch) {
        // Clean up - remove trailing words like "Regular", "service", etc.
        let lineName = lineMatch[1].trim();
        lineName = lineName
          .replace(/\s+(Regular|service|has|resumed|between).*$/i, "")
          .trim();
        return lineName;
      }
      // Fallback for Line routes
      const simpleMatch = headerText.match(/(Line \d+\s*[A-Za-z-]*)/i);
      if (simpleMatch) return simpleMatch[1].trim();
      return routeNumber;
    }

    // Try to match pattern like "306 Carlton:" or "306 Carlton Regular"
    const patterns = [
      new RegExp(
        `^(${routeNumber}\\s+[A-Za-z][A-Za-z-]+)(?::|\\s+Regular|\\s+Detour|\\s+Delay)`,
        "i"
      ),
      new RegExp(
        `^(${routeNumber}\\s+[A-Za-z][A-Za-z-]+\\s+[A-Za-z-]+)(?::|\\s+Regular)`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = headerText.match(pattern);
      if (match) return match[1].trim();
    }

    // Fallback: just return the route number
    return routeNumber;
  }

  /**
   * Normalize subway line names to just "Line X" format.
   * E.g., "Line 1 Yonge-University" -> "Line 1"
   * E.g., "Line 2 Bloor-Danforth" -> "Line 2"
   * E.g., "1 Yonge" -> "Line 1"
   */
  function normalizeSubwayLine(route: string): string {
    // Check if already in "Line X" format
    const lineMatch = route.match(/^(Line\s*\d+)/i);
    if (lineMatch) {
      return lineMatch[1];
    }
    
    // Check for "1 Yonge" or "2 Bloor" format (number + subway line name)
    const routeLower = route.toLowerCase();
    if (routeLower.includes("yonge") || routeLower.includes("university")) {
      return "Line 1";
    }
    if (routeLower.includes("bloor") || routeLower.includes("danforth")) {
      return "Line 2";
    }
    if (routeLower.includes("sheppard")) {
      return "Line 4";
    }
    if (routeLower.includes("eglinton")) {
      return "Line 5";
    }
    if (routeLower.includes("finch west")) {
      return "Line 6";
    }
    
    return route;
  }

  /**
   * Check if a route string represents a subway line.
   */
  function isSubwayLineRoute(route: string): boolean {
    const routeLower = route.toLowerCase();
    return routeLower.startsWith("line") ||
           routeLower.includes("yonge") ||
           routeLower.includes("university") ||
           routeLower.includes("bloor") ||
           routeLower.includes("danforth") ||
           routeLower.includes("sheppard") ||
           routeLower.includes("eglinton") ||
           routeLower.includes("finch west");
  }

  /**
   * Get display routes for badges.
   * - If multiple variants of same base (37, 37A, 37B) -> show just "37"
   * - If only one variant (37B alone) -> show "37B"
   * - Always show just the number, not the name (123, not "123 Sherway")
   * - Subway lines are normalized to "Line X" format
   *
   * E.g., ["37", "37A", "37B", "37 Islington"] -> ["37"]
   * E.g., ["37B", "37 Islington"] -> ["37"]  (still multiple variants)
   * E.g., ["37B"] -> ["37B"]  (single variant, keep suffix)
   * E.g., ["123", "123C", "123D", "123 Sherway"] -> ["123"]
   * E.g., ["37", "85", "939"] -> ["37", "85", "939"]
   * E.g., ["Line 1 Yonge-University"] -> ["Line 1"]
   * E.g., ["1 Yonge"] -> ["Line 1"]
   */
  function getDisplayRoutes(routes: string[]): string[] {
    // Group routes by their base number
    const routesByBase = new Map<string, string[]>();

    for (const route of routes) {
      // Check if it's a subway line first (including "1 Yonge" format)
      if (isSubwayLineRoute(route)) {
        const normalizedLine = normalizeSubwayLine(route);
        if (!routesByBase.has(normalizedLine)) {
          routesByBase.set(normalizedLine, []);
        }
        routesByBase.get(normalizedLine)!.push(route);
        continue;
      }

      // Extract base route number (digits only)
      const match = route.match(/^(\d+)/);
      if (match) {
        const baseNum = match[1];
        if (!routesByBase.has(baseNum)) {
          routesByBase.set(baseNum, []);
        }
        routesByBase.get(baseNum)!.push(route);
      } else {
        // Non-numeric routes - normalize and keep
        routesByBase.set(route, [route]);
      }
    }

    // For each base, decide what to display
    const displayRoutes: string[] = [];
    for (const [baseNum, variants] of routesByBase) {
      // For subway lines, always use the normalized "Line X" format
      if (baseNum.toLowerCase().startsWith("line")) {
        displayRoutes.push(baseNum);
        continue;
      }

      if (variants.length === 1) {
        // Single variant - extract just the route identifier (number + optional letter)
        const single = variants[0];
        const routeMatch = single.match(/^(\d+[A-Z]?)/);
        displayRoutes.push(routeMatch ? routeMatch[1] : single);
      } else {
        // Multiple variants - show just the base number
        displayRoutes.push(baseNum);
      }
    }

    return displayRoutes;
  }

  const latestAlert = $derived(thread.latestAlert);
  const earlierAlerts = $derived(thread.alerts.slice(1));

  // Get routes for badge display:
  // - Prefer thread routes (accumulated from all alerts in the thread)
  // - Fall back to latest alert routes if thread routes are empty
  const alertRoutes = $derived(parseJsonArray(latestAlert?.affected_routes));
  const threadRoutes = $derived(parseJsonArray(thread.affected_routes));
  const rawRoutes = $derived(
    threadRoutes.length > 0 ? threadRoutes : alertRoutes
  );
  // Get display routes (deduplicate variants, show base number only)
  const displayRoutes = $derived(getDisplayRoutes(rawRoutes));
  // Extract full route names from header text (for accessibility/screen readers)
  const routes = $derived(
    rawRoutes.map((route) =>
      extractRouteName(latestAlert?.header_text || "", route)
    )
  );
  const categories = $derived(
    parseJsonArray(latestAlert?.categories) ||
      parseJsonArray(thread.categories) ||
      []
  );

  const cardId = $derived(`alert-${thread.thread_id}`);
</script>

<article
  class="alert-card"
  class:expanded={showEarlierUpdates}
  class:has-line-accent={!!lineColor}
  id={cardId}
  aria-labelledby="{cardId}-title"
  style={lineColor ? `--alert-line-color: ${lineColor}` : ""}
>
  <div class="alert-card-content">
    <!-- Main content: Badge on left, details on right -->
    <div class="flex gap-3">
      <!-- Route badge(s) on left - fixed width for uniform alignment -->
      <div class="w-20 flex flex-col items-center gap-2 flex-shrink-0">
        {#each displayRoutes.slice(0, 2) as route}
          <RouteBadge {route} size="lg" class="alert-badge-fixed" />
        {/each}
        {#if displayRoutes.length > 2}
          <span class="text-xs text-muted-foreground"
            >+{displayRoutes.length - 2}</span
          >
        {/if}
      </div>

      <!-- Status + Description on right -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <!-- Show SERVICE_RESUMED badge for resolved threads if they have that category -->
          <StatusBadge category={thread.is_resolved && parseJsonArray(categories).includes('SERVICE_RESUMED') ? 'SERVICE_RESUMED' : getMainCategory(categories, rawRoutes)} />
          <time
            class="alert-card-timestamp"
            datetime={latestAlert?.created_at || ""}
          >
            {formatTimestamp(latestAlert?.created_at || "")}
          </time>
        </div>

        {#if getMainCategory(categories, rawRoutes) === "SCHEDULED_CLOSURE"}
          <!-- Scheduled Closure: Visual hierarchy with header + description -->
          <p class="text-sm font-medium leading-snug" id="{cardId}-title">
            {latestAlert?.header_text || ""}
          </p>
          {#if latestAlert?.description_text}
            <p class="text-sm text-muted-foreground leading-relaxed mt-1">
              {latestAlert.description_text}
            </p>
          {/if}
          {#if (latestAlert as { url?: string })?.url}
            <a
              href={(latestAlert as { url?: string }).url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-primary hover:underline mt-1.5 inline-flex items-center gap-1"
            >
              More details <ExternalLink class="h-3 w-3" aria-hidden="true" />
            </a>
          {/if}
        {:else}
          <!-- Regular alerts: description OR header -->
          <p class="text-sm leading-relaxed" id="{cardId}-title">
            {latestAlert?.description_text || latestAlert?.header_text || ""}
          </p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Earlier Updates -->
  {#if earlierAlerts.length > 0}
    <button
      class="earlier-updates-toggle"
      onclick={() => (showEarlierUpdates = !showEarlierUpdates)}
      aria-expanded={showEarlierUpdates}
      aria-controls="{cardId}-updates"
      type="button"
    >
      <span
        >{$_("alerts.earlierUpdates", {
          values: { count: earlierAlerts.length },
        })}</span
      >
      <ChevronDown
        class={cn(
          "h-4 w-4 transition-transform duration-200",
          showEarlierUpdates && "rotate-180"
        )}
        aria-hidden="true"
      />
    </button>

    {#if showEarlierUpdates}
      <div
        class="earlier-updates-content animate-fade-in-down"
        id="{cardId}-updates"
      >
        {#each earlierAlerts as alert, i}
          <div
            class="earlier-update-item animate-fade-in"
            style="animation-delay: {i * 80}ms"
          >
            <div class="flex justify-between items-start mb-1.5">
              <StatusBadge
                category={getMainCategory(alert.categories, rawRoutes)}
              />
              <time
                class="text-xs text-muted-foreground"
                datetime={alert.created_at}
              >
                {formatTimestamp(alert.created_at)}
              </time>
            </div>
            <p
              class="text-sm leading-relaxed text-muted-foreground font-normal"
            >
              {alert.header_text}
            </p>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</article>
