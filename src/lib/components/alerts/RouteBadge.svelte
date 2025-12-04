<script lang="ts">
  import { Check } from 'lucide-svelte';
  
  let { 
    route, 
    size = 'default',
    selectable = false,
    selected = false
  }: { 
    route: string; 
    size?: 'sm' | 'default';
    selectable?: boolean;
    selected?: boolean;
  } = $props();
  
  // Determine route type and style class
  function getRouteClass(route: string): string {
    const routeNum = parseInt(route);
    const routeLower = route.toLowerCase();
    
    // Subway lines
    if (routeLower === 'line 1' || routeLower === '1' || routeLower.includes('yonge')) {
      return 'route-line-1';
    }
    if (routeLower === 'line 2' || routeLower === '2' || routeLower.includes('bloor')) {
      return 'route-line-2';
    }
    if (routeLower === 'line 4' || routeLower === '4' || routeLower.includes('sheppard')) {
      return 'route-line-4';
    }
    
    // Night routes (300-series)
    if (routeNum >= 300 && routeNum < 400) {
      return 'route-night';
    }
    
    // Community routes (400-series)
    if (routeNum >= 400 && routeNum < 500) {
      return 'route-community';
    }
    
    // Streetcar routes (500-series)
    if (routeNum >= 500 && routeNum < 600) {
      // Limited service streetcars
      if (routeNum === 507 || routeNum === 508) {
        return 'route-limited';
      }
      return 'route-streetcar';
    }
    
    // Express routes (900-series)
    if (routeNum >= 900) {
      return 'route-express';
    }
    
    // Limited service buses
    const limitedBuses = [10, 99, 115, 119, 160, 162, 166, 167, 169];
    if (limitedBuses.includes(routeNum)) {
      return 'route-limited';
    }
    
    // Default: regular bus
    return 'route-bus';
  }
  
  function formatRoute(route: string): string {
    const routeLower = route.toLowerCase();
    
    // Format subway lines nicely
    if (routeLower === '1' || routeLower.includes('line 1')) return 'Line 1';
    if (routeLower === '2' || routeLower.includes('line 2')) return 'Line 2';
    if (routeLower === '4' || routeLower.includes('line 4')) return 'Line 4';
    
    return route;
  }
</script>

<span 
  class="route-badge {getRouteClass(route)}" 
  class:route-badge-sm={size === 'sm'}
  class:route-badge-selectable={selectable}
  class:selected={selectable && selected}
>
  {#if selectable}
    <span class="route-check">
      <Check class="check-icon" />
    </span>
  {/if}
  {formatRoute(route)}
</span>
