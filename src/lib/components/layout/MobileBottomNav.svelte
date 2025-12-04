<script lang="ts">
  import { Bell, Star, Settings } from 'lucide-svelte';
  import { page } from '$app/stores';
  
  function isActive(href: string, tab: string | null): boolean {
    const currentPath = $page.url.pathname;
    const currentTab = $page.url.searchParams.get('tab');
    
    if (href === '/preferences') {
      return currentPath === '/preferences';
    }
    if (tab === 'my') {
      return currentPath === '/' && currentTab === 'my';
    }
    return currentPath === '/' && !currentTab;
  }
</script>

<!-- Extra background layer to cover iOS dynamic viewport gaps -->
<div class="mobile-nav-bg-extension"></div>

<nav class="mobile-bottom-nav">
  <a 
    href="/"
    class="nav-item {isActive('/', null) ? 'active' : ''}"
  >
    <Bell />
    <span>All Alerts</span>
  </a>
  <a 
    href="/?tab=my"
    class="nav-item {isActive('/', 'my') ? 'active' : ''}"
  >
    <Star />
    <span>My Alerts</span>
  </a>
  <a 
    href="/preferences"
    class="nav-item {isActive('/preferences', null) ? 'active' : ''}"
  >
    <Settings />
    <span>Preferences</span>
  </a>
</nav>

<style>
  /* Background extension that covers any gap below the nav */
  .mobile-nav-bg-extension {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100px; /* Generous height to cover any browser chrome */
    background: hsl(var(--background));
    z-index: 99; /* Just below the nav */
    pointer-events: none;
  }
  
  @media (min-width: 1024px) {
    .mobile-nav-bg-extension {
      display: none;
    }
  }
</style>
