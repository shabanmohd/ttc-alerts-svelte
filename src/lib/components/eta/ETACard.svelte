<script lang="ts">
  import { onMount } from "svelte";
  import {
    AlertCircle,
    MapPin,
    X,
    Moon,
    Clock,
    RefreshCw,
    Calendar,
  } from "lucide-svelte";
  import { savedStops } from "$lib/stores/savedStops";
  import { type StopETA, type ETAPrediction } from "$lib/stores/eta";
  import { isSubwayLine } from "$lib/services/subway-eta";
  import {
    loadScheduleData,
    getNextScheduledDeparturesForStop,
    type NextDepartureInfo,
  } from "$lib/services/schedule-lookup";
  import { getRouteName } from "$lib/data/route-names";
  import { _ } from "svelte-i18n";
  import { db } from "$lib/data/stops-db";
  import LiveSignalIcon from "./LiveSignalIcon.svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";
  import { getEmptyStateMessage } from "$lib/utils/ttc-service-info";
  import { ChevronDown } from "lucide-svelte";

  interface Props {
    eta: StopETA;
    compact?: boolean;
    showRemove?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    onRefresh?: (stopId: string) => void;
    class?: string;
  }

  let {
    eta,
    compact = false,
    showRemove = true,
    collapsed = false,
    onToggleCollapse,
    onRefresh,
    class: className = "",
  }: Props = $props();

  let isRefreshing = $state(false);

  /**
   * Check if this stop serves subway routes
   */
  let isSubway = $derived.by(() => {
    // Look up the saved stop to get its routes
    const savedStop = $savedStops.find((s) => s.id === eta.stopId);
    if (savedStop?.routes && savedStop.routes.length > 0) {
      return savedStop.routes.some((route) => isSubwayLine(route));
    }
    return false;
  });

  /**
   * Format stop name as cross-streets
   * "Morningside Ave At Sheppard Ave" → "Morningside Ave / Sheppard Ave"
   * Also handles: "Opp", "Near", "North Side", "South Side", etc.
   */
  function formatCrossStreets(stopName: string): string {
    return stopName
      .replace(/\s+At\s+/gi, " / ")
      .replace(/\s+Opp\s+/gi, " / Opp ")
      .replace(/\s+Near\s+/gi, " / Near ")
      .replace(/\s+North Side\s*/gi, " (North Side)")
      .replace(/\s+South Side\s*/gi, " (South Side)")
      .replace(/\s+East Side\s*/gi, " (East Side)")
      .replace(/\s+West Side\s*/gi, " (West Side)");
  }

  /**
   * Sort predictions by route number
   */
  function sortPredictions(predictions: ETAPrediction[]): ETAPrediction[] {
    return [...predictions].sort((a, b) => {
      const aNum = parseInt(a.route, 10);
      const bNum = parseInt(b.route, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.route.localeCompare(b.route);
    });
  }

  /**
   * Parse direction into a single destination line
   * "North - 133 Neilson towards Morningside Heights via Scarborough Centre Stn"
   * → { direction: "North", destination: "Morningside Heights via Scarborough Centre Stn" }
   * "Southbound to Vaughan Metropolitan Centre via Union"
   * → { direction: "Southbound", destination: "Vaughan Metropolitan Centre via Union" }
   */
  function parseDirection(direction: string): {
    direction: string;
    destination: string;
  } {
    // Handle NTAS format: "Southbound to Vaughan..." or "Northbound to Finch"
    // Also handles "Eastbound to Kennedy" etc.
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

    // Pattern: "Direction - Route towards Destination via Details"
    const towardsIndex = cleaned.toLowerCase().indexOf(" towards ");
    if (towardsIndex > -1) {
      const beforeTowards = cleaned.substring(0, towardsIndex).trim();
      const afterTowards = cleaned.substring(towardsIndex + 9).trim(); // 9 = " towards ".length

      // Extract direction from "North - 133 Neilson" → "North"
      const dashMatch = beforeTowards.match(/^(North|South|East|West)\s*-/i);
      const dir = dashMatch ? dashMatch[1] : beforeTowards.split(/\s+/)[0];

      return {
        direction: dir,
        destination: afterTowards,
      };
    }

    // Pattern: "Direction - Route" (no towards)
    const dashMatch = cleaned.match(/^(North|South|East|West)\s*-\s*(.+)$/i);
    if (dashMatch) {
      return {
        direction: dashMatch[1].trim(),
        destination: dashMatch[2].trim(),
      };
    }

    // Fallback: check for directional keywords at start
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
   * Convert minutes to arrival time in HH:MM AM/PM format
   * Used for scheduled (non-live) predictions
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

  function handleRemove() {
    savedStops.remove(eta.stopId);
  }

  async function handleRefresh() {
    if (!onRefresh || isRefreshing) return;
    isRefreshing = true;
    try {
      await onRefresh(eta.stopId);
    } finally {
      // Small delay to show the animation completed
      setTimeout(() => {
        isRefreshing = false;
      }, 500);
    }
  }

  /**
   * Extract primary direction from predictions for display in header
   * Returns simplified direction like "Eastbound" or "Westbound"
   */
  function getPrimaryDirection(predictions: ETAPrediction[]): string | null {
    if (predictions.length === 0) return null;

    // Get the first prediction's direction
    const direction = predictions[0].direction;
    if (!direction) return null;

    // Try to extract just the direction part (e.g., "West" from "West - 116 Morningside")
    const dashMatch = direction.match(/^(North|South|East|West)\s*-/i);
    if (dashMatch) {
      return `${dashMatch[1]}bound`;
    }

    // Fallback: check for directional keywords at start
    const dirMatch = direction.match(/^(North|South|East|West)(?:bound)?/i);
    if (dirMatch) {
      return `${dirMatch[1]}bound`;
    }

    return null;
  }

  /**
   * Format the future day label for display
   * Labels from schedule-lookup are already formatted correctly:
   * - "Tomorrow"
   * - "Tomorrow - Christmas Day"
   * - "Mon, Dec 29"
   * - "Thu, Dec 25 - Christmas Day"
   */
  function formatFutureLabel(label: string): string {
    return label;
  }

  let sortedPredictions = $derived(sortPredictions(eta.predictions));
  let primaryDirection = $derived(getPrimaryDirection(eta.predictions));
  let crossStreets = $derived(formatCrossStreets(eta.stopName));

  // Schedule lookup state
  let scheduledDepartures = $state<Map<string, NextDepartureInfo>>(new Map());
  let routesWithNoService = $state<Set<string>>(new Set());
  let scheduleLoaded = $state(false);

  // Track routes from stops database lookup
  let dbRoutes = $state<string[]>([]);

  // Load routes from stops database if not available from saved stops
  $effect(() => {
    const savedStop = $savedStops.find((s) => s.id === eta.stopId);
    if (!savedStop?.routes || savedStop.routes.length === 0) {
      // Look up routes from the stops database
      db.stops.get(eta.stopId).then((stop) => {
        if (stop?.routes) {
          dbRoutes = stop.routes;
        }
      });
    }
  });

  // Get the routes this stop serves from saved stops, database, or predictions
  let stopRoutes = $derived.by(() => {
    const savedStop = $savedStops.find((s) => s.id === eta.stopId);
    // If saved stop has routes, use them
    if (savedStop?.routes && savedStop.routes.length > 0) {
      return savedStop.routes;
    }
    // Fallback to routes from database lookup
    if (dbRoutes.length > 0) {
      return dbRoutes;
    }
    // Last fallback: get routes from predictions if available
    if (eta.predictions.length > 0) {
      return [...new Set(eta.predictions.map((p) => p.route))];
    }
    return [];
  });

  // Get routes that have real-time predictions
  let routesWithPredictions = $derived.by(() => {
    return new Set(sortedPredictions.map((p) => p.route));
  });

  // Get routes that need scheduled time (saved but no real-time data)
  let routesNeedingSchedule = $derived.by(() => {
    return stopRoutes.filter((r) => !routesWithPredictions.has(r));
  });

  // Scheduled departures for routes without real-time data
  let missingRoutesSchedule = $derived.by(() => {
    if (!scheduleLoaded) return new Map<string, NextDepartureInfo | null>();
    const result = new Map<string, NextDepartureInfo | null>();
    // Include routes with scheduled departures
    for (const [routeId, info] of scheduledDepartures.entries()) {
      if (!routesWithPredictions.has(routeId)) {
        result.set(routeId, info);
      }
    }
    // Include routes with no service (show "No Service")
    for (const routeId of routesWithNoService) {
      if (!routesWithPredictions.has(routeId)) {
        result.set(routeId, null);
      }
    }
    return result;
  });

  // Load scheduled departures for missing routes
  $effect(() => {
    // Load schedules if:
    // 1. Not currently loading ETA data
    // 2. Schedule not already loaded
    // 3. Either we need schedules for routes without predictions, OR there are no predictions at all but we have routes
    const shouldLoadSchedules =
      !eta.isLoading &&
      !scheduleLoaded &&
      (routesNeedingSchedule.length > 0 ||
        (sortedPredictions.length === 0 && stopRoutes.length > 0));

    if (shouldLoadSchedules) {
      loadScheduleData().then(() => {
        if (stopRoutes.length > 0) {
          const departures = getNextScheduledDeparturesForStop(
            eta.stopId,
            stopRoutes
          );
          scheduledDepartures = departures;

          // Track routes that have no service (not in departures map)
          const noService = new Set<string>();
          for (const routeId of stopRoutes) {
            if (!departures.has(routeId)) {
              noService.add(routeId);
            }
          }
          routesWithNoService = noService;
        }
        scheduleLoaded = true;
      });
    }
  });
</script>

<div
  class={cn(
    "w-full rounded-lg border-2 bg-card overflow-hidden",
    eta.error && "border-destructive/30",
    className
  )}
>
  <!-- Header: Stop Name + Direction Badge + Stop ID -->
  {#if onToggleCollapse}
    <!-- Clickable header for collapsible mode -->
    <button
      type="button"
      class={cn(
        "flex items-start justify-between gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 w-full text-left",
        !collapsed && "border-b",
        "cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      )}
      onclick={onToggleCollapse}
      aria-expanded={!collapsed}
    >
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <MapPin class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div class="min-w-0 flex-1">
          <p class="font-medium text-base leading-tight">{crossStreets}</p>
          <div class="flex items-center gap-2 mt-1">
            {#if primaryDirection}
              {@const dirColor = primaryDirection.toLowerCase().includes("east")
                ? "bg-sky-600/20 text-sky-700 dark:text-sky-400 border-sky-600/40"
                : primaryDirection.toLowerCase().includes("west")
                  ? "bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/40"
                  : primaryDirection.toLowerCase().includes("north")
                    ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40"
                    : primaryDirection.toLowerCase().includes("south")
                      ? "bg-rose-600/20 text-rose-700 dark:text-rose-400 border-rose-600/40"
                      : "bg-muted text-muted-foreground border-muted-foreground/30"}
              <span
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase {dirColor}"
              >
                {primaryDirection}
              </span>
            {/if}
            <span class="text-xs text-muted-foreground">#{eta.stopId}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <ChevronDown
          class={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            !collapsed && "rotate-180"
          )}
        />
      </div>
    </button>
  {:else}
    <!-- Non-clickable header for normal mode -->
    <div
      class="flex items-start justify-between gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-b"
    >
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <MapPin class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div class="min-w-0 flex-1">
          <p class="font-medium text-base leading-tight">{crossStreets}</p>
          <div class="flex items-center gap-2 mt-1">
            {#if primaryDirection}
              {@const dirColor = primaryDirection.toLowerCase().includes("east")
                ? "bg-sky-600/20 text-sky-700 dark:text-sky-400 border-sky-600/40"
                : primaryDirection.toLowerCase().includes("west")
                  ? "bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/40"
                  : primaryDirection.toLowerCase().includes("north")
                    ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40"
                    : primaryDirection.toLowerCase().includes("south")
                      ? "bg-rose-600/20 text-rose-700 dark:text-rose-400 border-rose-600/40"
                      : "bg-muted text-muted-foreground border-muted-foreground/30"}
              <span
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase {dirColor}"
              >
                {primaryDirection}
              </span>
            {/if}
            <span class="text-xs text-muted-foreground">#{eta.stopId}</span>
          </div>
        </div>
      </div>
      {#if showRemove}
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
          onclick={handleRemove}
          aria-label="Remove stop"
        >
          <X class="h-4 w-4" />
        </Button>
      {/if}
    </div>
  {/if}

  <!-- Content (collapsible) -->
  {#if !collapsed}
    {#if eta.error}
      <!-- Error State -->
      <div class="flex items-center gap-2 text-destructive text-sm p-4">
        <AlertCircle class="h-4 w-4 flex-shrink-0" />
        <span>{eta.error}</span>
      </div>
    {:else if eta.isLoading && eta.predictions.length === 0}
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
    {:else if sortedPredictions.length === 0}
      <!-- No Predictions - Show scheduled departures in full card style -->
      {@const emptyState = getEmptyStateMessage(isSubway, eta.stopId)}

      {#if scheduleLoaded && scheduledDepartures.size > 0}
        <!-- Show scheduled departures in same style as live ETA -->
        <div class="bg-blue-500/10 dark:bg-blue-950/30">
          <!-- Section Header -->
          <div
            class="px-4 py-2 bg-blue-500/20 dark:bg-blue-900/40 border-b border-blue-500/20"
          >
            <div
              class="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300/80"
            >
              <Calendar class="h-3.5 w-3.5" />
              <span>Scheduled Next Bus</span>
            </div>
          </div>

          <!-- Scheduled Route Cards - Same style as live ETA -->
          <div class="divide-y divide-border">
            {#each [...scheduledDepartures.entries()] as [routeId, departure]}
              {@const routeName = getRouteName(routeId)}
              <div class="px-4 py-3">
                <!-- Mobile: Vertical layout -->
                <div class="sm:hidden">
                  <!-- Row 1: Route Badge + Route Name -->
                  <div class="flex items-start gap-3">
                    <RouteBadge
                      route={routeId}
                      size="lg"
                      class="flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-sm font-medium text-foreground leading-snug"
                      >
                        {routeName || routeId}
                      </p>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {crossStreets}
                      </p>
                    </div>
                  </div>
                  <!-- Row 2: Time (right aligned, matching live ETA style) -->
                  <div class="flex flex-col items-end mt-2">
                    {#if departure && departure.time}
                      <span
                        class="text-5xl font-bold text-foreground/70 tabular-nums"
                      >
                        {departure.time}
                      </span>
                      {#if departure.noWeekendService && departure.nextWeekdayLabel}
                        <span class="text-sm text-muted-foreground"
                          >{departure.nextWeekdayLabel}</span
                        >
                      {:else if !departure.isToday && departure.tomorrowLabel}
                        <span class="text-sm text-muted-foreground"
                          >{formatFutureLabel(departure.tomorrowLabel)}</span
                        >
                      {/if}
                    {:else if departure?.noWeekendService}
                      <span
                        class="text-xl font-semibold text-muted-foreground/60"
                      >
                        No Weekend Service
                      </span>
                    {:else}
                      <span
                        class="text-2xl font-semibold text-muted-foreground/60"
                      >
                        No Service
                      </span>
                    {/if}
                  </div>
                </div>

                <!-- Desktop: Horizontal layout -->
                <div class="hidden sm:flex items-center justify-between gap-4">
                  <!-- Left: Route Badge + Route Name -->
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <RouteBadge
                      route={routeId}
                      size="lg"
                      class="flex-shrink-0"
                    />
                    <div class="min-w-0 flex-1">
                      <p
                        class="text-sm font-medium text-foreground leading-snug"
                      >
                        {routeName || routeId}
                      </p>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {crossStreets}
                      </p>
                    </div>
                  </div>
                  <!-- Right: Time -->
                  <div class="flex flex-col items-end flex-shrink-0">
                    {#if departure && departure.time}
                      <span
                        class="text-4xl font-bold text-foreground/70 tabular-nums"
                      >
                        {departure.time}
                      </span>
                      {#if departure.noWeekendService && departure.nextWeekdayLabel}
                        <span class="text-sm text-muted-foreground"
                          >{departure.nextWeekdayLabel}</span
                        >
                      {:else if !departure.isToday && departure.tomorrowLabel}
                        <span class="text-sm text-muted-foreground"
                          >{formatFutureLabel(departure.tomorrowLabel)}</span
                        >
                      {/if}
                    {:else if departure?.noWeekendService}
                      <span
                        class="text-lg font-semibold text-muted-foreground/60"
                      >
                        No Weekend Service
                      </span>
                    {:else}
                      <span
                        class="text-xl font-semibold text-muted-foreground/60"
                      >
                        No Service
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else if !scheduleLoaded && stopRoutes.length > 0}
        <!-- Loading schedule data -->
        <div class="p-5 flex flex-col items-center gap-3 text-center">
          <div
            class="h-3 w-3 border-2 border-muted-foreground/30 border-t-muted-foreground/70 rounded-full animate-spin"
          ></div>
          <span class="text-xs text-muted-foreground/60"
            >{$_("common.loadingSchedule")}</span
          >
        </div>
      {:else}
        <!-- Fallback: No scheduled data available -->
        <div class="p-5 flex flex-col items-center gap-3 text-center">
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

          {#if onRefresh}
            <Button
              variant="outline"
              size="sm"
              class="mt-2 gap-1.5"
              onclick={handleRefresh}
              disabled={isRefreshing || eta.isLoading}
            >
              <RefreshCw
                class={cn(
                  "h-3.5 w-3.5",
                  (isRefreshing || eta.isLoading) && "animate-spin"
                )}
              />
              <span
                >{isRefreshing || eta.isLoading
                  ? $_("common.refreshing")
                  : $_("common.refresh")}</span
              >
            </Button>
          {/if}
        </div>
      {/if}
    {:else}
      <!-- Stacked Route Cards with Dividers -->
      <div class="divide-y divide-border">
        {#each sortedPredictions as prediction (prediction.route + prediction.direction)}
          {@const parsed = parseDirection(prediction.direction)}
          {@const primaryTime = prediction.arrivals[0]}
          {@const secondaryTimes = prediction.arrivals.slice(1)}

          <!-- Mobile: Vertical layout | Desktop: Original horizontal layout -->
          <div class="px-4 py-3">
            <!-- Desktop: Single row with badge + direction left, times right -->
            <div class="hidden sm:flex items-center justify-between gap-4">
              <!-- Left: Route Badge + Direction -->
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
                    {crossStreets}
                  </p>
                </div>
              </div>
              <!-- Right: Arrival Times -->
              {#if prediction.arrivals.length > 0}
                {#if prediction.isLive}
                  <!-- Live GPS data: show minutes countdown with signal icon -->
                  <div class="flex items-baseline gap-1 flex-shrink-0">
                    <span
                      class="text-4xl font-bold text-foreground tabular-nums"
                      >{primaryTime}</span
                    >
                    <LiveSignalIcon size="md" class="self-start mt-1" />
                    {#if secondaryTimes.length > 0}
                      {#each secondaryTimes as time}
                        <span class="text-base text-foreground/70 tabular-nums"
                          >, {time}</span
                        >
                        <LiveSignalIcon size="sm" class="self-center" />
                      {/each}
                    {/if}
                    <span class="text-base text-foreground/70 ml-1">min</span>
                  </div>
                {:else}
                  <!-- Scheduled: show times with AM/PM and label -->
                  {@const primaryTimeObj = minutesToTimeObject(primaryTime)}
                  {@const allTimeObjs = [
                    primaryTimeObj,
                    ...secondaryTimes.map((t) => minutesToTimeObject(t)),
                  ]}
                  {@const allSamePeriod = allTimeObjs.every(
                    (t) => t.period === primaryTimeObj.period
                  )}
                  <div class="flex flex-col items-end flex-shrink-0">
                    <div class="flex items-baseline gap-1">
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
                            class="text-base text-foreground/70 tabular-nums"
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
                    </div>
                    <span
                      class="text-sm text-amber-600 dark:text-amber-400 font-medium"
                      >Scheduled</span
                    >
                  </div>
                {/if}
              {:else}
                <span class="text-4xl font-bold text-muted-foreground/50"
                  >–</span
                >
              {/if}
            </div>

            <!-- Mobile: Vertical layout with text on top, ETAs below -->
            <div class="sm:hidden">
              <!-- Row 1: Route Badge + Direction/Destination Text -->
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
                    {crossStreets}
                  </p>
                </div>
              </div>
              <!-- Row 2: ETA Times (right aligned) -->
              <div class="flex items-baseline justify-end gap-2 mt-2">
                {#if prediction.arrivals.length > 0}
                  {#if prediction.isLive}
                    <!-- Live GPS data: show minutes countdown with signal icon -->
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
                    <span class="text-lg text-muted-foreground ml-1">min</span>
                  {:else}
                    <!-- Scheduled: show times with AM/PM and label -->
                    {@const primaryTimeObj = minutesToTimeObject(primaryTime)}
                    {@const allTimeObjs = [
                      primaryTimeObj,
                      ...secondaryTimes.map((t) => minutesToTimeObject(t)),
                    ]}
                    {@const allSamePeriod = allTimeObjs.every(
                      (t) => t.period === primaryTimeObj.period
                    )}
                    <div class="flex flex-col items-end">
                      <div class="flex items-baseline gap-1">
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
                      </div>
                      <span
                        class="text-sm text-amber-600 dark:text-amber-400 font-medium"
                        >Scheduled</span
                      >
                    </div>
                  {/if}
                {:else}
                  <span class="text-5xl font-bold text-muted-foreground/50"
                    >–</span
                  >
                  <span class="text-lg text-muted-foreground">min</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Routes without real-time data - show scheduled times -->
      {#if scheduleLoaded && missingRoutesSchedule.size > 0}
        <div
          class="border-t border-blue-500/20 bg-blue-500/10 dark:bg-blue-950/30"
        >
          <!-- Section Header -->
          <div
            class="px-4 py-2 bg-blue-500/20 dark:bg-blue-900/40 border-b border-blue-500/20"
          >
            <div
              class="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300/80"
            >
              <Calendar class="h-3.5 w-3.5" />
              <span>Scheduled Next Bus</span>
            </div>
          </div>

          <!-- Scheduled Route Cards -->
          <div class="divide-y divide-border/50">
            {#each [...missingRoutesSchedule.entries()] as [routeId, departure]}
              {@const routeName = getRouteName(routeId)}
              <div class="px-4 py-3">
                <!-- Mobile: Vertical layout -->
                <div class="sm:hidden">
                  <!-- Row 1: Route Badge + Route Name -->
                  <div class="flex items-start gap-3">
                    <RouteBadge
                      route={routeId}
                      size="lg"
                      class="flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-sm font-medium text-foreground leading-snug"
                      >
                        {routeName || routeId}
                      </p>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {crossStreets}
                      </p>
                    </div>
                  </div>
                  <!-- Row 2: Time (right aligned, matching live ETA style) -->
                  <div class="flex flex-col items-end mt-2">
                    {#if departure && departure.time}
                      <span
                        class="text-5xl font-bold text-foreground/70 tabular-nums"
                      >
                        {departure.time}
                      </span>
                      {#if departure.noWeekendService && departure.nextWeekdayLabel}
                        <span class="text-sm text-muted-foreground"
                          >{departure.nextWeekdayLabel}</span
                        >
                      {:else if !departure.isToday && departure.tomorrowLabel}
                        <span class="text-sm text-muted-foreground"
                          >{formatFutureLabel(departure.tomorrowLabel)}</span
                        >
                      {/if}
                    {:else if departure?.noWeekendService}
                      <span
                        class="text-xl font-semibold text-muted-foreground/60"
                      >
                        No Weekend Service
                      </span>
                    {:else}
                      <span
                        class="text-2xl font-semibold text-muted-foreground/60"
                      >
                        No Service
                      </span>
                    {/if}
                  </div>
                </div>

                <!-- Desktop: Horizontal layout -->
                <div class="hidden sm:flex items-center justify-between gap-4">
                  <!-- Left: Route Badge + Route Name -->
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <RouteBadge
                      route={routeId}
                      size="lg"
                      class="flex-shrink-0"
                    />
                    <div class="min-w-0 flex-1">
                      <p
                        class="text-sm font-medium text-foreground leading-snug"
                      >
                        {routeName || routeId}
                      </p>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {crossStreets}
                      </p>
                    </div>
                  </div>
                  <!-- Right: Time -->
                  <div class="flex flex-col items-end flex-shrink-0">
                    {#if departure && departure.time}
                      <span
                        class="text-4xl font-bold text-foreground/70 tabular-nums"
                      >
                        {departure.time}
                      </span>
                      {#if departure.noWeekendService && departure.nextWeekdayLabel}
                        <span class="text-sm text-muted-foreground"
                          >{departure.nextWeekdayLabel}</span
                        >
                      {:else if !departure.isToday && departure.tomorrowLabel}
                        <span class="text-sm text-muted-foreground"
                          >{formatFutureLabel(departure.tomorrowLabel)}</span
                        >
                      {/if}
                    {:else if departure?.noWeekendService}
                      <span
                        class="text-lg font-semibold text-muted-foreground/60"
                      >
                        No Weekend Service
                      </span>
                    {:else}
                      <span
                        class="text-xl font-semibold text-muted-foreground/60"
                      >
                        No Service
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>
