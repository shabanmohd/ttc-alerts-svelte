<script lang="ts">
  import { _ } from "svelte-i18n";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import { Zap, Calendar, CheckCircle } from "lucide-svelte";
  import Header from "$lib/components/layout/Header.svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import RSZAlertCard from "$lib/components/alerts/RSZAlertCard.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
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
  const URL_TO_CATEGORY: Record<string, "disruptions" | "delays" | "elevators"> = {
    disruptions: "disruptions",
    slowzones: "delays",
    elevators: "elevators",
  };
  const CATEGORY_TO_URL: Record<"disruptions" | "delays" | "elevators", string> = {
    disruptions: "disruptions",
    delays: "slowzones",
    elevators: "elevators",
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

  function getInitialCategory(): "disruptions" | "delays" | "elevators" {
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

  // Category filter: "disruptions" | "delays" | "elevators" - initialized from URL params
  let selectedCategory: "disruptions" | "delays" | "elevators" =
    $state(getInitialCategory());

  // Subtab for Scheduled tab: "closures" | "changes" - initialized from URL params
  let scheduledSubtab: "closures" | "changes" = $state(getInitialSubtab());

  // Update URL when state changes (shallow navigation without full reload)
  function updateUrl(
    tab: "now" | "planned",
    category: "disruptions" | "delays" | "elevators",
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
  function setCategory(cat: "disruptions" | "delays" | "elevators") {
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
      case "elevators":
        return "ACCESSIBILITY";
    }
  }

  // Helper: Check if a thread is an RSZ (Reduced Speed Zone) alert
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
      elevators: active.filter((t) => {
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

      // Count total issues: alerts + active maintenance
      const alertCount = allAlerts.length + (hasMaintenance ? 1 : 0);

      // Get unique alert types for display (e.g., ["disruption", "slowzone"])
      const alertTypes = new Set<
        "slowzone" | "delay" | "disruption" | "scheduled"
      >();
      for (const alert of allAlerts) {
        alertTypes.add(getAlertStatusType(alert));
      }
      // Add scheduled if there's active maintenance
      if (hasMaintenance) {
        alertTypes.add("scheduled");
      }

      // Convert to array in priority order (disruption > delay > scheduled > slowzone)
      const uniqueTypes: ("slowzone" | "delay" | "disruption" | "scheduled")[] =
        [];
      if (alertTypes.has("disruption")) uniqueTypes.push("disruption");
      if (alertTypes.has("delay")) uniqueTypes.push("delay");
      if (alertTypes.has("scheduled")) uniqueTypes.push("scheduled");
      if (alertTypes.has("slowzone")) uniqueTypes.push("slowzone");

      // Determine primary status (most severe)
      let status: "ok" | "slowzone" | "delay" | "disruption" | "scheduled" =
        "ok";
      if (alertTypes.has("disruption")) status = "disruption";
      else if (alertTypes.has("delay")) status = "delay";
      else if (alertTypes.has("scheduled")) status = "scheduled";
      else if (alertTypes.has("slowzone")) status = "slowzone";

      return {
        ...line,
        status,
        uniqueTypes,
        alertCount,
      };
    });
  });

  onMount(() => {
    fetchAlerts();
    fetchMaintenance();
    const unsubscribe = subscribeToAlerts();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  });
</script>

<svelte:head>
  <title>Alerts v3 - TTC Service Alerts</title>
</svelte:head>

<Header />

<main class="alerts-v3-container">
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
        Now
      </button>
      <button
        class="primary-tab"
        class:active={activeTab === "planned"}
        role="tab"
        aria-selected={activeTab === "planned"}
        onclick={() => setActiveTab("planned")}
      >
        <Calendar class="h-4 w-4" />
        Scheduled
      </button>
    </div>

    {#if activeTab === "now"}
      <!-- Category filter: Disruptions | Delays | Elevators -->
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
        <div class="error-message">
          <p>Unable to load alerts. Please try again.</p>
        </div>
      {:else}
        <!-- RSZ alerts (for delays tab) -->
        {#if selectedCategory === "delays" && rszAlerts.length > 0}
          <div class="rsz-section">
            <RSZAlertCard threads={rszAlerts} />
          </div>
        {/if}

        <!-- Alert cards -->
        {#if activeAlerts.length > 0}
          <div class="alerts-list">
            {#each activeAlerts as thread (thread.thread_id)}
              <AlertCard {thread} />
            {/each}
          </div>
        {:else if selectedCategory !== "delays"}
          <div class="empty-state">
            <div class="empty-icon">
              <CheckCircle class="h-8 w-8" />
            </div>
            <h3>All Clear</h3>
            <p>
              {#if selectedCategory === "disruptions"}
                No active service disruptions and delays at this time
              {:else}
                All elevators and escalators operational
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
    min-width: 0;
    padding: 1rem;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px) + 4.5rem);
    max-width: 576px;
    margin: 0 auto;
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
  }

  /* Primary tabs */
  .primary-tabs {
    display: flex;
    gap: 0;
    background-color: hsl(var(--muted));
    border-radius: calc(var(--radius) + 2px);
    padding: 0.25rem;
    margin-bottom: 1rem;
  }

  .primary-tab {
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

  /* Loading skeleton */
  .loading-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Error message */
  .error-message {
    padding: 2rem;
    text-align: center;
    color: hsl(var(--destructive));
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
</style>
