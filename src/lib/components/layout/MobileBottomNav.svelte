<script lang="ts">
  import { Home, AlertTriangle, Settings, Route } from 'lucide-svelte';
  import { page } from '$app/stores';
  
  function isActive(href: string): boolean {
    const currentPath = $page.url.pathname;
    const homeParam = $page.url.searchParams.get('home');
    
    if (href === '/settings') {
      return currentPath === '/settings';
    }
    if (href === '/routes') {
      // Active for /routes but not /routes/[route] detail pages
      return currentPath === '/routes';
    }
    if (href === '/alerts') {
      return currentPath === '/alerts';
    }
    // Home tab: active when on / with any ?home= param or no param
    if (href === '/') {
      return currentPath === '/' || currentPath === '';
    }
    return false;
  }
</script>

<nav class="mobile-bottom-nav">
  <a 
    href="/"
    class="nav-item {isActive('/') ? 'active' : ''}"
  >
    <Home />
    <span>Home</span>
  </a>
  <a 
    href="/alerts"
    class="nav-item {isActive('/alerts') ? 'active' : ''}"
  >
    <AlertTriangle />
    <span>Alerts</span>
  </a>
  <a 
    href="/routes"
    class="nav-item {isActive('/routes') ? 'active' : ''}"
  >
    <Route />
    <span>Routes</span>
  </a>
  <a 
    href="/settings"
    class="nav-item {isActive('/settings') ? 'active' : ''}"
  >
    <Settings />
    <span>Settings</span>
  </a>
</nav>
