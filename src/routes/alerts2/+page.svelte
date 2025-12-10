<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { SearchX, Megaphone, CheckCircle, Calendar, AlertTriangle } from "lucide-svelte";
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
  } from "$lib/stores/alerts";
  import { isAuthenticated, userName, signOut } from "$lib/stores/auth";
  import { isVisible } from "$lib/stores/visibility";

  // Import dialogs
  import { HowToUseDialog, InstallPWADialog } from "$lib/components/dialogs";

  import type { ThreadWithAlerts } from "$lib/types/database";

  type AlertsTab = "active" | "resolved" | "scheduled";

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
    return r.startsWith("line") || r === "1" || r === "2" || r === "3" || r === "4" || r === "5" || r === "6";
  }

  // Helper: check if thread has SERVICE_RESUMED status
  function isResolved(thread: ThreadWithAlerts): boolean {
    // Check if the thread is marked as resolved
    if (thread.is_resolved) return true;
    
    // Check if the latest alert has SERVICE_RESUMED effect
    const effect = thread.latestAlert?.effect?.toUpperCase() || "";
    if (effect.includes("SERVICE_RESUMED") || effect.includes("RESUMED")) return true;
    
    // Check header text for "Service has resumed"
    const headerText = thread.latestAlert?.header_text?.toLowerCase() || "";
    if (headerText.includes("service has resumed") || headerText.includes("service resumed")) return true;
    
    return false;
  }

  // Helper: get routes from thread (combines thread routes and latest alert routes)
  function getThreadRoutes(thread: ThreadWithAlerts): string[] {
    const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
    const alertRoutes = Array.isArray(thread.latestAlert?.affected_routes) ? thread.latestAlert.affected_routes : [];
    return [...new Set([...threadRoutes, ...alertRoutes])];
  }

  // Derived: Active alerts (unresolved, sorted with subway first)
  let activeAlerts = $derived(() => {
    const unresolved = $threadsWithAlerts.filter(thread => !isResolved(thread));
    
    // Sort: subway lines first, then by date
    return unresolved.sort((a, b) => {
      const aRoutes = getThreadRoutes(a);
      const bRoutes = getThreadRoutes(b);
      const aIsSubway = aRoutes.some(r => isSubwayRoute(r));
      const bIsSubway = bRoutes.some(r => isSubwayRoute(r));
      
      // Subway first
      if (aIsSubway && !bIsSubway) return -1;
      if (!aIsSubway && bIsSubway) return 1;
      
      // Then by date (newest first)
      return new Date(b.latestAlert?.created_at || 0).getTime() - 
             new Date(a.latestAlert?.created_at || 0).getTime();
    });
  });

  // Derived: Resolved alerts (service resumed only)
  let resolvedAlerts = $derived(() => {
    return $threadsWithAlerts
      .filter(thread => isResolved(thread))
      .sort((a, b) => 
        new Date(b.latestAlert?.created_at || 0).getTime() - 
        new Date(a.latestAlert?.created_at || 0).getTime()
      );
  });

  // Derived: Filtered active alerts based on category filters
  let filteredActiveAlerts = $derived(() => {
    const active = activeAlerts();
    if ($activeFilters.has('ALL') || $activeFilters.size === 0) {
      return active;
    }
    
    return active.filter(thread => {
      const categories = Array.isArray(thread.latestAlert?.categories) 
        ? thread.latestAlert.categories 
        : [];
      return categories.some(cat => $activeFilters.has(cat));
    });
  });

  // Derived: Filtered resolved alerts based on category filters
  let filteredResolvedAlerts = $derived(() => {
    const resolved = resolvedAlerts();
    if ($activeFilters.has('ALL') || $activeFilters.size === 0) {
      return resolved;
    }
    
    return resolved.filter(thread => {
      const categories = Array.isArray(thread.latestAlert?.categories) 
        ? thread.latestAlert.categories 
        : [];
      return categories.some(cat => $activeFilters.has(cat));
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
    <!-- Filter Chips -->
    <div class="mb-4">
      <FilterChips />
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
      {:else if filteredActiveAlerts().length === 0}
        <div class="text-center py-12 text-muted-foreground">
          <CheckCircle class="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
          <p class="text-lg mb-2 font-medium">All clear!</p>
          <p class="text-sm">
            No active service disruptions right now.
          </p>
        </div>
      {:else}
        {#each filteredActiveAlerts() as thread, i (thread.thread_id)}
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
    <!-- Filter Chips -->
    <div class="mb-4">
      <FilterChips />
    </div>

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
</style>
