<script lang="ts">
  import {
    RefreshCw,
    Sun,
    Moon,
    Menu,
    HelpCircle,
    Bug,
    Lightbulb,
    Info,
    X,
  } from "lucide-svelte";
  import { lastUpdated, refreshAlerts, isConnected } from "$lib/stores/alerts";
  import { etaStore } from "$lib/stores/eta";
  import { language, getSupportedLanguages } from "$lib/stores/language";
  import { localPreferences } from "$lib/stores/localPreferences";
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";

  let {
    onOpenDialog,
  }: {
    onOpenDialog?: (dialog: string) => void;
  } = $props();

  let isDark = $state(false);
  let isRefreshing = $state(false);
  let mobileMenuOpen = $state(false);
  let tick = $state(0); // Force re-render for relative time

  // Track dark mode state reactively
  $effect(() => {
    tick; // dependency
    isDark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");
  });

  // Update relative time every 30 seconds
  onMount(() => {
    const interval = setInterval(() => {
      tick++;
    }, 30000);
    return () => clearInterval(interval);
  });

  async function toggleTheme() {
    const currentlyDark = document.documentElement.classList.contains("dark");
    const newTheme = currentlyDark ? "light" : "dark";
    await localPreferences.updatePreference("theme", newTheme);
    tick++;
  }

  async function handleRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    await Promise.all([refreshAlerts(), etaStore.refreshAll()]);
    isRefreshing = false;
  }

  // Compact time format (just "2m" or "now")
  function formatCompactTime(date: Date | null, _tick: number): string {
    if (!date) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return $_("time.justNow") || "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  }
</script>

<header
  class="sticky top-0 w-full border-b border-border"
  style="z-index: 1000; background-color: hsl(var(--background));"
>
  <div class="header-container">
    <!-- Logo (mobile only) -->
    <a href="/" class="header-left">
      <span class="text-xl">🚇</span>
      <span class="font-bold tracking-tight">{$_("header.appName")}</span>
    </a>

    <!-- Right side actions -->
    <div class="header-right">
      <!-- Refresh + Status Group (desktop only) -->
      <div class="hidden sm:flex items-center bg-muted/50 rounded-md">
        <button
          class="flex p-1.5 rounded-l-md hover:bg-accent transition-colors"
          onclick={handleRefresh}
          title={$_("common.refresh")}
          aria-label={$_("common.refresh")}
          disabled={isRefreshing}
        >
          <RefreshCw
            class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}"
            aria-hidden="true"
          />
        </button>
        <div class="w-px h-4 bg-border"></div>
        <div
          class="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground font-normal"
          title={$isConnected
            ? $_("header.liveUpdates")
            : $_("header.connecting")}
          role="status"
          aria-live="polite"
        >
          {#if $isConnected}
            <!-- Connected: pulsing green dot -->
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-2 w-2 bg-green-500"
              ></span>
            </span>
          {:else}
            <!-- Disconnected: hollow gray circle -->
            <span
              class="w-2 h-2 rounded-full border border-gray-400 dark:border-gray-500 flex-shrink-0"
            ></span>
          {/if}
          {#if $lastUpdated}
            <span class="tabular-nums"
              >{formatCompactTime($lastUpdated, tick)}</span
            >
          {/if}
        </div>
      </div>

      <!-- Mobile-only: Compact Status (dot + time) -->
      <div
        class="sm:hidden flex items-center gap-1.5 text-xs text-muted-foreground font-normal"
        title={$isConnected
          ? $_("header.liveUpdates")
          : $_("header.connecting")}
        role="status"
        aria-live="polite"
      >
        {#if $isConnected}
          <!-- Connected: pulsing green dot -->
          <span class="relative flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
            ></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"
            ></span>
          </span>
        {:else}
          <!-- Disconnected: hollow gray circle -->
          <span
            class="w-2 h-2 rounded-full border border-gray-400 dark:border-gray-500 flex-shrink-0"
          ></span>
        {/if}
        {#if $lastUpdated}
          <span class="tabular-nums"
            >{formatCompactTime($lastUpdated, tick)}</span
          >
        {/if}
      </div>

      <!-- Language Toggle (always visible on both mobile and desktop) -->
      <div
        class="flex items-center gap-0.5 border border-border rounded-md p-0.5"
      >
        {#each getSupportedLanguages() as lang}
          <button
            onclick={() =>
              localPreferences.updatePreference("language", lang.code)}
            class="min-w-[2.25rem] px-2 py-1 text-xs font-semibold rounded transition-all duration-150"
            style={$language === lang.code
              ? "background-color: hsl(var(--foreground)); color: hsl(var(--background));"
              : "background-color: transparent; color: hsl(var(--muted-foreground));"}
            aria-label={$_("header.switchLanguage", {
              values: { language: lang.name },
            })}
            aria-pressed={$language === lang.code}
            translate="no"
          >
            {lang.code.toUpperCase()}
          </button>
        {/each}
      </div>

      <!-- Theme toggle (desktop only) -->
      <button
        class="hidden sm:flex p-2 rounded-md hover:bg-accent transition-colors"
        onclick={toggleTheme}
        title={$_("header.toggleTheme")}
        aria-label={$_("header.toggleTheme")}
      >
        {#if isDark}
          <Sun class="w-5 h-5" aria-hidden="true" />
        {:else}
          <Moon class="w-5 h-5" aria-hidden="true" />
        {/if}
      </button>

      <!-- Help button (desktop only) -->
      <button
        class="hidden sm:flex p-2 rounded-md hover:bg-accent transition-colors"
        onclick={() => onOpenDialog?.("how-to-use")}
        title={$_("header.howToUse")}
        aria-label={$_("header.howToUse")}
      >
        <HelpCircle class="w-5 h-5" aria-hidden="true" />
      </button>

      <!-- Mobile Menu Button -->
      {#if !mobileMenuOpen}
        <button
          class="sm:hidden flex p-2 rounded-md hover:bg-accent transition-colors"
          onclick={() => (mobileMenuOpen = true)}
          title={$_("header.menu")}
          aria-label={$_("header.openMenu")}
          aria-expanded={mobileMenuOpen}
        >
          <Menu class="w-5 h-5" aria-hidden="true" />
        </button>
      {/if}
    </div>
  </div>
</header>

<!-- Mobile Menu Panel -->
{#if mobileMenuOpen}
  <!-- Backdrop -->
  <button
    class="sm:hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in"
    onclick={() => (mobileMenuOpen = false)}
    aria-label={$_("header.closeMenu")}
  ></button>

  <!-- Header bar with close button -->
  <div
    class="sm:hidden fixed left-0 right-0 top-0 z-[102] flex items-center justify-between px-4 h-[57px] border-b animate-fade-in"
    style="background-color: hsl(var(--background)); border-color: hsl(var(--border));"
  >
    <div class="flex items-center gap-2">
      <span class="text-xl">🚇</span>
      <span
        class="font-bold tracking-tight"
        style="color: hsl(var(--foreground));">{$_("header.appName")}</span
      >
    </div>
    <button
      class="flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-background hover:opacity-80 transition-opacity"
      onclick={() => (mobileMenuOpen = false)}
      aria-label={$_("header.closeMenu")}
    >
      <X class="w-5 h-5" aria-hidden="true" />
    </button>
  </div>

  <!-- Menu Content -->
  <div
    class="sm:hidden fixed left-0 right-0 top-[57px] z-[101] border-t border-border shadow-xl max-h-[calc(100vh-57px)] overflow-y-auto animate-fade-in-down"
    style="background-color: hsl(var(--background));"
  >
    <nav class="px-4 py-4 space-y-4">
      <!-- APPEARANCE Section -->
      <div>
        <p
          class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style="color: hsl(var(--muted-foreground));"
        >
          {$_("header.appearance")}
        </p>

        <!-- Theme Toggle -->
        <button
          onclick={() => {
            toggleTheme();
            mobileMenuOpen = false;
          }}
          class="flex items-center justify-between w-full px-3 py-3 rounded-lg transition-colors"
          style="background-color: {isDark
            ? 'hsl(240 3.7% 20%)'
            : 'hsl(240 5.9% 88%)'}; color: hsl(var(--foreground));"
        >
          <span class="text-sm font-medium"
            >{isDark ? $_("header.darkMode") : $_("header.lightMode")}</span
          >
          {#if isDark}
            <Sun
              class="w-5 h-5"
              style="color: hsl(var(--muted-foreground));"
              aria-hidden="true"
            />
          {:else}
            <Moon
              class="w-5 h-5"
              style="color: hsl(var(--muted-foreground));"
              aria-hidden="true"
            />
          {/if}
        </button>
      </div>

      <div class="h-px bg-border"></div>

      <!-- HELP & INFO Section -->
      <div>
        <p
          class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style="color: hsl(var(--muted-foreground));"
        >
          Help & Info
        </p>

        <button
          onclick={() => {
            mobileMenuOpen = false;
            onOpenDialog?.("how-to-use");
          }}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-left"
          style="color: hsl(var(--foreground));"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <HelpCircle class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">{$_("sidebar.howToUse")}</span>
        </button>

        <button
          onclick={() => {
            mobileMenuOpen = false;
            onOpenDialog?.("report-bug");
          }}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-left"
          style="color: hsl(var(--foreground));"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Bug class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">{$_("sidebar.reportBug")}</span>
        </button>

        <button
          onclick={() => {
            mobileMenuOpen = false;
            onOpenDialog?.("feature-request");
          }}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-left"
          style="color: hsl(var(--foreground));"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Lightbulb class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">{$_("sidebar.featureRequest")}</span
          >
        </button>

        <button
          onclick={() => {
            mobileMenuOpen = false;
            onOpenDialog?.("about");
          }}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-left"
          style="color: hsl(var(--foreground));"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Info class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">{$_("sidebar.about")}</span>
        </button>
      </div>
    </nav>
  </div>
{/if}
