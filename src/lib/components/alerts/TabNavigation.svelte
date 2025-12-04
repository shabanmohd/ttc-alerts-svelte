<script lang="ts">
  import { Bell, Star } from 'lucide-svelte';
  import { currentTab } from '$lib/stores/alerts';
  import { isAuthenticated } from '$lib/stores/auth';
  
  let { myAlertsCount = 0 }: { myAlertsCount?: number } = $props();
</script>

<div class="tab-navigation">
  <button 
    class="tab-button"
    class:active={$currentTab === 'all'}
    onclick={() => currentTab.set('all')}
  >
    <Bell class="w-4 h-4" />
    <span>All Alerts</span>
  </button>
  
  <button 
    class="tab-button"
    class:active={$currentTab === 'my'}
    onclick={() => currentTab.set('my')}
    disabled={!$isAuthenticated}
    title={!$isAuthenticated ? 'Sign in to view your personalized alerts' : undefined}
  >
    <Star class="w-4 h-4" />
    <span>My Alerts</span>
    {#if myAlertsCount > 0 && $isAuthenticated}
      <span class="tab-badge">{myAlertsCount}</span>
    {/if}
  </button>
</div>

<style>
  .tab-navigation {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background-color: hsl(var(--muted));
    border-radius: calc(var(--radius) + 2px);
    margin-bottom: 1rem;
  }
  
  .tab-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .tab-button:hover:not(:disabled) {
    color: hsl(var(--foreground));
  }
  
  .tab-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .tab-button.active {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
  
  .tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 9999px;
  }
</style>
