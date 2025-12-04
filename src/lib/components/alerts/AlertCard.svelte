<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
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
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  function getMainCategory(categories: unknown): string {
    const cats = Array.isArray(categories) ? categories as string[] : [];
    const priority = ['SERVICE_RESUMED', 'SERVICE_DISRUPTION', 'DELAY', 'DETOUR', 'PLANNED_SERVICE_DISRUPTION'];
    for (const cat of priority) {
      if (cats.includes(cat)) return cat;
    }
    return cats[0] || 'OTHER';
  }
  
  // Helper to extract array from JSONB
  function toArray(data: unknown): string[] {
    return Array.isArray(data) ? data as string[] : [];
  }
  
  const latestAlert = $derived(thread.latestAlert);
  const earlierAlerts = $derived(thread.alerts.slice(1));
  const routes = $derived(toArray(thread.affected_routes) || toArray(latestAlert?.affected_routes) || []);
  const categories = $derived(toArray(thread.categories) || toArray(latestAlert?.categories) || []);
</script>

<div class="alert-card">
  <div class="alert-card-content">
    <!-- Header: Badges + Timestamp -->
    <div class="alert-card-header">
      <div class="alert-card-badges">
        {#each routes.slice(0, 3) as route}
          <RouteBadge {route} size="sm" />
        {/each}
        {#if routes.length > 3}
          <span class="text-xs text-[hsl(var(--muted-foreground))]">+{routes.length - 3} more</span>
        {/if}
        <StatusBadge category={getMainCategory(categories)} />
      </div>
      <span class="alert-card-timestamp">
        {formatTimestamp(latestAlert?.created_at || '')}
      </span>
    </div>
    
    <!-- Alert Title -->
    <p class="alert-card-title">
      {latestAlert?.header_text || ''}
    </p>
    
    <!-- Description if available -->
    {#if latestAlert?.description_text}
      <p class="alert-card-description">
        {latestAlert.description_text}
      </p>
    {/if}
  </div>
  
  <!-- Earlier Updates -->
  {#if earlierAlerts.length > 0}
    <button
      class="earlier-updates-toggle"
      onclick={() => showEarlierUpdates = !showEarlierUpdates}
    >
      <span>{earlierAlerts.length} earlier update{earlierAlerts.length > 1 ? 's' : ''}</span>
      <ChevronDown class="h-4 w-4 transition-transform duration-200" style="transform: {showEarlierUpdates ? 'rotate(180deg)' : ''}" />
    </button>
    
    {#if showEarlierUpdates}
      <div class="earlier-updates-content">
        {#each earlierAlerts as alert, i}
          <div class="earlier-update-item">
            <div class="flex justify-between items-start mb-1">
              <StatusBadge category={getMainCategory(alert.categories)} />
              <span class="text-xs text-[hsl(var(--muted-foreground))]">
                {formatTimestamp(alert.created_at)}
              </span>
            </div>
            <p class="text-sm">
              {alert.header_text}
            </p>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
