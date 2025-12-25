<script lang="ts">
  import { _ } from "svelte-i18n";
  import {
    Search,
    Plus,
    CheckCircle,
    X,
    Pencil,
    RefreshCw,
    Route,
    Trash2,
    GitBranch,
    Calendar,
    ExternalLink,
  } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import AlertCard from "./AlertCard.svelte";
  import RSZAlertCard from "./RSZAlertCard.svelte";
  import RouteSearch from "./RouteSearch.svelte";
  import RouteBadge from "./RouteBadge.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { toast } from "svelte-sonner";
  import {
    threadsWithAlerts,
    isLoading,
    refreshAlerts,
    recentlyAddedThreadIds,
    maintenanceItems,
  } from "$lib/stores/alerts";
  import { savedRoutes } from "$lib/stores/savedRoutes";
  import { routeChanges, routeChangesLoading, loadRouteChanges } from "$lib/stores/route-changes";
  import type { RouteChange } from "$lib/services/route-changes";
  import type {
    ThreadWithAlerts,
    PlannedMaintenance,
  } from "$lib/types/database";

  // Route filter state - which specific route to show (null = all saved routes)
  let selectedRouteFilter = $state<string | null>(null);

  let isEditMode = $state(false);
  let isRefreshing = $state(false);

  // Handle manual refresh
  async function handleRefresh() {
    isRefreshing = true;
    try {
      await refreshAlerts();
    } finally {
      isRefreshing = false;
    }
  }

  // Confirmation dialog state
  let confirmDeleteRoute = $state<{ id: string; name: string } | null>(null);

  // Prompt for route removal
  function promptRemoveRoute(routeId: string, routeName: string) {
    confirmDeleteRoute = { id: routeId, name: routeName };
  }

  // Confirm route removal
  function confirmRemoveRoute() {
    if (!confirmDeleteRoute) return;
    savedRoutes.remove(confirmDeleteRoute.id);
    // Clear filter if removing the filtered route
    if (selectedRouteFilter === confirmDeleteRoute.id) {
      selectedRouteFilter = null;
    }
    toast.success($_("toasts.routeRemoved"), {
      description: confirmDeleteRoute.name,
    });
    confirmDeleteRoute = null;
  }

  // Toggle route filter
  function toggleRouteFilter(routeId: string) {
    if (isEditMode) return; // Don't toggle when in edit mode
    selectedRouteFilter = selectedRouteFilter === routeId ? null : routeId;
  }

  // Toggle edit mode
  function toggleEditMode() {
    isEditMode = !isEditMode;
    // Clear route filter when entering edit mode
    if (isEditMode) {
      selectedRouteFilter = null;
    }
  }

  // Get saved route IDs
  let routeIds = $derived($savedRoutes.map((r) => r.id));

  let hasRoutes = $derived($savedRoutes.length > 0);

  // Helper to extract routes from various formats
  function extractRoutes(
    routes: string | string[] | null | undefined
  ): string[] {
    if (!routes) return [];
    if (Array.isArray(routes)) return routes;
    if (typeof routes === "string") {
      try {
        const parsed = JSON.parse(routes);
        return Array.isArray(parsed) ? parsed : [routes];
      } catch {
        return [routes];
      }
    }
    return [];
  }

  // Helper to normalize route ID for comparison (remove leading zeros, lowercase)
  // Also extracts just the route number from strings like "44 Kipling" or "Line 1"
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

  // Helper to check if two routes match exactly (handles different formats)
  function routesMatch(route1: string, route2: string): boolean {
    return normalizeRouteId(route1) === normalizeRouteId(route2);
  }

  // Helper to check if thread matches a specific route
  function matchesSpecificRoute(
    thread: ThreadWithAlerts,
    routeId: string
  ): boolean {
    const threadRoutes = extractRoutes(thread.affected_routes);
    const alertRoutes = extractRoutes(thread.latestAlert?.affected_routes);
    const allRoutes = [...new Set([...threadRoutes, ...alertRoutes])];

    // Use exact match only - no substring matching
    return allRoutes.some((threadRoute) => routesMatch(threadRoute, routeId));
  }

  // Helper to check if thread matches saved routes
  function matchesRoutes(thread: ThreadWithAlerts): boolean {
    const threadRoutes = extractRoutes(thread.affected_routes);
    const alertRoutes = extractRoutes(thread.latestAlert?.affected_routes);
    const allRoutes = [...new Set([...threadRoutes, ...alertRoutes])];

    // Use exact match only - no substring matching
    return routeIds.some((savedRoute) =>
      allRoutes.some((threadRoute) => routesMatch(threadRoute, savedRoute))
    );
  }

  // Helper: check if thread has SERVICE_RESUMED status (resolved)
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

  // Helper: Check if a thread is an RSZ (Reduced Speed Zone) alert from TTC API
  function isRSZAlert(thread: ThreadWithAlerts): boolean {
    const alert = thread.latestAlert;
    if (!alert) return false;

    // RSZ alerts have effect SIGNIFICANT_DELAYS and raw_data with stopStart/stopEnd
    const rawData = alert.raw_data as Record<string, unknown> | null;
    return (
      alert.effect === "SIGNIFICANT_DELAYS" &&
      rawData?.source === "ttc-api" &&
      typeof rawData?.stopStart === "string" &&
      typeof rawData?.stopEnd === "string"
    );
  }

  // Get all alerts matching saved routes (excluding resolved)
  let routeMatchedAlerts = $derived.by<ThreadWithAlerts[]>(() => {
    if (routeIds.length === 0) return [];
    return $threadsWithAlerts
      .filter(matchesRoutes)
      .filter((thread) => !isResolved(thread));
  });

  // Filter alerts for saved routes with optional route filter applied
  let myAlerts = $derived.by<ThreadWithAlerts[]>(() => {
    const routeFilter = selectedRouteFilter;

    // Start with route-matched alerts (already excludes resolved)
    let filtered = routeMatchedAlerts;

    // Apply specific route filter if selected
    if (routeFilter) {
      filtered = filtered.filter((thread) =>
        matchesSpecificRoute(thread, routeFilter)
      );
    }

    return filtered;
  });

  // Separate RSZ alerts from regular alerts
  let rszAlerts = $derived(myAlerts.filter(isRSZAlert));
  let regularAlerts = $derived(myAlerts.filter((t) => !isRSZAlert(t)));

  // ====== Scheduled Maintenance Helpers ======

  // Parse date string as local time
  function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    if (dateStr.length === 10 && dateStr.includes("-")) {
      return new Date(dateStr + "T00:00:00");
    }
    if (!dateStr.includes("Z") && !dateStr.includes("+")) {
      return new Date(dateStr);
    }
    return new Date(dateStr);
  }

  // Parse time string "HH:MM" to { hours, minutes }
  function parseTime(
    timeStr: string | null
  ): { hours: number; minutes: number } | null {
    if (!timeStr) return null;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
  }

  // Check if scheduled maintenance is happening right now
  function isMaintenanceHappeningNow(item: PlannedMaintenance): boolean {
    const now = new Date();
    const startDate = parseLocalDate(item.start_date);
    const endDate = parseLocalDate(item.end_date);

    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDateOnly = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const endDateOnly = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    const startTime = parseTime(item.start_time);
    let endTime = parseTime(item.end_time);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // For nightly closures (start >= 10 PM) with no end time, assume 6 AM
    const isNightlyClosure = startTime && startTime.hours >= 22;
    if (isNightlyClosure && !endTime) {
      endTime = { hours: 6, minutes: 0 };
    }

    // Extend end date for overnight closures
    const endDateExtended = new Date(endDateOnly);
    if (isNightlyClosure && endTime && endTime.hours < 12) {
      endDateExtended.setDate(endDateExtended.getDate() + 1);
    }

    if (nowDate < startDateOnly || nowDate > endDateExtended) return false;

    // Morning after last closure
    if (
      nowDate.getTime() === endDateExtended.getTime() &&
      nowDate > endDateOnly
    ) {
      if (endTime) {
        const endMinutes = endTime.hours * 60 + endTime.minutes;
        return nowMinutes <= endMinutes;
      }
      return false;
    }

    if (nowDate.getTime() === startDateOnly.getTime() && startTime) {
      const startMinutes = startTime.hours * 60 + startTime.minutes;
      if (nowMinutes < startMinutes) return false;
    }

    // Overnight closure check
    if (startTime && endTime) {
      const startMinutes = startTime.hours * 60 + startTime.minutes;
      const endMinutes = endTime.hours * 60 + endTime.minutes;

      if (startMinutes > endMinutes) {
        // Overnight: active if after start OR before end
        return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
      } else {
        return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
      }
    }

    return true;
  }

  // Format time for display
  function formatTimeDisplay(timeStr: string | null): string {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  // Format date for display
  function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Convert maintenance to thread-like format for AlertCard
  function maintenanceToThread(
    maintenance: PlannedMaintenance
  ): ThreadWithAlerts {
    const startTime = maintenance.start_time
      ? formatTimeDisplay(maintenance.start_time)
      : "";
    const endDate = formatDateDisplay(maintenance.end_date);

    const headerText =
      maintenance.affected_stations || "Scheduled closure in effect";

    let descriptionParts: string[] = [];
    if (startTime) descriptionParts.push(`Nightly from ${startTime}`);
    if (endDate) descriptionParts.push(`Until ${endDate}`);
    const descriptionText =
      descriptionParts.length > 0 ? descriptionParts.join(" • ") : null;

    return {
      thread_id: `maintenance-${maintenance.maintenance_id}`,
      title: `${maintenance.routes.join(", ")} - Scheduled Closure`,
      categories: ["SCHEDULED_CLOSURE", "SUBWAY"],
      affected_routes: maintenance.routes,
      is_resolved: false,
      resolved_at: null,
      created_at: maintenance.start_date,
      updated_at: maintenance.start_date,
      alerts: [],
      latestAlert: {
        alert_id: `maintenance-alert-${maintenance.maintenance_id}`,
        thread_id: `maintenance-${maintenance.maintenance_id}`,
        header_text: headerText,
        description_text: descriptionText,
        effect: "SCHEDULED_CLOSURE",
        categories: ["SCHEDULED_CLOSURE", "SUBWAY"],
        affected_routes: maintenance.routes,
        is_latest: true,
        created_at: maintenance.start_date,
        url: maintenance.url,
      },
    } as unknown as ThreadWithAlerts;
  }

  // Get active maintenance matching saved routes
  let activeMaintenanceForRoutes = $derived.by<ThreadWithAlerts[]>(() => {
    if (routeIds.length === 0) return [];

    // Get active maintenance items
    const activeMaintenance = $maintenanceItems.filter(
      isMaintenanceHappeningNow
    );

    // Filter to those matching saved routes
    const matchingMaintenance = activeMaintenance.filter((item) => {
      // Check if any maintenance route matches any saved route
      return item.routes.some((maintRoute) =>
        routeIds.some((savedRoute) => {
          const maintLower = maintRoute.toLowerCase();
          const savedLower = savedRoute.toLowerCase();
          // Match "Line 1" with "1", "Line 1", etc.
          return (
            maintLower === savedLower ||
            maintLower === `line ${savedLower}` ||
            maintLower.replace("line ", "") === savedLower
          );
        })
      );
    });

    // Apply route filter if selected
    if (selectedRouteFilter) {
      const filterLower = selectedRouteFilter.toLowerCase();
      return matchingMaintenance
        .filter((item) =>
          item.routes.some((r) => {
            const rLower = r.toLowerCase();
            return (
              rLower === filterLower ||
              rLower === `line ${filterLower}` ||
              rLower.replace("line ", "") === filterLower
            );
          })
        )
        .map(maintenanceToThread);
    }

    return matchingMaintenance.map(maintenanceToThread);
  });

  // ====== Route Changes (from TTC website) ======

  // Load route changes on mount
  onMount(() => {
    loadRouteChanges();
  });

  // Check if a route change is currently active based on dates
  function isRouteChangeCurrentlyActive(change: RouteChange): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // If no start date, assume it's active
    if (!change.startDate) return true;

    const startDate = new Date(change.startDate + "T00:00:00");
    if (today < startDate) return false;

    // If there's an end date, check if we're past it
    if (change.endDate) {
      const endDate = new Date(change.endDate + "T23:59:59");
      if (now > endDate) return false;
    }

    return true;
  }

  // Format route change date for display
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

  // Filter route changes for saved routes
  let filteredRouteChanges = $derived.by<RouteChange[]>(() => {
    if (routeIds.length === 0) return [];

    // Start with active route changes that match saved routes
    let changes = $routeChanges
      .filter(isRouteChangeCurrentlyActive)
      .filter((change) => {
        // Check if any of the change's routes match any saved route
        return change.routes.some((changeRoute) =>
          routeIds.some((savedRoute) =>
            routesMatch(changeRoute, savedRoute)
          )
        );
      });

    // Apply optional route filter
    if (selectedRouteFilter) {
      const filterRoute = selectedRouteFilter;
      changes = changes.filter((change) =>
        change.routes.some((r) => routesMatch(r, filterRoute))
      );
    }

    return changes;
  });

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

  function handleAddRoutes() {
    goto("/routes");
  }

  // Reference to RouteSearch component for focus
  let routeSearchRef: { focus: () => void } | undefined = $state();
</script>

<div class="my-route-alerts">
  <!-- Search Bar with Inline Dropdown -->
  <div class="search-section">
    <RouteSearch
      bind:this={routeSearchRef}
      placeholder={$_("search.placeholderRoute")}
    />
    {#if hasRoutes}
      <Button
        variant="ghost"
        size="sm"
        class="edit-button"
        onclick={toggleEditMode}
      >
        {#if isEditMode}
          {$_("common.done")}
        {:else}
          <Pencil class="h-3 w-3 mr-1" />
          {$_("common.edit")}
        {/if}
      </Button>
    {/if}
  </div>

  <!-- Route Filter Tabs -->
  {#if hasRoutes}
    <div class="route-tabs-container">
      <div class="route-tabs" role="tablist" aria-label="Filter by route">
        {#if isEditMode}
          <!-- Edit Mode: Show removable chips -->
          <div class="edit-mode-chips">
            {#each $savedRoutes as route (route.id)}
              <div class="saved-chip editing">
                <RouteBadge route={route.id} size="sm" />
                <button
                  type="button"
                  class="chip-remove"
                  onclick={() => promptRemoveRoute(route.id, route.name)}
                  aria-label="Remove {route.id}"
                >
                  <X class="h-3 w-3" />
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Normal Mode: Show tabs -->
          <button
            type="button"
            role="tab"
            class="route-tab"
            class:active={selectedRouteFilter === null}
            aria-selected={selectedRouteFilter === null}
            onclick={() => (selectedRouteFilter = null)}
          >
            {$_("myRoutes.allSavedRoutes")}
          </button>
          {#each $savedRoutes as route (route.id)}
            <button
              type="button"
              role="tab"
              class="route-tab"
              class:active={selectedRouteFilter === route.id}
              aria-selected={selectedRouteFilter === route.id}
              onclick={() => (selectedRouteFilter = route.id)}
            >
              <RouteBadge route={route.id} size="sm" />
            </button>
          {/each}
        {/if}
      </div>
      <div class="route-tabs-fade" aria-hidden="true"></div>
    </div>
  {/if}

  {#if $isLoading && !hasRoutes}
    <!-- Loading State with stagger animation -->
    <div class="space-y-3">
      {#each Array(2) as _, i}
        <div
          class="alert-card animate-fade-in stagger-{i + 1}"
          aria-hidden="true"
        >
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
    </div>
  {:else if !hasRoutes}
    <!-- Empty State: No Routes Saved -->
    <button
      type="button"
      class="empty-state animate-fade-in"
      onclick={() => routeSearchRef?.focus()}
    >
      <div class="empty-state-icon">
        <Route class="h-8 w-8" />
      </div>
      <h3 class="empty-state-title">{$_("myRoutes.noRoutesSaved")}</h3>
      <p class="empty-state-description">
        {$_("myRoutes.useSearchBar")}
      </p>
    </button>
  {:else if myAlerts.length === 0 && activeMaintenanceForRoutes.length === 0 && filteredRouteChanges.length === 0}
    <!-- Empty State: Routes Saved but No Active Alerts -->
    <div class="empty-state success animate-fade-in">
      <div class="empty-state-icon success">
        <CheckCircle class="h-8 w-8" />
      </div>
      <h3 class="empty-state-title">{$_("myRoutes.allClear")}</h3>
      <p class="empty-state-description">
        {$_("myRoutes.noActiveAlerts")}
      </p>
      <button
        type="button"
        class="refresh-button"
        onclick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Refresh alerts"
      >
        <span class="refresh-icon" class:spinning={isRefreshing}>
          <RefreshCw class="h-4 w-4" />
        </span>
        {isRefreshing ? $_("common.loading") : $_("common.refresh")}
      </button>
    </div>
  {:else}
    <!-- Alert Cards for Saved Routes -->
    <div
      class="space-y-3"
      role="feed"
      aria-label="Alerts for your saved routes"
    >
      <!-- Active Scheduled Maintenance (closures happening now) -->
      {#each activeMaintenanceForRoutes as thread, i (thread.thread_id)}
        <div
          class="animate-fade-in-up"
          style={`animation-delay: ${Math.min(i * 50, 300)}ms`}
        >
          <AlertCard {thread} />
        </div>
      {/each}

      <!-- Regular Alerts (non-RSZ) -->
      {#each regularAlerts as thread, i (thread.thread_id)}
        {@const isNew = $recentlyAddedThreadIds.has(thread.thread_id)}
        <div
          class={isNew ? "animate-new-alert" : "animate-fade-in-up"}
          style={isNew ? "" : `animation-delay: ${Math.min(i * 50, 300)}ms`}
        >
          <AlertCard {thread} />
        </div>
      {/each}

      <!-- RSZ Alerts grouped by line (lowest priority) -->
      {#if rszAlerts.length > 0}
        {@const line1RSZ = rszAlerts.filter((t) => {
          const routes = t.affected_routes || t.latestAlert?.affected_routes;
          if (!routes) return false;
          const routeArr = Array.isArray(routes) ? routes : [routes];
          return routeArr.some(
            (r: string) =>
              r === "1" ||
              r.toLowerCase() === "line 1" ||
              r.toLowerCase().includes("line 1")
          );
        })}
        {@const line2RSZ = rszAlerts.filter((t) => {
          const routes = t.affected_routes || t.latestAlert?.affected_routes;
          if (!routes) return false;
          const routeArr = Array.isArray(routes) ? routes : [routes];
          return routeArr.some(
            (r: string) =>
              r === "2" ||
              r.toLowerCase() === "line 2" ||
              r.toLowerCase().includes("line 2")
          );
        })}
        {#if line1RSZ.length > 0}
          <RSZAlertCard threads={line1RSZ} />
        {/if}
        {#if line2RSZ.length > 0}
          <RSZAlertCard threads={line2RSZ} />
        {/if}
      {/if}

      <!-- Route Changes (from TTC website) -->
      {#if filteredRouteChanges.length > 0}
        <div class="route-changes-section">
          <h3 class="route-changes-title">
            <GitBranch class="h-4 w-4" />
            {$_("routes.routeChanges")}
          </h3>
          {#each filteredRouteChanges as change, i (change.id)}
            <div
              class="route-change-card animate-fade-in-up"
              style={`animation-delay: ${Math.min(i * 50, 300)}ms`}
            >
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
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Route Confirmation Dialog -->
<Dialog.Root
  open={confirmDeleteRoute !== null}
  onOpenChange={(open) => {
    if (!open) confirmDeleteRoute = null;
  }}
>
  <Dialog.Content
    class="sm:max-w-md"
    style="background-color: hsl(var(--background)); border: 1px solid hsl(var(--border));"
  >
    <Dialog.Header>
      <div
        class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
      >
        <Trash2 class="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <Dialog.Title class="text-center text-lg font-semibold"
        >{$_("myRoutes.removeRouteTitle")}</Dialog.Title
      >
      <Dialog.Description class="text-center text-sm text-muted-foreground">
        {$_("myRoutes.removeRouteConfirm", {
          values: { route: confirmDeleteRoute?.name },
        })}
        {$_("toasts.canAddBackAnytime")}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer
      class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center"
    >
      <Button
        variant="outline"
        class="w-full sm:w-auto"
        onclick={() => (confirmDeleteRoute = null)}
        >{$_("common.cancel")}</Button
      >
      <Button
        variant="destructive"
        class="w-full sm:w-auto"
        style="background-color: hsl(var(--destructive)); color: white;"
        onclick={confirmRemoveRoute}
      >
        {$_("myRoutes.removeRoute")}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .my-route-alerts {
    min-height: 200px;
  }

  .search-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    position: relative;
    z-index: 50;
  }

  /* Route tabs container with fade indicator on mobile */
  .route-tabs-container {
    position: relative;
    margin-bottom: 1rem;
  }

  .route-tabs {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .route-tabs::-webkit-scrollbar {
    display: none;
  }

  /* Fade indicator on mobile to show more content */
  .route-tabs-fade {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0.25rem;
    width: 2rem;
    pointer-events: none;
    background: linear-gradient(to right, transparent, hsl(var(--background)));
  }

  /* Desktop: wrap instead of scroll, hide fade */
  @media (min-width: 768px) {
    .route-tabs {
      flex-wrap: wrap;
      overflow-x: visible;
    }

    .route-tabs-fade {
      display: none;
    }
  }

  .route-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .route-tab:hover {
    background-color: hsl(var(--muted) / 0.5);
    color: hsl(var(--foreground));
  }

  .route-tab.active {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-color: hsl(var(--primary));
  }

  .edit-mode-chips {
    display: flex;
    gap: 0.5rem;
    /* Mobile: scroll horizontally */
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .edit-mode-chips::-webkit-scrollbar {
    display: none;
  }

  /* Desktop: wrap instead of scroll */
  @media (min-width: 768px) {
    .edit-mode-chips {
      flex-wrap: wrap;
      overflow-x: visible;
    }
  }

  :global(.edit-button) {
    height: 2.375rem;
    padding: 0 0.75rem;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .saved-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem;
    padding-left: 0.25rem;
    border-radius: var(--radius);
  }

  .saved-chip.editing {
    background-color: hsl(var(--destructive) / 0.1);
  }

  .chip-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background-color: hsl(var(--destructive) / 0.15);
    border: none;
    cursor: pointer;
    color: hsl(var(--destructive));
    transition: all 0.15s;
  }

  .chip-remove:hover {
    background-color: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    padding: 3rem 1.5rem;
    background-color: hsl(var(--muted) / 0.3);
    border-radius: var(--radius);
    border: 1px dashed hsl(var(--border));
    cursor: pointer;
    position: relative;
    z-index: 0;
  }

  .empty-state-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    margin-bottom: 1rem;
  }

  .empty-state-icon.success {
    background-color: hsl(142 76% 36% / 0.1);
    color: hsl(142 76% 36%);
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }

  .empty-state-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    max-width: 280px;
    line-height: 1.5;
  }

  .empty-state.success {
    border-style: solid;
    border-color: hsl(142 76% 36% / 0.2);
    background-color: hsl(142 76% 36% / 0.05);
  }

  .refresh-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(142 76% 36%);
    background-color: hsl(142 76% 36% / 0.1);
    border: 1px solid hsl(142 76% 36% / 0.3);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
  }

  .refresh-button:hover:not(:disabled) {
    background-color: hsl(142 76% 36% / 0.2);
    border-color: hsl(142 76% 36% / 0.5);
  }

  .refresh-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .refresh-icon {
    display: inline-flex;
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Route Changes Section */
  .route-changes-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid hsl(var(--border));
  }

  .route-changes-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.75rem;
  }

  /* Route change card (matching RouteChangesView) */
  .route-change-card {
    display: block;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    padding: 0.875rem;
    margin-bottom: 0.75rem;
    color: inherit;
  }

  .route-change-card:last-child {
    margin-bottom: 0;
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
