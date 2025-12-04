<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { cn } from '$lib/utils';
  
  let { category, class: className = '' }: { category: string; class?: string } = $props();
  
  /**
   * Get the appropriate CSS class for the status badge based on alert category.
   * Colors are WCAG 2.2 AA compliant with minimum 4.5:1 contrast ratio.
   */
  function getStatusClass(category: string): string {
    const cat = category.toUpperCase();
    
    switch (cat) {
      case 'SERVICE_RESUMED':
        return 'status-badge-resumed';
      case 'SERVICE_DISRUPTION':
        return 'status-badge-disruption';
      case 'DELAY':
        return 'status-badge-delay';
      case 'DETOUR':
        return 'status-badge-detour';
      case 'PLANNED_SERVICE_DISRUPTION':
      case 'PLANNED':
        return 'status-badge-planned';
      case 'BUS':
        return 'bg-secondary text-secondary-foreground';
      case 'STREETCAR':
        return 'bg-[#dc241f] text-white';
      case 'SUBWAY':
        return 'bg-[#ffcc00] text-black';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  }
  
  /**
   * Format the category string for display in the badge.
   */
  function formatCategory(category: string): string {
    const cat = category.toUpperCase();
    
    const categoryMap: Record<string, string> = {
      'SERVICE_RESUMED': 'Service Resumed',
      'SERVICE_DISRUPTION': 'Disruption',
      'DELAY': 'Delay',
      'DETOUR': 'Detour',
      'PLANNED_SERVICE_DISRUPTION': 'Planned',
      'PLANNED': 'Planned',
      'ACCESSIBILITY': 'Accessibility',
      'BUS': 'Bus',
      'STREETCAR': 'Streetcar',
      'SUBWAY': 'Subway',
      'OTHER': 'Other',
    };
    
    return categoryMap[cat] ?? category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<span 
  class={cn(
    'status-badge',
    getStatusClass(category),
    className
  )}
  role="status"
  aria-label={`Status: ${formatCategory(category)}`}
>
  {formatCategory(category)}
</span>
