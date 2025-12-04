<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import Header from '$lib/components/layout/Header.svelte';
  import AlertCard from '$lib/components/alerts/AlertCard.svelte';
  import FilterChips from '$lib/components/alerts/FilterChips.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Tabs from '$lib/components/ui/tabs';
  import { 
    filteredThreads, 
    isLoading, 
    error, 
    fetchAlerts, 
    subscribeToAlerts,
    pollForUpdates,
    currentTab
  } from '$lib/stores/alerts';
  
  let activeDialog = $state<string | null>(null);
  let isAuthenticated = $state(false);
  let username = $state('');
  
  let realtimeUnsubscribe: (() => void) | null = null;
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Sync tab from URL
  $effect(() => {
    const tab = $page.url.searchParams.get('tab');
    currentTab.set(tab === 'my' ? 'my' : 'all');
  });
  
  onMount(async () => {
    // Initial fetch
    await fetchAlerts();
    
    // Set up Realtime subscription
    realtimeUnsubscribe = subscribeToAlerts();
    
    // Set up polling fallback (every 30s)
    pollingInterval = setInterval(() => {
      pollForUpdates();
    }, 30000);
  });
  
  onDestroy(() => {
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
    }
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
  
  function handleSignOut() {
    isAuthenticated = false;
    username = '';
  }
</script>

<svelte:head>
  <title>TTC Service Alerts</title>
  <meta name="description" content="Real-time TTC transit service alerts for Toronto" />
</svelte:head>

<Header 
  {isAuthenticated}
  {username}
  onOpenDialog={handleOpenDialog}
  onSignIn={handleSignIn}
  onSignOut={handleSignOut}
/>

<main class="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
  <!-- Tabs -->
  <Tabs.Root value={$currentTab} class="mb-6">
    <Tabs.List class="grid w-full grid-cols-2">
      <Tabs.Trigger value="all" onclick={() => currentTab.set('all')}>
        All Alerts
      </Tabs.Trigger>
      <Tabs.Trigger value="my" onclick={() => currentTab.set('my')}>
        My Alerts
      </Tabs.Trigger>
    </Tabs.List>
  </Tabs.Root>
  
  <!-- Filters -->
  <div class="mb-6">
    <FilterChips />
  </div>
  
  <!-- Alert List -->
  <div class="space-y-4">
    {#if $isLoading}
      <!-- Loading skeletons -->
      {#each Array(3) as _}
        <div class="rounded-lg border border-border p-4 space-y-3">
          <div class="flex items-center gap-2">
            <Skeleton class="h-6 w-16 rounded-md" />
            <Skeleton class="h-5 w-20 rounded-full" />
          </div>
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-3/4" />
        </div>
      {/each}
    {:else if $error}
      <div class="text-center py-12">
        <p class="text-destructive mb-4">{$error}</p>
        <button 
          onclick={() => fetchAlerts()}
          class="text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    {:else if $filteredThreads.length === 0}
      <div class="text-center py-12 text-muted-foreground">
        <p class="text-lg mb-2">No alerts at this time</p>
        <p class="text-sm">All TTC services are running normally</p>
      </div>
    {:else}
      {#each $filteredThreads as thread (thread.thread_id)}
        <AlertCard {thread} />
      {/each}
    {/if}
  </div>
</main>
