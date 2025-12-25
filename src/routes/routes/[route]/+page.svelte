<script lang="ts">
  import { _ } from "svelte-i18n";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    ArrowLeft,
    AlertOctagon,
    CheckCircle,
    MapPin,
    Loader2,
    GitBranch,
    Calendar,
    ExternalLink,
  } from "lucide-svelte";
  import Header from "$lib/components/layout/Header.svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import RSZAlertCard from "$lib/components/alerts/RSZAlertCard.svelte";
  import BookmarkRouteButton from "$lib/components/alerts/BookmarkRouteButton.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    threadsWithAlerts,
    isLoading,
    fetchAlerts,
    getSeverityCategory,
  } from "$lib/stores/alerts";
  import { isAuthenticated, userName, signOut } from "$lib/stores/auth";
  import type { ThreadWithAlerts } from "$lib/types/database";

  // Import route changes store
  import {
    routeChanges,
    routeChangesLoading,
    loadRouteChanges,
  } from "$lib/stores/route-changes";
  import type { RouteChange } from "$lib/services/route-changes";

  // Import route stops components
  import RouteDirectionTabs, {
    type DirectionItem,
  } from "$lib/components/stops/RouteDirectionTabs.svelte";
  import RouteStopsList from "$lib/components/stops/RouteStopsList.svelte";
  import {
    initStopsDB,
    getStopsByRouteGroupedByDirection,
    getRouteBranches,
    getBranchesForDirection,
    type DirectionGroup,
    type DirectionLabel,
    type TTCStop,
    type RouteBranchInfo,
    type RouteEnhancedData,
  } from "$lib/data/stops-db";

  // Import BranchDropdown component
  import BranchDropdown, {
    type BranchItem,
  } from "$lib/components/stops/BranchDropdown.svelte";

  // Import route names and headsigns data
  import { getRouteName } from "$lib/data/route-names";
  import { getRouteDirectionLabel } from "$lib/data/route-headsigns";

  // Import dialogs
  import { HowToUseDialog, InstallPWADialog } from "$lib/components/dialogs";

  // Get route from URL param (with fallback)
  let routeId = $derived($page.params.route || "");

  // Get route name from centralized data
  let routeName = $derived(getRouteName(routeId));

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

  /**
   * Check if a thread is an RSZ (Reduced Speed Zone) alert
   */
  function isRSZAlert(thread: ThreadWithAlerts): boolean {
    const alert = thread.latestAlert;
    if (!alert) return false;

    // RSZ alerts have effect SIGNIFICANT_DELAYS and raw_data with stopStart/stopEnd (TTC API source)
    const rawData = alert.raw_data as Record<string, unknown> | null;
    const isTTCApiRSZ =
      alert.effect === "SIGNIFICANT_DELAYS" &&
      rawData?.source === "ttc-api" &&
      typeof rawData?.stopStart === "string" &&
      typeof rawData?.stopEnd === "string";

    // Also detect Bluesky-sourced RSZ alerts by text patterns
    const headerText = (alert.header_text || "").toLowerCase();
    const isBlueskyRSZ =
      headerText.includes("slower than usual") ||
      headerText.includes("reduced speed") ||
      headerText.includes("move slower") ||
      headerText.includes("running slower") ||
      headerText.includes("slow zone");

    return isTTCApiRSZ || isBlueskyRSZ;
  }

  /**
   * Normalize route ID for comparison
   * Extracts just the route number from strings like "44 Kipling" or "Line 1"
   */
  function normalizeRouteId(route: string): string {
    // Handle subway lines (Line 1, Line 2, etc.)
    if (route.toLowerCase().startsWith("line ")) {
      return route.toLowerCase().trim();
    }
    // For bus/streetcar routes, extract just the number (e.g., "44 Kipling" → "44")
    const match = route.match(/^(\d+)/);
    if (match) {
      return match[1]; // Return just the number
    }
    // Remove leading zeros and convert to lowercase for other formats
    return route.replace(/^0+/, "").toLowerCase();
  }

  // Filter alerts for this route (only active/unresolved MAJOR disruption alerts)
  // Excludes: resolved/resumed, hidden, accessibility (elevator/escalator), RSZ (shown separately)
  let routeAlerts = $derived(
    $threadsWithAlerts.filter((thread) => {
      // First, skip resolved/resumed alerts
      if (isResolved(thread)) return false;

      // Skip hidden alerts (same as alerts-v3 page behavior)
      if (thread.is_hidden) return false;

      // Skip accessibility alerts (elevator/escalator) - not route disruptions
      const categories = Array.isArray(thread.categories)
        ? thread.categories
        : [];
      const alertCategories = Array.isArray(thread.latestAlert?.categories)
        ? thread.latestAlert.categories
        : [];
      const allCategories = [...new Set([...categories, ...alertCategories])];
      const severity = getSeverityCategory(
        allCategories,
        thread.latestAlert?.effect ?? undefined,
        thread.latestAlert?.header_text ?? undefined
      );
      if (severity === "ACCESSIBILITY") return false;

      const threadRoutes = Array.isArray(thread.affected_routes)
        ? thread.affected_routes
        : [];
      const alertRoutes = Array.isArray(thread.latestAlert?.affected_routes)
        ? thread.latestAlert.affected_routes
        : [];
      const allRoutes = [...new Set([...threadRoutes, ...alertRoutes])];

      // Use exact match only - no substring matching to prevent route 11 matching 119/511
      return allRoutes.some(
        (r) => normalizeRouteId(r) === normalizeRouteId(routeId)
      );
    })
  );

  // Separate RSZ alerts from regular alerts
  let rszAlerts = $derived(routeAlerts.filter(isRSZAlert));
  let nonRSZAlerts = $derived(routeAlerts.filter((t) => !isRSZAlert(t)));

  /**
   * Parse a date string that could be in various formats
   * e.g., "November 22, 2025" or "2025-11-22"
   */
  function parseFlexibleDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    // If it's an ISO format date (YYYY-MM-DD), append time
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + "T00:00:00");
    }
    
    // Otherwise, try to parse the human-readable format
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // Filter route changes for this specific route (only currently active ones)
  let filteredRouteChanges = $derived(
    $routeChanges
      .filter((change) => {
        return change.routes.some(
          (r) => normalizeRouteId(r) === normalizeRouteId(routeId)
        );
      })
      .filter(isRouteChangeCurrentlyActive)
  );

  /**
   * Check if a route change is currently active (not just upcoming)
   */
  function isRouteChangeCurrentlyActive(change: RouteChange): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // If there's no start date, consider it active (show it)
    if (!change.startDate) return true;
    
    // Parse the start date
    const startDate = parseFlexibleDate(change.startDate);
    if (!startDate) return true; // If can't parse, show it
    
    // Set time to midnight for date comparison
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    
    // Not active yet if start date is in the future
    if (startDateOnly > today) return false;
    
    // Check end date if present
    if (change.endDate) {
      const endDate = parseFlexibleDate(change.endDate);
      if (endDate) {
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        // Past end date means no longer active
        if (today > endDateOnly) return false;
      }
    }
    
    return true;
  }

  /**
   * Format route change date for display
   */
  function formatRouteChangeDate(change: RouteChange): string {
    const parts: string[] = [];
    
    // Always show start date label if present
    if (change.startDateLabel) {
      const label = change.startDateLabel.charAt(0).toUpperCase() + change.startDateLabel.slice(1);
      parts.push(label);
    }
    
    // Add start date if present
    if (change.startDate) {
      const date = parseFlexibleDate(change.startDate);
      if (date) {
        const formatted = date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        if (change.startTime) {
          parts.push(`${formatted} - ${change.startTime}`);
        } else {
          parts.push(formatted);
        }
      } else {
        // If parsing failed, use the raw date string
        if (change.startTime) {
          parts.push(`${change.startDate} - ${change.startTime}`);
        } else {
          parts.push(change.startDate);
        }
      }
    }
    
    // Add end date if present
    if (change.endDate) {
      const date = parseFlexibleDate(change.endDate);
      parts.push("to");
      if (date) {
        const formatted = date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        if (change.endTime) {
          parts.push(`${formatted} - ${change.endTime}`);
        } else {
          parts.push(formatted);
        }
      } else {
        // If parsing failed, use the raw date string
        if (change.endTime) {
          parts.push(`${change.endDate} - ${change.endTime}`);
        } else {
          parts.push(change.endDate);
        }
      }
    }
    
    return parts.join(" ");
  }

  /**
   * Capitalize first letter of each word in route name
   */
  function formatRouteName(name: string): string {
    if (!name) return "";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // Stops state
  let directionGroups = $state<DirectionGroup[]>([]);
  let selectedDirection = $state<DirectionLabel>("All Stops");
  let selectedBranch = $state<string | null>(null);
  let routeBranchData = $state<RouteEnhancedData | null>(null);
  let isLoadingStops = $state(true);
  let stopsError = $state<string | null>(null);
  let expandedStopId = $state<string | null>(null);

  // Derived: branches for current direction
  let currentBranches = $derived.by((): BranchItem[] => {
    if (!routeBranchData) return [];
    const dirBranches = routeBranchData.directions[selectedDirection]?.branches;
    if (!dirBranches) return [];
    return dirBranches.map((b) => ({
      id: b.id,
      title: b.title,
      stopCount: b.stops.length,
    }));
  });

  // Derived: current stops for selected direction AND branch
  let currentStops = $derived(() => {
    // First, get the base direction group
    const group = directionGroups.find(
      (g) => g.direction === selectedDirection
    );

    if (!group?.stops || group.stops.length === 0) {
      return [];
    }

    // If we have branch data and a selected branch, try to filter by branch stops
    if (routeBranchData && selectedBranch) {
      const dirBranches =
        routeBranchData.directions[selectedDirection]?.branches;
      const branch = dirBranches?.find((b) => b.id === selectedBranch);
      if (branch) {
        // Branch stops array contains stop IDs - filter group stops by these IDs
        const branchStopIds = new Set(branch.stops);
        const filteredStops = group.stops.filter((s) =>
          branchStopIds.has(s.id)
        );

        // If no stops matched (likely NextBus vs GTFS ID mismatch), fall back to all stops
        if (filteredStops.length === 0) {
          return group.stops;
        }

        return filteredStops;
      }
    }

    // Default: show all stops for direction
    return group.stops;
  });

  // Derived: all stops (for map)
  let allStops = $derived(() => {
    return directionGroups.flatMap((g) => g.stops);
  });

  // Derived: direction labels for tabs (exclude "All Stops" if we have real directions)
  let directionLabels = $derived(() => {
    const labels = directionGroups.map((g) => g.direction);
    console.log(
      "[DEBUG PAGE] directionGroups:",
      directionGroups.length,
      directionGroups.map((g) => g.direction)
    );
    // If we have real directions (E/W/N/S), filter out "All Stops"
    const realDirections = labels.filter((l) => l !== "All Stops");
    if (realDirections.length > 0) {
      return realDirections;
    }
    return labels;
  });

  // Derived: map internal direction keys to user-friendly destination labels
  // Now uses displayLabel from DirectionGroup (populated from ttc-direction-labels.json)
  // Falls back to getRouteDirectionLabel for routes without NextBus data
  let directionDisplayLabels = $derived(() => {
    const displayMap: Record<string, string> = {};
    for (const group of directionGroups) {
      const key = group.direction;
      // Use displayLabel from DirectionGroup if available
      if (group.displayLabel) {
        displayMap[key] = group.displayLabel;
      } else if (key.startsWith("Towards ") || key === "All Stops") {
        // Already a user-friendly label
        displayMap[key] = key;
      } else {
        // Fall back to headsigns-based lookup for standard directions
        displayMap[key] = getRouteDirectionLabel(routeId, key);
      }
    }
    return displayMap;
  });

  // Derived: direction items for tabs (shows cardinal directions like Northbound, Southbound)
  let directionItems = $derived(() => {
    const keys = directionLabels();
    // Show cardinal directions as labels (not destination labels)
    const items = keys.map(
      (key) =>
        ({
          key,
          label: key, // Cardinal direction: Northbound, Southbound, etc.
        }) as DirectionItem
    );
    console.log("[DEBUG PAGE] directionItems:", items);
    return items;
  });

  // Derived: branch title for current direction (for single branch display)
  let currentBranchTitle = $derived.by((): string | null => {
    if (currentBranches.length === 1) {
      return currentBranches[0].title;
    }
    return null;
  });

  // Derived: selected display label (for tabs)
  let selectedDisplayLabel = $derived(() => {
    const displayMap = directionDisplayLabels();
    return displayMap[selectedDirection] || selectedDirection;
  });

  // Derived: filtered direction groups (matching directionLabels)
  let filteredDirectionGroups = $derived(() => {
    const labels = directionLabels();
    return directionGroups.filter((g) => labels.includes(g.direction));
  });

  // Derived: stop counts per direction (keyed by internal direction key)
  let stopCounts = $derived(() => {
    const counts: Record<string, number> = {};
    for (const group of filteredDirectionGroups()) {
      counts[group.direction] = group.stops.length;
    }
    return counts;
  });

  // Get route color for map
  let activeDialog = $state<string | null>(null);

  onMount(async () => {
    // Load alerts, stops, and route changes in parallel
    await Promise.all([fetchAlerts(), loadRouteStops(), loadRouteChanges()]);
  });

  /**
   * Load stops for current route
   */
  async function loadRouteStops() {
    console.log("[DEBUG] loadRouteStops() called for route:", routeId);
    isLoadingStops = true;
    stopsError = null;

    try {
      // Initialize stops database
      console.log("[DEBUG] Calling initStopsDB()...");
      await initStopsDB();
      console.log("[DEBUG] initStopsDB() complete");

      // Get stops grouped by direction
      console.log("[DEBUG] Calling getStopsByRouteGroupedByDirection()...");
      directionGroups = await getStopsByRouteGroupedByDirection(routeId);
      console.log(
        "[DEBUG] getStopsByRouteGroupedByDirection() returned:",
        directionGroups.length,
        "groups"
      );
      if (directionGroups.length > 0) {
        console.log(
          "[DEBUG] First group:",
          directionGroups[0].direction,
          "with",
          directionGroups[0].stops.length,
          "stops"
        );
      }

      // Load branch data for this route
      routeBranchData = getRouteBranches(routeId);

      // Set default selected direction to first valid (non-"All Stops" if available)
      if (directionGroups.length > 0) {
        const realDirections = directionGroups.filter(
          (g) => g.direction !== "All Stops"
        );
        selectedDirection =
          realDirections.length > 0
            ? realDirections[0].direction
            : directionGroups[0].direction;

        // If we have branch data, select the first branch for the direction
        if (routeBranchData) {
          const dirBranches =
            routeBranchData.directions[selectedDirection]?.branches;
          if (dirBranches && dirBranches.length > 0) {
            selectedBranch = dirBranches[0].id;
          }
        }
      }
    } catch (error) {
      console.error("Failed to load route stops:", error);
      stopsError = "Failed to load stops for this route";
    } finally {
      isLoadingStops = false;
    }
  }

  /**
   * Handle direction tab selection (receives internal direction key)
   */
  function handleDirectionSelect(directionKey: string) {
    selectedDirection = directionKey as DirectionLabel;
    expandedStopId = null; // Collapse any expanded stop

    // When direction changes, select first branch for that direction
    if (routeBranchData) {
      const dirBranches = routeBranchData.directions[directionKey]?.branches;
      if (dirBranches && dirBranches.length > 0) {
        selectedBranch = dirBranches[0].id;
      } else {
        selectedBranch = null;
      }
    }
  }

  /**
   * Handle branch selection from dropdown
   */
  function handleBranchSelect(branchId: string) {
    selectedBranch = branchId;
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
      <h1 class="route-title">{routeName || routeId}</h1>
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
        <AlertOctagon class="h-4 w-4" />
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
          <!-- Regular (non-RSZ) alerts -->
          {#each nonRSZAlerts as thread (thread.thread_id)}
            <AlertCard {thread} />
          {/each}

          <!-- RSZ alerts (grouped table display) -->
          {#if rszAlerts.length > 0}
            <RSZAlertCard threads={rszAlerts} />
          {/if}
        {/if}
      </div>
    </section>
  {/if}

  <!-- Route Changes Section (if any affect this route) -->
  {#if filteredRouteChanges.length > 0}
    <section class="mt-6">
      <h2 class="section-title">
        <GitBranch class="h-4 w-4" />
        {$_("routes.routeChanges")}
      </h2>

      <div class="space-y-3 mt-3">
        {#each filteredRouteChanges as change (change.id)}
          <div class="route-change-card animate-fade-in">
            <!-- Header: all affected routes + route name -->
            <div class="route-change-header">
              <div class="route-badges">
                {#each change.routes as route}
                  <RouteBadge {route} size="lg" />
                {/each}
              </div>
              {#if change.routeName}
                <span class="route-name">{formatRouteName(change.routeName)}</span>
              {/if}
            </div>

            <!-- Title -->
            <p class="card-title">{change.title}</p>

            <!-- Date info -->
            {#if formatRouteChangeDate(change)}
              <p class="card-date">
                <Calendar class="date-icon" />
                <span>{formatRouteChangeDate(change)}</span>
              </p>
            {/if}

            <!-- Link -->
            <a
              href={change.url}
              target="_blank"
              rel="noopener noreferrer"
              class="card-link"
            >
              {$_("common.moreDetails")}
              <ExternalLink class="link-icon" />
            </a>
          </div>
        {/each}
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
            directions={directionItems()}
            selected={selectedDirection}
            onSelect={handleDirectionSelect}
            stopCounts={stopCounts()}
          />
        </div>

        <!-- Branch Dropdown OR Destination Label -->
        {#if currentBranches.length > 1}
          <!-- Multiple branches - show dropdown (no separate destination label needed) -->
          <div class="mt-3 animate-fade-in branch-dropdown-container">
            <BranchDropdown
              branches={currentBranches}
              selected={selectedBranch || currentBranches[0]?.id || ""}
              onSelect={handleBranchSelect}
              routeNumber={routeId}
            />
          </div>
        {:else}
          <!-- Single/no branch - show destination label as plain text -->
          <p class="direction-destination-label animate-fade-in">
            {selectedDisplayLabel()}
          </p>
        {/if}

        <!-- Stops List -->
        <div class="mt-3 stops-list-container">
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

  .route-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    line-height: 1.2;
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

  /* Direction destination label (shown below tabs as plain text heading) */
  .direction-destination-label {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    font-weight: 500;
  }

  /* Branch dropdown container - needs high z-index to be above stops list */
  .branch-dropdown-container {
    position: relative;
    z-index: 100;
  }

  /* Stops list container - lower z-index */
  .stops-list-container {
    position: relative;
    z-index: 1;
  }

  /* Route Change Card Styles (matching RouteChangesView) */
  .route-change-card {
    display: block;
    padding: 0.875rem;
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    color: inherit;
  }

  .route-change-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .route-badges {
    display: inline-flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .route-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .card-title {
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 1.4;
    margin: 0 0 0.375rem 0;
    color: hsl(var(--foreground));
  }

  .card-date {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 0.5rem 0;
    line-height: 1.35;
  }

  .card-date :global(.date-icon) {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--primary));
    text-decoration: none;
  }

  .card-link:hover {
    text-decoration: underline;
  }

  .card-link :global(.link-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }
</style>
