<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { activeFilters, toggleFilter } from '$lib/stores/alerts';
  
  const filters = [
    { id: 'ALL', label: 'All' },
    { id: 'SERVICE_DISRUPTION', label: 'Disruption' },
    { id: 'SERVICE_RESUMED', label: 'Resumed' },
    { id: 'DELAY', label: 'Delay' },
    { id: 'DETOUR', label: 'Detour' },
    { id: 'PLANNED_SERVICE_DISRUPTION', label: 'Planned' }
  ];
</script>

<div class="flex gap-2 flex-wrap">
  {#each filters as filter}
    {@const isActive = $activeFilters.has(filter.id)}
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      class="rounded-full h-8 px-3 text-sm font-medium"
      onclick={() => toggleFilter(filter.id)}
    >
      {filter.label}
    </Button>
  {/each}
</div>
