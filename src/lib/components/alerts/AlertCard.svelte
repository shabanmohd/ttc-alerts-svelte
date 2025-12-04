<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import RouteBadge from './RouteBadge.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import type { ThreadWithAlerts, Alert } from '$lib/types/database';
  
  let { thread }: { thread: ThreadWithAlerts } = $props();
  
  let showEarlierUpdates = $state(false);
  
  function formatTimestamp(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  function getPriorityClass(categories: string[]): string {
    if (categories.includes('SERVICE_RESUMED')) return 'alert-border-resumed';
    if (categories.includes('SERVICE_DISRUPTION')) return 'alert-border-high';
    if (categories.includes('DELAY')) return 'alert-border-medium';
    if (categories.includes('DETOUR')) return 'alert-border-medium';
    if (categories.includes('PLANNED_SERVICE_DISRUPTION')) return 'alert-border-info';
    return 'alert-border-low';
  }
  
  function getMainCategory(categories: string[]): string {
    const priority = ['SERVICE_RESUMED', 'SERVICE_DISRUPTION', 'DELAY', 'DETOUR', 'PLANNED_SERVICE_DISRUPTION'];
    for (const cat of priority) {
      if (categories.includes(cat)) return cat;
    }
    return categories[0] || 'OTHER';
  }
  
  const latestAlert = $derived(thread.latestAlert);
  const earlierAlerts = $derived(thread.alerts.slice(1));
  const routes = $derived(thread.routes || latestAlert?.routes || []);
  const categories = $derived(thread.categories || latestAlert?.categories || []);
</script>

<Card.Root class="overflow-hidden {getPriorityClass(categories)}">
  <Card.Content class="p-4">
    <!-- Header: Badges + Timestamp -->
    <div class="flex items-start justify-between gap-3 mb-2">
      <div class="flex items-center gap-2 flex-wrap">
        {#each routes.slice(0, 3) as route}
          <RouteBadge {route} size="sm" />
        {/each}
        {#if routes.length > 3}
          <span class="text-xs text-muted-foreground">+{routes.length - 3} more</span>
        {/if}
        <StatusBadge category={getMainCategory(categories)} />
      </div>
      <span class="text-xs text-muted-foreground whitespace-nowrap">
        {formatTimestamp(latestAlert?.created_at || '')}
      </span>
    </div>
    
    <!-- Alert Text -->
    <p class="text-sm leading-relaxed">
      {latestAlert?.header_text || ''}
    </p>
  </Card.Content>
  
  <!-- Earlier Updates -->
  {#if earlierAlerts.length > 0}
    <div class="border-t border-border">
      <Button
        variant="ghost"
        class="w-full flex items-center justify-between px-4 py-3 h-auto text-sm text-muted-foreground hover:text-foreground"
        onclick={() => showEarlierUpdates = !showEarlierUpdates}
      >
        <span>{earlierAlerts.length} earlier update{earlierAlerts.length > 1 ? 's' : ''}</span>
        <ChevronDown class="h-4 w-4 transition-transform {showEarlierUpdates ? 'rotate-180' : ''}" />
      </Button>
      
      {#if showEarlierUpdates}
        <div class="border-t border-border">
          {#each earlierAlerts as alert, i}
            <div class="px-4 py-3 {i > 0 ? 'border-t border-border' : ''}">
              <div class="flex items-center gap-2 mb-1">
                <StatusBadge category={getMainCategory(alert.categories)} />
                <span class="text-xs text-muted-foreground">
                  {formatTimestamp(alert.created_at)}
                </span>
              </div>
              <p class="text-sm text-muted-foreground">
                {alert.header_text}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</Card.Root>
