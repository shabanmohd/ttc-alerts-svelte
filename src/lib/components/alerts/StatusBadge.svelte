<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  
  let { category }: { category: string } = $props();
  
  function getStatusClass(category: string): string {
    const cat = category.toUpperCase();
    
    if (cat === 'SERVICE_RESUMED') return 'status-badge-resumed';
    if (cat === 'SERVICE_DISRUPTION') return 'status-badge-disruption';
    if (cat === 'DELAY') return 'status-badge-delay';
    if (cat === 'DETOUR') return 'status-badge-detour';
    if (cat === 'PLANNED_SERVICE_DISRUPTION') return 'status-badge-planned';
    
    return '';
  }
  
  function formatCategory(category: string): string {
    const cat = category.toUpperCase();
    
    if (cat === 'SERVICE_RESUMED') return 'Service Resumed';
    if (cat === 'SERVICE_DISRUPTION') return 'Disruption';
    if (cat === 'DELAY') return 'Delay';
    if (cat === 'DETOUR') return 'Detour';
    if (cat === 'PLANNED_SERVICE_DISRUPTION') return 'Planned';
    if (cat === 'ACCESSIBILITY') return 'Accessibility';
    
    return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<Badge variant="secondary" class="rounded-full text-xs font-medium {getStatusClass(category)}">
  {formatCategory(category)}
</Badge>
