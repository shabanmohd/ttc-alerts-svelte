<script lang="ts">
  import { _ } from "svelte-i18n";
  import type { TTCStop } from "$lib/data/stops-db";
  import {
    fetchStopETA,
    filterPredictionsForRoute,
    type ETAPrediction,
  } from "$lib/services/nextbus";
  import { fetchSubwayETA, isSubwayStop } from "$lib/services/subway-eta";
  import {
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Loader2,
    Moon,
    RefreshCw,
    Bookmark,
    Check,
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import LiveSignalIcon from "$lib/components/eta/LiveSignalIcon.svelte";
  import { savedStops, isAtMaxSavedStops } from "$lib/stores/savedStops";
  import { cn } from "$lib/utils";
  import { toast } from "svelte-sonner";
  import { getEmptyStateMessage } from "$lib/utils/ttc-service-info";

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
  let timeTick = $state(0); // For updating relative time display
  let showSavedFeedback = $state(false); // For save button feedback animation
  let atMax = $state(false);
  let isSaved = $state(false);

  // Subscribe to saved stops to track if this stop is saved
  $effect(() => {
    const unsubscribe = savedStops.subscribe((stops) => {
      isSaved = stops.some((s) => s.id === stop.id);
    });
    return unsubscribe;
  });

  // Sync expanded state with prop (default collapsed)
  $effect(() => {
    expanded = isExpanded;
  });

  // Timer for updating relative time display
  $effect(() => {
    if (!lastFetched) return;

    const interval = setInterval(() => {
      timeTick++;
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  });

  // Subscribe to max stops state
  $effect(() => {
    const unsubscribe = isAtMaxSavedStops.subscribe((value) => {
      atMax = value;
    });
    return unsubscribe;
  });

  // Reset saved feedback after animation
  $effect(() => {
    if (showSavedFeedback) {
      const timeout = setTimeout(() => {
        showSavedFeedback = false;
      }, 2000);
      return () => clearTimeout(timeout);
    }
  });

  /**
   * Toggle expand/collapse - fetch ETA if expanding
   */
  function handleToggle() {
    if (expanded) {
      expanded = false;
      return;
    }
    // Expanding - fetch fresh data
    handleGetETA();
  }

  /**
   * Fetch ETA for this stop (always fetches, used by toggle and refresh)
   */
  async function handleGetETA() {
    expanded = true;
    isLoadingETA = true;
    etaError = null;

    // Notify parent
    onGetETA?.(stop.id);

    try {
      // Use subway ETA service for subway stops, NextBus for surface vehicles
      const response = isSubwayStop(stop.type)
        ? await fetchSubwayETA(stop.name, stop.id, routeFilter)
        : await fetchStopETA(stop.id);

      if (response.error) {
        etaError = response.error;
        etaPredictions = [];
      } else {
        // Filter for specific route if provided (only for surface vehicles)
        etaPredictions =
          routeFilter && !isSubwayStop(stop.type)
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
   * Handles both surface vehicle format ("North - 133 towards...")
   * and NTAS subway format ("Southbound to Vaughan...")
   */
  function parseDirection(direction: string): {
    direction: string;
    destination: string;
  } {
    // Handle NTAS format: "Southbound to Vaughan..." or "Northbound to Finch"
    const boundMatch = direction.match(
      /^(North|South|East|West)(bound)\s+to\s+(.+)$/i
    );
    if (boundMatch) {
      return {
        direction: boundMatch[1] + boundMatch[2], // "Southbound", "Northbound", etc.
        destination: boundMatch[3].trim(),
      };
    }

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
   * Format last updated time as relative (e.g., "2m ago", "Just now")
   */
  function formatLastUpdated(date: Date | null, _tick: number): string {
    if (!date) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return $_("time.justNow");
    if (diff < 3600)
      return $_("time.minutesAgo", {
        values: { count: Math.floor(diff / 60) },
      });
    return $_("time.hoursAgo", { values: { count: Math.floor(diff / 3600) } });
  }

  /**
   * Convert minutes from now to AM/PM time object
   * Returns { time: string, period: string } for flexible display
   */
  function minutesToTimeObject(minutes: number): {
    time: string;
    period: string;
  } {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + minutes * 60 * 1000);
    const hours = arrivalTime.getHours();
    const mins = arrivalTime.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return {
      time: `${displayHours}:${mins.toString().padStart(2, "0")}`,
      period,
    };
  }

  /**
   * Handle refresh button click
   */
  function handleRefresh(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    // Don't toggle - just refresh
    refreshETA();
  }

  /**
   * Refresh ETA without toggling expand state
   */
  async function refreshETA() {
    isLoadingETA = true;
    etaError = null;

    try {
      // Use subway ETA service for subway stops, NextBus for surface vehicles
      const response = isSubwayStop(stop.type)
        ? await fetchSubwayETA(stop.name, stop.id, routeFilter, true) // forceRefresh=true
        : await fetchStopETA(stop.id);

      if (response.error) {
        etaError = response.error;
        etaPredictions = [];
      } else {
        // Filter for specific route if provided (only for surface vehicles)
        etaPredictions =
          routeFilter && !isSubwayStop(stop.type)
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
   * Handle save stop button click
   */
  async function handleSaveStop(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (isSaved) {
      await savedStops.remove(stop.id);
      toast.success($_("toasts.stopRemoved"), {
        description: stop.name,
      });
    } else if (!atMax) {
      const added = await savedStops.add({
        id: stop.id,
        name: stop.name,
        routes: stop.routes,
      });
      if (added) {
        showSavedFeedback = true;
        toast.success($_("toasts.stopAdded"), {
          description: stop.name,
        });
      } else {
        toast.info($_("toasts.stopAlreadySaved"), {
          description: $_("toast.stopAlreadyInYourStops", {
            values: { stopName: stop.name },
          }),
        });
      }
    }
  }

  let formattedStop = $derived(formatStopName(stop.name));
</script>

<div
  class="route-stop-item"
  class:expanded
  data-stop-id={stop.id}
  role="listitem"
>
  <!-- Stop Header (clickable to expand/collapse) -->
  <button
    type="button"
    class="stop-header"
    onclick={handleToggle}
    aria-expanded={expanded}
    aria-controls="eta-panel-{stop.id}"
  >
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

    <!-- Expand/collapse indicator -->
    <div class="expand-indicator" aria-hidden="true">
      {#if isLoadingETA}
        <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
      {:else if expanded}
        <ChevronUp class="h-4 w-4 text-muted-foreground" />
      {:else}
        <ChevronDown class="h-4 w-4 text-muted-foreground" />
      {/if}
    </div>
  </button>

  <!-- ETA Panel (same style as ETACard) -->
  {#if expanded}
    <div id="eta-panel-{stop.id}" class="eta-panel animate-fade-in-down">
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
        <!-- Action bar for error state -->
        <div class="action-bar">
          <button
            type="button"
            class="save-stop-button"
            class:saved={isSaved}
            class:show-feedback={showSavedFeedback}
            onclick={handleSaveStop}
            disabled={!isSaved && atMax}
            aria-label={isSaved ? "Remove from My Stops" : "Save to My Stops"}
          >
            {#if showSavedFeedback}
              <Check class="h-4 w-4" />
              <span>Saved!</span>
            {:else if isSaved}
              <Bookmark class="h-4 w-4 fill-current" />
              <span>Saved to My Stops</span>
            {:else}
              <Bookmark class="h-4 w-4" />
              <span>Save to My Stops</span>
            {/if}
          </button>
          <button
            type="button"
            class="refresh-button"
            onclick={handleRefresh}
            disabled={isLoadingETA}
            aria-label="Refresh arrival times"
          >
            <RefreshCw
              class="h-3.5 w-3.5 {isLoadingETA ? 'animate-spin' : ''}"
            />
            <span class="refresh-text">Retry</span>
          </button>
        </div>
      {:else if etaPredictions.length === 0}
        <!-- No Predictions -->
        {@const emptyState = getEmptyStateMessage(
          stop.type === "subway",
          stop.id
        )}
        <div class="p-5 flex flex-col items-center gap-2 text-center">
          {#if emptyState.icon === "moon"}
            <Moon class="h-6 w-6 text-muted-foreground/50 mb-1" />
          {:else if emptyState.icon === "alert"}
            <AlertCircle class="h-6 w-6 text-muted-foreground/50 mb-1" />
          {:else}
            <Clock class="h-6 w-6 text-muted-foreground/50 mb-1" />
          {/if}
          <p class="text-sm font-medium text-muted-foreground">
            {emptyState.title}
          </p>
          <p class="text-xs text-muted-foreground/70">{emptyState.subtitle}</p>
          {#if emptyState.frequency}
            <p class="text-xs text-muted-foreground/60 italic">
              {emptyState.frequency}
            </p>
          {/if}
          {#if emptyState.additionalInfo}
            <p class="text-xs text-muted-foreground/60 italic">
              {emptyState.additionalInfo}
            </p>
          {/if}
          <Button
            variant="outline"
            size="sm"
            class="mt-2 gap-1.5"
            onclick={refreshETA}
            disabled={isLoadingETA}
          >
            <RefreshCw
              class={cn("h-3.5 w-3.5", isLoadingETA && "animate-spin")}
            />
            <span>{isLoadingETA ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
        <!-- Action bar for empty state -->
        <div class="action-bar">
          <button
            type="button"
            class="save-stop-button"
            class:saved={isSaved}
            class:show-feedback={showSavedFeedback}
            onclick={handleSaveStop}
            disabled={!isSaved && atMax}
            aria-label={isSaved ? "Remove from My Stops" : "Save to My Stops"}
          >
            {#if showSavedFeedback}
              <Check class="h-4 w-4" />
              <span>Saved!</span>
            {:else if isSaved}
              <Bookmark class="h-4 w-4 fill-current" />
              <span>Saved to My Stops</span>
            {:else}
              <Bookmark class="h-4 w-4" />
              <span>Save to My Stops</span>
            {/if}
          </button>
          <button
            type="button"
            class="refresh-button"
            onclick={handleRefresh}
            disabled={isLoadingETA}
            aria-label="Refresh arrival times"
          >
            <RefreshCw
              class="h-3.5 w-3.5 {isLoadingETA ? 'animate-spin' : ''}"
            />
            <span class="refresh-text">
              {#if lastFetched}
                {formatLastUpdated(lastFetched, timeTick)}
              {:else}
                Refresh
              {/if}
            </span>
          </button>
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
                    {#if prediction.isLive}
                      <!-- Live GPS data: show minutes countdown -->
                      <span
                        class="text-5xl font-bold text-foreground tabular-nums"
                        >{primaryTime}</span
                      >
                      <LiveSignalIcon size="lg" class="self-start mt-1.5" />
                      {#if secondaryTimes.length > 0}
                        {#each secondaryTimes as time}
                          <span
                            class="text-3xl font-semibold text-muted-foreground tabular-nums"
                            >, {time}</span
                          >
                          <LiveSignalIcon size="md" class="self-start mt-1" />
                        {/each}
                      {/if}
                      <span class="text-lg text-muted-foreground ml-1">min</span
                      >
                    {:else}
                      <!-- Scheduled: show times with small AM/PM -->
                      {@const primaryTimeObj = minutesToTimeObject(primaryTime)}
                      {@const allTimeObjs = [
                        primaryTimeObj,
                        ...secondaryTimes.map((t) => minutesToTimeObject(t)),
                      ]}
                      {@const allSamePeriod = allTimeObjs.every(
                        (t) => t.period === primaryTimeObj.period
                      )}
                      <span
                        class="text-4xl font-bold text-foreground tabular-nums"
                        >{primaryTimeObj.time}</span
                      >
                      {#if !allSamePeriod}
                        <span class="text-base text-muted-foreground"
                          >{primaryTimeObj.period}</span
                        >
                      {/if}
                      {#if secondaryTimes.length > 0}
                        {#each secondaryTimes as time, i}
                          {@const timeObj = allTimeObjs[i + 1]}
                          <span
                            class="text-2xl font-semibold text-muted-foreground tabular-nums"
                            >, {timeObj.time}</span
                          >
                          {#if !allSamePeriod && timeObj.period !== allTimeObjs[i]?.period}
                            <span class="text-sm text-muted-foreground"
                              >{timeObj.period}</span
                            >
                          {/if}
                        {/each}
                      {/if}
                      {#if allSamePeriod}
                        <span class="text-sm text-muted-foreground ml-0.5"
                          >{primaryTimeObj.period}</span
                        >
                      {/if}
                      <span
                        class="text-[10px] text-amber-600 dark:text-amber-400 ml-2 self-end mb-1.5 font-medium"
                        >Scheduled</span
                      >
                    {/if}
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
                    {#if prediction.isLive}
                      <!-- Live GPS data: show minutes countdown -->
                      <span
                        class="text-4xl font-bold text-foreground tabular-nums"
                        >{primaryTime}</span
                      >
                      <LiveSignalIcon size="md" class="self-start mt-1" />
                      {#if secondaryTimes.length > 0}
                        {#each secondaryTimes as time}
                          <span
                            class="text-base text-foreground/70 tabular-nums"
                            >, {time}</span
                          >
                          <LiveSignalIcon size="sm" class="self-center" />
                        {/each}
                      {/if}
                      <span class="text-base text-foreground/70 ml-1">min</span>
                    {:else}
                      <!-- Scheduled: show times with small AM/PM -->
                      {@const primaryTimeObj = minutesToTimeObject(primaryTime)}
                      {@const allTimeObjs = [
                        primaryTimeObj,
                        ...secondaryTimes.map((t) => minutesToTimeObject(t)),
                      ]}
                      {@const allSamePeriod = allTimeObjs.every(
                        (t) => t.period === primaryTimeObj.period
                      )}
                      <span
                        class="text-3xl font-bold text-foreground tabular-nums"
                        >{primaryTimeObj.time}</span
                      >
                      {#if !allSamePeriod}
                        <span class="text-xs text-foreground/70"
                          >{primaryTimeObj.period}</span
                        >
                      {/if}
                      {#if secondaryTimes.length > 0}
                        {#each secondaryTimes as time, i}
                          {@const timeObj = allTimeObjs[i + 1]}
                          <span
                            class="text-base text-foreground/70 tabular-nums"
                            >, {timeObj.time}</span
                          >
                          {#if !allSamePeriod && timeObj.period !== allTimeObjs[i]?.period}
                            <span class="text-xs text-foreground/70"
                              >{timeObj.period}</span
                            >
                          {/if}
                        {/each}
                      {/if}
                      {#if allSamePeriod}
                        <span class="text-sm text-foreground/70 ml-0.5"
                          >{primaryTimeObj.period}</span
                        >
                      {/if}
                      <span
                        class="text-[10px] text-amber-600 dark:text-amber-400 ml-2 self-end mb-0.5 font-medium"
                        >Scheduled</span
                      >
                    {/if}
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

        <!-- Action bar: Save stop (left) + Refresh (right) -->
        <div class="action-bar">
          <!-- Save stop button -->
          <button
            type="button"
            class="save-stop-button"
            class:saved={isSaved}
            class:show-feedback={showSavedFeedback}
            onclick={handleSaveStop}
            disabled={!isSaved && atMax}
            aria-label={isSaved ? "Remove from My Stops" : "Save to My Stops"}
          >
            {#if showSavedFeedback}
              <Check class="h-4 w-4" />
              <span>Saved!</span>
            {:else if isSaved}
              <Bookmark class="h-4 w-4 fill-current" />
              <span>Saved to My Stops</span>
            {:else}
              <Bookmark class="h-4 w-4" />
              <span>Save to My Stops</span>
            {/if}
          </button>

          <!-- Refresh button with relative time -->
          {#if lastFetched}
            <button
              type="button"
              class="refresh-button"
              onclick={handleRefresh}
              disabled={isLoadingETA}
              aria-label="Refresh arrival times"
            >
              <RefreshCw
                class="h-3.5 w-3.5 {isLoadingETA ? 'animate-spin' : ''}"
              />
              <span class="refresh-text"
                >{formatLastUpdated(lastFetched, timeTick)}</span
              >
            </button>
          {/if}
        </div>
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
    border-color: hsl(var(--primary) / 0.5);
    box-shadow: 0 2px 8px hsl(var(--foreground) / 0.08);
  }

  .stop-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    width: 100%;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .stop-header:hover {
    background: hsl(var(--accent) / 0.5);
  }

  .stop-header:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: -2px;
  }

  .expand-indicator {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
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

  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    border-top: 1px dashed hsl(var(--border));
  }

  .refresh-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);
    background: transparent;
    border: none;
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    font-size: 0.625rem;
    transition: all 0.15s ease;
  }

  .refresh-button:hover:not(:disabled) {
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }

  .refresh-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .refresh-text {
    font-weight: 500;
  }

  /* Save stop button */
  .save-stop-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: var(--radius);
    background: transparent;
    border: 1px solid hsl(var(--border));
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .save-stop-button:hover:not(:disabled) {
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
    border-color: hsl(var(--accent));
  }

  .save-stop-button.saved {
    color: rgb(180, 83, 9);
    border-color: rgb(217, 119, 6, 0.4);
    background: rgb(254, 243, 199);
  }

  .save-stop-button.saved:hover:not(:disabled) {
    background: rgb(253, 230, 138);
    color: rgb(146, 64, 14);
  }

  :global(.dark) .save-stop-button.saved {
    color: rgb(252, 211, 77);
    border-color: rgb(245, 158, 11, 0.4);
    background: rgb(120, 53, 15, 0.3);
  }

  :global(.dark) .save-stop-button.saved:hover:not(:disabled) {
    background: rgb(120, 53, 15, 0.5);
    color: rgb(253, 224, 71);
  }

  .save-stop-button.show-feedback {
    color: rgb(21, 128, 61);
    border-color: rgb(34, 197, 94, 0.4);
    background: rgb(220, 252, 231);
    animation: pulse-success 0.3s ease-out;
  }

  :global(.dark) .save-stop-button.show-feedback {
    color: rgb(134, 239, 172);
    border-color: rgb(34, 197, 94, 0.4);
    background: rgb(20, 83, 45, 0.4);
  }

  .save-stop-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  @keyframes pulse-success {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
