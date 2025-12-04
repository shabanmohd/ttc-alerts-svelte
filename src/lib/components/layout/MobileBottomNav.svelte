<script lang="ts">
  import { Bell, Star, Settings, Map } from 'lucide-svelte';
  import { page } from '$app/stores';
  
  function isActive(href: string, tab: string | null): boolean {
    const currentPath = $page.url.pathname;
    const currentTab = $page.url.searchParams.get('tab');
    
    if (href === '/preferences') {
      return currentPath === '/preferences';
    }
    if (href === '/routes') {
      return currentPath === '/routes';
    }
    if (tab === 'my') {
      return currentPath === '/' && currentTab === 'my';
    }
    return currentPath === '/' && !currentTab;
  }
</script>

<nav class="mobile-bottom-nav">
  <a 
    href="/"
    class="nav-item {isActive('/', null) ? 'active' : ''}"
  >
    <Bell />
    <span>Alerts</span>
  </a>
  <a 
    href="/?tab=my"
    class="nav-item {isActive('/', 'my') ? 'active' : ''}"
  >
    <Star />
    <span>My Alerts</span>
  </a>
  <a 
    href="/routes"
    class="nav-item {isActive('/routes', null) ? 'active' : ''}"
  >
    <Map />
    <span>Routes</span>
  </a>
  <a 
    href="/preferences"
    class="nav-item {isActive('/preferences', null) ? 'active' : ''}"
  >
    <Settings />
    <span>Settings</span>
  </a>
</nav>
