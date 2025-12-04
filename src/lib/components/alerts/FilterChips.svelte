<script lang="ts">
  import { activeFilters, toggleFilter } from '$lib/stores/alerts';
  
  const filters = [
    { id: 'ALL', label: 'All' },
    { id: 'SERVICE_DISRUPTION', label: 'Service Disruption' },
    { id: 'SERVICE_RESUMED', label: 'Service Resumed' },
    { id: 'DELAY', label: 'Delay' },
    { id: 'DETOUR', label: 'Detour' },
    { id: 'PLANNED_SERVICE_DISRUPTION', label: 'Planned' }
  ];
</script>

<div class="flex flex-wrap gap-2">
  {#each filters as filter}
    {@const isActive = $activeFilters.has(filter.id)}
    <button
      class="filter-chip {isActive ? 'active' : ''}"
      data-filter={filter.id.toLowerCase()}
      onclick={() => toggleFilter(filter.id)}
    >
      {filter.label}
    </button>
  {/each}
</div>
