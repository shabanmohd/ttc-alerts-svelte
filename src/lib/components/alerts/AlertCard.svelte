<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
  import RouteBadge from './RouteBadge.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import { cn } from '$lib/utils';
  import type { ThreadWithAlerts, Alert } from '$lib/types/database';
  
  let { thread }: { thread: ThreadWithAlerts } = $props();
  
  let showEarlierUpdates = $state(false);
  
  /**
   * Format timestamp for display with relative time.
   */
  function formatTimestamp(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 0) return 'Just now';
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  /**
   * Get the main category from categories array for display priority.
   */
  function getMainCategory(categories: unknown): string {
    const cats = parseJsonArray(categories);
    // Priority order for display
    const priority = ['SERVICE_DISRUPTION', 'DETOUR', 'DELAY', 'SERVICE_RESUMED', 'PLANNED_SERVICE_DISRUPTION'];
    for (const cat of priority) {
      if (cats.includes(cat)) return cat;
    }
    return cats[0] || 'OTHER';
  }
  
  /**
   * Parse potentially double-encoded JSON arrays.
   */
  function parseJsonArray(data: unknown): string[] {
    if (!data) return [];
    if (Array.isArray(data)) return data as string[];
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed as string[];
      } catch {
        // Not valid JSON
      }
    }
    return [];
  }
  
  /**
   * Extract route name from header text (e.g., "306 Carlton: Detour..." -> "306 Carlton")
   */
  function extractRouteName(headerText: string, routeNumber: string): string {
    if (!headerText) return routeNumber;
    
    // Handle "Line X" subway routes - extract "Line X Yonge-University" format
    if (routeNumber.toLowerCase().startsWith('line')) {
      // Match "Line 1 Yonge-University" or similar - stop at ":" or " Regular" or " Delays"
      const lineMatch = headerText.match(/^(Line \d+[^:]+?)(?::|[\s]+Regular|[\s]+Delays|[\s]+No\s)/i);
      if (lineMatch) {
        // Clean up - remove trailing words like "Regular", "service", etc.
        let lineName = lineMatch[1].trim();
        lineName = lineName.replace(/\s+(Regular|service|has|resumed|between).*$/i, '').trim();
        return lineName;
      }
      // Fallback for Line routes
      const simpleMatch = headerText.match(/(Line \d+\s*[A-Za-z-]*)/i);
      if (simpleMatch) return simpleMatch[1].trim();
      return routeNumber;
    }
    
    // Try to match pattern like "306 Carlton:" or "306 Carlton Regular"
    const patterns = [
      new RegExp(`^(${routeNumber}\\s+[A-Za-z][A-Za-z-]+)(?::|\\s+Regular|\\s+Detour|\\s+Delay)`, 'i'),
      new RegExp(`^(${routeNumber}\\s+[A-Za-z][A-Za-z-]+\\s+[A-Za-z-]+)(?::|\\s+Regular)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = headerText.match(pattern);
      if (match) return match[1].trim();
    }
    
    // Fallback: just return the route number
    return routeNumber;
  }
  
  const latestAlert = $derived(thread.latestAlert);
  const earlierAlerts = $derived(thread.alerts.slice(1));
  const rawRoutes = $derived(
    parseJsonArray(latestAlert?.affected_routes) || 
    parseJsonArray(thread.affected_routes) || 
    []
  );
  // Extract full route names from header text
  const routes = $derived(
    rawRoutes.map(route => extractRouteName(latestAlert?.header_text || '', route))
  );
  const categories = $derived(
    parseJsonArray(latestAlert?.categories) || 
    parseJsonArray(thread.categories) || 
    []
  );
  
  const cardId = $derived(`alert-${thread.thread_id}`);
</script>

<article 
  class="alert-card" 
  id={cardId}
  aria-labelledby="{cardId}-title"
>
  <div class="alert-card-content">
    <!-- Header: Badges + Timestamp -->
    <div class="alert-card-header">
      <div class="alert-card-badges">
        {#each routes.slice(0, 3) as route}
          <RouteBadge {route} size="sm" />
        {/each}
        {#if routes.length > 3}
          <span class="text-xs text-muted-foreground">+{routes.length - 3} more</span>
        {/if}
        <StatusBadge category={getMainCategory(categories)} />
      </div>
      <time 
        class="alert-card-timestamp" 
        datetime={latestAlert?.created_at || ''}
      >
        {formatTimestamp(latestAlert?.created_at || '')}
      </time>
    </div>
    
    <!-- Description (showing header_text as description per reference UI) -->
    <p 
      class="alert-card-description" 
      id="{cardId}-title"
    >
      {latestAlert?.description_text || latestAlert?.header_text || ''}
    </p>
  </div>
  
  <!-- Earlier Updates -->
  {#if earlierAlerts.length > 0}
    <button
      class="earlier-updates-toggle"
      onclick={() => showEarlierUpdates = !showEarlierUpdates}
      aria-expanded={showEarlierUpdates}
      aria-controls="{cardId}-updates"
      type="button"
    >
      <span>{earlierAlerts.length} earlier update{earlierAlerts.length > 1 ? 's' : ''}</span>
      <ChevronDown 
        class={cn(
          'h-4 w-4 transition-transform duration-200',
          showEarlierUpdates && 'rotate-180'
        )} 
        aria-hidden="true"
      />
    </button>
    
    {#if showEarlierUpdates}
      <div class="earlier-updates-content" id="{cardId}-updates">
        {#each earlierAlerts as alert, i}
          <div class="earlier-update-item">
            <div class="flex justify-between items-start mb-1.5">
              <StatusBadge category={getMainCategory(alert.categories)} />
              <time 
                class="text-xs text-muted-foreground"
                datetime={alert.created_at}
              >
                {formatTimestamp(alert.created_at)}
              </time>
            </div>
            <p class="text-sm leading-relaxed text-muted-foreground">
              {alert.header_text}
            </p>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</article>
