<script lang="ts">
  import { _ } from "svelte-i18n";
  import { onMount, onDestroy } from "svelte";
  import {
    SearchX,
    CheckCircle,
    Calendar,
    AlertTriangle,
    AlertCircle,
    Accessibility,
    Clock,
  } from "lucide-svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Header from "$lib/components/layout/Header.svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import RSZAlertCard from "$lib/components/alerts/RSZAlertCard.svelte";
  import FilterChips from "$lib/components/alerts/FilterChips.svelte";
  import CategoryFilter from "$lib/components/alerts/CategoryFilter.svelte";
  import ClosuresView from "$lib/components/alerts/ClosuresView.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Button } from "$lib/components/ui/button";
  import SEO from "$lib/components/SEO.svelte";
  import {
    formatTimeDisplay,
    formatDateDisplay,
  } from "$lib/utils/date-formatters";
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
    selectedSeverityCategory,
    getSeverityCategory,
    type SeverityCategory,
  } from "$lib/stores/alerts";
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

    // RSZ and ACCESSIBILITY threads should NEVER be resolved by text matching
    // Their lifecycle is managed exclusively by TTC API through poll-alerts
    const categories = Array.isArray(thread.categories)
      ? thread.categories
      : [];
    if (categories.includes("RSZ") || categories.includes("ACCESSIBILITY")) {
      // For RSZ/ACCESSIBILITY, only trust the is_resolved flag
      return false;
    }

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
  // Handles both "Line 1" and "Line 1 (Yonge - University)" formats
  function routeMatchesLine(route: string, lineId: string): boolean {
    const normalizedRoute = normalizeLineId(route).toLowerCase();
    const normalizedLine = lineId.toLowerCase();
    // Use startsWith to match "Line 1 (Yonge - University)" with "Line 1"
    return (
      normalizedRoute === normalizedLine ||
      normalizedRoute.startsWith(normalizedLine + " ")
    );
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

    // Get today's date only (no time)
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

    // Check time info
    const startTime = parseTime(item.start_time);
    let endTime = parseTime(item.end_time);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // For nightly closures with only start time (late night, e.g., 10 PM+),
    // assume service resumes at 6 AM (TTC standard)
    const isNightlyClosure = startTime && startTime.hours >= 22;
    if (isNightlyClosure && !endTime) {
      endTime = { hours: 6, minutes: 0 };
    }

    // For overnight closures, we need to check the "morning after" the last date
    // e.g., Dec 15-18 closure ends on Dec 19 at 6 AM
    const endDateExtended = new Date(endDateOnly);
    if (isNightlyClosure && endTime && endTime.hours < 12) {
      // Add one day to end date for morning-after check
      endDateExtended.setDate(endDateExtended.getDate() + 1);
    }

    // Check if we're within the extended date range
    if (nowDate < startDateOnly || nowDate > endDateExtended) return false;

    // Special case: we're on the day AFTER the end date (morning after last closure)
    if (
      nowDate.getTime() === endDateExtended.getTime() &&
      nowDate > endDateOnly
    ) {
      // Only active if we're before the end time (e.g., before 6 AM)
      if (endTime) {
        const endMinutes = endTime.hours * 60 + endTime.minutes;
        return nowMinutes <= endMinutes;
      }
      return false;
    }

    // If we're on the START date, check if we've passed the start time
    if (nowDate.getTime() === startDateOnly.getTime() && startTime) {
      const startMinutes = startTime.hours * 60 + startTime.minutes;
      if (nowMinutes < startMinutes) return false;
    }

    // Handle overnight closures (e.g., 11:59 PM to 6 AM)
    if (startTime && endTime) {
      const startMinutes = startTime.hours * 60 + startTime.minutes;
      const endMinutes = endTime.hours * 60 + endTime.minutes;

      // Overnight closure (end time is less than start time, like 23:59 to 6:00)
      if (endMinutes < startMinutes) {
        // Active if now >= start (late night) OR now <= end (early morning)
        return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
      } else {
        // Same day: active if now is between start and end
        return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
      }
    }

    // If no times specified, assume active during the date range
    return true;
  }

  // Get ALL active alerts for a specific subway line (for count and grouping)
  // EXCLUDES: RSZ (MINOR) and ACCESSIBILITY alerts - these don't affect line status
  function getAllAlertsForLine(lineId: string): ThreadWithAlerts[] {
    const active = activeAlerts();
    return active.filter((thread) => {
      const routes = getThreadRoutes(thread);
      if (!routes.some((r) => routeMatchesLine(r, lineId))) return false;

      // Exclude RSZ and ACCESSIBILITY alerts from line status calculation
      // RSZ alerts are "slower than usual" - not a disruption or delay
      // Accessibility alerts are elevator/escalator issues - separate concern
      const categories = Array.isArray(thread.latestAlert?.categories)
        ? thread.latestAlert.categories
        : [];
      const effect = thread.latestAlert?.effect || "";
      const headerText = thread.latestAlert?.header_text || "";

      const severity = getSeverityCategory(categories, effect, headerText);

      // Only MAJOR alerts affect line status (disruptions, delays, etc.)
      return severity === "MAJOR";
    });
  }

  // Get the most severe active alert for a specific subway line (for status display)
  function getActiveAlertForLine(lineId: string): ThreadWithAlerts | null {
    const lineAlerts = getAllAlertsForLine(lineId);
    if (lineAlerts.length === 0) return null;

    // Priority order: disruption > delay > other
    const disruption = lineAlerts.find(
      (t) => getAlertStatusType(t) === "disruption"
    );
    if (disruption) return disruption;

    const delay = lineAlerts.find((t) => getAlertStatusType(t) === "delay");
    if (delay) return delay;

    return lineAlerts[0];
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

  // Combine real alerts with demo alerts (filter out hidden threads)
  let allThreads = $derived(() => {
    // Filter out hidden threads (alerts cleared from TTC API without SERVICE_RESUMED)
    const visibleThreads = $threadsWithAlerts.filter((t) => !t.is_hidden);
    if (DEMO_MODE) {
      return [...visibleThreads, ...demoAlerts];
    }
    return visibleThreads;
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

  // Helper: get status type (delay vs disruption vs scheduled) for styling
  function getAlertStatusType(
    alert: ThreadWithAlerts | null
  ): "delay" | "disruption" | "scheduled" {
    if (!alert?.latestAlert?.effect) return "disruption";
    const effect = alert.latestAlert.effect.toUpperCase();

    if (effect.includes("DELAY") || effect.includes("SIGNIFICANT_DELAYS"))
      return "delay";

    if (effect.includes("SCHEDULED") || effect.includes("CLOSURE"))
      return "scheduled";

    return "disruption";
  }

  // Helper: get display name for status type
  function getStatusTypeName(
    type: "delay" | "disruption" | "scheduled"
  ): string {
    switch (type) {
      case "delay":
        return "Delay";
      case "disruption":
        return "Disruption";
      case "scheduled":
        return "Scheduled";
    }
  }

  // Derived: subway status for each line
  let subwayStatuses = $derived(() => {
    return SUBWAY_LINES.map((line) => {
      const allAlerts = getAllAlertsForLine(line.id);
      const activeAlert = getActiveAlertForLine(line.id);
      const activeMaintenance = getActiveMaintenanceForLine(line.id);
      const alertType = getAlertStatusType(activeAlert);

      // Count total issues: alerts + active maintenance
      const alertCount =
        allAlerts.length +
        (activeMaintenance &&
        !allAlerts.some((a) => a.thread_id.startsWith("maintenance-"))
          ? 1
          : 0);

      // Check for compound status (both live alert AND scheduled maintenance)
      const hasCompoundStatus =
        allAlerts.length > 0 &&
        activeMaintenance &&
        !allAlerts.some((a) => a.thread_id.startsWith("maintenance-"));

      // Get unique alert types for display (e.g., ["Disruption", "Delay"])
      const alertTypes = new Set<"delay" | "disruption" | "scheduled">();
      for (const alert of allAlerts) {
        alertTypes.add(getAlertStatusType(alert));
      }
      // Add scheduled if there's active maintenance not already counted
      if (
        activeMaintenance &&
        !allAlerts.some((a) => a.thread_id.startsWith("maintenance-"))
      ) {
        alertTypes.add("scheduled");
      }
      // Convert to array in priority order (disruption > delay > scheduled)
      const uniqueTypes: ("delay" | "disruption" | "scheduled")[] = [];
      if (alertTypes.has("disruption")) uniqueTypes.push("disruption");
      if (alertTypes.has("delay")) uniqueTypes.push("delay");
      if (alertTypes.has("scheduled")) uniqueTypes.push("scheduled");

      return {
        ...line,
        hasAlert: !!activeAlert,
        alert: activeAlert,
        alertStatusText: getAlertStatusText(activeAlert),
        alertType, // "delay" or "disruption" (most severe)
        hasMaintenance: !!activeMaintenance,
        maintenance: activeMaintenance,
        alertCount, // Total number of issues for this line
        hasCompoundStatus, // Both live alert AND scheduled closure
        uniqueTypes, // Array of unique alert types for multi-status display
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

  // Derived: Resolved alerts (service resumed only, excluding accessibility and RSZ alerts)
  // Accessibility alerts (elevator/escalator) should not appear in Resolved tab
  // because "elevator working again" isn't newsworthy like "service has resumed"
  // RSZ alerts should be deleted when resolved, but if any slip through, exclude them
  let resolvedAlerts = $derived(() => {
    return allThreads()
      .filter((thread) => {
        if (!isResolved(thread)) return false;

        // Exclude accessibility alerts from resolved tab
        const categories = Array.isArray(thread.latestAlert?.categories)
          ? thread.latestAlert.categories
          : [];
        const effect = thread.latestAlert?.effect || "";
        const headerText = thread.latestAlert?.header_text || "";

        const severity = getSeverityCategory(categories, effect, headerText);
        if (severity === "ACCESSIBILITY") return false;

        // Exclude RSZ (Reduced Speed Zone) alerts - they should never appear in Resolved tab
        // RSZ alerts are supposed to be deleted when resolved, not marked resolved
        const lowerHeader = headerText.toLowerCase();
        const isRSZ =
          lowerHeader.includes("slower than usual") ||
          lowerHeader.includes("reduced speed") ||
          lowerHeader.includes("move slower") ||
          lowerHeader.includes("running slower") ||
          lowerHeader.includes("slow zone") ||
          effect === "SIGNIFICANT_DELAYS";
        if (isRSZ) return false;

        // Exclude orphaned SERVICE_RESUMED threads (no parent disruption alert)
        // These are threads where:
        // 1. All alerts are SERVICE_RESUMED (no preceding DELAY/DISRUPTION)
        // 2. Thread only has 1 alert (orphaned resumption)
        const threadCategories = Array.isArray(thread.categories)
          ? thread.categories
          : [];
        const onlyServiceResumed =
          threadCategories.length === 1 &&
          threadCategories[0] === "SERVICE_RESUMED";
        const singleAlertThread = thread.alerts?.length === 1;
        if (onlyServiceResumed && singleAlertThread) return false;

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.latestAlert?.created_at || 0).getTime() -
          new Date(a.latestAlert?.created_at || 0).getTime()
      );
  });

  // Derived: Filtered active alerts based on severity category (MAJOR/MINOR/ACCESSIBILITY/ALL)
  let filteredActiveAlerts = $derived(() => {
    const active = activeAlerts();
    const category = $selectedSeverityCategory;

    // If ALL is selected, return all active alerts
    if (category === "ALL") {
      return active;
    }

    // Filter by severity category
    return active.filter((thread) => {
      const categories = Array.isArray(thread.latestAlert?.categories)
        ? thread.latestAlert.categories
        : [];
      const effect = thread.latestAlert?.effect || "";
      const headerText = thread.latestAlert?.header_text || "";

      const threadSeverity = getSeverityCategory(
        categories,
        effect,
        headerText
      );
      return threadSeverity === category;
    });
  });

  // Derived: Currently active scheduled maintenance (happening right now)
  // Moved up so severityCounts can include it
  let activeMaintenanceNow = $derived(() => {
    const allMaintenance = [...$maintenanceItems, ...demoMaintenance];
    return allMaintenance.filter((item) => isMaintenanceHappeningNow(item));
  });

  // Derived: Count of alerts per severity category (includes active maintenance)
  let severityCounts = $derived(() => {
    const active = activeAlerts();
    const maintenanceCount = activeMaintenanceNow().length;
    const counts = {
      MAJOR: maintenanceCount, // Start with maintenance count
      MINOR: 0,
      ACCESSIBILITY: 0,
      ALL: active.length + maintenanceCount,
    };

    for (const thread of active) {
      const categories = Array.isArray(thread.latestAlert?.categories)
        ? thread.latestAlert.categories
        : [];
      const effect = thread.latestAlert?.effect || "";
      const headerText = thread.latestAlert?.header_text || "";

      const severity = getSeverityCategory(categories, effect, headerText);
      counts[severity]++;
    }

    return counts;
  });

  // Derived: Resolved alerts for display (no filtering - all resolved alerts shown)
  let filteredResolvedAlerts = $derived(() => {
    return resolvedAlerts();
  });

  // Helper: Check if a thread is an RSZ (Reduced Speed Zone) alert
  function isRSZAlert(thread: ThreadWithAlerts): boolean {
    const alert = thread.latestAlert;
    if (!alert) return false;

    // Primary: RSZ alerts have alert_id starting with "ttc-RSZ-"
    // This is the most reliable way to detect RSZ from TTC API
    if (alert.alert_id?.startsWith("ttc-RSZ-")) {
      return true;
    }

    // Secondary: Bluesky-sourced RSZ alerts detected by text patterns
    const headerText = (alert.header_text || "").toLowerCase();
    const isBlueskyRSZ =
      headerText.includes("slower than usual") ||
      headerText.includes("reduced speed") ||
      headerText.includes("move slower") ||
      headerText.includes("running slower") ||
      headerText.includes("slow zone");

    return isBlueskyRSZ;
  }

  // Derived: RSZ alerts (filtered out when in MINOR view to display separately)
  let rszAlerts = $derived(() => {
    if ($selectedSeverityCategory !== "MINOR") return [];
    return filteredActiveAlerts().filter(isRSZAlert);
  });

  // Derived: Non-RSZ alerts (regular alerts minus RSZ when in MINOR view)
  let nonRSZAlerts = $derived(() => {
    if ($selectedSeverityCategory !== "MINOR") return filteredActiveAlerts();
    return filteredActiveAlerts().filter((t) => !isRSZAlert(t));
  });

  // Derived: Count of unique scheduled closures (only real maintenance items, not demo)
  let scheduledClosuresCount = $derived(() => {
    return $maintenanceItems.length;
  });

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

  // Helper: get subway line ID from thread
  function getSubwayLineFromThread(thread: ThreadWithAlerts): string | null {
    const routes = getThreadRoutes(thread);
    for (const route of routes) {
      const normalized = normalizeLineId(route).toLowerCase();
      if (normalized.startsWith("line")) {
        // Extract just "Line X" from "line x (name)" format
        const match = normalized.match(/^line\s*(\d)/);
        if (match) {
          return `Line ${match[1]}`;
        }
        return normalized.replace("line ", "Line ");
      }
    }
    return null;
  }

  // Derived: Combined active alerts and maintenance, grouped by subway line with section headers
  let combinedActiveAlerts = $derived(() => {
    // Use nonRSZAlerts when in MINOR mode (RSZ alerts render separately)
    const alerts =
      $selectedSeverityCategory === "MINOR"
        ? nonRSZAlerts()
        : filteredActiveAlerts();

    // Only include maintenance in MAJOR tab (scheduled closures are MAJOR)
    const maintenance =
      $selectedSeverityCategory === "MAJOR" ? activeMaintenanceThreads() : [];
    const combined = [...alerts, ...maintenance];

    // Separate subway and non-subway alerts
    const subwayAlerts = combined.filter((t) => {
      const routes = getThreadRoutes(t);
      return routes.some((r) => isSubwayRoute(r));
    });
    const nonSubwayAlerts = combined.filter((t) => {
      const routes = getThreadRoutes(t);
      return !routes.some((r) => isSubwayRoute(r));
    });

    // Group subway alerts by line ID, maintaining line order (1, 2, 4, 6)
    const lineOrder = ["Line 1", "Line 2", "Line 4", "Line 6"];
    const groupedSubway: ThreadWithAlerts[] = [];

    for (const lineId of lineOrder) {
      const lineAlerts = subwayAlerts
        .filter((t) => {
          const threadLine = getSubwayLineFromThread(t);
          return threadLine === lineId;
        })
        .sort((a, b) => {
          // Within a line, sort by severity then date
          const aType = getAlertStatusType(a);
          const bType = getAlertStatusType(b);
          if (aType === "disruption" && bType !== "disruption") return -1;
          if (bType === "disruption" && aType !== "disruption") return 1;
          return (
            new Date(b.latestAlert?.created_at || 0).getTime() -
            new Date(a.latestAlert?.created_at || 0).getTime()
          );
        });
      groupedSubway.push(...lineAlerts);
    }

    // Sort non-subway by date
    const sortedNonSubway = nonSubwayAlerts.sort((a, b) => {
      return (
        new Date(b.latestAlert?.created_at || 0).getTime() -
        new Date(a.latestAlert?.created_at || 0).getTime()
      );
    });

    return [...groupedSubway, ...sortedNonSubway];
  });

  // Helper: get line info for subway alerts
  function getLineInfo(lineId: string) {
    return SUBWAY_LINES.find((l) => l.id === lineId);
  }

  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
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

  function handleSeverityCategorySelect(category: SeverityCategory) {
    selectedSeverityCategory.set(category);
  }
</script>

<SEO
  title={$_("pages.alerts.title")}
  description="Real-time TTC transit service alerts for Toronto"
  noindex={true}
/>

<Header onOpenDialog={handleOpenDialog} />

<main class="content-area">
  <!-- Visually hidden h1 for screen readers (WCAG 1.3.1 heading hierarchy) -->
  <h1 class="sr-only">{$_("pages.alerts.title").replace(" - rideTO", "")}</h1>

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
      <span>{$_("status.active")}</span>
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
      <span>{$_("status.resolved")}</span>
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
      <span>{$_("status.scheduled")}</span>
      {#if scheduledClosuresCount() > 0}
        <span class="tab-count">{scheduledClosuresCount()}</span>
      {/if}
    </button>
  </div>

  <!-- Aria-live region for screen reader announcements (WCAG 4.1.3) -->
  <div aria-live="polite" aria-atomic="true" class="sr-only">
    {#if $isLoading}
      Loading alerts...
    {:else if currentTab === "active"}
      {activeAlerts().length} active alert{activeAlerts().length === 1
        ? ""
        : "s"} found
    {:else if currentTab === "resolved"}
      {resolvedAlerts().length} resolved alert{resolvedAlerts().length === 1
        ? ""
        : "s"} found
    {:else}
      {scheduledClosuresCount()} scheduled item{scheduledClosuresCount() === 1
        ? ""
        : "s"} found
    {/if}
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
          role="status"
          aria-label="{line.name}: {line.status === 'ok'
            ? $_('status.normalService')
            : `${line.alertCount} issue${line.alertCount > 1 ? 's' : ''}: ${line.uniqueTypes.map((t) => getStatusTypeName(t)).join(', ')}`}"
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
              <span class="status-text status-ok-text"
                >{$_("status.normalService")}</span
              >
            {:else}
              <!-- Show all unique issue types with icons -->
              <div class="multi-status-container">
                {#each line.uniqueTypes as type}
                  <div class="status-type-item status-type-{type}">
                    {#if type === "disruption"}
                      <AlertCircle class="w-4 h-4 status-disruption-icon" />
                      <span class="status-text status-disruption-text"
                        >{$_("status.disruption")}</span
                      >
                    {:else if type === "delay"}
                      <AlertCircle class="w-4 h-4 status-delay-icon" />
                      <span class="status-text status-delay-text"
                        >{$_("status.delay")}</span
                      >
                    {:else if type === "scheduled"}
                      <Calendar
                        class="w-4 h-4 status-scheduled-icon flex-shrink-0"
                      />
                      <span class="status-text status-scheduled-text"
                        >{$_("status.scheduled")}</span
                      >
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Severity Category Filter -->
    <CategoryFilter
      selected={$selectedSeverityCategory}
      counts={severityCounts()}
      onSelect={handleSeverityCategorySelect}
    />

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
      {:else if combinedActiveAlerts().length === 0 && rszAlerts().length === 0}
        {#if $selectedSeverityCategory !== "ALL" && activeAlerts().length > 0}
          <!-- Category filter is active but no alerts in this category -->
          <div class="empty-state animate-fade-in">
            <div class="empty-state-icon">
              {#if $selectedSeverityCategory === "MAJOR"}
                <AlertTriangle class="h-8 w-8" />
              {:else if $selectedSeverityCategory === "MINOR"}
                <Clock class="h-8 w-8" />
              {:else if $selectedSeverityCategory === "ACCESSIBILITY"}
                <Accessibility class="h-8 w-8" />
              {:else}
                <SearchX class="h-8 w-8" />
              {/if}
            </div>
            <h3 class="empty-state-title">
              No {$selectedSeverityCategory.toLowerCase()} alerts
            </h3>
            <p class="empty-state-description">
              {#if $selectedSeverityCategory === "MAJOR"}
                No major disruptions at this time.
              {:else if $selectedSeverityCategory === "MINOR"}
                No minor delays at this time.
              {:else if $selectedSeverityCategory === "ACCESSIBILITY"}
                No elevator or escalator outages at this time.
              {/if}
            </p>
          </div>
        {:else}
          <!-- No active alerts at all -->
          <div class="empty-state success animate-fade-in">
            <div class="empty-state-icon success">
              <CheckCircle class="h-8 w-8" />
            </div>
            <h3 class="empty-state-title">{$_("emptyStates.allClear")}</h3>
            <p class="empty-state-description">
              {$_("emptyStates.noActiveDisruptions")}
            </p>
          </div>
        {/if}
      {:else}
        <!-- All alerts displayed directly without grouping -->
        {#each combinedActiveAlerts() as thread, i (thread.thread_id)}
          {@const isNew = $recentlyAddedThreadIds.has(thread.thread_id)}
          {@const subwayLine = getSubwayLineFromThread(thread)}
          {@const lineInfo = subwayLine ? getLineInfo(subwayLine) : null}

          <div
            class={isNew ? "animate-new-alert" : "animate-fade-in-up"}
            style={isNew ? "" : `animation-delay: ${Math.min(i * 50, 300)}ms`}
          >
            <AlertCard {thread} lineColor={lineInfo?.color} />
          </div>
        {/each}

        <!-- RSZ Alerts: Show grouped table at bottom when in MINOR category -->
        {#if $selectedSeverityCategory === "MINOR" && rszAlerts().length > 0}
          <div class="mt-4 animate-fade-in">
            <RSZAlertCard threads={rszAlerts()} />
          </div>
        {/if}
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
            {$_("common.tryAgain")}
          </Button>
        </div>
      {:else if filteredResolvedAlerts().length === 0}
        <div class="text-center py-12 text-muted-foreground">
          <SearchX class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p class="text-lg mb-2 font-medium">
            {$_("emptyStates.noResolvedAlerts")}
          </p>
          <p class="text-sm">
            {$_("emptyStates.resolvedAlertsAppear")}
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
    position: relative;
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
    min-width: 0; /* Allow flex items to shrink below content size */
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

  .alerts-tab.active::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 2rem;
    height: 2px;
    background: hsl(var(--primary));
    border-radius: 1px;
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
    background-color: hsl(var(--muted-foreground) / 0.2);
    color: hsl(var(--foreground));
  }

  :global(.dark) .tab-count {
    background-color: hsl(var(--muted-foreground) / 0.25);
  }

  .alerts-tab.active .tab-count {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  /* Responsive: smaller text on small screens */
  @media (max-width: 450px) {
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
      padding: 0 0.25rem;
    }
  }

  /* Extra small screens: even more compact */
  @media (max-width: 360px) {
    .alerts-tab {
      font-size: 0.6875rem;
      padding: 0.5rem 0.25rem;
      gap: 0.2rem;
    }

    .alerts-tab span {
      overflow: hidden;
      text-overflow: ellipsis;
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
    text-align: left;
  }

  .subway-status-card.status-ok {
    background-color: hsl(142.1 76.2% 36.3% / 0.1);
  }

  .subway-status-card.status-delay {
    background-color: hsl(38 80% 94%);
  }

  .subway-status-card.status-disruption {
    background-color: hsl(0 70% 96%);
  }

  .subway-status-card.status-scheduled {
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

  /* Multi-status container for showing multiple issue types */
  .multi-status-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  .status-type-item {
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

  /* Empty State Styles - Consistent with MyRouteAlerts and MyStops */
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
  }

  .empty-state.success {
    border-style: solid;
    border-color: hsl(142 76% 36% / 0.2);
    background-color: hsl(142 76% 36% / 0.05);
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
</style>
