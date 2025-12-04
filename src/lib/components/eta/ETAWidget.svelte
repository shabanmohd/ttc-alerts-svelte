<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Clock, Plus, RefreshCw, AlertCircle } from 'lucide-svelte';
  import { bookmarks, bookmarkCount } from '$lib/stores/bookmarks';
  import { etaStore, etaList, isAnyLoading } from '$lib/stores/eta';
  import ETACard from './ETACard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  interface Props {
    onAddStop?: () => void;
    maxDisplay?: number;
    class?: string;
  }

  let { 
    onAddStop,
    maxDisplay = 5,
    class: className = ''
  }: Props = $props();

  let count = $state(0);
  let etas = $state<typeof $etaList>([]);
  let loading = $state(false);

  // Subscribe to stores
  $effect(() => {
    const unsubscribeCount = bookmarkCount.subscribe(value => {
      count = value;
    });
    const unsubscribeEtas = etaList.subscribe(value => {
      etas = value;
    });
    const unsubscribeLoading = isAnyLoading.subscribe(value => {
      loading = value;
    });
    return () => {
      unsubscribeCount();
      unsubscribeEtas();
      unsubscribeLoading();
    };
  });

  // Start auto-refresh when mounted
  onMount(() => {
    etaStore.startAutoRefresh();
  });

  // Stop auto-refresh when unmounted
  onDestroy(() => {
    etaStore.stopAutoRefresh();
  });

  function handleRefreshAll() {
    etaStore.refreshAll();
  }
</script>

{#if count > 0}
  <div class={cn('space-y-3', className)}>
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="font-semibold flex items-center gap-2">
        <Clock class="h-4 w-4 text-primary" />
        Live Arrivals
        {#if loading}
          <RefreshCw class="h-3 w-3 animate-spin text-muted-foreground" />
        {/if}
      </h2>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          class="h-8 text-xs"
          onclick={handleRefreshAll}
          disabled={loading}
        >
          <RefreshCw class={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
          Refresh
        </Button>
        {#if onAddStop}
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs"
            onclick={onAddStop}
          >
            <Plus class="h-3 w-3 mr-1" />
            Add Stop
          </Button>
        {/if}
      </div>
    </div>

    <!-- ETA Cards -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each etas.slice(0, maxDisplay) as eta (eta.stopId)}
        <ETACard {eta} />
      {/each}
    </div>

    {#if etas.length > maxDisplay}
      <p class="text-xs text-muted-foreground text-center">
        +{etas.length - maxDisplay} more stops
      </p>
    {/if}
  </div>
{:else}
  <!-- Empty State -->
  <div class={cn('rounded-lg border border-dashed bg-muted/30 p-6 text-center', className)}>
    <Clock class="h-10 w-10 text-muted-foreground mx-auto mb-3" />
    <h3 class="font-medium mb-1">No Saved Stops</h3>
    <p class="text-sm text-muted-foreground mb-4">
      Add stops to see live arrival times for your frequent routes
    </p>
    {#if onAddStop}
      <Button onclick={onAddStop} size="sm">
        <Plus class="h-4 w-4 mr-1" />
        Add Your First Stop
      </Button>
    {/if}
  </div>
{/if}
