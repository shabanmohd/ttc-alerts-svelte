<script lang="ts">
  import {
    Home,
    AlertTriangle,
    Settings,
    HelpCircle,
    Bug,
    Lightbulb,
    Info,
    LogOut,
    Route,
  } from "lucide-svelte";
  import { Separator } from "$lib/components/ui/separator";
  import { Button } from "$lib/components/ui/button";
  import { page } from "$app/stores";
  import {
    isAuthenticated,
    userName,
    userInitial,
    signOut,
  } from "$lib/stores/auth";
  import { _ } from "svelte-i18n";

  let { onOpenDialog }: { onOpenDialog?: (dialog: string) => void } = $props();

  function handleDialog(dialog: string) {
    onOpenDialog?.(dialog);
  }

  async function handleSignOut() {
    await signOut();
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
    <!-- User Section (only show when authenticated) -->
    {#if $isAuthenticated}
      <div class="px-3 py-2 mb-2">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
          >
            <span class="text-sm font-bold text-primary-foreground"
              >{$userInitial}</span
            >
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate">{$userName}</p>
            <p class="text-xs text-muted-foreground font-normal">Signed in</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="w-full mt-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onclick={handleSignOut}
        >
          <LogOut class="w-4 h-4 mr-2" aria-hidden="true" />
          Sign Out
        </Button>
      </div>
      <Separator class="my-2" />
    {/if}

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
        <Bug class="w-4 h-4" />
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
