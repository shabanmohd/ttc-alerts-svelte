<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    SearchX,
    CheckCircle,
    Calendar,
    AlertTriangle,
    AlertCircle,
  } from "lucide-svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Header from "$lib/components/layout/Header.svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import FilterChips from "$lib/components/alerts/FilterChips.svelte";
  import ClosuresView from "$lib/components/alerts/ClosuresView.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Button } from "$lib/components/ui/button";
  import {
    threadsWithAlerts,
    isLoading,
    error,
    fetchAlerts,
    subscribeToAlerts,
    activeFilters,
    isConnected,
    fetchMaintenance,
    recentlyAddedThreadIds,
    maintenanceItems,
  } from "$lib/stores/alerts";
  import { isAuthenticated, userName, signOut } from "$lib/stores/auth";
  import { isVisible } from "$lib/stores/visibility";

  // Import dialogs
  import { HowToUseDialog, InstallPWADialog } from "$lib/components/dialogs";

  import type {
    ThreadWithAlerts,
    PlannedMaintenance,
  } from "$lib/types/database";

  type AlertsTab = "active" | "resolved" | "scheduled";

  // Subway lines to track - using official TTC colors from layout.css
  const SUBWAY_LINES = [
    { id: "Line 1", name: "Line 1", color: "#ffc524", textColor: "#000000" }, // Yellow
    { id: "Line 2", name: "Line 2", color: "#00853f", textColor: "#ffffff" }, // Green
    { id: "Line 4", name: "Line 4", color: "#a12f7d", textColor: "#ffffff" }, // Purple
    { id: "Line 6", name: "Line 6", color: "#808285", textColor: "#ffffff" }, // Gray (Finch West)
  ];

  // ===== DEMO MODE =====
  // Set to true to show demo alerts for testing UI
  const DEMO_MODE = false;

  // Demo alerts for testing (using type assertion for demo data)
  const demoAlerts = (DEMO_MODE
    ? [
        // Line 1 - Delay (Subway delay)
        {
          thread_id: "demo-line1-delay",
          title: "Line 1 Yonge-University - Delays",
          categories: ["DELAY", "SUBWAY"],
          affected_routes: ["Line 1"],
          is_resolved: false,
          resolved_at: null,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          alerts: [],
          latestAlert: {
            alert_id: "demo-alert-1",
            thread_id: "demo-line1-delay",
            header_text:
              "Line 1 Yonge-University: Delays of 10-15 minutes due to a medical emergency at Bloor-Yonge Station.",
            description_text:
              "TTC crews are on scene. Delays expected to continue for the next 20-30 minutes.",
            effect: "DELAY",
            categories: ["DELAY", "SUBWAY"],
            affected_routes: ["Line 1"],
            is_latest: true,
            created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
        },
        // Line 2 - Service Disruption
        {
          thread_id: "demo-line2-disruption",
          title: "Line 2 Bloor-Danforth - No Service",
          categories: ["SERVICE_DISRUPTION", "SUBWAY"],
          affected_routes: ["Line 2"],
          is_resolved: false,
          resolved_at: null,
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          alerts: [],
          latestAlert: {
            alert_id: "demo-alert-2",
            thread_id: "demo-line2-disruption",
            header_text:
              "Line 2 Bloor-Danforth: No subway service between Broadview and Kennedy stations due to a fire investigation.",
            description_text:
              "Shuttle buses are running. Use surface routes as alternatives.",
            effect: "NO_SERVICE",
            categories: ["SERVICE_DISRUPTION", "SUBWAY"],
            affected_routes: ["Line 2"],
            is_latest: true,
            created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          },
        },
        // Bus route delay
        {
          thread_id: "demo-bus-delay",
          title: "Route 52 Lawrence West - Detour",
          categories: ["DETOUR", "BUS"],
          affected_routes: ["52"],
          is_resolved: false,
          resolved_at: null,
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          alerts: [],
          latestAlert: {
            alert_id: "demo-alert-3",
            thread_id: "demo-bus-delay",
            header_text:
              "52 Lawrence West: Diverting via Eglinton Ave due to road closure at Lawrence and Allen.",
            description_text:
              "Expect 5-10 minute delays. Normal routing expected by 6 PM.",
            effect: "DETOUR",
            categories: ["DETOUR", "BUS"],
            affected_routes: ["52"],
            is_latest: true,
            created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          },
        },
      ]
    : []) as unknown as ThreadWithAlerts[];

  // Demo maintenance using real scheduled closure format (forced to "happening now")
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .split("T")[0];
  const demoMaintenance: PlannedMaintenance[] = DEMO_MODE
    ? [
        // Nightly closure with start time (Line 4)
        {
          id: 13,
          maintenance_id: "6cfbb742a368a0af",
          routes: ["Line 4"],
          affected_stations: "Sheppard-Yonge to Don Mills stations",
          description: null,
          reason: null,
          start_date: today,
          end_date: tomorrow,
          start_time: "23:59", // Same as real TTC data
          end_time: null, // Real TTC data often has null end_time
          url: "https://www.ttc.ca/service-advisories/subway-service/Line-4-Sheppard-Nightly-early-closures",
        },
        // Full weekend closure with no times (Line 6)
        {
          id: 14,
          maintenance_id: "weekend-closure-demo",
          routes: ["Line 6"],
          affected_stations: "Finch West to Humber College stations",
          description: null,
          reason: null,
          start_date: today,
          end_date: dayAfter,
          start_time: null, // Weekend closures often have no start time
          end_time: null,
          url: "https://www.ttc.ca/service-advisories/subway-service/Line-6-weekend-closure",
        },
      ]
    : [];
  // ===== END DEMO MODE =====

  let activeDialog = $state<string | null>(null);
  let unsubscribeRealtime: (() => void) | null = null;
  let maintenancePollingInterval: ReturnType<typeof setInterval> | null = null;

  // Get current tab from URL, default to 'active'
  let currentTab = $derived<AlertsTab>(
    ($page.url.searchParams.get("tab") as AlertsTab) || "active"
  );

  // Track visibility for polling control
  let hiddenSince: number | null = null;
  const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  // React to visibility changes
  $effect(() => {
    if ($isVisible) {
      if (hiddenSince && Date.now() - hiddenSince > STALE_THRESHOLD) {
        console.log(
          "[Visibility] Tab was hidden for too long, refreshing data..."
        );
        fetchAlerts();
        fetchMaintenance();
      }
      hiddenSince = null;
    } else {
      hiddenSince = Date.now();
    }
  });

  onMount(async () => {
    // Initial data fetch
    await fetchAlerts();

    // Subscribe to Realtime updates
    unsubscribeRealtime = subscribeToAlerts();

    // Fetch maintenance items
    await fetchMaintenance();

    // Maintenance polling (every 5 minutes) - only when visible
    maintenancePollingInterval = setInterval(() => {
      if ($isVisible) {
        fetchMaintenance();
      }
    }, 300000);
  });

  onDestroy(() => {
    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }
    if (maintenancePollingInterval) {
      clearInterval(maintenancePollingInterval);
    }
  });

  // Helper: check if a route is a subway line
  function isSubwayRoute(route: string): boolean {
    const r = route.toLowerCase();
    return (
      r.startsWith("line") ||
      r === "1" ||
      r === "2" ||
      r === "3" ||
      r === "4" ||
      r === "5" ||
      r === "6"
    );
  }

  // Helper: check if thread has SERVICE_RESUMED status
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

  // Helper: get routes from thread (combines thread routes and latest alert routes)
  function getThreadRoutes(thread: ThreadWithAlerts): string[] {
    const threadRoutes = Array.isArray(thread.affected_routes)
      ? thread.affected_routes
      : [];
    const alertRoutes = Array.isArray(thread.latestAlert?.affected_routes)
      ? thread.latestAlert.affected_routes
      : [];
    return [...new Set([...threadRoutes, ...alertRoutes])];
  }

  // Helper: normalize line ID (e.g., "Line 1" -> "Line 1", "1" -> "Line 1")
  function normalizeLineId(route: string): string {
    const r = route.trim();
    if (r.toLowerCase().startsWith("line")) return r;
    // Single digit -> "Line X"
    if (/^\d$/.test(r)) return `Line ${r}`;
    return r;
  }

  // Helper: check if route matches a specific line
  function routeMatchesLine(route: string, lineId: string): boolean {
    const normalizedRoute = normalizeLineId(route).toLowerCase();
    const normalizedLine = lineId.toLowerCase();
    return normalizedRoute === normalizedLine;
  }

  // Helper: parse date as local time (Toronto time)
  function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // If it's just a date (YYYY-MM-DD), treat as local midnight
    if (dateStr.length === 10 && dateStr.includes("-")) {
      return new Date(dateStr + "T00:00:00");
    }
    // If no timezone indicator, treat as local time
    if (!dateStr.includes("Z") && !dateStr.includes("+")) {
      return new Date(dateStr);
    }
    return new Date(dateStr);
  }

  // Helper: parse time string to hours and minutes
  function parseTime(
    timeStr: string | null
  ): { hours: number; minutes: number } | null {
    if (!timeStr) return null;
    const time = timeStr.trim().toLowerCase();

    // Try 24h format (HH:MM or HH:MM:SS)
    const match24 = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      return {
        hours: parseInt(match24[1], 10),
        minutes: parseInt(match24[2], 10),
      };
    }

    // Try 12h format (e.g., "11:30 PM")
    const match12 = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const isPM = match12[3].toLowerCase().startsWith("p");
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return { hours, minutes };
    }

    return null;
  }

  // Helper: check if a scheduled maintenance is happening now
  function isMaintenanceHappeningNow(item: PlannedMaintenance): boolean {
    const now = new Date();
    const startDate = parseLocalDate(item.start_date);
    const endDate = parseLocalDate(item.end_date);

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Check if we're within the date range
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

    if (nowDate < startDateOnly || nowDate > endDateOnly) return false;

    // Check time range if provided
    const startTime = parseTime(item.start_time);
    const endTime = parseTime(item.end_time);

    if (startTime && endTime) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startTime.hours * 60 + startTime.minutes;
      const endMinutes = endTime.hours * 60 + endTime.minutes;

      // Handle overnight closures (e.g., 11 PM to 5 AM)
      if (endMinutes < startMinutes) {
        // Overnight: active if now >= start OR now <= end
        return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
      } else {
        // Same day: active if now is between start and end
        return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
      }
    }

    // No time specified, assume active all day
    return true;
  }

  // Get active alert for a specific subway line
  function getActiveAlertForLine(lineId: string): ThreadWithAlerts | null {
    const active = activeAlerts();
    return (
      active.find((thread) => {
        const routes = getThreadRoutes(thread);
        return routes.some((r) => routeMatchesLine(r, lineId));
      }) || null
    );
  }

  // Get scheduled maintenance happening now for a specific line
  function getActiveMaintenanceForLine(
    lineId: string
  ): PlannedMaintenance | null {
    // Combine real and demo maintenance
    const allMaintenance = [...$maintenanceItems, ...demoMaintenance];
    return (
      allMaintenance.find((item) => {
        const matchesLine = item.routes.some((r) =>
          routeMatchesLine(r, lineId)
        );
        return matchesLine && isMaintenanceHappeningNow(item);
      }) || null
    );
  }

  // Combine real alerts with demo alerts
  let allThreads = $derived(() => {
    if (DEMO_MODE) {
      return [...$threadsWithAlerts, ...demoAlerts];
    }
    return $threadsWithAlerts;
  });

  // Helper: get human-readable status text from alert effect
  // For subway status cards, we simplify to: Delay, Disruption, or generic status
  function getAlertStatusText(alert: ThreadWithAlerts | null): string {
    if (!alert?.latestAlert?.effect) return "Disruption";
    const effect = alert.latestAlert.effect.toUpperCase();

    // Delays shown as "Delay"
    if (effect.includes("DELAY") || effect.includes("SIGNIFICANT_DELAYS"))
      return "Delay";

    // Everything else is "Disruption" for subway status simplicity
    // This includes: NO_SERVICE, DETOUR, REDUCED_SERVICE, MODIFIED_SERVICE, STOP_MOVED
    return "Disruption";
  }

  // Helper: get status type (delay vs disruption) for styling
  function getAlertStatusType(
    alert: ThreadWithAlerts | null
  ): "delay" | "disruption" {
    if (!alert?.latestAlert?.effect) return "disruption";
    const effect = alert.latestAlert.effect.toUpperCase();

    if (effect.includes("DELAY") || effect.includes("SIGNIFICANT_DELAYS"))
      return "delay";

    return "disruption";
  }

  // Derived: subway status for each line
  let subwayStatuses = $derived(() => {
    return SUBWAY_LINES.map((line) => {
      const activeAlert = getActiveAlertForLine(line.id);
      const activeMaintenance = getActiveMaintenanceForLine(line.id);
      const alertType = getAlertStatusType(activeAlert);

      return {
        ...line,
        hasAlert: !!activeAlert,
        alert: activeAlert,
        alertStatusText: getAlertStatusText(activeAlert),
        alertType, // "delay" or "disruption"
        hasMaintenance: !!activeMaintenance,
        maintenance: activeMaintenance,
        // More specific status: "ok", "delay", "disruption", or "scheduled"
        status: activeAlert
          ? alertType
          : activeMaintenance
            ? "scheduled"
            : "ok",
      };
    });
  });

  // Derived: Active alerts (unresolved, sorted with subway first)
  let activeAlerts = $derived(() => {
    const unresolved = allThreads().filter((thread) => !isResolved(thread));

    // Sort: subway lines first, then by date
    return unresolved.sort((a, b) => {
      const aRoutes = getThreadRoutes(a);
      const bRoutes = getThreadRoutes(b);
      const aIsSubway = aRoutes.some((r) => isSubwayRoute(r));
      const bIsSubway = bRoutes.some((r) => isSubwayRoute(r));

      // Subway first
      if (aIsSubway && !bIsSubway) return -1;
      if (!aIsSubway && bIsSubway) return 1;

      // Then by date (newest first)
      return (
        new Date(b.latestAlert?.created_at || 0).getTime() -
        new Date(a.latestAlert?.created_at || 0).getTime()
      );
    });
  });

  // Derived: Resolved alerts (service resumed only)
  let resolvedAlerts = $derived(() => {
    return allThreads()
      .filter((thread) => isResolved(thread))
      .sort(
        (a, b) =>
          new Date(b.latestAlert?.created_at || 0).getTime() -
          new Date(a.latestAlert?.created_at || 0).getTime()
      );
  });

  // Derived: Filtered active alerts based on category filters
  let filteredActiveAlerts = $derived(() => {
    const active = activeAlerts();
    if ($activeFilters.has("ALL") || $activeFilters.size === 0) {
      return active;
    }

    return active.filter((thread) => {
      const categories = Array.isArray(thread.latestAlert?.categories)
        ? thread.latestAlert.categories
        : [];
      return categories.some((cat) => $activeFilters.has(cat));
    });
  });

  // Derived: Resolved alerts for display (no filtering - all resolved alerts shown)
  let filteredResolvedAlerts = $derived(() => {
    return resolvedAlerts();
  });

  // Derived: Currently active scheduled maintenance (happening right now)
  let activeMaintenanceNow = $derived(() => {
    const allMaintenance = [...$maintenanceItems, ...demoMaintenance];
    return allMaintenance.filter((item) => isMaintenanceHappeningNow(item));
  });

  // Format time for display (convert 24h to 12h format)
  function formatTimeDisplay(timeStr: string | null): string {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  // Format date for display (e.g., "Dec 18")
  function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Convert scheduled maintenance to thread-like format for AlertCard
  function maintenanceToThread(
    maintenance: PlannedMaintenance
  ): ThreadWithAlerts {
    // Format times for display
    const startTime = maintenance.start_time
      ? formatTimeDisplay(maintenance.start_time)
      : "";
    const endDate = formatDateDisplay(maintenance.end_date);

    // Build header: stations (primary info)
    // e.g., "Osgoode to College stations"
    const headerText =
      maintenance.affected_stations || "Scheduled closure in effect";

    // Build description: time + end date only (start date not needed - it's already active)
    // Format: "Nightly from 11:59 PM • Until Dec 18" or just "Until Dec 18"
    let descriptionParts: string[] = [];

    // Time info (nightly closures)
    if (startTime) {
      descriptionParts.push(`Nightly from ${startTime}`);
    }

    // End date only
    if (endDate) {
      descriptionParts.push(`Until ${endDate}`);
    }

    const descriptionText =
      descriptionParts.length > 0 ? descriptionParts.join(" • ") : null;

    // Include URL for more details link
    const alertUrl = maintenance.url || null;

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
        url: alertUrl,
      },
    } as unknown as ThreadWithAlerts;
  }

  // Derived: Active maintenance as threads
  let activeMaintenanceThreads = $derived(() => {
    return activeMaintenanceNow().map(maintenanceToThread);
  });

  // Derived: Combined active alerts and maintenance, sorted with subway first
  let combinedActiveAlerts = $derived(() => {
    const alerts = filteredActiveAlerts();
    const maintenance = activeMaintenanceThreads();
    const combined = [...alerts, ...maintenance];

    // Sort: subway lines first, then by date
    return combined.sort((a, b) => {
      const aRoutes = getThreadRoutes(a);
      const bRoutes = getThreadRoutes(b);
      const aIsSubway = aRoutes.some((r) => isSubwayRoute(r));
      const bIsSubway = bRoutes.some((r) => isSubwayRoute(r));

      // Subway first
      if (aIsSubway && !bIsSubway) return -1;
      if (!aIsSubway && bIsSubway) return 1;

      // Then by date (newest first)
      return (
        new Date(b.latestAlert?.created_at || 0).getTime() -
        new Date(a.latestAlert?.created_at || 0).getTime()
      );
    });
  });

  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }

  async function handleSignOut() {
    await signOut();
  }

  function handleTabClick(tabId: AlertsTab) {
    const url = new URL($page.url);
    if (tabId === "active") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tabId);
    }
    goto(url.toString(), { replaceState: true, noScroll: true });
  }
</script>

<svelte:head>
  <title>Service Alerts - TTC Alerts</title>
  <meta
    name="description"
    content="Real-time TTC transit service alerts for Toronto"
  />
</svelte:head>

<Header
  isAuthenticated={$isAuthenticated}
  username={$userName || ""}
  onOpenDialog={handleOpenDialog}
  onSignOut={handleSignOut}
/>

<main class="content-area">
  <!-- Active/Resolved/Scheduled Tabs -->
  <div class="alerts-tabs" role="tablist" aria-label="Alert sections">
    <button
      role="tab"
      aria-selected={currentTab === "active"}
      class="alerts-tab"
      class:active={currentTab === "active"}
      onclick={() => handleTabClick("active")}
    >
      <AlertTriangle class="w-4 h-4" aria-hidden="true" />
      <span>Active</span>
      {#if activeAlerts().length > 0}
        <span class="tab-count">{activeAlerts().length}</span>
      {/if}
    </button>
    <button
      role="tab"
      aria-selected={currentTab === "resolved"}
      class="alerts-tab"
      class:active={currentTab === "resolved"}
      onclick={() => handleTabClick("resolved")}
    >
      <CheckCircle class="w-4 h-4" aria-hidden="true" />
      <span>Resolved</span>
      {#if resolvedAlerts().length > 0}
        <span class="tab-count">{resolvedAlerts().length}</span>
      {/if}
    </button>
    <button
      role="tab"
      aria-selected={currentTab === "scheduled"}
      class="alerts-tab"
      class:active={currentTab === "scheduled"}
      onclick={() => handleTabClick("scheduled")}
    >
      <Calendar class="w-4 h-4" aria-hidden="true" />
      <span>Scheduled</span>
    </button>
  </div>

  {#if currentTab === "active"}
    <!-- Active Alerts Tab -->

    <!-- Subway Status Cards -->
    <div
      class="subway-status-grid"
      role="region"
      aria-label="Subway line status"
    >
      {#each subwayStatuses() as line (line.id)}
        <div
          class="subway-status-card"
          class:status-ok={line.status === "ok"}
          class:status-delay={line.status === "delay"}
          class:status-disruption={line.status === "disruption"}
          class:status-scheduled={line.status === "scheduled"}
          style="--line-color: {line.color}"
        >
          <div class="subway-status-header">
            <span
              class="subway-line-badge"
              style="background-color: {line.color}; color: {line.textColor}"
            >
              {line.name.replace("Line ", "")}
            </span>
            <span class="subway-line-name">{line.name}</span>
          </div>
          <div class="subway-status-indicator">
            {#if line.status === "ok"}
              <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-500" />
              <span class="status-text status-ok-text">Normal Service</span>
            {:else if line.status === "delay"}
              <AlertCircle class="w-4 h-4 status-delay-icon" />
              <span class="status-text status-delay-text"
                >{line.alertStatusText}</span
              >
            {:else if line.status === "disruption"}
              <AlertCircle class="w-4 h-4 status-disruption-icon" />
              <span class="status-text status-disruption-text"
                >{line.alertStatusText}</span
              >
            {:else if line.status === "scheduled"}
              <Calendar class="w-4 h-4 status-scheduled-icon flex-shrink-0" />
              <span class="status-text status-scheduled-text"
                >Scheduled Closure</span
              >
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Alert Cards -->
    <div
      class="space-y-3"
      id="alerts-container"
      role="feed"
      aria-label="Active service alerts"
    >
      {#if $isLoading}
        <!-- Loading skeletons with stagger animation -->
        {#each Array(3) as _, i}
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
        <span class="sr-only">Loading alerts...</span>
      {:else if $error}
        <div class="text-center py-12" role="alert">
          <p class="text-destructive mb-4">{$error}</p>
          <Button variant="link" onclick={() => fetchAlerts()}>
            Try again
          </Button>
        </div>
      {:else if combinedActiveAlerts().length === 0}
        <div class="text-center py-12 text-muted-foreground">
          <CheckCircle
            class="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500"
          />
          <p class="text-lg mb-2 font-medium">All clear!</p>
          <p class="text-sm">No active service disruptions right now.</p>
        </div>
      {:else}
        {#each combinedActiveAlerts() as thread, i (thread.thread_id)}
          {@const isNew = $recentlyAddedThreadIds.has(thread.thread_id)}
          <div
            class={isNew ? "animate-new-alert" : "animate-fade-in-up"}
            style={isNew ? "" : `animation-delay: ${Math.min(i * 50, 300)}ms`}
          >
            <AlertCard {thread} />
          </div>
        {/each}
      {/if}
    </div>
  {:else if currentTab === "resolved"}
    <!-- Resolved Alerts Tab -->

    <!-- Alert Cards -->
    <div
      class="space-y-3"
      id="resolved-container"
      role="feed"
      aria-label="Resolved service alerts"
    >
      {#if $isLoading}
        <!-- Loading skeletons with stagger animation -->
        {#each Array(3) as _, i}
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
        <span class="sr-only">Loading alerts...</span>
      {:else if $error}
        <div class="text-center py-12" role="alert">
          <p class="text-destructive mb-4">{$error}</p>
          <Button variant="link" onclick={() => fetchAlerts()}>
            Try again
          </Button>
        </div>
      {:else if filteredResolvedAlerts().length === 0}
        <div class="text-center py-12 text-muted-foreground">
          <SearchX class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p class="text-lg mb-2 font-medium">No resolved alerts</p>
          <p class="text-sm">
            Resolved alerts from the past 24 hours will appear here.
          </p>
        </div>
      {:else}
        {#each filteredResolvedAlerts() as thread, i (thread.thread_id)}
          <div
            class="animate-fade-in-up"
            style="animation-delay: {Math.min(i * 50, 300)}ms"
          >
            <AlertCard {thread} />
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <!-- Scheduled Tab -->
    <ClosuresView />
  {/if}
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
  .alerts-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background-color: hsl(var(--muted));
    border-radius: calc(var(--radius) + 2px);
    margin-bottom: 1rem;
  }

  .alerts-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.625rem 0.5rem;
    border-radius: var(--radius);
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .alerts-tab:hover:not(.active) {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted-foreground) / 0.1);
  }

  .alerts-tab.active {
    color: hsl(var(--foreground));
    background-color: hsl(var(--background));
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 9999px;
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  .alerts-tab.active .tab-count {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  /* Responsive: smaller text on very small screens */
  @media (max-width: 360px) {
    .alerts-tab {
      font-size: 0.75rem;
      padding: 0.5rem 0.375rem;
      gap: 0.25rem;
    }

    .alerts-tab :global(svg) {
      width: 0.875rem;
      height: 0.875rem;
    }

    .tab-count {
      min-width: 1rem;
      height: 1rem;
      font-size: 0.625rem;
    }
  }

  /* Subway Status Grid */
  .subway-status-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  @media (min-width: 640px) {
    .subway-status-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .subway-status-card {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.625rem;
    border-radius: var(--radius);
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    transition: all 0.15s ease;
  }

  .subway-status-card.status-ok {
    border-color: hsl(142.1 76.2% 36.3% / 0.3);
    background-color: hsl(142.1 76.2% 36.3% / 0.05);
  }

  .subway-status-card.status-delay {
    border-color: hsl(38 80% 50% / 0.4);
    background-color: hsl(38 80% 94%);
  }

  .subway-status-card.status-disruption {
    border-color: hsl(0 70% 50% / 0.4);
    background-color: hsl(0 70% 96%);
  }

  .subway-status-card.status-scheduled {
    border-color: hsl(270 60% 60% / 0.4);
    background-color: hsl(270 60% 95%);
  }

  :global(.dark) .subway-status-card.status-delay {
    background-color: hsl(38 92% 50% / 0.25);
  }

  :global(.dark) .subway-status-card.status-disruption {
    background-color: hsl(0 63% 31% / 0.25);
  }

  :global(.dark) .subway-status-card.status-scheduled {
    background-color: hsl(270 50% 30% / 0.35);
  }

  .subway-status-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .subway-line-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.75rem;
    height: 1.75rem;
    padding: 0 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 700;
  }

  .subway-line-name {
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .subway-status-indicator {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
  }

  .subway-status-indicator :global(svg) {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .status-text {
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* Status icon colors - matching badge text colors (global for Lucide components) */
  :global(.status-delay-icon) {
    color: hsl(28 90% 25%) !important;
  }

  :global(.status-disruption-icon) {
    color: hsl(0 72% 30%) !important;
  }

  :global(.status-scheduled-icon) {
    color: hsl(270 60% 35%) !important;
  }

  /* Status text colors matching badge colors for consistency */
  .status-ok-text {
    color: hsl(142.1 71.8% 29.2%); /* green-700 */
  }

  .status-delay-text {
    color: hsl(28 90% 25%);
  }

  .status-disruption-text {
    color: hsl(0 72% 30%);
  }

  .status-scheduled-text {
    color: hsl(270 60% 35%);
  }

  :global(.dark) .status-ok-text {
    color: hsl(142.1 70.6% 45.3%); /* green-600 */
  }

  :global(.dark .status-delay-icon),
  :global(.dark) .status-delay-text {
    color: hsl(43 96% 70%) !important;
  }

  :global(.dark .status-disruption-icon),
  :global(.dark) .status-disruption-text {
    color: hsl(0 91% 75%) !important;
  }

  :global(.dark .status-scheduled-icon),
  :global(.dark) .status-scheduled-text {
    color: hsl(270 70% 75%) !important;
  }
</style>
