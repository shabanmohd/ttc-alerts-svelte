<script lang="ts">
  import { Search, MapPin, Loader2, X } from "lucide-svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import {
    initStopsDB,
    searchStops,
    findNearbyStops,
    type TTCStop,
  } from "$lib/data/stops-db";
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import BookmarkStopButton from "./BookmarkStopButton.svelte";

  interface Props {
    onSelect?: (stop: TTCStop) => void;
    onClose?: () => void;
    placeholder?: string;
    showNearbyButton?: boolean;
    showBookmarkButton?: boolean;
    autoFocus?: boolean;
  }

  let {
    onSelect,
    onClose,
    placeholder = "Search by name or stop ID...",
    showNearbyButton = true,
    showBookmarkButton = true,
    autoFocus = false,
  }: Props = $props();

  let query = $state("");
  let results = $state<TTCStop[]>([]);
  let isLoading = $state(false);
  let isLoadingNearby = $state(false);
  let error = $state<string | null>(null);
  let isInitialized = $state(false);
  let showResults = $state(false);
  let inputRef = $state<HTMLInputElement | null>(null);
  let containerRef = $state<HTMLDivElement | null>(null);
  let highlightedIndex = $state(-1);
  let hasSearched = $state(false);
  let isHighlighted = $state(false);

  // Export focus function for parent components
  export function focus() {
    inputRef?.focus();
    // Trigger highlight animation
    isHighlighted = true;
    setTimeout(() => {
      isHighlighted = false;
    }, 600);
  }

  // Handle click outside to close dropdown
  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      showResults = false;
      highlightedIndex = -1;
    }
  }

  // Handle scroll to close dropdown (but not when scrolling inside the dropdown itself)
  function handleScroll(event: Event) {
    // Don't close if scrolling inside the dropdown results
    const target = event.target;
    // Check if target is an Element with closest method (not Document or Window)
    if (target instanceof Element && target.closest("[data-stop-results]")) {
      return;
    }
    if (showResults) {
      showResults = false;
      highlightedIndex = -1;
    }
  }

  // Initialize database on mount
  onMount(async () => {
    if (browser) {
      document.addEventListener("click", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
      // Auto-focus input for mobile keyboard trigger
      if (autoFocus) {
        setTimeout(() => inputRef?.focus(), 100);
      }
    }
    try {
      await initStopsDB();
      isInitialized = true;
    } catch (e) {
      error = "Failed to load stops database";
      console.error(e);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    }
  });

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;

  async function handleInput() {
    clearTimeout(searchTimeout);
    highlightedIndex = -1;

    if (!query || query.length < 2) {
      results = [];
      showResults = false;
      hasSearched = false;
      return;
    }

    searchTimeout = setTimeout(async () => {
      isLoading = true;
      try {
        results = await searchStops(query, 15);
        showResults = true;
        hasSearched = true;
        error = null;
      } catch (e) {
        error = "Search failed";
        console.error("Stop search error:", e);
      } finally {
        isLoading = false;
      }
    }, 200);
  }

  async function handleNearbyClick() {
    if (!navigator.geolocation) {
      error = "Geolocation not supported";
      return;
    }

    isLoadingNearby = true;
    error = null;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const nearby = await findNearbyStops(
            position.coords.latitude,
            position.coords.longitude,
            1, // 1km radius
            15
          );
          results = nearby.map(({ distance, ...stop }) => stop);
          showResults = true;
          hasSearched = true;
          query = "";
          highlightedIndex = -1;
        } catch (e) {
          error = "Failed to find nearby stops";
          console.error(e);
        } finally {
          isLoadingNearby = false;
        }
      },
      (geoError) => {
        isLoadingNearby = false;
        if (geoError.code === geoError.PERMISSION_DENIED) {
          error = "Location access denied";
        } else {
          error = "Could not get location";
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function selectStop(stop: TTCStop) {
    showResults = false;
    query = "";
    results = [];
    highlightedIndex = -1;
    hasSearched = false;
    onSelect?.(stop);
  }

  function clearSearch() {
    query = "";
    results = [];
    showResults = false;
    highlightedIndex = -1;
    hasSearched = false;
    inputRef?.focus();
  }

  function handleFocus() {
    if (results.length > 0 || hasSearched) {
      showResults = true;
    }
  }

  function handleBlur(event: FocusEvent) {
    // Don't hide if clicking on results
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Element &&
      relatedTarget.closest("[data-stop-results]")
    ) {
      return;
    }
    // Delay hiding to allow click events
    setTimeout(() => {
      showResults = false;
      highlightedIndex = -1;
    }, 150);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!showResults || results.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        highlightedIndex = (highlightedIndex + 1) % results.length;
        scrollToHighlighted();
        break;
      case "ArrowUp":
        event.preventDefault();
        highlightedIndex =
          highlightedIndex <= 0 ? results.length - 1 : highlightedIndex - 1;
        scrollToHighlighted();
        break;
      case "Enter":
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          selectStop(results[highlightedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        if (showResults) {
          showResults = false;
          highlightedIndex = -1;
        } else if (onClose) {
          onClose();
        }
        break;
    }
  }

  function scrollToHighlighted() {
    const container = document.querySelector("[data-stop-results]");
    const highlighted = container?.querySelector(
      `[data-index="${highlightedIndex}"]`
    );
    highlighted?.scrollIntoView({ block: "nearest" });
  }

  function getStopIcon(type: TTCStop["type"]) {
    switch (type) {
      case "subway":
        return "🚇";
      case "streetcar":
        return "🚋";
      default:
        return "🚌";
    }
  }
</script>

<div class="relative w-full z-0" bind:this={containerRef}>
  {#if onClose}
    <div class="flex items-center justify-between mb-3 p-3 pb-0">
      <h3 class="font-semibold">Add a Stop</h3>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        onclick={onClose}
        aria-label="Close"
      >
        <X class="h-4 w-4" />
      </Button>
    </div>
  {/if}
  <div class="relative flex items-center gap-2 {onClose ? 'px-3 pb-3' : ''}">
    <div class="relative flex-1">
      <Search
        class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 flex-shrink-0 -translate-y-1/2"
      />
      <Input
        bind:ref={inputRef}
        type="text"
        bind:value={query}
        oninput={handleInput}
        onfocus={handleFocus}
        onblur={handleBlur}
        onkeydown={handleKeydown}
        {placeholder}
        disabled={!isInitialized}
        class="pl-9 pr-8 {isHighlighted ? 'focus-highlight' : ''}"
        aria-label="Search for a TTC stop"
        aria-autocomplete="list"
        aria-expanded={showResults}
        aria-activedescendant={highlightedIndex >= 0
          ? `stop-option-${highlightedIndex}`
          : undefined}
      />
      {#if query || isLoading}
        <button
          type="button"
          onclick={clearSearch}
          class="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 p-1"
          aria-label="Clear search"
        >
          {#if isLoading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <X class="h-4 w-4" />
          {/if}
        </button>
      {/if}
    </div>

    {#if showNearbyButton}
      <Button
        variant="outline"
        size="icon"
        onclick={handleNearbyClick}
        disabled={!isInitialized || isLoadingNearby}
        aria-label="Find nearby stops"
        title="Find stops near me"
      >
        {#if isLoadingNearby}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <MapPin class="h-4 w-4" />
        {/if}
      </Button>
    {/if}
  </div>

  {#if error}
    <p class="text-destructive mt-1 text-sm">{error}</p>
  {/if}

  {#if showResults}
    <div
      data-stop-results
      class="absolute top-full z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border shadow-lg stop-results-list"
      style="background-color: hsl(var(--popover)); color: hsl(var(--popover-foreground)); border-color: hsl(var(--border));"
      role="listbox"
    >
      {#if results.length > 0}
        {#each results as stop, index (stop.id)}
          <button
            id="stop-option-{index}"
            data-index={index}
            type="button"
            role="option"
            aria-selected={highlightedIndex === index}
            onclick={() => selectStop(stop)}
            class="stop-result-item flex w-full items-start gap-3 px-3 py-2.5 text-left outline-none transition-colors"
            class:highlighted={highlightedIndex === index}
          >
            <MapPin
              class="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="truncate text-sm font-medium">
                  {stop.name}
                </p>
                {#if stop.dir}
                  {@const dirColor =
                    stop.dir === "Eastbound"
                      ? "bg-sky-600/20 text-sky-700 dark:text-sky-400 border-sky-600/40"
                      : stop.dir === "Westbound"
                        ? "bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/40"
                        : stop.dir === "Northbound"
                          ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40"
                          : "bg-rose-600/20 text-rose-700 dark:text-rose-400 border-rose-600/40"}
                  <span
                    class="text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 uppercase {dirColor}"
                  >
                    {stop.dir}
                  </span>
                {/if}
                <span class="text-xs text-muted-foreground/60 flex-shrink-0"
                  >#{stop.id}</span
                >
              </div>
              <div class="mt-1 flex flex-wrap gap-1">
                {#each stop.routes.slice(0, 5) as route}
                  <RouteBadge {route} size="sm" />
                {/each}
                {#if stop.routes.length > 5}
                  <span class="text-muted-foreground text-xs"
                    >+{stop.routes.length - 5} more</span
                  >
                {/if}
              </div>
            </div>
            {#if showBookmarkButton}
              <BookmarkStopButton {stop} size="sm" />
            {/if}
          </button>
        {/each}
      {:else if hasSearched && !isLoading}
        <div class="text-muted-foreground px-3 py-4 text-center text-sm">
          <p>No stops found for "{query}"</p>
          <p class="mt-1 text-xs">
            Try a different search term or use the nearby button
          </p>
        </div>
      {/if}
    </div>
  {/if}

  {#if !isInitialized && !error}
    <p class="text-muted-foreground mt-1 text-sm">Loading stops database...</p>
  {/if}
</div>

<style>
  .stop-result-item {
    background-color: transparent;
  }

  .stop-result-item:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }

  .stop-result-item.highlighted {
    background-color: rgba(255, 255, 255, 0.12);
  }

  :global(.light) .stop-result-item:hover,
  :root:not(.dark) .stop-result-item:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  :global(.light) .stop-result-item.highlighted,
  :root:not(.dark) .stop-result-item.highlighted {
    background-color: rgba(0, 0, 0, 0.08);
  }

  /* Visible scrollbar for better UX */
  .stop-results-list {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  }

  .stop-results-list::-webkit-scrollbar {
    width: 8px;
  }

  .stop-results-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .stop-results-list::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3);
    border-radius: 4px;
  }

  .stop-results-list::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground) / 0.5);
  }

  /* Focus highlight animation is defined globally in layout.css */
</style>
