<script lang="ts">
  import { _ } from "svelte-i18n";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { ArrowLeft, Bell, CheckCircle, MapPin, Loader2 } from "lucide-svelte";
  import Header from "$lib/components/layout/Header.svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import BookmarkRouteButton from "$lib/components/alerts/BookmarkRouteButton.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    threadsWithAlerts,
    isLoading,
    fetchAlerts,
  } from "$lib/stores/alerts";
  import { isAuthenticated, userName, signOut } from "$lib/stores/auth";
  import type { ThreadWithAlerts } from "$lib/types/database";

  // Import route stops components
  import RouteDirectionTabs from "$lib/components/stops/RouteDirectionTabs.svelte";
  import RouteStopsList from "$lib/components/stops/RouteStopsList.svelte";
  import {
    initStopsDB,
    getStopsByRouteGroupedByDirection,
    type DirectionGroup,
    type DirectionLabel,
    type TTCStop,
  } from "$lib/data/stops-db";

  // Import dialogs
  import { HowToUseDialog, InstallPWADialog } from "$lib/components/dialogs";

  // Get route from URL param (with fallback)
  let routeId = $derived($page.params.route || "");

  // Get route details
  const ROUTE_NAMES: Record<string, string> = {
    "Line 1": "Yonge-University",
    "Line 2": "Bloor-Danforth",
    "Line 4": "Sheppard",
    "Line 5": "Eglinton (Under Construction)",
    "Line 6": "Finch West",
    "501": "Queen",
    "503": "Kingston Rd",
    "504": "King",
    "505": "Dundas",
    "506": "Carlton",
    "507": "Long Branch",
    "508": "Lake Shore",
    "509": "Harbourfront",
    "510": "Spadina",
    "511": "Bathurst",
    "512": "St Clair",
    "7": "Bathurst",
    "25": "Don Mills",
    "29": "Dufferin",
    "32": "Eglinton West",
    "34": "Eglinton East",
    "35": "Jane",
    "36": "Finch West",
    "39": "Finch East",
    "41": "Keele",
    "52": "Lawrence West",
    "54": "Lawrence East",
    "60": "Steeles West",
    "63": "Ossington",
    "84": "Sheppard West",
    "85": "Sheppard East",
    "95": "York Mills",
    "96": "Wilson",
    "97": "Yonge",
  };

  let routeName = $derived(ROUTE_NAMES[routeId] || "");

  // Check if this is a not-yet-operational line
  let isNotOperational = $derived(routeId === "Line 5");

  /**
   * Check if a thread is resolved (service resumed or marked resolved)
   */
  function isResolved(thread: ThreadWithAlerts): boolean {
    // Check if the thread is marked as resolved
    if (thread.is_resolved) return true;

    // Check if the latest alert has SERVICE_RESUMED effect
    const effect = thread.latestAlert?.effect?.toUpperCase() || "";
    if (effect.includes("SERVICE_RESUMED") || effect.includes("RESUMED"))
      return true;

    // Check header text for "Service has resumed"
    const headerText = thread.latestAlert?.header_text?.toLowerCase() || "";
    if (
      headerText.includes("service has resumed") ||
      headerText.includes("service resumed")
    )
      return true;

    return false;
  }

  // Filter alerts for this route (only active/unresolved alerts)
  let routeAlerts = $derived(
    $threadsWithAlerts.filter((thread) => {
      // First, skip resolved/resumed alerts
      if (isResolved(thread)) return false;

      const threadRoutes = Array.isArray(thread.affected_routes)
        ? thread.affected_routes
        : [];
      const alertRoutes = Array.isArray(thread.latestAlert?.affected_routes)
        ? thread.latestAlert.affected_routes
        : [];
      const allRoutes = [...new Set([...threadRoutes, ...alertRoutes])];

      // Use exact match only - no substring matching to prevent route 11 matching 119/511
      return allRoutes.some(
        (r) =>
          r.replace(/^0+/, "").toLowerCase() ===
          routeId.replace(/^0+/, "").toLowerCase()
      );
    })
  );

  // Stops state
  let directionGroups = $state<DirectionGroup[]>([]);
  let selectedDirection = $state<DirectionLabel>("All Stops");
  let isLoadingStops = $state(true);
  let stopsError = $state<string | null>(null);
  let expandedStopId = $state<string | null>(null);

  // Derived: current stops for selected direction
  let currentStops = $derived(() => {
    const group = directionGroups.find(
      (g) => g.direction === selectedDirection
    );
    return group?.stops || [];
  });

  // Derived: all stops (for map)
  let allStops = $derived(() => {
    return directionGroups.flatMap((g) => g.stops);
  });

  // Derived: direction labels for tabs (exclude "All Stops" if we have real directions)
  let directionLabels = $derived(() => {
    const labels = directionGroups.map((g) => g.direction);
    // If we have real directions (E/W/N/S), filter out "All Stops"
    const realDirections = labels.filter((l) => l !== "All Stops");
    if (realDirections.length > 0) {
      return realDirections;
    }
    return labels;
  });

  // Derived: filtered direction groups (matching directionLabels)
  let filteredDirectionGroups = $derived(() => {
    const labels = directionLabels();
    return directionGroups.filter((g) => labels.includes(g.direction));
  });

  // Derived: stop counts per direction (only for displayed directions)
  let stopCounts = $derived(() => {
    const counts: Record<DirectionLabel, number> = {} as any;
    for (const group of filteredDirectionGroups()) {
      counts[group.direction] = group.stops.length;
    }
    return counts;
  });

  // Get route color for map
  let activeDialog = $state<string | null>(null);

  onMount(async () => {
    // Load alerts and stops in parallel
    await Promise.all([fetchAlerts(), loadRouteStops()]);
  });

  /**
   * Load stops for current route
   */
  async function loadRouteStops() {
    isLoadingStops = true;
    stopsError = null;

    try {
      // Initialize stops database
      await initStopsDB();

      // Get stops grouped by direction
      directionGroups = await getStopsByRouteGroupedByDirection(routeId);

      // Set default selected direction to first valid (non-"All Stops" if available)
      if (directionGroups.length > 0) {
        const realDirections = directionGroups.filter(
          (g) => g.direction !== "All Stops"
        );
        selectedDirection =
          realDirections.length > 0
            ? realDirections[0].direction
            : directionGroups[0].direction;
      }
    } catch (error) {
      console.error("Failed to load route stops:", error);
      stopsError = "Failed to load stops for this route";
    } finally {
      isLoadingStops = false;
    }
  }

  /**
   * Handle direction tab change
   */
  function handleDirectionChange(direction: DirectionLabel) {
    selectedDirection = direction;
    expandedStopId = null; // Collapse any expanded stop
  }

  /**
   * Handle ETA request for a stop
   */
  function handleGetETA(stopId: string) {
    // Toggle expansion - if same stop, it will collapse in the item
    expandedStopId = expandedStopId === stopId ? null : stopId;
  }

  /**
   * Handle stop click from map
   */
  function handleMapStopClick(stop: TTCStop) {
    // Find which direction this stop belongs to
    for (const group of directionGroups) {
      if (group.stops.some((s) => s.id === stop.id)) {
        selectedDirection = group.direction;
        break;
      }
    }
    // Expand the stop
    expandedStopId = stop.id;

    // Scroll to stop in list (if visible)
    setTimeout(() => {
      const stopElement = document.querySelector(`[data-stop-id="${stop.id}"]`);
      stopElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  function handleBack() {
    goto("/routes");
  }

  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }

  async function handleSignOut() {
    await signOut();
  }
</script>

<svelte:head>
  <title>{routeId} {routeName ? `- ${routeName}` : ""} - TTC Alerts</title>
  <meta
    name="description"
    content="Service alerts for TTC route {routeId} {routeName}"
  />
</svelte:head>

<Header onOpenDialog={handleOpenDialog} />

<main class="content-area">
  <!-- Back Button -->
  <Button
    variant="ghost"
    size="sm"
    class="mb-4 -ml-2 text-muted-foreground"
    onclick={handleBack}
  >
    <ArrowLeft class="h-4 w-4 mr-1" />
    {$_("routes.backToRoutes")}
  </Button>

  <!-- Route Header -->
  <div class="route-header">
    <div class="route-header-info">
      <RouteBadge route={routeId} size="lg" />
      <div class="route-header-text">
        <h1 class="route-title">{routeId}</h1>
        {#if routeName}
          <p class="route-name">{routeName}</p>
        {/if}
      </div>
    </div>

    <BookmarkRouteButton
      route={routeId}
      name={routeName || routeId}
      type={routeId.startsWith("Line")
        ? "subway"
        : [
              "501",
              "503",
              "504",
              "505",
              "506",
              "507",
              "508",
              "509",
              "510",
              "511",
              "512",
            ].includes(routeId)
          ? "streetcar"
          : "bus"}
      showLabel={true}
    />
  </div>

  <!-- Active Alerts Section (hidden for lines not yet operational) -->
  {#if !isNotOperational}
    <section class="mt-6">
      <h2 class="section-title">
        <Bell class="h-4 w-4" />
        {$_("routes.activeAlerts")}
      </h2>

      <div class="space-y-3 mt-3">
        {#if $isLoading}
          {#each Array(2) as _}
            <div class="alert-card" aria-hidden="true">
              <div class="alert-card-content">
                <div class="alert-card-header">
                  <div class="alert-card-badges">
                    <Skeleton class="h-6 w-16 rounded-md" />
                    <Skeleton class="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton class="h-4 w-16" />
                </div>
                <Skeleton class="h-4 w-full mt-3" />
                <Skeleton class="h-4 w-3/4 mt-2" />
              </div>
            </div>
          {/each}
        {:else if routeAlerts.length === 0}
          <div class="no-alerts">
            <div class="no-alerts-icon">
              <CheckCircle class="h-6 w-6" />
            </div>
            <p class="no-alerts-title">{$_("routes.noActiveAlerts")}</p>
            <p class="no-alerts-description">
              {$_("routes.serviceRunningNormally", {
                values: { route: routeId },
              })}
            </p>
          </div>
        {:else}
          {#each routeAlerts as thread (thread.thread_id)}
            <AlertCard {thread} />
          {/each}
        {/if}
      </div>
    </section>
  {/if}

  <!-- Stops & Live ETA Section -->
  <section class="mt-6">
    <h2 class="section-title">
      <MapPin class="h-4 w-4" />
      {$_("routes.stopsAndETA")}
    </h2>
    {#if !isNotOperational}
      <p class="text-xs text-muted-foreground -mt-1 mb-3">
        {$_("routes.realtimePredictions")}{" "}
        <a
          href="https://www.ttc.ca/routes-and-schedules"
          target="_blank"
          rel="noopener"
          class="underline hover:text-foreground">ttc.ca</a
        >
      </p>
    {/if}

    <div class="stops-section mt-3">
      {#if isNotOperational}
        <!-- Not yet operational message -->
        <div class="stops-empty animate-fade-in">
          <div
            class="flex items-center gap-2 text-amber-600 dark:text-amber-400"
          >
            <span class="text-2xl">🚧</span>
            <span class="font-semibold">Under Construction</span>
          </div>
          <p class="text-sm text-muted-foreground mt-2 max-w-sm text-center">
            The Eglinton Crosstown LRT (Line 5) is currently under construction
            and not yet open to the public.
          </p>
          <p class="text-xs text-muted-foreground mt-2">
            Stop data and real-time arrivals will be available once the line
            opens.
          </p>
          <a
            href="https://www.metrolinx.com/en/projects-and-programs/eglinton-crosstown-lrt"
            target="_blank"
            rel="noopener"
            class="text-xs text-primary hover:underline mt-3"
          >
            Learn more at Metrolinx →
          </a>
        </div>
      {:else if isLoadingStops}
        <!-- Loading state -->
        <div class="stops-loading animate-fade-in">
          <div class="direction-tabs-skeleton">
            <Skeleton class="h-10 flex-1 rounded-md" />
            <Skeleton class="h-10 flex-1 rounded-md" />
          </div>
          <Skeleton class="h-12 w-full rounded-lg mt-3" />
          <div class="stops-list-skeleton mt-3">
            {#each Array(5) as _, i}
              <div class="stop-skeleton" style="animation-delay: {i * 50}ms">
                <Skeleton class="h-5 w-5 rounded-full" />
                <Skeleton class="h-4 flex-1" />
                <Skeleton class="h-8 w-14 rounded-md" />
              </div>
            {/each}
          </div>
        </div>
      {:else if stopsError}
        <!-- Error state -->
        <div class="stops-error animate-fade-in">
          <MapPin class="h-8 w-8 text-destructive" />
          <p class="text-sm text-destructive">{stopsError}</p>
          <Button variant="outline" size="sm" onclick={loadRouteStops}>
            Try Again
          </Button>
        </div>
      {:else if directionGroups.length === 0}
        <!-- No stops found -->
        <div class="stops-empty animate-fade-in">
          <MapPin class="h-8 w-8 text-muted-foreground" />
          {#if routeId === "Line 5"}
            <p class="text-sm text-muted-foreground font-medium">
              🚧 Under Construction
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              The Eglinton Crosstown LRT (Line 5) is currently under
              construction
            </p>
          {:else if routeId.startsWith("Line")}
            <p class="text-sm text-muted-foreground">
              Subway stations not available in stop database
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              Use TTC real-time displays at stations for arrival times
            </p>
          {:else}
            <p class="text-sm text-muted-foreground">
              No stops found for route {routeId}
            </p>
          {/if}
        </div>
      {:else}
        <!-- Direction Tabs -->
        <div class="animate-fade-in">
          <RouteDirectionTabs
            directions={directionLabels()}
            selected={selectedDirection}
            onSelect={handleDirectionChange}
            stopCounts={stopCounts()}
          />
        </div>

        <!-- Stops List -->
        <div class="mt-3">
          <RouteStopsList
            stops={currentStops()}
            direction={selectedDirection}
            onGetETA={handleGetETA}
            {expandedStopId}
            routeFilter={routeId}
          />
        </div>

        <!-- Total stops count -->
        <p class="stops-count">
          Showing {currentStops().length} stops
          {#if directionGroups.length > 1}
            · {allStops().length} total on route
          {/if}
        </p>
      {/if}
    </div>
  </section>
</main>

<!-- Dialogs -->
<HowToUseDialog
  open={activeDialog === "how-to-use"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>

<InstallPWADialog
  open={activeDialog === "install-pwa"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>

<style>
  .route-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: hsl(var(--card));
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
  }

  .route-header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .route-header-text {
    display: flex;
    flex-direction: column;
  }

  .route-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    line-height: 1.2;
  }

  .route-name {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.125rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .no-alerts {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2.5rem 1.5rem;
    background-color: hsl(var(--muted) / 0.3);
    border-radius: var(--radius);
    border: 1px dashed hsl(var(--border));
  }

  .no-alerts-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background-color: hsl(142 76% 36% / 0.1);
    color: hsl(142 76% 36%);
    margin-bottom: 0.75rem;
  }

  .no-alerts-title {
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.25rem;
  }

  .no-alerts-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }

  /* Mobile: stack header vertically */
  @media (max-width: 400px) {
    .route-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }

  /* Stops Section */
  .stops-section {
    display: flex;
    flex-direction: column;
  }

  .stops-loading,
  .stops-error,
  .stops-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2.5rem 1.5rem;
    background-color: hsl(var(--muted) / 0.3);
    border-radius: var(--radius);
    border: 1px dashed hsl(var(--border));
    text-align: center;
  }

  .direction-tabs-skeleton {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: hsl(var(--muted) / 0.5);
    border-radius: var(--radius);
  }

  .stops-list-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stop-skeleton {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    animation: fadeIn 0.2s ease-out forwards;
    opacity: 0;
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }

  .stops-count {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    text-align: center;
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px dashed hsl(var(--border));
  }
</style>
