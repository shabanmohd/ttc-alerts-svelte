<script lang="ts">
  import type { TTCStop } from "$lib/data/stops-db";
  import type { DirectionLabel } from "$lib/data/stops-db";
  import RouteStopItem from "./RouteStopItem.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { MapPin } from "lucide-svelte";

  // Props
  let {
    stops = [],
    direction,
    isLoading = false,
    onGetETA,
    expandedStopId = null,
  }: {
    stops: TTCStop[];
    direction: DirectionLabel;
    isLoading?: boolean;
    onGetETA?: (stopId: string) => void;
    expandedStopId?: string | null;
  } = $props();
</script>

<div class="route-stops-list" role="list" aria-label="{direction} stops">
  {#if isLoading}
    <!-- Loading skeletons -->
    {#each Array(6) as _, i}
      <div
        class="stop-skeleton animate-fade-in"
        style="animation-delay: {Math.min(i * 50, 300)}ms"
      >
        <Skeleton class="h-5 w-5 rounded-full" />
        <div class="skeleton-content">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-3 w-1/4 mt-1" />
        </div>
        <Skeleton class="h-8 w-16 rounded-md" />
      </div>
    {/each}
  {:else if stops.length === 0}
    <!-- Empty state -->
    <div class="stops-empty animate-fade-in">
      <MapPin class="h-8 w-8 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">
        No stops found for this direction
      </p>
    </div>
  {:else}
    <!-- Stop items with staggered animation -->
    {#each stops as stop, i (stop.id)}
      <div
        class="animate-fade-in-up"
        style="animation-delay: {Math.min(i * 40, 400)}ms"
      >
        <RouteStopItem
          {stop}
          index={i + 1}
          isExpanded={expandedStopId === stop.id}
          {onGetETA}
        />
      </div>
    {/each}
  {/if}
</div>

<style>
  .route-stops-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stop-skeleton {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: hsl(var(--card));
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
  }

  .skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .stops-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    text-align: center;
  }
</style>
