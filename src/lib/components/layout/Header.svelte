<script lang="ts">
  import {
    RefreshCw,
    Sun,
    Moon,
    HelpCircle,
    Flag,
    Lightbulb,
    Info,
    Check,
    X,
    CloudOff,
  } from "lucide-svelte";
  import { lastUpdated, refreshAlerts, isConnected } from "$lib/stores/alerts";
  import { isOnline } from "$lib/stores/networkStatus";
  import { etaStore } from "$lib/stores/eta";
  import { language, getSupportedLanguages } from "$lib/stores/language";
  import { localPreferences } from "$lib/stores/localPreferences";
  import { openDialog } from "$lib/stores/dialogs";
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";

  // Legacy prop - kept for backwards compatibility but ignored
  // All dialog handling now goes through the shared store
  let {
    onOpenDialog: _onOpenDialog,
  }: {
    onOpenDialog?: (dialog: string) => void;
  } = $props();

  let isDark = $state(false);
  let isRefreshing = $state(false);
  let mobileMenuOpen = $state(false);
  let tick = $state(0); // Force re-render for relative time
  let isHeaderHidden = $state(false); // Track header visibility on scroll

  // Scroll tracking state
  let lastScrollY = 0;
  let scrollThreshold = 100; // Pixels scrolled before hiding header

  // Handle scroll for header hide/show on mobile
  function handleScroll() {
    // Only apply on mobile (< 1024px breakpoint)
    if (window.innerWidth >= 1024) {
      isHeaderHidden = false;
      return;
    }

    const currentScrollY = document.body.scrollTop || window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;

    // If at top (within 10px), always show header
    if (currentScrollY < 10) {
      isHeaderHidden = false;
      lastScrollY = currentScrollY;
      return;
    }

    // Scrolling down past threshold - hide header
    if (scrollDelta > 0 && currentScrollY > scrollThreshold) {
      if (scrollDelta > 5) {
        isHeaderHidden = true;
      }
    }
    // Scrolling up - show header
    else if (scrollDelta < 0) {
      if (Math.abs(scrollDelta) > 5) {
        isHeaderHidden = false;
      }
    }

    lastScrollY = currentScrollY;
  }

  // Track dark mode state reactively
  $effect(() => {
    tick; // dependency
    isDark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");
  });

  // Lock body scroll when mobile menu is open
  $effect(() => {
    if (typeof document !== "undefined") {
      if (mobileMenuOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    // Cleanup on unmount
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  });

  // Update relative time every 30 seconds + setup scroll listeners
  onMount(() => {
    const interval = setInterval(() => {
      tick++;
    }, 30000);

    // Add scroll listeners for header hide/show
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.body.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
      document.body.removeEventListener("scroll", handleScroll);
    };
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
  class="sticky top-0 w-full border-b border-border app-header"
  class:header-hidden={isHeaderHidden}
  style="z-index: 999; background-color: hsl(var(--background)); padding-top: env(safe-area-inset-top, 0px);"
>
  <div class="header-container">
    <!-- Logo (mobile only) -->
    <a href="/" class="header-left py-3">
      <img
        src="/LOGO.svg"
        alt="rideTO"
        width="72"
        height="24"
        class="h-6 w-auto"
      />
    </a>

    <!-- Right side actions -->
    <div class="header-right">
      <!-- Refresh + Status Group (desktop only) -->
      <div class="hidden sm:flex items-center bg-muted/50 rounded-md">
        <button
          class="flex p-1.5 rounded-l-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
          title={!$isOnline
            ? $_("networkStatus.offline.message")
            : $isConnected
              ? $_("header.liveUpdates")
              : $_("header.connecting")}
          role="status"
          aria-live="polite"
        >
          {#if !$isOnline}
            <!-- Offline: red cloud-off icon -->
            <span class="shrink-0 flex items-center justify-center w-4 h-4">
              <CloudOff class="w-3 h-3 text-destructive" />
            </span>
          {:else if $isConnected}
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
              class="w-2 h-2 rounded-full border border-gray-400 dark:border-gray-500 shrink-0"
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
        title={!$isOnline
          ? $_("networkStatus.offline.message")
          : $isConnected
            ? $_("header.liveUpdates")
            : $_("header.connecting")}
        role="status"
        aria-live="polite"
      >
        {#if !$isOnline}
          <!-- Offline: red cloud-off icon -->
          <span class="shrink-0 flex items-center justify-center w-4 h-4">
            <CloudOff class="w-3 h-3 text-destructive" />
          </span>
        {:else if $isConnected}
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
            class="w-2 h-2 rounded-full border border-gray-400 dark:border-gray-500 shrink-0"
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
            class="min-w-[2.25rem] px-2 py-1 text-xs font-semibold rounded transition-all duration-150 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
        class="hidden sm:flex p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
      <a
        href="/help"
        class="hidden sm:flex p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title={$_("header.howToUse")}
        aria-label={$_("header.howToUse")}
      >
        <HelpCircle class="w-5 h-5" aria-hidden="true" />
      </a>

      <!-- Mobile Menu Button - toggles between hamburger and X -->
      <button
        class="sm:hidden flex p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        title={mobileMenuOpen ? $_("header.closeMenu") : $_("header.menu")}
        aria-label={mobileMenuOpen
          ? $_("header.closeMenu")
          : $_("header.openMenu")}
        aria-expanded={mobileMenuOpen}
      >
        <span class="relative w-5 h-5">
          <!-- Hamburger icon - inline SVG for instant render -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-5 h-5 absolute inset-0 transition-all duration-200 {mobileMenuOpen
              ? 'opacity-0 rotate-90 scale-75'
              : 'opacity-100 rotate-0 scale-100'}"
            aria-hidden="true"
          >
            <line x1="4" x2="20" y1="12" y2="12"></line>
            <line x1="4" x2="20" y1="6" y2="6"></line>
            <line x1="4" x2="20" y1="18" y2="18"></line>
          </svg>
          <!-- X icon - inline SVG for instant render -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-5 h-5 absolute inset-0 transition-all duration-200 {mobileMenuOpen
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-75'}"
            aria-hidden="true"
          >
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </span>
      </button>
    </div>
  </div>
</header>

<!-- Mobile Menu Panel -->
{#if mobileMenuOpen}
  <!-- Backdrop -->
  <button
    class="sm:hidden fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm animate-fade-in"
    onclick={() => (mobileMenuOpen = false)}
    aria-label={$_("header.closeMenu")}
  ></button>

  <!-- Header bar with close button - accounts for iOS safe area -->
  <div
    class="sm:hidden fixed left-0 right-0 top-0 z-[1003] flex items-center justify-between px-4 border-b"
    style="background-color: hsl(var(--background)); border-color: hsl(var(--border)); padding-top: env(safe-area-inset-top, 0px); height: calc(56px + env(safe-area-inset-top, 0px));"
  >
    <div class="flex items-center gap-2 py-3">
      <!-- Inline SVG for instant render -->
      <svg
        width="886"
        height="213"
        viewBox="0 0 886 213"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-auto"
        aria-label="rideTO"
        role="img"
      >
        <path
          d="M87.308 139.284C82.344 139.284 79.132 137.532 81.468 130.524C83.22 124.976 83.512 117.092 76.212 117.092C71.248 117.092 67.744 120.888 67.744 128.188V200.02C67.744 205.86 64.824 208.78 58.692 208.78H8.76C2.92 208.78 0 205.86 0 200.02V70.372C0 64.532 2.92 61.612 8.76 61.612H58.692C64.532 61.612 67.452 64.24 67.744 69.788C76.504 62.196 87.892 58.692 100.74 58.692C128.48 58.692 144.248 75.044 144.248 103.952C144.248 113.004 143.08 122.64 140.744 131.692C139.576 136.656 136.364 139.284 131.108 139.284H87.308Z"
          fill="#9B44C7"
        />
        <path
          d="M153.895 26.28C153.895 11.388 161.487 0 191.563 0C221.639 0 229.231 11.388 229.231 26.28C229.231 41.172 221.639 52.56 191.563 52.56C161.487 52.56 153.895 41.172 153.895 26.28ZM157.691 200.02V70.372C157.691 64.532 160.611 61.612 166.451 61.612H216.675C222.515 61.612 225.435 64.532 225.435 70.372V200.02C225.435 205.86 222.515 208.78 216.675 208.78H166.451C160.611 208.78 157.691 205.86 157.691 200.02Z"
          fill="#9B44C7"
        />
        <path
          d="M405.841 23.068V200.02C405.841 205.86 402.921 208.78 397.081 208.78H346.857C341.017 208.78 338.097 205.86 338.097 200.312C328.169 207.612 316.197 211.992 302.181 211.992C262.177 211.992 240.861 185.42 240.861 135.196C240.861 84.972 262.177 58.692 302.181 58.692C316.489 58.692 328.461 62.78 338.097 70.08V23.068C338.097 17.228 341.017 14.308 346.857 14.308H397.081C402.921 14.308 405.841 17.228 405.841 23.068ZM338.097 135.196C338.097 124.976 332.257 117.676 322.913 117.676C314.153 117.676 308.605 124.976 308.605 135.196C308.605 145.416 314.153 153.008 322.913 153.008C332.257 153.008 338.097 145.416 338.097 135.196Z"
          fill="#9B44C7"
        />
        <path
          d="M487.058 144.832C490.854 156.512 501.366 158.848 516.842 158.848C529.982 158.848 543.122 156.804 556.554 155.636C561.518 155.052 562.686 159.432 562.394 163.812L560.35 195.348C560.058 202.064 555.678 203.232 550.13 204.984C536.698 209.072 522.974 211.992 508.666 211.992C459.902 211.992 420.482 188.048 420.482 135.196C420.482 86.14 454.354 58.692 501.95 58.692C532.902 58.692 566.19 71.54 566.19 108.624C566.19 138.116 543.706 144.832 519.47 144.832H487.058ZM486.182 124.392H505.454C509.834 124.392 513.63 121.18 513.63 116.216C513.63 110.96 508.082 108.624 503.41 108.624C493.19 108.624 488.226 115.924 486.182 124.392Z"
          fill="#9B44C7"
        />
        <path
          d="M737.927 128.71C734.597 169.286 764.791 204.879 805.367 208.21C845.943 211.54 881.537 181.346 884.867 140.77C888.197 100.194 858.003 64.6003 817.427 61.27C776.851 57.9396 741.257 88.1335 737.927 128.71ZM833.438 136.549C832.439 148.722 821.761 157.78 809.588 156.781C797.415 155.782 788.357 145.104 789.356 132.931C790.355 120.758 801.033 111.7 813.206 112.699C825.379 113.698 834.437 124.376 833.438 136.549Z"
          fill="#808080"
        />
        <path
          d="M597.025 60.24H720.703C725.144 60.24 727.364 62.4622 727.364 67.1289V100.684C727.364 105.129 725.144 107.351 720.703 107.351H684.954V201.573C684.954 206.018 682.734 208.24 678.293 208.24H639.435C634.772 208.24 632.552 206.018 632.552 201.573V107.351H597.025C592.584 107.351 590.364 104.907 590.364 100.462V67.1289C590.364 62.4622 592.584 60.24 597.025 60.24Z"
          fill="#808080"
        />
      </svg>
    </div>
    <button
      class="flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-background hover:opacity-80 transition-opacity"
      onclick={() => (mobileMenuOpen = false)}
      aria-label={$_("header.closeMenu")}
    >
      <X class="w-5 h-5" aria-hidden="true" />
    </button>
  </div>

  <!-- Menu Content - positioned below header with safe area -->
  <div
    class="sm:hidden fixed left-0 right-0 z-[1002] border-t border-border shadow-xl overflow-y-auto animate-fade-in-down"
    style="background-color: hsl(var(--background)); top: calc(57px + env(safe-area-inset-top, 0px)); max-height: calc(100vh - 57px - env(safe-area-inset-top, 0px));"
  >
    <nav class="px-4 py-4 space-y-4">
      <!-- APPEARANCE Section -->
      <div class="animate-fade-in-up" style="animation-delay: 50ms;">
        <p
          class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style="color: hsl(var(--muted-foreground));"
        >
          {$_("header.appearance")}
        </p>

        <!-- Theme Options - Light and Dark -->
        <div class="flex gap-2">
          <!-- Light Mode Button -->
          <button
            onclick={async () => {
              if (isDark) {
                await toggleTheme();
              }
              mobileMenuOpen = false;
            }}
            class="flex-1 h-12 px-4 rounded-xl transition-all font-medium inline-flex items-center gap-2 active:scale-[0.98] cursor-pointer {!isDark
              ? 'border-2'
              : 'border border-input hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
            style={!isDark ? "border-color: hsl(var(--foreground));" : ""}
          >
            {#if !isDark}
              <span
                class="h-5 w-5 rounded-full flex items-center justify-center shrink-0 animate-scale-in"
                style="background-color: hsl(var(--foreground));"
              >
                <Check class="h-3 w-3" style="color: hsl(var(--background));" />
              </span>
            {:else}
              <span
                class="h-5 w-5 rounded-full shrink-0 border-2 border-muted-foreground/30"
              ></span>
            {/if}
            <Sun class="w-4 h-4" aria-hidden="true" />
            <span class="text-sm">{$_("header.lightMode")}</span>
          </button>

          <!-- Dark Mode Button -->
          <button
            onclick={async () => {
              if (!isDark) {
                await toggleTheme();
              }
              mobileMenuOpen = false;
            }}
            class="flex-1 h-12 px-4 rounded-xl transition-all font-medium inline-flex items-center gap-2 active:scale-[0.98] cursor-pointer {isDark
              ? 'border-2'
              : 'border border-input hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
            style={isDark ? "border-color: hsl(var(--foreground));" : ""}
          >
            {#if isDark}
              <span
                class="h-5 w-5 rounded-full flex items-center justify-center shrink-0 animate-scale-in"
                style="background-color: hsl(var(--foreground));"
              >
                <Check class="h-3 w-3" style="color: hsl(var(--background));" />
              </span>
            {:else}
              <span
                class="h-5 w-5 rounded-full shrink-0 border-2 border-muted-foreground/30"
              ></span>
            {/if}
            <Moon class="w-4 h-4" aria-hidden="true" />
            <span class="text-sm">{$_("header.darkMode")}</span>
          </button>
        </div>
      </div>

      <div class="h-px bg-border"></div>

      <!-- HELP & INFO Section -->
      <div class="animate-fade-in-up" style="animation-delay: 100ms;">
        <p
          class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style="color: hsl(var(--muted-foreground));"
        >
          Help & Info
        </p>

        <a
          href="/help"
          onclick={() => (mobileMenuOpen = false)}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all text-left active:scale-[0.98]"
          style="color: hsl(var(--foreground));"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <HelpCircle class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">{$_("sidebar.howToUse")}</span>
        </a>

        <button
          onclick={() => {
            mobileMenuOpen = false;
            openDialog("report-bug");
          }}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all text-left active:scale-[0.98]"
          style="color: hsl(var(--foreground));"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Flag class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">{$_("sidebar.reportBug")}</span>
        </button>

        <button
          onclick={() => {
            mobileMenuOpen = false;
            openDialog("feature-request");
          }}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all text-left active:scale-[0.98]"
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

        <a
          href="/about"
          onclick={() => (mobileMenuOpen = false)}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all text-left active:scale-[0.98]"
          style="color: hsl(var(--foreground));"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Info class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm font-medium">{$_("sidebar.about")}</span>
        </a>
      </div>
    </nav>
  </div>
{/if}
