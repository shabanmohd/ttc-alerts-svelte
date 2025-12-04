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

<div 
  class="flex flex-wrap gap-2" 
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
