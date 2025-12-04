<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SearchX } from 'lucide-svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import AlertCard from '$lib/components/alerts/AlertCard.svelte';
  import FilterChips from '$lib/components/alerts/FilterChips.svelte';
  import MaintenanceWidget from '$lib/components/alerts/MaintenanceWidget.svelte';
  import ETAWidget from '$lib/components/eta/ETAWidget.svelte';
  import StopSearch from '$lib/components/stops/StopSearch.svelte';
  import WeatherWarningBanner from '$lib/components/weather/WeatherWarningBanner.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Button } from '$lib/components/ui/button';
  import { 
    filteredThreads, 
    isLoading, 
    error, 
    fetchAlerts, 
    subscribeToAlerts,
    fetchMaintenance,
    maintenanceItems,
    activeFilters,
    isConnected
  } from '$lib/stores/alerts';
  import { isAuthenticated, userName, signOut } from '$lib/stores/auth';
  import { isVisible } from '$lib/stores/visibility';
  import { bookmarks } from '$lib/stores/bookmarks';
  import type { TTCStop } from '$lib/data/stops-db';
  
  // Import dialogs
  import { HowToUseDialog, SignInDialog, InstallPWADialog } from '$lib/components/dialogs';
  
  let activeDialog = $state<string | null>(null);
  let showStopSearch = $state(false);
  let unsubscribeRealtime: (() => void) | null = null;
  let maintenancePollingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Track visibility for polling control
  let wasHiddenTooLong = false;
  let hiddenSince: number | null = null;
  const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  
  // React to visibility changes
  $effect(() => {
    if ($isVisible) {
      // Coming back to foreground
      if (hiddenSince && Date.now() - hiddenSince > STALE_THRESHOLD) {
        // Data might be stale, refresh
        console.log('[Visibility] Tab was hidden for too long, refreshing data...');
        fetchAlerts();
        fetchMaintenance();
      }
      hiddenSince = null;
    } else {
      // Going to background
      hiddenSince = Date.now();
    }
  });
  
  onMount(async () => {
    // Initial data fetch
    await fetchAlerts();
    
    // Subscribe to Realtime updates (push-based, no polling!)
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
    // Clean up Realtime subscription
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
  
  function handleSignIn() {
    activeDialog = 'sign-in';
  }
  
  async function handleSignOut() {
    await signOut();
  }

  function handleAddStop() {
    showStopSearch = true;
  }

  function handleStopSelect(stop: TTCStop) {
    bookmarks.add(stop);
    showStopSearch = false;
  }
</script>

<svelte:head>
  <title>TTC Service Alerts</title>
  <meta name="description" content="Real-time TTC transit service alerts for Toronto" />
</svelte:head>

<Header 
  isAuthenticated={$isAuthenticated}
  username={$userName || ''}
  onOpenDialog={handleOpenDialog}
  onSignIn={handleSignIn}
  onSignOut={handleSignOut}
/>

<main class="content-area">
  <!-- Stop Search Overlay -->
  {#if showStopSearch}
    <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
      <div class="w-full max-w-lg bg-card rounded-lg border shadow-lg">
        <StopSearch 
          onSelect={handleStopSelect} 
          onClose={() => showStopSearch = false}
        />
      </div>
    </div>
  {/if}

  <!-- Weather Warnings - Transit-relevant alerts from Environment Canada -->
  <WeatherWarningBanner />

  <!-- ETA Widget - Live Arrivals for Bookmarked Stops -->
  <div class="mb-4">
    <ETAWidget onAddStop={handleAddStop} />
  </div>

  <!-- Planned Maintenance Widget -->
  <div class="mb-4">
    <MaintenanceWidget items={$maintenanceItems} />
  </div>
  
  <!-- Filter Chips -->
  <div class="mb-4">
    <FilterChips />
  </div>
  
  <!-- Alert Cards -->
  <div class="space-y-3" id="alerts-container" role="feed" aria-label="Service alerts">
    {#if $isLoading}
      <!-- Loading skeletons -->
      {#each Array(3) as _, i}
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
      <span class="sr-only">Loading alerts...</span>
    {:else if $error}
      <div class="text-center py-12" role="alert">
        <p class="text-destructive mb-4">{$error}</p>
        <Button 
          variant="link"
          onclick={() => fetchAlerts()}
        >
          Try again
        </Button>
      </div>
    {:else if $filteredThreads.length === 0}
      <div class="text-center py-12 text-muted-foreground">
        <SearchX class="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p class="text-lg mb-2 font-medium">No alerts for this filter</p>
        {#if !$activeFilters.has('ALL')}
          <p class="text-sm">Try selecting a different filter or view all alerts</p>
        {/if}
      </div>
    {:else}
      {#each $filteredThreads as thread (thread.thread_id)}
        <AlertCard {thread} />
      {/each}
    {/if}
  </div>
</main>

<!-- Dialogs -->
<HowToUseDialog 
  open={activeDialog === 'how-to-use'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }} 
/>

<SignInDialog 
  open={activeDialog === 'sign-in'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }}
/>

<InstallPWADialog 
  open={activeDialog === 'install-pwa'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }} 
/>
