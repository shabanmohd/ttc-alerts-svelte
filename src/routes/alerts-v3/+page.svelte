<script lang="ts">
  import { _ } from "svelte-i18n";
  import { onMount } from "svelte";
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

  // Tab state: "now" or "planned"
  let activeTab: "now" | "planned" = $state("now");

  // Category filter: "disruptions" | "delays" | "elevators"
  let selectedCategory: "disruptions" | "delays" | "elevators" =
    $state("disruptions");

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

  // Get subway status for each line
  function getSubwayStatus(lineId: string): "normal" | "delayed" | "disrupted" {
    const lineAlerts = $threadsWithAlerts.filter((t) => {
      const routes = t.affected_routes || [];
      return routes.includes(lineId) && !t.is_resolved;
    });

    if (lineAlerts.length === 0) return "normal";

    // Check for major disruptions
    const hasMajor = lineAlerts.some((t) => {
      const categories = (t.categories as string[]) || [];
      const severity = getSeverityCategory(
        categories,
        t.latestAlert?.effect ?? undefined,
        t.latestAlert?.header_text ?? undefined
      );
      return severity === "MAJOR";
    });

    if (hasMajor) return "disrupted";
    return "delayed";
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

  // Get active alerts (not resolved)
  let activeAlerts = $derived.by(() => {
    const active = $threadsWithAlerts.filter((t) => !t.is_resolved);
    return filterByCategory(active);
  });

  // Get RSZ alerts (for delays tab)
  let rszAlerts = $derived.by(() => {
    if (selectedCategory !== "delays") return [];
    return $threadsWithAlerts.filter((t) => {
      const header = t.latestAlert?.header_text?.toLowerCase() || "";
      return (
        !t.is_resolved &&
        (header.includes("slower than usual") ||
          header.includes("slow zone") ||
          header.includes("reduced speed"))
      );
    });
  });

  // Get recently resolved alerts (last 4 hours) - show all categories
  let recentlyResolved = $derived.by(() => {
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    return $threadsWithAlerts.filter((t) => {
      if (!t.is_resolved || !t.resolved_at) return false;
      return new Date(t.resolved_at).getTime() > fourHoursAgo;
    });
  });

  // Count alerts by category
  let categoryCounts = $derived.by(() => {
    const active = $threadsWithAlerts.filter((t) => !t.is_resolved);
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

  // Get subway status for all lines
  let subwayStatuses = $derived.by(() => {
    return SUBWAY_LINES.map((line) => ({
      ...line,
      status: getSubwayStatus(line.id),
    }));
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

    <!-- Primary tabs: Now | Planned -->
    <div class="primary-tabs" role="tablist" aria-label="Alert timing">
      <button
        class="primary-tab"
        class:active={activeTab === "now"}
        role="tab"
        aria-selected={activeTab === "now"}
        onclick={() => (activeTab = "now")}
      >
        Now
      </button>
      <button
        class="primary-tab"
        class:active={activeTab === "planned"}
        role="tab"
        aria-selected={activeTab === "planned"}
        onclick={() => (activeTab = "planned")}
      >
        Planned
      </button>
    </div>

    {#if activeTab === "now"}
      <!-- Category filter: Disruptions | Delays | Elevators -->
      <CategoryFilterV3
        selected={selectedCategory}
        counts={categoryCounts}
        onSelect={(cat) => (selectedCategory = cat)}
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
        {:else}
          <div class="empty-state">
            <div class="empty-icon">✓</div>
            <h3>All Clear</h3>
            <p>
              {#if selectedCategory === "disruptions"}
                No active service disruptions
              {:else if selectedCategory === "delays"}
                No delays or slow zones reported
              {:else}
                All elevators and escalators operational
              {/if}
            </p>
          </div>
        {/if}

        <!-- Recently resolved section - always show header -->
        <ResolvedSection alerts={recentlyResolved} />
      {/if}
    {:else}
      <!-- Planned content -->
      <PlannedContent maintenance={$maintenanceItems} />
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
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    background-color: hsl(142 71% 45% / 0.15);
    color: hsl(142 71% 35%);
    border-radius: 9999px;
    margin-bottom: 1rem;
  }

  :global(.dark) .empty-icon {
    background-color: hsl(142 71% 45% / 0.2);
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
