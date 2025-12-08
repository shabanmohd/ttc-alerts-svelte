<script lang="ts">
  import type { TTCStop } from "$lib/data/stops-db";
  import {
    fetchStopETA,
    filterPredictionsForRoute,
    type ETAPrediction,
  } from "$lib/services/nextbus";
  import { ChevronUp, Clock, Loader2, Moon } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import LiveSignalIcon from "$lib/components/eta/LiveSignalIcon.svelte";
  import { cn } from "$lib/utils";

  // Props
  let {
    stop,
    index = 0,
    routeFilter,
    isExpanded = false,
    onGetETA,
  }: {
    stop: TTCStop;
    index?: number;
    routeFilter?: string;
    isExpanded?: boolean;
    onGetETA?: (stopId: string) => void;
  } = $props();

  // State
  let expanded = $state(false);
  let isLoadingETA = $state(false);
  let etaPredictions = $state<ETAPrediction[]>([]);
  let etaError = $state<string | null>(null);
  let lastFetched = $state<Date | null>(null);

  // Sync expanded state with prop
  $effect(() => {
    expanded = isExpanded;
  });

  /**
   * Fetch ETA for this stop
   */
  async function handleGetETA() {
    if (expanded && etaPredictions.length > 0) {
      // Already expanded with data - just collapse
      expanded = false;
      return;
    }

    expanded = true;
    isLoadingETA = true;
    etaError = null;

    // Notify parent
    onGetETA?.(stop.id);

    try {
      const response = await fetchStopETA(stop.id);

      if (response.error) {
        etaError = response.error;
        etaPredictions = [];
      } else {
        // Filter for specific route if provided
        etaPredictions = routeFilter
          ? filterPredictionsForRoute(response, routeFilter)
          : response.predictions;
        lastFetched = new Date();
      }
    } catch (error) {
      etaError = "Failed to fetch arrival times";
      etaPredictions = [];
    } finally {
      isLoadingETA = false;
    }
  }

  /**
   * Format stop name for display
   * Returns { name: string, platformDirection: string | null }
   * For subway stations, extracts both the station name and platform direction
   */
  function formatStopName(name: string): {
    name: string;
    platformDirection: string | null;
  } {
    let cleaned = name;

    // For subway stations, extract station name and platform direction
    // Pattern 1: "Station Name - Direction Platform (Towards ...)" (Line 1, 2, 4)
    const subwayDashMatch = cleaned.match(
      /^(.+?)\s*-\s*(Eastbound|Westbound|Northbound|Southbound)\s+Platform(\s+Towards\s+.+)?$/i
    );
    if (subwayDashMatch) {
      const stationName = subwayDashMatch[1].trim();
      const direction =
        subwayDashMatch[2].charAt(0).toUpperCase() +
        subwayDashMatch[2].slice(1).toLowerCase();
      return {
        name: stationName,
        platformDirection: direction,
      };
    }

    // Pattern 2: "Station Name Direction Platform" without dash (Line 6 LRT)
    const subwayNoDashMatch = cleaned.match(
      /^(.+?)\s+(Eastbound|Westbound|Northbound|Southbound)\s+Platform$/i
    );
    if (subwayNoDashMatch) {
      const stationName = subwayNoDashMatch[1].trim();
      const direction =
        subwayNoDashMatch[2].charAt(0).toUpperCase() +
        subwayNoDashMatch[2].slice(1).toLowerCase();
      return {
        name: stationName,
        platformDirection: direction,
      };
    }

    // Check for terminal platform format: "Station - Subway Platform" or "Station - Subway"
    const terminalMatch = cleaned.match(/^(.+?)\s*-\s*Subway(\s+Platform)?$/i);
    if (terminalMatch) {
      return {
        name: terminalMatch[1].trim(),
        platformDirection: null, // Terminal - no direction
      };
    }

    // For "Station Name Station" patterns, remove redundant "Station"
    cleaned = cleaned.replace(/\s+Station\s+Station$/i, " Station");

    // Remove direction + Platform suffix (e.g., "Eastbound Platform", "Westbound Platform")
    cleaned = cleaned.replace(
      /\s+(Eastbound|Westbound|Northbound|Southbound)\s+Platform$/i,
      ""
    );

    // Remove standalone "Platform" suffix
    cleaned = cleaned.replace(/\s+Platform$/i, "");

    // Clean up intersection formatting
    cleaned = cleaned
      .replace(/\s+At\s+/gi, " / ")
      .replace(/\s+Opp\s+/gi, " (opp) ");

    // Remove trailing direction indicators
    cleaned = cleaned.replace(
      /\s*-\s*(Eastbound|Westbound|Northbound|Southbound)$/i,
      ""
    );

    // Clean up trailing hyphens and whitespace
    cleaned = cleaned.replace(/\s*-\s*$/g, "").trim();

    return { name: cleaned, platformDirection: null };
  }

  /**
   * Get badge color class for platform direction
   */
  function getDirectionBadgeClass(direction: string): string {
    const lowerDir = direction.toLowerCase();
    if (lowerDir.includes("northbound"))
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (lowerDir.includes("southbound"))
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    if (lowerDir.includes("eastbound"))
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
    if (lowerDir.includes("westbound"))
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-muted text-muted-foreground";
  }

  /**
   * Parse direction into simplified format
   */
  function parseDirection(direction: string): {
    direction: string;
    destination: string;
  } {
    const cleaned = direction.replace(/bound$/i, "").trim();

    // Pattern: "Direction - Route towards Destination"
    const towardsIndex = cleaned.toLowerCase().indexOf(" towards ");
    if (towardsIndex > -1) {
      const beforeTowards = cleaned.substring(0, towardsIndex).trim();
      const afterTowards = cleaned.substring(towardsIndex + 9).trim();
      const dashMatch = beforeTowards.match(/^(North|South|East|West)\s*-/i);
      const dir = dashMatch ? dashMatch[1] : beforeTowards.split(/\s+/)[0];
      return { direction: dir, destination: afterTowards };
    }

    // Pattern: "Direction - Route"
    const dashMatch = cleaned.match(/^(North|South|East|West)\s*-\s*(.+)$/i);
    if (dashMatch) {
      return {
        direction: dashMatch[1].trim(),
        destination: dashMatch[2].trim(),
      };
    }

    // Fallback
    const dirMatch = cleaned.match(/^(North|South|East|West)/i);
    if (dirMatch) {
      return {
        direction: dirMatch[1],
        destination: cleaned.substring(dirMatch[1].length).trim(),
      };
    }

    return { direction: "", destination: cleaned };
  }

  /**
   * Get empty state message based on time of day
   */
  function getEmptyStateMessage(): {
    icon: "moon" | "clock";
    title: string;
    subtitle: string;
  } {
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 5) {
      return {
        icon: "moon",
        title: "Limited service",
        subtitle: "Most routes run 6am–1am",
      };
    }
    if (hour >= 5 && hour < 6) {
      return {
        icon: "clock",
        title: "Service starting soon",
        subtitle: "First buses ~6am",
      };
    }
    return {
      icon: "clock",
      title: "No arrivals scheduled",
      subtitle: "Check back shortly",
    };
  }

  let formattedStop = $derived(formatStopName(stop.name));
</script>

<div
  class="route-stop-item"
  class:expanded
  data-stop-id={stop.id}
  role="listitem"
>
  <!-- Stop Header (always visible) -->
  <div class="stop-header">
    <!-- Index marker -->
    <div class="stop-index">
      <span class="index-number">{index}</span>
    </div>

    <!-- Stop info -->
    <div class="stop-info">
      <p class="stop-name">{formattedStop.name}</p>
      <div class="flex items-center gap-2 mt-0.5">
        {#if formattedStop.platformDirection}
          <span
            class="platform-badge {getDirectionBadgeClass(
              formattedStop.platformDirection
            )}"
          >
            {formattedStop.platformDirection}
          </span>
        {/if}
        {#if stop.type !== "subway"}
          <span class="stop-id">Stop #{stop.id}</span>
        {/if}
      </div>
    </div>

    <!-- Get ETA button -->
    <Button
      variant={expanded ? "secondary" : "outline"}
      size="sm"
      class="eta-button"
      onclick={handleGetETA}
      disabled={isLoadingETA}
    >
      {#if isLoadingETA}
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
      {:else if expanded}
        <ChevronUp class="h-3.5 w-3.5" />
        <span class="sr-only sm:not-sr-only">Hide</span>
      {:else}
        <Clock class="h-3.5 w-3.5" />
        <span class="sr-only sm:not-sr-only">ETA</span>
      {/if}
    </Button>
  </div>

  <!-- ETA Panel (same style as ETACard) -->
  {#if expanded}
    <div class="eta-panel animate-fade-in-down">
      {#if isLoadingETA}
        <!-- Loading State -->
        <div class="p-4 space-y-3">
          {#each [1, 2] as _}
            <div class="animate-pulse flex items-center gap-3">
              <div class="h-10 w-14 bg-muted rounded-lg flex-shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 w-32 bg-muted rounded"></div>
                <div class="h-3 w-24 bg-muted rounded"></div>
              </div>
              <div class="h-8 w-16 bg-muted rounded"></div>
            </div>
          {/each}
        </div>
      {:else if etaError}
        <!-- Error State -->
        <div class="eta-error">
          <p class="text-sm text-destructive">{etaError}</p>
          <Button variant="ghost" size="sm" onclick={handleGetETA}>Retry</Button
          >
        </div>
      {:else if etaPredictions.length === 0}
        <!-- No Predictions -->
        {@const emptyState = getEmptyStateMessage()}
        <div class="p-5 flex flex-col items-center gap-1.5 text-center">
          {#if emptyState.icon === "moon"}
            <Moon class="h-6 w-6 text-muted-foreground/50 mb-1" />
          {:else}
            <Clock class="h-6 w-6 text-muted-foreground/50 mb-1" />
          {/if}
          <p class="text-sm font-medium text-muted-foreground">
            {emptyState.title}
          </p>
          <p class="text-xs text-muted-foreground/70">{emptyState.subtitle}</p>
        </div>
      {:else}
        <!-- Predictions (ETACard style) -->
        <div class="divide-y divide-border">
          {#each etaPredictions as prediction (prediction.route + prediction.direction)}
            {@const parsed = parseDirection(prediction.direction)}
            {@const primaryTime = prediction.arrivals[0]}
            {@const secondaryTimes = prediction.arrivals.slice(1)}

            <div class="px-4 py-3">
              <!-- Mobile: Vertical layout -->
              <div class="sm:hidden">
                <div class="flex items-start gap-3">
                  <RouteBadge
                    route={prediction.route}
                    size="lg"
                    class="flex-shrink-0"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-foreground leading-snug">
                      {parsed.direction}{parsed.direction && parsed.destination
                        ? " to "
                        : ""}{parsed.destination}
                    </p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {formattedStop.name}
                    </p>
                  </div>
                </div>
                <div class="flex items-baseline justify-end gap-1 mt-2">
                  {#if prediction.arrivals.length > 0}
                    <span
                      class="text-5xl font-bold text-foreground tabular-nums"
                      >{primaryTime}</span
                    >
                    {#if prediction.isLive}
                      <LiveSignalIcon size="lg" class="self-start mt-1.5" />
                    {/if}
                    {#if secondaryTimes.length > 0}
                      {#each secondaryTimes as time}
                        <span
                          class="text-3xl font-semibold text-muted-foreground tabular-nums"
                          >, {time}</span
                        >
                        {#if prediction.isLive}
                          <LiveSignalIcon size="md" class="self-start mt-1" />
                        {/if}
                      {/each}
                    {/if}
                    <span class="text-lg text-muted-foreground ml-1">min</span>
                  {:else}
                    <span class="text-5xl font-bold text-muted-foreground/50"
                      >–</span
                    >
                    <span class="text-lg text-muted-foreground">min</span>
                  {/if}
                </div>
              </div>

              <!-- Desktop: Horizontal layout -->
              <div class="hidden sm:flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <RouteBadge
                    route={prediction.route}
                    size="lg"
                    class="flex-shrink-0"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-foreground leading-snug">
                      {parsed.direction}{parsed.direction && parsed.destination
                        ? " to "
                        : ""}{parsed.destination}
                    </p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {formattedStop.name}
                    </p>
                  </div>
                </div>
                {#if prediction.arrivals.length > 0}
                  <div class="flex items-baseline gap-1 flex-shrink-0">
                    <span
                      class="text-4xl font-bold text-foreground tabular-nums"
                      >{primaryTime}</span
                    >
                    {#if prediction.isLive}
                      <LiveSignalIcon size="md" class="self-start mt-1" />
                    {/if}
                    {#if secondaryTimes.length > 0}
                      {#each secondaryTimes as time}
                        <span class="text-base text-foreground/70 tabular-nums"
                          >, {time}</span
                        >
                        {#if prediction.isLive}
                          <LiveSignalIcon size="sm" class="self-center" />
                        {/if}
                      {/each}
                    {/if}
                    <span class="text-base text-foreground/70 ml-1">min</span>
                  </div>
                {:else}
                  <span class="text-4xl font-bold text-muted-foreground/50"
                    >–</span
                  >
                {/if}
              </div>
            </div>
          {/each}
        </div>

        {#if lastFetched}
          <p class="last-updated">
            Updated {lastFetched.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .route-stop-item {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    overflow: hidden;
    transition: box-shadow 0.15s ease;
  }

  .route-stop-item.expanded {
    box-shadow: 0 2px 8px hsl(var(--foreground) / 0.05);
  }

  .stop-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .stop-index {
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(var(--muted));
    border-radius: 50%;
  }

  .index-number {
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
  }

  .stop-info {
    flex: 1;
    min-width: 0;
  }

  .stop-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stop-id {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  .platform-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }

  :global(.eta-button) {
    flex-shrink: 0;
    gap: 0.25rem;
  }

  /* ETA Panel */
  .eta-panel {
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--card));
  }

  .eta-error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
  }

  .last-updated {
    font-size: 0.625rem;
    color: hsl(var(--muted-foreground));
    text-align: right;
    padding: 0.5rem 1rem;
    border-top: 1px dashed hsl(var(--border));
  }
</style>
