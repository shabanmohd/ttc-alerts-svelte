<script lang="ts">
  import { activeFilters, toggleFilter } from '$lib/stores/alerts';
  import { cn } from '$lib/utils';
  
  /**
   * Filter configuration with accessible labels.
   * Single source of truth for all alert type filters.
   */
  const filters = [
    { id: 'ALL', label: 'All', ariaLabel: 'Show all alerts' },
    { id: 'SERVICE_DISRUPTION', label: 'Disruption', ariaLabel: 'Filter by service disruptions' },
    { id: 'SERVICE_RESUMED', label: 'Resumed', ariaLabel: 'Filter by resumed services' },
    { id: 'DELAY', label: 'Delay', ariaLabel: 'Filter by delays' },
    { id: 'DETOUR', label: 'Detour', ariaLabel: 'Filter by detours' }
  ] as const;
</script>

<div class="filter-chips-container">
  <div 
    class="filter-chips-scroll" 
    role="group" 
    aria-label="Filter alerts by type"
  >
    {#each filters as filter}
      {@const isActive = $activeFilters.has(filter.id)}
      <button
        class={cn(
          'filter-chip',
          isActive && 'active'
        )}
        data-filter={filter.id.toLowerCase()}
        onclick={() => toggleFilter(filter.id)}
        aria-pressed={isActive}
        aria-label={filter.ariaLabel}
        type="button"
      >
        {filter.label}
      </button>
    {/each}
  </div>
  <div class="filter-chips-fade" aria-hidden="true"></div>
</div>

<style>
  .filter-chips-container {
    position: relative;
  }
  
  .filter-chips-scroll {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  
  .filter-chips-scroll::-webkit-scrollbar {
    display: none;
  }
  
  /* Fade indicator on mobile */
  .filter-chips-fade {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0.25rem;
    width: 2rem;
    pointer-events: none;
    background: linear-gradient(to right, transparent, hsl(var(--background)));
  }
  
  /* Desktop: wrap instead of scroll, hide fade */
  @media (min-width: 768px) {
    .filter-chips-scroll {
      flex-wrap: wrap;
      overflow-x: visible;
    }
    
    .filter-chips-fade {
      display: none;
    }
  }
</style>
