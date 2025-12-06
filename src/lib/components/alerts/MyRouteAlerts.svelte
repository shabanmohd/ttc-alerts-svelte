<script lang="ts">
  import { Search, Plus, Bell, X, Pencil, RefreshCw } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import AlertCard from './AlertCard.svelte';
  import RouteSearch from './RouteSearch.svelte';
  import RouteBadge from './RouteBadge.svelte';
  import FullscreenSearchModal from '$lib/components/ui/FullscreenSearchModal.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { threadsWithAlerts, isLoading, refreshAlerts } from '$lib/stores/alerts';
  import { savedRoutes } from '$lib/stores/savedRoutes';
  import type { ThreadWithAlerts } from '$lib/types/database';
  
  // Route filter state - which specific route to show (null = all saved routes)
  let selectedRouteFilter = $state<string | null>(null);
  
  // Search modal state
  let showSearchModal = $state(false);
  let isEditMode = $state(false);
  let isRefreshing = $state(false);
  
  // Handle manual refresh
  async function handleRefresh() {
    isRefreshing = true;
    try {
      await refreshAlerts();
    } finally {
      isRefreshing = false;
    }
  }
  
  // Check if mobile
  let isMobile = $state(false);
  
  onMount(() => {
    if (browser) {
      // Check if mobile
      isMobile = window.innerWidth < 640;
    }
  });
  
  // Handle route removal
  function handleRemoveRoute(routeId: string) {
    savedRoutes.remove(routeId);
    // Clear filter if removing the filtered route
    if (selectedRouteFilter === routeId) {
      selectedRouteFilter = null;
    }
  }
  
  // Toggle route filter
  function toggleRouteFilter(routeId: string) {
    if (isEditMode) return; // Don't toggle when in edit mode
    selectedRouteFilter = selectedRouteFilter === routeId ? null : routeId;
  }
  
  // Toggle edit mode
  function toggleEditMode() {
    isEditMode = !isEditMode;
    // Clear route filter when entering edit mode
    if (isEditMode) {
      selectedRouteFilter = null;
    }
  }
  
  // Get saved route IDs
  let routeIds = $derived($savedRoutes.map(r => r.id));
  
  let hasRoutes = $derived($savedRoutes.length > 0);
  
  // Helper to extract routes from various formats
  function extractRoutes(routes: string | string[] | null | undefined): string[] {
    if (!routes) return [];
    if (Array.isArray(routes)) return routes;
    if (typeof routes === 'string') {
      try {
        const parsed = JSON.parse(routes);
        return Array.isArray(parsed) ? parsed : [routes];
      } catch {
        return [routes];
      }
    }
    return [];
  }
  
  // Helper to check if thread matches a specific route
  function matchesSpecificRoute(thread: ThreadWithAlerts, routeId: string): boolean {
    const threadRoutes = extractRoutes(thread.affected_routes);
    const alertRoutes = extractRoutes(thread.latestAlert?.affected_routes);
    const allRoutes = [...new Set([...threadRoutes, ...alertRoutes])];
    
    return allRoutes.some(threadRoute => 
      threadRoute.toLowerCase() === routeId.toLowerCase() ||
      threadRoute.includes(routeId) ||
      routeId.includes(threadRoute)
    );
  }
  
  // Helper to check if thread matches saved routes
  function matchesRoutes(thread: ThreadWithAlerts): boolean {
    const threadRoutes = extractRoutes(thread.affected_routes);
    const alertRoutes = extractRoutes(thread.latestAlert?.affected_routes);
    const allRoutes = [...new Set([...threadRoutes, ...alertRoutes])];
    
    return routeIds.some(savedRoute => 
      allRoutes.some(threadRoute => 
        threadRoute.toLowerCase() === savedRoute.toLowerCase() ||
        threadRoute.includes(savedRoute) ||
        savedRoute.includes(threadRoute)
      )
    );
  }
  
  // Get all alerts matching saved routes
  let routeMatchedAlerts = $derived.by<ThreadWithAlerts[]>(() => {
    if (routeIds.length === 0) return [];
    return $threadsWithAlerts.filter(matchesRoutes);
  });
  
  // Filter alerts for saved routes with optional route filter applied
  let myAlerts = $derived.by<ThreadWithAlerts[]>(() => {
    const routeFilter = selectedRouteFilter;
    
    // Start with route-matched alerts
    let filtered = routeMatchedAlerts;
    
    // Apply specific route filter if selected
    if (routeFilter) {
      filtered = filtered.filter(thread => matchesSpecificRoute(thread, routeFilter));
    }
    
    return filtered;
  });
  
  function handleAddRoutes() {
    goto('/routes');
  }
</script>

<!-- Fullscreen Search Modal (Mobile) -->
<FullscreenSearchModal 
  open={showSearchModal} 
  title="Add Routes"
  onClose={() => showSearchModal = false}
>
  <RouteSearch 
    placeholder="Search by route number or name..."
    onClose={() => showSearchModal = false}
  />
  
  {#if hasRoutes}
    <div class="modal-saved-routes">
      <h3 class="modal-section-title">Saved Routes ({$savedRoutes.length}/20)</h3>
      <div class="saved-chips">
        {#each $savedRoutes as route (route.id)}
          <div class="saved-chip">
            <RouteBadge route={route.id} size="sm" />
            <button
              type="button"
              class="chip-remove"
              onclick={() => handleRemoveRoute(route.id)}
              aria-label="Remove {route.id}"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</FullscreenSearchModal>

<div class="my-route-alerts">
  <!-- Search Bar (Always Visible) -->
  <div class="search-section">
    {#if isMobile}
      <!-- Mobile: Tap to open fullscreen modal -->
      <button 
        type="button"
        class="mobile-search-trigger"
        onclick={() => showSearchModal = true}
      >
        <Search class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span class="trigger-text">Search routes by number or name...</span>
      </button>
    {:else}
      <!-- Desktop: Inline search -->
      <RouteSearch placeholder="Search by route number or name..." />
    {/if}
    {#if hasRoutes}
      <Button 
        variant="ghost" 
        size="sm" 
        class="edit-button"
        onclick={toggleEditMode}
      >
        {#if isEditMode}
          Done
        {:else}
          <Pencil class="h-3 w-3 mr-1" />
          Edit
        {/if}
      </Button>
    {/if}
  </div>

  <!-- Route Filter Tabs -->
  {#if hasRoutes}
    <div class="route-tabs-container">
      <div class="route-tabs" role="tablist" aria-label="Filter by route">
        {#if isEditMode}
          <!-- Edit Mode: Show removable chips -->
          <div class="edit-mode-chips">
            {#each $savedRoutes as route (route.id)}
              <div class="saved-chip editing">
                <RouteBadge route={route.id} size="sm" />
                <button
                  type="button"
                  class="chip-remove"
                  onclick={() => handleRemoveRoute(route.id)}
                  aria-label="Remove {route.id}"
                >
                  <X class="h-3 w-3" />
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Normal Mode: Show tabs -->
          <button
            type="button"
            role="tab"
            class="route-tab"
            class:active={selectedRouteFilter === null}
            aria-selected={selectedRouteFilter === null}
            onclick={() => selectedRouteFilter = null}
          >
            All saved routes
          </button>
          {#each $savedRoutes as route (route.id)}
            <button
              type="button"
              role="tab"
              class="route-tab"
              class:active={selectedRouteFilter === route.id}
              aria-selected={selectedRouteFilter === route.id}
              onclick={() => selectedRouteFilter = route.id}
            >
              <RouteBadge route={route.id} size="sm" />
            </button>
          {/each}
        {/if}
      </div>
      <div class="route-tabs-fade" aria-hidden="true"></div>
    </div>
  {/if}

  {#if $isLoading && !hasRoutes}
    <!-- Loading State -->
    <div class="space-y-3">
      {#each Array(2) as _, i}
        <div class="alert-card" aria-hidden="true">
          <div class="alert-card-content">
            <div class="alert-card-header">
              <div class="alert-card-badges">
                <Skeleton class="h-6 w-16 rounded-md" />
                <Skeleton class="h-5 w-20 rounded-full" />
              </div>
              <Skeleton class="h-4 w-16" />
            </div>
            <Skeleton class="h-4 w-full mt-3" />
            <Skeleton class="h-4 w-3/4 mt-2" />
          </div>
        </div>
      {/each}
    </div>
  {:else if !hasRoutes}
    <!-- Empty State: No Routes Saved -->
    <div class="empty-state">
      <div class="empty-state-icon">
        <Route class="h-8 w-8" />
      </div>
      <h3 class="empty-state-title">No routes saved yet</h3>
      <p class="empty-state-description">
        Use the search bar above to find and save your regular routes. Get alerts for delays and disruptions.
      </p>
    </div>
  {:else}
    {#if myAlerts.length === 0}
      <!-- Empty State: Routes Saved but No Active Alerts -->
      <div class="empty-state success">
        <div class="empty-state-icon success">
          <Bell class="h-8 w-8" />
        </div>
        <h3 class="empty-state-title">All clear!</h3>
        <p class="empty-state-description">
          No active alerts for your saved routes. Service is running normally.
        </p>
        <button
          type="button"
          class="refresh-button"
          onclick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh alerts"
        >
          <span class="refresh-icon" class:spinning={isRefreshing}>
            <RefreshCw class="h-4 w-4" />
          </span>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    {:else}
      <!-- Alert Cards for Saved Routes -->
      <div class="space-y-3" role="feed" aria-label="Alerts for your saved routes">
        {#each myAlerts as thread (thread.thread_id)}
          <AlertCard {thread} />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .my-route-alerts {
    min-height: 200px;
  }

  .search-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .mobile-search-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    padding: 0.625rem 0.75rem;
    background-color: hsl(var(--muted));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
  }

  .mobile-search-trigger:hover {
    border-color: hsl(var(--ring));
    background-color: hsl(var(--muted) / 0.8);
  }

  .trigger-text {
    color: hsl(var(--muted-foreground));
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Route tabs container with fade indicator on mobile */
  .route-tabs-container {
    position: relative;
    margin-bottom: 1rem;
  }

  .route-tabs {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .route-tabs::-webkit-scrollbar {
    display: none;
  }

  /* Fade indicator on mobile to show more content */
  .route-tabs-fade {
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
    .route-tabs {
      flex-wrap: wrap;
      overflow-x: visible;
    }
    
    .route-tabs-fade {
      display: none;
    }
  }

  .route-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .route-tab:hover {
    background-color: hsl(var(--muted) / 0.5);
    color: hsl(var(--foreground));
  }

  .route-tab.active {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-color: hsl(var(--primary));
  }

  .edit-mode-chips {
    display: flex;
    gap: 0.5rem;
    /* Mobile: scroll horizontally */
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .edit-mode-chips::-webkit-scrollbar {
    display: none;
  }

  /* Desktop: wrap instead of scroll */
  @media (min-width: 768px) {
    .edit-mode-chips {
      flex-wrap: wrap;
      overflow-x: visible;
    }
  }

  :global(.edit-button) {
    height: 2.375rem;
    padding: 0 0.75rem;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .saved-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem;
    padding-left: 0.25rem;
    border-radius: var(--radius);
  }

  .saved-chip.editing {
    background-color: hsl(var(--destructive) / 0.1);
  }

  .chip-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: none;
    border: none;
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    transition: all 0.15s;
  }

  .chip-remove:hover {
    background-color: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
  }

  .modal-saved-routes {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid hsl(var(--border));
  }

  .modal-section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.75rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 1.5rem;
    background-color: hsl(var(--muted) / 0.3);
    border-radius: var(--radius);
    border: 1px dashed hsl(var(--border));
  }

  .empty-state-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    margin-bottom: 1rem;
  }
  
  .empty-state-icon.success {
    background-color: hsl(142 76% 36% / 0.1);
    color: hsl(142 76% 36%);
  }
  
  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }
  
  .empty-state-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    max-width: 280px;
    line-height: 1.5;
  }

  .empty-state.success {
    border-style: solid;
    border-color: hsl(142 76% 36% / 0.2);
    background-color: hsl(142 76% 36% / 0.05);
  }

  .refresh-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(142 76% 36%);
    background-color: hsl(142 76% 36% / 0.1);
    border: 1px solid hsl(142 76% 36% / 0.3);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
  }

  .refresh-button:hover:not(:disabled) {
    background-color: hsl(142 76% 36% / 0.2);
    border-color: hsl(142 76% 36% / 0.5);
  }

  .refresh-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .refresh-icon {
    display: inline-flex;
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
