<script lang="ts">
  import {
    RefreshCw,
    Sun,
    Moon,
    Menu,
    HelpCircle,
    LogOut,
    ChevronDown,
    Settings,
    Wifi,
    WifiOff,
    X,
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { lastUpdated, refreshAlerts, isConnected } from "$lib/stores/alerts";
  import { etaStore } from "$lib/stores/eta";
  import {
    language,
    setLanguage,
    getSupportedLanguages,
  } from "$lib/stores/language";
  import { localPreferences } from "$lib/stores/localPreferences";
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";

  let {
    isAuthenticated = false,
    username = "",
    onOpenDialog,
    onSignOut,
  }: {
    isAuthenticated?: boolean;
    username?: string;
    onOpenDialog?: (dialog: string) => void;
    onSignOut?: () => void;
  } = $props();

  let isDark = $state(false);
  let isRefreshing = $state(false);
  let mobileMenuOpen = $state(false);
  let tick = $state(0); // Force re-render for relative time

  // Track dark mode state reactively
  $effect(() => {
    // Re-check when tick changes (which happens on theme toggle or interval)
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
    // Toggle between light and dark, respecting current state
    const currentlyDark = document.documentElement.classList.contains("dark");

    // If on system, switch to explicit light/dark based on current appearance
    // Otherwise toggle between light and dark
    const newTheme = currentlyDark ? "light" : "dark";
    await localPreferences.updatePreference("theme", newTheme);
    tick++; // Trigger effect to update isDark state
  }

  async function handleRefresh() {
    if (isRefreshing) return;

    isRefreshing = true;
    // Refresh both alerts and ETAs (context-aware - each handles its own state)
    await Promise.all([refreshAlerts(), etaStore.refreshAll()]);
    isRefreshing = false;
  }

  function formatLastUpdated(date: Date | null, _tick: number): string {
    if (!date) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return $_("header.justNow");
    if (diff < 3600)
      return $_("header.updated", {
        values: { time: `${Math.floor(diff / 60)}m` },
      });
    return $_("header.updated", {
      values: { time: `${Math.floor(diff / 3600)}h` },
    });
  }

  function getUserInitial(name: string): string {
    return name.charAt(0).toUpperCase() || "U";
  }
</script>

<header class="sticky top-0 z-40 w-full border-b border-border bg-background">
  <div class="header-container">
    <!-- Logo (mobile only) -->
    <a href="/" class="header-left">
      <span class="text-xl">🚇</span>
      <span class="font-bold tracking-tight">{$_("header.appName")}</span>
    </a>

    <!-- Right side actions -->
    <div class="header-right">
      <!-- Last updated + Refresh (always visible) -->
      <div
        class="flex items-center gap-1 text-xs text-muted-foreground font-normal"
      >
        {#if $lastUpdated}
          <span id="last-updated">{formatLastUpdated($lastUpdated, tick)}</span>
        {/if}
        <!-- Connection status indicator -->
        {#if $isConnected}
          <span class="text-green-500" title={$_("header.liveUpdates")}>
            <Wifi class="w-3 h-3" aria-hidden="true" />
          </span>
        {:else}
          <span class="text-muted-foreground" title={$_("header.connecting")}>
            <WifiOff class="w-3 h-3" aria-hidden="true" />
          </span>
        {/if}
        <button
          class="p-1.5 rounded-md hover:bg-accent transition-colors"
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
      </div>

      <!-- Help button (hidden on mobile) -->
      <button
        class="hidden sm:flex p-2 rounded-md hover:bg-accent transition-colors"
        onclick={() => onOpenDialog?.("how-to-use")}
        title={$_("header.howToUse")}
        aria-label={$_("header.howToUse")}
      >
        <HelpCircle class="w-5 h-5" aria-hidden="true" />
      </button>

      <!-- Theme toggle (hidden on mobile) -->
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

      <!-- Language toggle (hidden on mobile) -->
      <div
        class="hidden sm:flex items-center gap-1 border border-border rounded-md p-0.5"
      >
        {#each getSupportedLanguages() as lang}
          <button
            onclick={() => setLanguage(lang.code)}
            class="px-2.5 py-1 text-xs font-medium rounded transition-all duration-150 {$language ===
            lang.code
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-transparent hover:bg-secondary text-muted-foreground'}"
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

      <!-- User Menu (hidden on mobile, only when authenticated) -->
      {#if isAuthenticated}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            class="hidden sm:inline-flex items-center gap-2 h-9 px-3 py-2 rounded-md hover:bg-accent transition-colors"
          >
            <div
              class="w-7 h-7 rounded-full bg-primary flex items-center justify-center"
            >
              <span class="text-xs font-semibold text-primary-foreground"
                >{getUserInitial(username)}</span
              >
            </div>
            <span class="text-sm font-medium max-w-[100px] truncate"
              >{username}</span
            >
            <ChevronDown class="w-4 h-4" aria-hidden="true" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-48">
            <div class="px-3 py-2 border-b border-border">
              <p class="text-sm font-semibold">{username}</p>
              <p class="text-xs text-muted-foreground font-normal">Signed in</p>
            </div>
            <DropdownMenu.Item href="/preferences">
              <Settings class="w-4 h-4 mr-2" aria-hidden="true" />
              Preferences
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={onSignOut} class="text-destructive">
              <LogOut class="w-4 h-4 mr-2" aria-hidden="true" />
              Sign Out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}

      <!-- Mobile Menu Button (only on mobile) -->
      {#if !mobileMenuOpen}
        <button
          class="sm:hidden flex p-2 rounded-md hover:bg-accent transition-colors"
          onclick={() => (mobileMenuOpen = true)}
          title="Menu"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu class="w-5 h-5" aria-hidden="true" />
        </button>
      {/if}
    </div>
  </div>
</header>

<!-- Mobile Menu Dropdown (OUTSIDE header for proper z-index stacking) -->
{#if mobileMenuOpen}
  <!-- Backdrop to close menu when clicking outside -->
  <button
    class="sm:hidden fixed inset-0 z-[100]"
    style="background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);"
    onclick={() => (mobileMenuOpen = false)}
    aria-label="Close menu"
  ></button>

  <!-- Close button header bar -->
  <div
    class="sm:hidden fixed left-0 right-0 top-0 z-[102] flex items-center justify-between px-4 h-[57px] border-b"
    style="background: white; border-color: #e5e5e5;"
  >
    <div class="dark:hidden absolute inset-0" style="background: white;"></div>
    <div
      class="hidden dark:block absolute inset-0"
      style="background: #0a0a0a;"
    ></div>
    <div class="relative flex items-center gap-2">
      <span class="text-xl">🚇</span>
      <span class="font-bold tracking-tight">{$_("header.appName")}</span>
    </div>
    <button
      class="relative flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-background hover:opacity-80 transition-opacity"
      onclick={() => (mobileMenuOpen = false)}
      aria-label="Close menu"
    >
      <X class="w-5 h-5" aria-hidden="true" />
    </button>
  </div>

  <div
    class="sm:hidden fixed left-0 right-0 top-[57px] z-[101] border-t shadow-xl max-h-[calc(100vh-57px)] overflow-y-auto"
    style="background: white; border-color: #e5e5e5;"
  >
    <div class="dark:hidden absolute inset-0" style="background: white;"></div>
    <div
      class="hidden dark:block absolute inset-0"
      style="background: #0a0a0a;"
    ></div>
    <nav class="relative px-4 py-3 space-y-1">
      {#if isAuthenticated}
        <div
          class="flex items-center gap-3 px-3 py-3 border-b border-border mb-2"
        >
          <div
            class="w-10 h-10 rounded-full bg-primary flex items-center justify-center"
          >
            <span class="text-sm font-bold text-primary-foreground"
              >{getUserInitial(username)}</span
            >
          </div>
          <div>
            <p class="text-sm font-semibold">{username}</p>
            <p class="text-xs text-muted-foreground font-normal">Signed in</p>
          </div>
        </div>
      {/if}

      <button
        onclick={() => {
          mobileMenuOpen = false;
          onOpenDialog?.("how-to-use");
        }}
        class="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
      >
        <HelpCircle class="w-5 h-5" aria-hidden="true" />
        <span class="text-sm">How to Use</span>
      </button>

      <!-- Divider -->
      <div class="h-px bg-border my-2"></div>

      <!-- Theme toggle -->
      <div class="px-3 py-2">
        <p
          class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide"
        >
          Appearance
        </p>
        <button
          onclick={() => {
            toggleTheme();
          }}
          class="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-accent transition-colors"
        >
          <span class="text-sm">{isDark ? "Dark Mode" : "Light Mode"}</span>
          {#if isDark}
            <Sun class="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          {:else}
            <Moon class="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          {/if}
        </button>
      </div>

      <!-- Language toggle (mobile) -->
      <div class="px-3 py-2">
        <p
          class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide"
        >
          Language
        </p>
        <div class="flex gap-2">
          {#each getSupportedLanguages() as lang}
            <button
              onclick={() => {
                setLanguage(lang.code);
              }}
              class="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {$language ===
              lang.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 hover:bg-accent'}"
              translate="no"
            >
              {lang.nativeName}
            </button>
          {/each}
        </div>
      </div>

      {#if isAuthenticated}
        <!-- Divider -->
        <div class="h-px bg-border my-2"></div>

        <a
          href="/preferences"
          onclick={() => (mobileMenuOpen = false)}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-accent transition-colors text-left"
        >
          <Settings class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm">Preferences</span>
        </a>
        <button
          onclick={() => {
            mobileMenuOpen = false;
            onSignOut?.();
          }}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left text-destructive"
        >
          <LogOut class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">Sign Out</span>
        </button>
      {/if}
    </nav>
  </div>
{/if}
