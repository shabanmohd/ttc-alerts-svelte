<script lang="ts">
  import { Bookmark, MapPin, ChevronRight, X } from 'lucide-svelte';
  import { savedStops, savedStopsCount } from '$lib/stores/savedStops';
  import RouteBadge from '$lib/components/alerts/RouteBadge.svelte';
  import { Button } from '$lib/components/ui/button';

  interface Props {
    onStopClick?: (stopId: string) => void;
    onViewAll?: () => void;
    maxDisplay?: number;
  }

  let { 
    onStopClick,
    onViewAll,
    maxDisplay = 3
  }: Props = $props();

  let stops = $state<typeof $savedStops>([]);
  let count = $state(0);

  // Subscribe to saved stops
  $effect(() => {
    const unsubscribeStops = savedStops.subscribe(value => {
      stops = value;
    });
    const unsubscribeCount = savedStopsCount.subscribe(value => {
      count = value;
    });
    return () => {
      unsubscribeStops();
      unsubscribeCount();
    };
  });

  function handleRemove(stopId: string, e: MouseEvent) {
    e.stopPropagation();
    savedStops.remove(stopId);
  }
</script>

{#if count > 0}
  <div class="rounded-lg border bg-card p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold flex items-center gap-2">
        <Bookmark class="h-4 w-4 text-amber-500" />
        My Stops
        <span class="text-xs text-muted-foreground font-normal">({count})</span>
      </h3>
      {#if count > maxDisplay && onViewAll}
        <Button variant="ghost" size="sm" onclick={onViewAll} class="text-xs">
          View all
          <ChevronRight class="h-3 w-3 ml-1" />
        </Button>
      {/if}
    </div>

    <div class="space-y-2">
      {#each stops.slice(0, maxDisplay) as stop (stop.id)}
        <div
          class="group flex w-full items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
        >
          <button
            type="button"
            onclick={() => onStopClick?.(stop.id)}
            class="flex items-start gap-3 text-left flex-1 min-w-0"
          >
            <MapPin class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{stop.name}</p>
              <div class="mt-1 flex flex-wrap gap-1">
                {#each stop.routes.slice(0, 4) as route}
                  <RouteBadge {route} size="sm" />
                {/each}
                {#if stop.routes.length > 4}
                  <span class="text-muted-foreground text-xs">+{stop.routes.length - 4}</span>
                {/if}
              </div>
            </div>
          </button>
          <button
            type="button"
            onclick={(e) => handleRemove(stop.id, e)}
            class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
            aria-label="Remove {stop.name} from bookmarks"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      {/each}
    </div>

    {#if count > maxDisplay}
      <p class="text-xs text-muted-foreground mt-2 text-center">
        +{count - maxDisplay} more saved stops
      </p>
    {/if}
  </div>
{:else}
  <!-- Empty state - optionally show prompt -->
  <div class="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
    <Bookmark class="h-8 w-8 text-muted-foreground mx-auto mb-2" />
    <p class="text-sm text-muted-foreground">No saved stops yet</p>
    <p class="text-xs text-muted-foreground mt-1">
      Search for a stop and tap the bookmark icon to save it
    </p>
  </div>
{/if}
