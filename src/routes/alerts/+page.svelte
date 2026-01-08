<script lang="ts">
  import { _ } from "svelte-i18n";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import {
    Zap,
    Calendar,
    CheckCircle,
    RefreshCw,
    AlertTriangle,
    ExternalLink,
  } from "lucide-svelte";
  import Header from "$lib/components/layout/Header.svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import RSZAlertCard from "$lib/components/alerts/RSZAlertCard.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Button } from "$lib/components/ui/button";
  import SEO from "$lib/components/SEO.svelte";
  import {
    threadsWithAlerts,
    isLoading,
    error,
    fetchAlerts,
    subscribeToAlerts,
    fetchMaintenance,
    maintenanceItems,
    getSeverityCategory,
    type SeverityCategory,
  } from "$lib/stores/alerts";

  import SubwayStatusBar from "./SubwayStatusBar.svelte";
  import CategoryFilterV3 from "./CategoryFilterV3.svelte";
  import PlannedContent from "./PlannedContent.svelte";
  import ResolvedSection from "./ResolvedSection.svelte";

  import type { ThreadWithAlerts } from "$lib/types/database";

  // URL param names (user-friendly) vs internal state names
  // URL: slowzones → Internal: delays
  // URL: elevators → Internal: station-alerts
  const URL_TO_CATEGORY: Record<
    string,
    "disruptions" | "delays" | "station-alerts"
  > = {
    disruptions: "disruptions",
    slowzones: "delays",
    elevators: "station-alerts",
    "station-alerts": "station-alerts", // Keep for backwards compatibility
  };
  const CATEGORY_TO_URL: Record<
    "disruptions" | "delays" | "station-alerts",
    string
  > = {
    disruptions: "disruptions",
    delays: "slowzones",
    "station-alerts": "elevators", // Changed: URL shows "elevators" instead of "station-alerts"
  };

  // URL param to subtab mapping
  const URL_TO_SUBTAB: Record<string, "closures" | "changes"> = {
    closures: "closures",
    routechanges: "changes",
  };
  const SUBTAB_TO_URL: Record<"closures" | "changes", string> = {
    closures: "closures",
    changes: "routechanges",
  };

  // Parse URL params to get initial state
  function getInitialTab(): "now" | "planned" {
    if (!browser) return "now";
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") === "scheduled" ? "planned" : "now";
  }

  function getInitialCategory(): "disruptions" | "delays" | "station-alerts" {
    if (!browser) return "disruptions";
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    // Map URL param to internal category
    if (cat && URL_TO_CATEGORY[cat]) {
      return URL_TO_CATEGORY[cat];
    }
    return "disruptions";
  }

  function getInitialSubtab(): "closures" | "changes" {
    if (!browser) return "closures";
    const params = new URLSearchParams(window.location.search);
    const subtab = params.get("subtab");
    if (subtab && URL_TO_SUBTAB[subtab]) {
      return URL_TO_SUBTAB[subtab];
    }
    return "closures";
  }

  // Tab state: "now" or "planned" - initialized from URL params
  let activeTab: "now" | "planned" = $state(getInitialTab());

  // Category filter: "disruptions" | "delays" | "station-alerts" - initialized from URL params
  let selectedCategory: "disruptions" | "delays" | "station-alerts" =
    $state(getInitialCategory());

  // Subtab for Scheduled tab: "closures" | "changes" - initialized from URL params
  let scheduledSubtab: "closures" | "changes" = $state(getInitialSubtab());

  // Update URL when state changes (shallow navigation without full reload)
  function updateUrl(
    tab: "now" | "planned",
    category: "disruptions" | "delays" | "station-alerts",
    subtab: "closures" | "changes"
  ) {
    if (!browser) return;
    const params = new URLSearchParams();

    if (tab === "planned") {
      // Scheduled tab: use "scheduled" in URL and include subtab
      params.set("tab", "scheduled");
      const urlSubtab = SUBTAB_TO_URL[subtab];
      if (urlSubtab !== "closures") params.set("subtab", urlSubtab);
    } else {
      // Now tab: only include category if not default
      const urlCategory = CATEGORY_TO_URL[category];
      if (urlCategory !== "disruptions") params.set("category", urlCategory);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/alerts?${queryString}` : "/alerts";
    goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
  }

  // Handle tab change
  function setActiveTab(tab: "now" | "planned") {
    activeTab = tab;
    // Reset category to disruptions when switching tabs
    if (selectedCategory !== "disruptions") {
      selectedCategory = "disruptions";
    }
    // Reset subtab to closures when switching to scheduled
    if (tab === "planned" && scheduledSubtab !== "closures") {
      scheduledSubtab = "closures";
    }
    updateUrl(tab, selectedCategory, scheduledSubtab);
  }

  // Handle category change (Now tab)
  function setCategory(cat: "disruptions" | "delays" | "station-alerts") {
    selectedCategory = cat;
    updateUrl(activeTab, cat, scheduledSubtab);
  }

  // Handle subtab change (Scheduled tab)
  function setScheduledSubtab(subtab: "closures" | "changes") {
    scheduledSubtab = subtab;
    updateUrl(activeTab, selectedCategory, subtab);
  }

  // Subway lines configuration
  const SUBWAY_LINES = [
    {
      id: "Line 1",
      name: "Line 1",
      shortName: "1",
      color: "#ffc524",
      textColor: "#000000",
    },
    {
      id: "Line 2",
      name: "Line 2",
      shortName: "2",
      color: "#00853f",
      textColor: "#ffffff",
    },
    {
      id: "Line 4",
      name: "Line 4",
      shortName: "4",
      color: "#a12f7d",
      textColor: "#ffffff",
    },
    {
      id: "Line 6",
      name: "Line 6",
      shortName: "6",
      color: "#808285",
      textColor: "#ffffff",
    },
  ];

  // Get subway status for each line - matching production behavior
  // Returns status type based on most severe alert, plus uniqueTypes for compound display
  function getAlertStatusType(
    thread: ThreadWithAlerts
  ): "slowzone" | "delay" | "disruption" | "scheduled" {
    if (!thread?.latestAlert?.effect) return "disruption";

    // Check if this is an RSZ (slow zone) alert first
    if (isRSZAlert(thread)) {
      return "slowzone";
    }

    const effect = thread.latestAlert.effect.toUpperCase();

    if (effect.includes("DELAY") || effect.includes("SIGNIFICANT_DELAYS"))
      return "delay";

    if (effect.includes("SCHEDULED") || effect.includes("CLOSURE"))
      return "scheduled";

    return "disruption";
  }

  // Get ALL active alerts for a specific subway line
  function getAllAlertsForLine(lineId: string): ThreadWithAlerts[] {
    const active = $threadsWithAlerts.filter(
      (t) => !t.is_resolved && !t.is_hidden
    );
    return active.filter((thread) => {
      const routes = thread.affected_routes || [];
      // Check if any route matches this line
      return routes.some((r) => {
        if (r === lineId) return true;
        // Handle "Line 1" vs "1" format
        const routeNum = r.match(/^(\d+)/)?.[1];
        const lineNum = lineId.match(/\d+/)?.[0];
        return routeNum === lineNum;
      });
    });
  }

  // Get active maintenance happening now for a specific line
  function getActiveMaintenanceForLine(lineId: string): boolean {
    const lineNum = lineId.match(/\d+/)?.[0];
    return $maintenanceItems.some((item) => {
      const matchesLine = item.routes.some((r: string) => {
        if (r === lineId) return true;
        const routeNum = r.match(/^(\d+)/)?.[1];
        return routeNum === lineNum;
      });
      // Check if maintenance is happening now
      if (!matchesLine) return false;
      const now = new Date();
      // If item has periods, check if any are active now
      if ((item as any).periods?.length > 0) {
        return (item as any).periods.some(
          (p: { start: string; end: string }) => {
            const start = new Date(p.start);
            const end = new Date(p.end);
            return now >= start && now <= end;
          }
        );
      }
      return false;
    });
  }

  // Map our new categories to severity categories
  function mapCategoryToSeverity(
    cat: typeof selectedCategory
  ): SeverityCategory {
    switch (cat) {
      case "disruptions":
        return "MAJOR";
      case "delays":
        return "MINOR";
      case "station-alerts":
        return "ACCESSIBILITY";
    }
  }

  // Helper: Check if a thread is an RSZ (Reduced Speed Zone) alert
  function isRSZAlert(thread: ThreadWithAlerts): boolean {
    const alert = thread.latestAlert;
    if (!alert) return false;

    // Primary: RSZ alerts have alert_id starting with "ttc-rsz-" (lowercase)
    // This is the most reliable way to detect RSZ from TTC API
    if (alert.alert_id?.toLowerCase().startsWith("ttc-rsz-")) {
      return true;
    }
    
    // Also check for RSZ category (set by poll-alerts v93+)
    const categories = (alert.categories as string[]) || [];
    if (categories.includes("RSZ")) {
      return true;
    }
    
    // Also check for RSZ effect (set by poll-alerts v93+)
    if (alert.effect?.toUpperCase() === "RSZ") {
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

  // Filter threads by category
  function filterByCategory(threads: ThreadWithAlerts[]): ThreadWithAlerts[] {
    const targetSeverity = mapCategoryToSeverity(selectedCategory);
    return threads.filter((t) => {
      const categories = (t.categories as string[]) || [];
      const severity = getSeverityCategory(
        categories,
        t.latestAlert?.effect ?? undefined,
        t.latestAlert?.header_text ?? undefined
      );
      return severity === targetSeverity;
    });
  }

  // Get active alerts (not resolved, not hidden)
  // For delays tab, exclude RSZ alerts (they're shown separately via RSZAlertCard)
  let activeAlerts = $derived.by(() => {
    const active = $threadsWithAlerts.filter(
      (t) => !t.is_resolved && !t.is_hidden
    );
    const filtered = filterByCategory(active);
    // When on delays tab, exclude RSZ alerts (they render separately)
    if (selectedCategory === "delays") {
      return filtered.filter((t) => !isRSZAlert(t));
    }
    return filtered;
  });

  // Get RSZ alerts (for delays tab) - using same isRSZAlert helper
  let rszAlerts = $derived.by(() => {
    if (selectedCategory !== "delays") return [];
    return $threadsWithAlerts.filter(
      (t) => !t.is_resolved && !t.is_hidden && isRSZAlert(t)
    );
  });

  // Get recently resolved alerts (last 6 hours) - only show under Disruptions tab
  // ONLY show alerts that have SERVICE_RESUMED category (properly threaded with Bluesky confirmation)
  // Exclude hidden, accessibility and RSZ alerts
  let recentlyResolved = $derived.by(() => {
    // Only show resolved section in disruptions tab
    if (selectedCategory !== "disruptions") return [];

    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    return $threadsWithAlerts.filter((t) => {
      // Must be resolved and not hidden
      if (!t.is_resolved || t.is_hidden || !t.resolved_at) return false;
      if (new Date(t.resolved_at).getTime() < sixHoursAgo) return false;

      // MUST have SERVICE_RESUMED category (properly confirmed by Bluesky)
      const categories = (t.categories as string[]) || [];
      if (!categories.includes("SERVICE_RESUMED")) return false;

      // Exclude RSZ alerts
      if (isRSZAlert(t)) return false;

      // Exclude orphaned SERVICE_RESUMED (no preceding DELAY/DISRUPTION)
      const onlyServiceResumed =
        categories.length === 1 && categories[0] === "SERVICE_RESUMED";
      const singleAlertThread = (t.alerts?.length || 0) === 1;
      if (onlyServiceResumed && singleAlertThread) return false;

      return true;
    });
  });

  // Count alerts by category
  let categoryCounts = $derived.by(() => {
    const active = $threadsWithAlerts.filter(
      (t) => !t.is_resolved && !t.is_hidden
    );

    // Debug: log all active threads to understand categorization
    console.log("=== DEBUG: Active threads ===");
    active.forEach((t) => {
      const categories = (t.categories as string[]) || [];
      const severity = getSeverityCategory(
        categories,
        t.latestAlert?.effect ?? undefined,
        t.latestAlert?.header_text ?? undefined
      );
      console.log(
        `Thread: ${t.title?.slice(0, 50)}... | Categories: ${categories.join(",")} | Effect: ${t.latestAlert?.effect} | Severity: ${severity}`
      );
    });

    return {
      disruptions: active.filter((t) => {
        const categories = (t.categories as string[]) || [];
        return (
          getSeverityCategory(
            categories,
            t.latestAlert?.effect ?? undefined,
            t.latestAlert?.header_text ?? undefined
          ) === "MAJOR"
        );
      }).length,
      delays: active.filter((t) => {
        const categories = (t.categories as string[]) || [];
        return (
          getSeverityCategory(
            categories,
            t.latestAlert?.effect ?? undefined,
            t.latestAlert?.header_text ?? undefined
          ) === "MINOR"
        );
      }).length,
      stationAlerts: active.filter((t) => {
        const categories = (t.categories as string[]) || [];
        return (
          getSeverityCategory(
            categories,
            t.latestAlert?.effect ?? undefined,
            t.latestAlert?.header_text ?? undefined
          ) === "ACCESSIBILITY"
        );
      }).length,
    };
  });

  // Get subway status for all lines - matching production behavior
  let subwayStatuses = $derived.by(() => {
    return SUBWAY_LINES.map((line) => {
      const allAlerts = getAllAlertsForLine(line.id);
      const hasMaintenance = getActiveMaintenanceForLine(line.id);

      // Filter out slowzone alerts from subway status cards
      // (slow zones are shown separately in the Slow Zones filter tab)
      const nonSlowzoneAlerts = allAlerts.filter(
        (alert) => getAlertStatusType(alert) !== "slowzone"
      );

      // Count total issues: non-slowzone alerts + active maintenance
      const alertCount = nonSlowzoneAlerts.length + (hasMaintenance ? 1 : 0);

      // Get unique alert types for display (e.g., ["disruption", "delay"])
      // Exclude slowzone from subway status cards
      const alertTypes = new Set<"delay" | "disruption" | "scheduled">();
      for (const alert of nonSlowzoneAlerts) {
        const type = getAlertStatusType(alert);
        if (type !== "slowzone") {
          alertTypes.add(type as "delay" | "disruption" | "scheduled");
        }
      }
      // Add scheduled if there's active maintenance
      if (hasMaintenance) {
        alertTypes.add("scheduled");
      }

      // Convert to array in priority order (disruption > delay > scheduled)
      const uniqueTypes: ("delay" | "disruption" | "scheduled")[] = [];
      if (alertTypes.has("disruption")) uniqueTypes.push("disruption");
      if (alertTypes.has("delay")) uniqueTypes.push("delay");
      if (alertTypes.has("scheduled")) uniqueTypes.push("scheduled");

      // Determine primary status (most severe) - no slowzone
      let status: "ok" | "delay" | "disruption" | "scheduled" = "ok";
      if (alertTypes.has("disruption")) status = "disruption";
      else if (alertTypes.has("delay")) status = "delay";
      else if (alertTypes.has("scheduled")) status = "scheduled";

      return {
        ...line,
        status,
        uniqueTypes,
        alertCount,
      };
    });
  });

  // Retry handler for failed fetches
  let isRetrying = $state(false);
  async function handleRetry() {
    isRetrying = true;
    await fetchAlerts();
    await fetchMaintenance();
    isRetrying = false;
  }

  onMount(() => {
    fetchAlerts();
    fetchMaintenance();
    const unsubscribe = subscribeToAlerts();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  });
</script>

<SEO
  title={$_("pages.alerts.title")}
  description="Live TTC service alerts - subway delays, bus detours, streetcar disruptions, and elevator outages. Real-time updates for Toronto transit riders."
/>

<Header />

<main class="alerts-v3-container">
  <!-- Visually hidden h1 for screen readers (WCAG 1.3.1 heading hierarchy) -->
  <h1 class="sr-only">{$_("pages.alerts.title").replace(" - rideTO", "")}</h1>

  <div class="alerts-main">
    <!-- Subway status grid - same UI for mobile and desktop -->
    <div class="subway-status-section">
      <SubwayStatusBar lines={subwayStatuses} />
    </div>

    <!-- Primary tabs: Now | Scheduled -->
    <div class="primary-tabs" role="tablist" aria-label="Alert timing">
      <button
        class="primary-tab"
        class:active={activeTab === "now"}
        role="tab"
        aria-selected={activeTab === "now"}
        onclick={() => setActiveTab("now")}
      >
        <Zap class="h-4 w-4" />
        {$_("alerts.tabs.now")}
      </button>
      <button
        class="primary-tab"
        class:active={activeTab === "planned"}
        role="tab"
        aria-selected={activeTab === "planned"}
        onclick={() => setActiveTab("planned")}
      >
        <Calendar class="h-4 w-4" />
        {$_("alerts.tabs.scheduled")}
      </button>
    </div>

    {#if activeTab === "now"}
      <!-- Aria-live region for screen reader announcements (WCAG 4.1.3) -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        {#if $isLoading}
          {$_("common.loading")}
        {:else if activeAlerts.length > 0}
          {activeAlerts.length}
          {selectedCategory} alert{activeAlerts.length === 1 ? "" : "s"} found
        {:else}
          {$_("alerts.noAlertsForCategory", {
            values: { category: selectedCategory },
          })}
        {/if}
      </div>

      <!-- Category filter: Disruptions | Delays | Station Alerts -->
      <CategoryFilterV3
        selected={selectedCategory}
        counts={categoryCounts}
        onSelect={(cat) => setCategory(cat)}
      />

      <!-- Loading state -->
      {#if $isLoading}
        <div class="loading-skeleton">
          <Skeleton class="h-24 w-full rounded-lg" />
          <Skeleton class="h-24 w-full rounded-lg" />
          <Skeleton class="h-24 w-full rounded-lg" />
        </div>
      {:else if $error}
        <div class="error-state">
          <div class="error-icon">
            <AlertTriangle class="h-8 w-8" />
          </div>
          <h3 class="error-title">{$_("alerts.error.title")}</h3>
          <p class="error-description">{$_("alerts.error.description")}</p>
          <Button
            variant="outline"
            onclick={handleRetry}
            disabled={isRetrying}
            class="gap-2"
          >
            <RefreshCw class="h-4 w-4 {isRetrying ? 'animate-spin' : ''}" />
            {isRetrying ? $_("common.refreshing") : $_("common.tryAgain")}
          </Button>
        </div>
      {:else}
        <!-- RSZ alerts (for delays tab) -->
        {#if selectedCategory === "delays" && rszAlerts.length > 0}
          <div class="rsz-section animate-fade-in-up">
            <RSZAlertCard threads={rszAlerts} />
          </div>
        {/if}

        <!-- Alert cards -->
        {#if activeAlerts.length > 0}
          <div class="alerts-list">
            {#each activeAlerts as thread, i (thread.thread_id)}
              <div
                class="animate-fade-in-up"
                style="animation-delay: {Math.min(i * 50, 300)}ms"
              >
                <AlertCard {thread} />
              </div>
            {/each}
          </div>
        {:else if selectedCategory !== "delays"}
          <div class="empty-state animate-fade-in-up">
            <div class="empty-icon">
              <CheckCircle class="h-8 w-8" />
            </div>
            <h3>{$_("emptyStates.allClear")}</h3>
            <p>
              {#if selectedCategory === "disruptions"}
                {$_("alerts.emptyDisruptions")}
              {:else}
                {$_("alerts.emptyElevators")}
              {/if}
            </p>
          </div>
        {/if}

        <!-- Recently resolved section - only show under Disruptions tab -->
        {#if selectedCategory === "disruptions"}
          <ResolvedSection alerts={recentlyResolved} />
        {/if}
      {/if}
    {:else}
      <!-- Scheduled content - closures and route changes -->
      <PlannedContent
        activeSubTab={scheduledSubtab}
        onSubtabChange={setScheduledSubtab}
      />
    {/if}

    <!-- TTC Attribution -->
    <div class="ttc-attribution">
      <span>{$_("alerts.attribution.dataFrom")}</span>
      {#if activeTab === "now" && selectedCategory === "delays"}
        <a
          href="https://www.ttc.ca/riding-the-ttc/Updates/Reduced-Speed-Zones"
          target="_blank"
          rel="noopener noreferrer"
        >
          {$_("alerts.attribution.ttcReducedSpeedZones")}
          <ExternalLink class="h-3 w-3" />
        </a>
      {:else if activeTab === "planned" && scheduledSubtab === "changes"}
        <a
          href="https://www.ttc.ca/service-advisories/Service-Changes"
          target="_blank"
          rel="noopener noreferrer"
        >
          {$_("alerts.attribution.ttcServiceChanges")}
          <ExternalLink class="h-3 w-3" />
        </a>
      {:else if activeTab === "planned" && scheduledSubtab === "closures"}
        <a
          href="https://www.ttc.ca/service-advisories/subway-service#e=0"
          target="_blank"
          rel="noopener noreferrer"
        >
          {$_("alerts.attribution.ttcSubwayServiceAdvisories")}
          <ExternalLink class="h-3 w-3" />
        </a>
      {:else}
        <a
          href="https://www.ttc.ca/service-alerts"
          target="_blank"
          rel="noopener noreferrer"
        >
          {$_("alerts.attribution.ttcServiceAlerts")}
          <ExternalLink class="h-3 w-3" />
        </a>
      {/if}
    </div>
  </div>
</main>

<style>
  .alerts-v3-container {
    display: flex;
    min-height: calc(100vh - 4rem);
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Main content area */
  .alerts-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 1rem;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px) + 4.5rem);
    max-width: 600px; /* Consistent with content-area */
    margin: 0 auto;
    width: 100%;
  }

  @media (min-width: 640px) {
    .alerts-main {
      padding: 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .alerts-main {
      padding-bottom: 1.5rem;
    }
  }

  /* Subway status section */
  .subway-status-section {
    margin-bottom: 1rem;
    width: 100%;
  }

  /* Primary tabs */
  .primary-tabs {
    display: flex;
    gap: 0;
    background-color: hsl(var(--muted));
    border-radius: calc(var(--radius) + 2px);
    padding: 0.25rem;
    margin-bottom: 1rem;
    width: 100%;
  }

  .primary-tab {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.625rem 1rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    background: transparent;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .primary-tab:hover:not(.active) {
    color: hsl(var(--foreground));
  }

  .primary-tab.active {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .primary-tab.active::after {
    content: "";
    position: absolute;
    bottom: -0.125rem;
    left: 50%;
    transform: translateX(-50%);
    width: 2rem;
    height: 2px;
    background: hsl(var(--primary));
    border-radius: 1px;
  }

  /* Loading skeleton */
  .loading-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Error state */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    border: 1px dashed hsl(var(--border));
    border-radius: var(--radius);
    background-color: hsl(var(--muted) / 0.3);
  }

  .error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 9999px;
    background-color: hsl(var(--destructive) / 0.1);
    color: hsl(var(--destructive));
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }

  .error-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-bottom: 1.5rem;
    max-width: 280px;
  }

  /* RSZ section */
  .rsz-section {
    margin-bottom: 1rem;
  }

  /* Alerts list */
  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
  }

  .empty-icon {
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(142 71% 45% / 0.15);
    border-radius: 9999px;
    margin-bottom: 1rem;
  }

  .empty-icon :global(svg) {
    color: hsl(142 71% 35%);
  }

  :global(.dark) .empty-icon {
    background-color: hsl(142 71% 45% / 0.2);
  }

  :global(.dark) .empty-icon :global(svg) {
    color: hsl(142 71% 55%);
  }

  .empty-state h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.25rem;
  }

  .empty-state p {
    font-size: 0.875rem;
  }

  /* TTC Attribution */
  .ttc-attribution {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 1rem 0;
    margin-top: 1.5rem;
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    border-top: 1px solid hsl(var(--border));
  }

  .ttc-attribution a {
    color: hsl(var(--primary));
    text-decoration: underline;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .ttc-attribution a:hover {
    text-decoration: underline;
    opacity: 0.9;
  }
</style>
