<script lang="ts">
  import { RefreshCw, AlertCircle, Clock, X } from 'lucide-svelte';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { etaStore, type StopETA, type ETAPrediction } from '$lib/stores/eta';
  import RouteBadge from '$lib/components/alerts/RouteBadge.svelte';
  import ETABadge from './ETABadge.svelte';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  interface Props {
    eta: StopETA;
    compact?: boolean;
    showRemove?: boolean;
    class?: string;
  }

  let { 
    eta, 
    compact = false,
    showRemove = true,
    class: className = ''
  }: Props = $props();

  /**
   * Format the last updated time
   */
  function formatLastUpdated(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  /**
   * Group predictions by route for cleaner display
   */
  function groupByRoute(predictions: ETAPrediction[]): Map<string, ETAPrediction[]> {
    const grouped = new Map<string, ETAPrediction[]>();
    for (const pred of predictions) {
      const existing = grouped.get(pred.route) || [];
      existing.push(pred);
      grouped.set(pred.route, existing);
    }
    return grouped;
  }

  function handleRemove() {
    bookmarks.remove(eta.stopId);
  }

  function handleRefresh() {
    etaStore.refreshStop(eta.stopId);
  }

  let groupedPredictions = $derived(groupByRoute(eta.predictions));
  let lastUpdatedText = $derived(formatLastUpdated(eta.lastUpdated));
</script>

<div
  class={cn(
    'rounded-lg border bg-card overflow-hidden',
    eta.error && 'border-destructive/30',
    className
  )}
>
  <!-- Header -->
  <div class="flex items-center justify-between gap-2 p-3 bg-muted/30 border-b">
    <div class="min-w-0 flex-1">
      <h4 class="font-medium text-sm truncate">{eta.stopName}</h4>
      <p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
        <Clock class="h-3 w-3" />
        Updated {lastUpdatedText}
      </p>
    </div>
    <div class="flex items-center gap-1 flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        onclick={handleRefresh}
        disabled={eta.isLoading}
        aria-label="Refresh predictions"
      >
        <RefreshCw class={cn('h-3.5 w-3.5', eta.isLoading && 'animate-spin')} />
      </Button>
      {#if showRemove}
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground hover:text-destructive"
          onclick={handleRemove}
          aria-label="Remove stop"
        >
          <X class="h-3.5 w-3.5" />
        </Button>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="p-3">
    {#if eta.error}
      <!-- Error State -->
      <div class="flex items-center gap-2 text-destructive text-sm">
        <AlertCircle class="h-4 w-4 flex-shrink-0" />
        <span>{eta.error}</span>
      </div>
    {:else if eta.isLoading && eta.predictions.length === 0}
      <!-- Loading State (no cached data) -->
      <div class="space-y-3">
        {#each [1, 2] as _}
          <div class="animate-pulse">
            <div class="h-4 bg-muted rounded w-24 mb-2"></div>
            <div class="flex gap-2">
              <div class="h-6 bg-muted rounded w-14"></div>
              <div class="h-6 bg-muted rounded w-14"></div>
              <div class="h-6 bg-muted rounded w-14"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if eta.predictions.length === 0}
      <!-- No Predictions -->
      <p class="text-sm text-muted-foreground text-center py-2">
        No predictions available
      </p>
    {:else}
      <!-- Predictions -->
      <div class="space-y-3">
        {#each [...groupedPredictions] as [route, predictions] (route)}
          <div>
            <!-- Route header -->
            <div class="flex items-center gap-2 mb-1.5">
              <RouteBadge {route} size="sm" />
              <span class="text-xs text-muted-foreground truncate">
                {predictions[0]?.routeTitle || route}
              </span>
            </div>
            
            <!-- Directions -->
            <div class="space-y-1.5 ml-1">
              {#each predictions as pred (pred.direction)}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted-foreground w-24 truncate flex-shrink-0" title={pred.direction}>
                    {pred.direction.replace(/bound$/, '').trim()}
                  </span>
                  <div class="flex gap-1.5 flex-wrap">
                    {#each pred.arrivals as minutes, i (i)}
                      <ETABadge {minutes} size="sm" />
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
