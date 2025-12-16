<script lang="ts">
  import {
    Home,
    AlertTriangle,
    Settings,
    HelpCircle,
    Flag,
    Lightbulb,
    Info,
    Route,
  } from "lucide-svelte";
  import { page } from "$app/stores";
  import { _ } from "svelte-i18n";

  let { onOpenDialog }: { onOpenDialog?: (dialog: string) => void } = $props();

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
      return currentPath === "/" || currentPath === "";
    }
    return false;
  }
</script>

<aside class="sidebar">
  <a href="/" class="sidebar-header">
    <span class="sidebar-logo">🚇</span>
    <span class="sidebar-title">{$_("header.appName")}</span>
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
        onclick={() => handleDialog("how-to-use")}
        class="sidebar-footer-link"
        title={$_("sidebar.howToUse")}
      >
        <HelpCircle class="w-4 h-4" />
        <span>{$_("sidebar.howToUse")}</span>
      </button>
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
      <button
        onclick={() => handleDialog("about")}
        class="sidebar-footer-link"
        title={$_("sidebar.about")}
      >
        <Info class="w-4 h-4" />
        <span>{$_("sidebar.about")}</span>
      </button>
    </div>
  </div>
</aside>
