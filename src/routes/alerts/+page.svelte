<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { SearchX, Megaphone, Ban } from "lucide-svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Header from "$lib/components/layout/Header.svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import FilterChips from "$lib/components/alerts/FilterChips.svelte";
  import ClosuresView from "$lib/components/alerts/ClosuresView.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Button } from "$lib/components/ui/button";
  import {
    filteredThreads,
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

  type AlertsTab = "active" | "closures";

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
  <!-- Active/Closures Tabs -->
  <div class="alerts-tabs" role="tablist" aria-label="Alert sections">
    <button
      role="tab"
      aria-selected={currentTab === "active"}
      class="alerts-tab"
      class:active={currentTab === "active"}
      onclick={() => handleTabClick("active")}
    >
      <Megaphone class="w-4 h-4" aria-hidden="true" />
      <span>Active</span>
    </button>
    <button
      role="tab"
      aria-selected={currentTab === "closures"}
      class="alerts-tab"
      class:active={currentTab === "closures"}
      onclick={() => handleTabClick("closures")}
    >
      <Ban class="w-4 h-4" aria-hidden="true" />
      <span>Closures</span>
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
      aria-label="Service alerts"
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
      {:else if $filteredThreads.length === 0}
        <div class="text-center py-12 text-muted-foreground">
          <SearchX class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p class="text-lg mb-2 font-medium">No alerts for this filter</p>
          {#if !$activeFilters.has("ALL")}
            <p class="text-sm">
              Try selecting a different filter or view all alerts
            </p>
          {/if}
        </div>
      {:else}
        {#each $filteredThreads as thread, i (thread.thread_id)}
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
  {:else}
    <!-- Closures Tab -->
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
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    border-radius: var(--radius);
    font-size: 0.875rem;
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
</style>
