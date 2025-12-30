<script lang="ts">
  import type { TTCStop } from "$lib/data/stops-db";
  import type { DirectionLabel } from "$lib/data/stops-db";
  import RouteStopItem from "./RouteStopItem.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { MapPin, Search, X } from "lucide-svelte";
  import { _ } from "svelte-i18n";

  // Props
  let {
    stops = [],
    direction,
    isLoading = false,
    onGetETA,
    expandedStopId = null,
    routeFilter,
    showInlineETA = false,
  }: {
    stops: TTCStop[];
    direction: DirectionLabel;
    isLoading?: boolean;
    onGetETA?: (stopId: string) => void;
    expandedStopId?: string | null;
    routeFilter?: string;
    showInlineETA?: boolean;
  } = $props();

  // Search filter state
  let searchQuery = $state("");

  // Filter stops based on search query
  let filteredStops = $derived(() => {
    if (!searchQuery.trim()) return stops;
    const query = searchQuery.toLowerCase().trim();
    return stops.filter(
      (stop) =>
        stop.name.toLowerCase().includes(query) ||
        stop.id.toLowerCase().includes(query)
    );
  });

  function clearSearch() {
    searchQuery = "";
  }
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
    <!-- Search bar for filtering stops -->
    <div class="stops-search-container">
      <div class="stops-search-input-wrapper">
        <Search class="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={$_("search.filterStops")}
          class="stops-search-input"
          aria-label={$_("search.filterStops")}
        />
        {#if searchQuery}
          <button
            type="button"
            class="stops-search-clear"
            onclick={clearSearch}
            aria-label={$_("common.clear")}
          >
            <X class="h-4 w-4" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Stop items with staggered animation -->
    {#each filteredStops() as stop, i (stop.id)}
      <div
        class="animate-fade-in-up"
        style="animation-delay: {Math.min(i * 40, 400)}ms"
      >
        <RouteStopItem
          {stop}
          index={i + 1}
          isExpanded={expandedStopId === stop.id}
          {onGetETA}
          {routeFilter}
          {showInlineETA}
        />
      </div>
    {:else}
      <div class="stops-empty animate-fade-in">
        <Search class="h-8 w-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">
          {$_("search.noStopsMatch")}
        </p>
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

  .stops-search-container {
    margin-bottom: 0.75rem;
  }

  .stops-search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: hsl(var(--muted) / 0.5);
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .stops-search-input-wrapper:focus-within {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1);
  }

  .stops-search-input {
    flex: 1;
    border: none;
    background: transparent;
    /* Use 16px to prevent iOS auto-zoom on focus */
    font-size: 1rem;
    color: hsl(var(--foreground));
    outline: none;
  }

  .stops-search-input::placeholder {
    color: hsl(var(--muted-foreground));
  }

  .stops-search-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border-radius: var(--radius);
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition:
      color 0.2s,
      background-color 0.2s;
  }

  .stops-search-clear:hover {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted));
  }
</style>
