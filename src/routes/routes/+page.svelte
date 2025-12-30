<script lang="ts">
  import { _ } from "svelte-i18n";
  import {
    Search,
    TrainFrontTunnel,
    TramFront,
    Bus,
    Moon,
    Zap,
    Users,
    LayoutGrid,
    ArrowRightLeft,
  } from "lucide-svelte";
  import Header from "$lib/components/layout/Header.svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import BookmarkRouteButton from "$lib/components/alerts/BookmarkRouteButton.svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Toggle } from "$lib/components/ui/toggle";
  import { activeFilters, setRouteFilter } from "$lib/stores/alerts";
  import { savedRoutes } from "$lib/stores/savedRoutes";
  import { goto } from "$app/navigation";
  import SEO from "$lib/components/SEO.svelte";

  // Import route data from JSON (auto-updated weekly from NextBus API)
  import routeData from "$lib/data/ttc-routes.json";

  // Type for route entries
  type RouteEntry = { route: string; name: string };

  // Route data from JSON file (updated weekly via GitHub Actions)
  const SUBWAY_LINES: RouteEntry[] = routeData.categories.subway;
  const STREETCAR_ROUTES: RouteEntry[] = routeData.categories.streetcar;
  const EXPRESS_ROUTES: RouteEntry[] = routeData.categories.express;
  const NIGHT_ROUTES: RouteEntry[] = routeData.categories.night;
  const NIGHT_STREETCAR_ROUTES: RouteEntry[] =
    routeData.categories.nightStreetcar;
  const COMMUNITY_ROUTES: RouteEntry[] = routeData.categories.community;
  const REGULAR_BUS_ROUTES: RouteEntry[] = routeData.categories.bus;
  const SHUTTLE_ROUTES: RouteEntry[] = routeData.categories.shuttle;

  let searchQuery = $state("");
  let activeCategory = $state<string | null>(null);

  // Get set of bookmarked route IDs for fast lookup
  let bookmarkedRouteIds = $derived(new Set($savedRoutes.map((r) => r.id)));

  // Sort routes with bookmarked first
  function sortWithBookmarksFirst<T extends { route: string }>(
    routes: T[]
  ): T[] {
    return [...routes].sort((a, b) => {
      const aBookmarked = bookmarkedRouteIds.has(a.route);
      const bBookmarked = bookmarkedRouteIds.has(b.route);
      if (aBookmarked && !bBookmarked) return -1;
      if (!aBookmarked && bBookmarked) return 1;
      return 0; // Keep original order for routes with same bookmark status
    });
  }

  // All routes combined for search
  const allRoutesForSearch = [
    ...SUBWAY_LINES.map((r) => ({ ...r, category: "subway" as const })),
    ...STREETCAR_ROUTES.map((r) => ({ ...r, category: "streetcar" as const })),
    ...EXPRESS_ROUTES.map((r) => ({ ...r, category: "express" as const })),
    ...NIGHT_ROUTES.map((r) => ({ ...r, category: "night-bus" as const })),
    ...NIGHT_STREETCAR_ROUTES.map((r) => ({
      ...r,
      category: "night-streetcar" as const,
    })),
    ...COMMUNITY_ROUTES.map((r) => ({ ...r, category: "community" as const })),
    ...REGULAR_BUS_ROUTES.map((r) => ({ ...r, category: "bus" as const })),
    ...SHUTTLE_ROUTES.map((r) => ({ ...r, category: "shuttle" as const })),
  ];

  let filteredRoutes = $derived(
    searchQuery.length > 0
      ? sortWithBookmarksFirst(
          allRoutesForSearch.filter(
            (r) =>
              r.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
      : []
  );

  function handleRouteClick(route: string) {
    // Navigate to route detail page
    goto(`/routes/${encodeURIComponent(route)}`);
  }

  // Build categories dynamically, filtering out empty ones
  const categories = [
    {
      id: "all",
      labelKey: "routeCategories.all",
      icon: LayoutGrid,
      routes: [],
    }, // Special "All" option
    {
      id: "subway",
      labelKey: "routeCategories.subway",
      icon: TrainFrontTunnel,
      routes: SUBWAY_LINES,
    },
    {
      id: "streetcar",
      labelKey: "routeCategories.streetcars",
      icon: TramFront,
      routes: STREETCAR_ROUTES,
    },
    {
      id: "bus",
      labelKey: "routeCategories.regularBus",
      icon: Bus,
      routes: REGULAR_BUS_ROUTES,
    },
    {
      id: "express",
      labelKey: "routeCategories.expressBus",
      icon: Zap,
      routes: EXPRESS_ROUTES,
    },
    {
      id: "night-bus",
      labelKey: "routeCategories.blueNightBus",
      icon: Moon,
      routes: NIGHT_ROUTES,
    },
    {
      id: "night-streetcar",
      labelKey: "routeCategories.blueNightStreetcar",
      icon: Moon,
      routes: NIGHT_STREETCAR_ROUTES,
    },
    // Community routes - only show if any exist
    ...(COMMUNITY_ROUTES.length > 0
      ? [
          {
            id: "community",
            labelKey: "routeCategories.communityBus",
            icon: Users,
            routes: COMMUNITY_ROUTES,
          },
        ]
      : []),
    // Shuttle routes - only show if any exist
    ...(SHUTTLE_ROUTES.length > 0
      ? [
          {
            id: "shuttle",
            labelKey: "routeCategories.shuttle",
            icon: ArrowRightLeft,
            routes: SHUTTLE_ROUTES,
          },
        ]
      : []),
  ];

  // Filtered categories based on selection (skip "all" for section display)
  // Also sorts routes with bookmarked first
  let displayCategories = $derived(
    (activeCategory === "all" || activeCategory === null
      ? categories.filter((c) => c.id !== "all")
      : categories.filter((c) => c.id === activeCategory)
    ).map((c) => ({
      ...c,
      routes: sortWithBookmarksFirst(c.routes),
    }))
  );
</script>

<SEO
  title={$_("pages.routes.title")}
  description="Browse all TTC routes - subway lines, streetcar routes, express buses, regular bus service, and Blue Night routes. Save your favorites for quick access."
/>

<Header />

<main class="content-area">
  <!-- Search -->
  <div class="mb-6">
    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 flex-shrink-0 text-muted-foreground"
      />
      <Input
        type="text"
        placeholder={$_("search.placeholderRoute")}
        bind:value={searchQuery}
        class="pl-9"
      />
    </div>

    <!-- Search Results -->
    {#if searchQuery.length > 0}
      <div class="mt-3 rounded-lg border bg-card p-4">
        {#if filteredRoutes.length === 0}
          <p class="text-muted-foreground text-sm text-center py-4">
            No routes found for "{searchQuery}"
          </p>
        {:else}
          <div class="flex flex-wrap gap-2">
            {#each filteredRoutes as { route, name, category }, i (route)}
              {@const routeType =
                category === "subway"
                  ? "subway"
                  : category === "streetcar" || category === "night-streetcar"
                    ? "streetcar"
                    : "bus"}
              <button
                type="button"
                onclick={() => handleRouteClick(route)}
                class="route-card flex items-center gap-1 p-2 rounded-md border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors animate-fade-in text-left"
                style="animation-delay: {Math.min(i * 30, 150)}ms"
              >
                <span class="flex items-center gap-2">
                  <RouteBadge {route} size="sm" />
                  <span class="text-sm">{name}</span>
                </span>
                <BookmarkRouteButton
                  {route}
                  {name}
                  type={routeType}
                  size="sm"
                />
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Category Filter Toggles -->
  <div class="flex flex-wrap gap-2 mb-6">
    {#each categories as { id, labelKey, icon: Icon }}
      {@const isSelected =
        activeCategory === id || (id === "all" && activeCategory === null)}
      <button
        type="button"
        onclick={() => {
          if (id === "all") {
            activeCategory = null;
          } else {
            activeCategory = activeCategory === id ? null : id;
          }
        }}
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-3 border"
        style={isSelected
          ? "background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary));"
          : ""}
      >
        <Icon class="h-4 w-4" />
        {$_(labelKey)}
      </button>
    {/each}
  </div>

  <!-- Route Categories -->
  <div class="space-y-8">
    {#each displayCategories as { id, labelKey, icon: Icon, routes }}
      {@const routeType =
        id === "subway"
          ? "subway"
          : id === "streetcar" || id === "night-streetcar"
            ? "streetcar"
            : "bus"}
      <section id="category-{id}" class="scroll-mt-20">
        <h2 class="text-lg font-semibold flex items-center gap-2 mb-3">
          <Icon class="h-5 w-5" />
          {$_(labelKey)}
          <span class="text-sm font-normal text-muted-foreground"
            >({routes.length})</span
          >
        </h2>

        <div class="flex flex-wrap gap-2">
          {#each routes as { route, name }, i (route)}
            <button
              type="button"
              onclick={() => handleRouteClick(route)}
              class="route-card flex items-center gap-1 p-3 rounded-lg border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors animate-fade-in text-left"
              style="animation-delay: {Math.min(i * 20, 200)}ms"
            >
              <span class="flex items-center gap-2">
                <RouteBadge {route} />
                <span class="text-sm">{name}</span>
              </span>
              <BookmarkRouteButton {route} {name} type={routeType} size="sm" />
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <!-- Back to Home -->
  <div class="mt-8 text-center">
    <Button variant="outline" onclick={() => goto("/")}>← Back to Home</Button>
  </div>
</main>

<style>
  /* Route card styling with proper cursor and tap feedback */
  .route-card {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    background: none;
    font: inherit;
  }

  .route-card:active {
    transform: scale(0.98);
    background-color: hsl(var(--accent));
  }

  .route-card:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  /* Touch feedback animation */
  @media (hover: none) {
    .route-card:active {
      transition:
        transform 0.1s ease-out,
        background-color 0.1s ease-out;
    }
  }
</style>
