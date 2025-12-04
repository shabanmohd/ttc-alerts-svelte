<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SearchX } from 'lucide-svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import AlertCard from '$lib/components/alerts/AlertCard.svelte';
  import FilterChips from '$lib/components/alerts/FilterChips.svelte';
  import MaintenanceWidget from '$lib/components/alerts/MaintenanceWidget.svelte';
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
  
  // Import dialogs
  import { HowToUseDialog, SignInDialog, InstallPWADialog } from '$lib/components/dialogs';
  
  let activeDialog = $state<string | null>(null);
  let unsubscribeRealtime: (() => void) | null = null;
  let maintenancePollingInterval: ReturnType<typeof setInterval> | null = null;
  
  onMount(async () => {
    // Initial data fetch
    await fetchAlerts();
    
    // Subscribe to Realtime updates (push-based, no polling!)
    unsubscribeRealtime = subscribeToAlerts();
    
    // Fetch maintenance items
    await fetchMaintenance();
    
    // Maintenance still uses polling (every 5 minutes) since it's not real-time critical
    maintenancePollingInterval = setInterval(() => {
      fetchMaintenance();
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
