<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import AlertCard from '$lib/components/alerts/AlertCard.svelte';
  import FilterChips from '$lib/components/alerts/FilterChips.svelte';
  import MaintenanceWidget from '$lib/components/alerts/MaintenanceWidget.svelte';
  import TabNavigation from '$lib/components/alerts/TabNavigation.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { 
    filteredThreads, 
    isLoading, 
    error, 
    fetchAlerts, 
    pollForUpdates,
    currentTab
  } from '$lib/stores/alerts';
  import { isAuthenticated, userName, signOut } from '$lib/stores/auth';
  import { routes as userRoutes } from '$lib/stores/preferences';
  
  // Import dialogs
  import { HowToUseDialog, SignInDialog, InstallPWADialog } from '$lib/components/dialogs';
  
  let activeDialog = $state<string | null>(null);
  let maintenanceItems = $state<any[]>([]);
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Derive "My Alerts" count based on user's selected routes
  const myAlertsCount = $derived.by(() => {
    if (!$isAuthenticated || !$userRoutes.length) return 0;
    
    return $filteredThreads.filter(thread => {
      const threadRoutes = thread.routes || thread.latestAlert?.routes || [];
      return threadRoutes.some((route: string) => $userRoutes.includes(route));
    }).length;
  });
  
  // Filter threads based on current tab
  const displayedThreads = $derived.by(() => {
    if ($currentTab === 'my' && $isAuthenticated && $userRoutes.length) {
      return $filteredThreads.filter(thread => {
        const threadRoutes = thread.routes || thread.latestAlert?.routes || [];
        return threadRoutes.some((route: string) => $userRoutes.includes(route));
      });
    }
    return $filteredThreads;
  });
  
  onMount(async () => {
    // Set up polling fallback (every 30s)
    pollingInterval = setInterval(() => {
      pollForUpdates();
    }, 30000);
    
    // TODO: Fetch maintenance items
    // maintenanceItems = await fetchMaintenanceItems();
  });
  
  onDestroy(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
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
  <!-- Tab Navigation -->
  <TabNavigation {myAlertsCount} />
  
  <!-- Filter Chips -->
  <div class="mb-4">
    <FilterChips />
  </div>
  
  <!-- Planned Maintenance Widget -->
  <MaintenanceWidget items={maintenanceItems} />
  
  <!-- Alert Cards -->
  <div class="space-y-3" id="alerts-container">
    {#if $isLoading}
      <!-- Loading skeletons -->
      {#each Array(3) as _}
        <div class="alert-card">
          <div class="alert-card-content">
            <div class="alert-card-header">
              <div class="alert-card-badges">
                <Skeleton class="h-6 w-16 rounded-md" />
                <Skeleton class="h-5 w-20 rounded-full" />
              </div>
              <Skeleton class="h-4 w-16" />
            </div>
            <Skeleton class="h-4 w-full mt-2" />
            <Skeleton class="h-4 w-3/4 mt-1" />
          </div>
        </div>
      {/each}
    {:else if $error}
      <div class="text-center py-12">
        <p class="text-[hsl(var(--destructive))] mb-4">{$error}</p>
        <button 
          onclick={() => fetchAlerts()}
          class="text-[hsl(var(--primary))] hover:underline"
        >
          Try again
        </button>
      </div>
    {:else if displayedThreads.length === 0}
      <div class="text-center py-12 text-[hsl(var(--muted-foreground))]">
        {#if $currentTab === 'my'}
          <p class="text-lg mb-2">No alerts for your routes</p>
          <p class="text-sm">Your selected routes have no current alerts</p>
          <a href="/preferences" class="text-[hsl(var(--primary))] hover:underline text-sm mt-2 inline-block">
            Update your routes →
          </a>
        {:else}
          <p class="text-lg mb-2">No alerts at this time</p>
          <p class="text-sm">All TTC services are running normally</p>
        {/if}
      </div>
    {:else}
      {#each displayedThreads as thread (thread.thread_id)}
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
