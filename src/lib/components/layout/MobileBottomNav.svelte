<script lang="ts">
  import { _ } from "svelte-i18n";
  import { Home, AlertTriangle, Settings, Route } from "lucide-svelte";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  function isActive(href: string): boolean {
    const currentPath = $page.url.pathname;
    const homeParam = $page.url.searchParams.get("home");

    if (href === "/settings") {
      return currentPath === "/settings";
    }
    if (href === "/routes") {
      // Active for /routes but not /routes/[route] detail pages
      return currentPath === "/routes";
    }
    if (href === "/alerts") {
      return currentPath === "/alerts";
    }
    // Home tab: active when on / with any ?home= param or no param
    if (href === "/") {
      return currentPath === "/" || currentPath === "";
    }
    return false;
  }

  // Fix for iOS dynamic viewport
  onMount(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${window.innerHeight}px`
      );
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    
    // Also handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', setViewportHeight);
    };
  });
</script>

<nav class="mobile-bottom-nav">
  <a href="/" class="nav-item {isActive('/') ? 'active' : ''}">
    <Home />
    <span>{$_("navigation.home")}</span>
  </a>
  <a href="/alerts" class="nav-item {isActive('/alerts') ? 'active' : ''}">
    <AlertTriangle />
    <span>{$_("navigation.alerts")}</span>
  </a>
  <a href="/routes" class="nav-item {isActive('/routes') ? 'active' : ''}">
    <Route />
    <span>{$_("navigation.routes")}</span>
  </a>
  <a href="/settings" class="nav-item {isActive('/settings') ? 'active' : ''}">
    <Settings />
    <span>{$_("navigation.settings")}</span>
  </a>
</nav>
