<script lang="ts">
  import {
    Home,
    AlertTriangle,
    Settings,
    Flag,
    Lightbulb,
    Info,
    Route,
  } from "lucide-svelte";
  import { page } from "$app/stores";
  import { _ } from "svelte-i18n";

  let { onOpenDialog }: { onOpenDialog?: (dialog: string) => void } = $props();

  let isDark = $state(false);

  // Track dark mode state reactively
  $effect(() => {
    if (typeof document !== "undefined") {
      const observer = new MutationObserver(() => {
        isDark = document.documentElement.classList.contains("dark");
      });
      isDark = document.documentElement.classList.contains("dark");
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    }
  });

  function handleDialog(dialog: string) {
    onOpenDialog?.(dialog);
  }

  function isNavActive(href: string): boolean {
    const currentPath = $page.url.pathname;

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
    // Home: active when on / with any ?home= param or no param
    if (href === "/") {
      return currentPath === "/";
    }
    return false;
  }
</script>

<aside class="sidebar">
  <a href="/" class="sidebar-header">
    <img
      src="/LOGO.svg"
      alt="rideTO"
      width="85"
      height="32"
      class="sidebar-logo dark:hidden"
    />
    <img
      src="/DARK-LOGO.svg"
      alt="rideTO"
      width="85"
      height="32"
      class="sidebar-logo hidden dark:block"
    />
  </a>

  <nav class="sidebar-nav">
    <a href="/" class="sidebar-nav-item {isNavActive('/') ? 'active' : ''}">
      <Home />
      <span>{$_("navigation.home")}</span>
    </a>
    <a
      href="/alerts"
      class="sidebar-nav-item {isNavActive('/alerts') ? 'active' : ''}"
    >
      <AlertTriangle />
      <span>{$_("navigation.serviceAlerts")}</span>
    </a>
    <a
      href="/routes"
      class="sidebar-nav-item {isNavActive('/routes') ? 'active' : ''}"
    >
      <Route />
      <span>{$_("navigation.routes")}</span>
    </a>
    <a
      href="/settings"
      class="sidebar-nav-item {isNavActive('/settings') ? 'active' : ''}"
    >
      <Settings />
      <span>{$_("navigation.settings")}</span>
    </a>
  </nav>

  <div class="sidebar-footer">
    <!-- Help & Info Links -->
    <div class="sidebar-footer-links">
      <button
        onclick={() => handleDialog("report-bug")}
        class="sidebar-footer-link"
        title={$_("sidebar.reportBug")}
      >
        <Flag class="w-4 h-4" />
        <span>{$_("sidebar.reportBug")}</span>
      </button>
      <button
        onclick={() => handleDialog("feature-request")}
        class="sidebar-footer-link"
        title={$_("sidebar.featureRequest")}
      >
        <Lightbulb class="w-4 h-4" />
        <span>{$_("sidebar.featureRequest")}</span>
      </button>
      <a href="/about" class="sidebar-footer-link" title={$_("sidebar.about")}>
        <Info class="w-4 h-4" />
        <span>{$_("sidebar.about")}</span>
      </a>
    </div>
  </div>
</aside>
