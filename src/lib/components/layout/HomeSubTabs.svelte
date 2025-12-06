<script lang="ts">
  import { MapPin, Route } from 'lucide-svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  type HomeTab = 'stops' | 'routes';
  
  // Get current tab from URL, default to 'stops'
  let currentTab = $derived<HomeTab>(
    ($page.url.searchParams.get('home') as HomeTab) || 'stops'
  );
  
  const tabs: Array<{ id: HomeTab; label: string; icon: typeof MapPin }> = [
    { id: 'stops', label: 'My Stops', icon: MapPin },
    { id: 'routes', label: 'My Routes', icon: Route }
  ];
  
  function handleTabClick(tabId: HomeTab) {
    // Use replaceState to avoid adding to history for tab switches
    const url = new URL($page.url);
    if (tabId === 'stops') {
      url.searchParams.delete('home');
    } else {
      url.searchParams.set('home', tabId);
    }
    goto(url.toString(), { replaceState: true, noScroll: true });
  }
</script>

<div class="home-sub-tabs" role="tablist" aria-label="Home sections">
  {#each tabs as tab (tab.id)}
    {@const Icon = tab.icon}
    <button
      role="tab"
      aria-selected={currentTab === tab.id}
      class="sub-tab"
      class:active={currentTab === tab.id}
      onclick={() => handleTabClick(tab.id)}
    >
      <Icon class="w-4 h-4" aria-hidden="true" />
      <span>{tab.label}</span>
    </button>
  {/each}
</div>

<style>
  .home-sub-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background-color: hsl(var(--muted));
    border-radius: calc(var(--radius) + 2px);
    margin-bottom: 1rem;
  }
  
  .sub-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    border-radius: var(--radius);
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  
  .sub-tab:hover:not(.active) {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted-foreground) / 0.1);
  }
  
  .sub-tab.active {
    color: hsl(var(--foreground));
    background-color: hsl(var(--background));
    box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
  }
  
  /* Mobile: smaller text, icons only on very small screens */
  @media (max-width: 360px) {
    .sub-tab {
      padding: 0.5rem;
      font-size: 0.75rem;
    }
    
    .sub-tab span {
      display: none;
    }
  }
</style>
