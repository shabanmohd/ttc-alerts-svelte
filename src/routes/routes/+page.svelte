<script lang="ts">
  import {
    Search,
    TrainFrontTunnel,
    TramFront,
    Bus,
    Moon,
    Zap,
    Users,
    LayoutGrid,
  } from "lucide-svelte";
  import Header from "$lib/components/layout/Header.svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import BookmarkRouteButton from "$lib/components/alerts/BookmarkRouteButton.svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Toggle } from "$lib/components/ui/toggle";
  import { isAuthenticated, userName, signOut } from "$lib/stores/auth";
  import { activeFilters, setRouteFilter } from "$lib/stores/alerts";
  import { savedRoutes } from "$lib/stores/savedRoutes";
  import { goto } from "$app/navigation";

  // Route data organized by category
  const SUBWAY_LINES = [
    { route: "Line 1", name: "Yonge-University" },
    { route: "Line 2", name: "Bloor-Danforth" },
    { route: "Line 4", name: "Sheppard" },
    { route: "Line 5", name: "Eglinton" },
    { route: "Line 6", name: "Finch West" },
  ];

  const STREETCAR_ROUTES = [
    { route: "501", name: "Queen" },
    { route: "503", name: "Kingston Rd" },
    { route: "504", name: "King" },
    { route: "505", name: "Dundas" },
    { route: "506", name: "Carlton" },
    { route: "507", name: "Long Branch" },
    { route: "508", name: "Lake Shore" },
    { route: "509", name: "Harbourfront" },
    { route: "510", name: "Spadina" },
    { route: "511", name: "Bathurst" },
    { route: "512", name: "St Clair" },
  ];

  const EXPRESS_ROUTES = [
    { route: "900", name: "Airport Express" },
    { route: "902", name: "Markham Rd Express" },
    { route: "905", name: "Eglinton East Express" },
    { route: "907", name: "Dufferin Express" },
    { route: "913", name: "Jane Express" },
    { route: "924", name: "Victoria Park Express" },
    { route: "925", name: "Don Mills Express" },
    { route: "927", name: "Highway 27 Express" },
    { route: "929", name: "Dufferin Express" },
    { route: "935", name: "Jane Express" },
    { route: "936", name: "Finch West Express" },
    { route: "939", name: "Finch Express" },
    { route: "941", name: "Keele Express" },
    { route: "952", name: "Lawrence West Express" },
    { route: "953", name: "Steeles East Express" },
    { route: "954", name: "Lawrence East Express" },
    { route: "960", name: "Steeles West Express" },
    { route: "968", name: "Warden Express" },
    { route: "984", name: "Sheppard West Express" },
    { route: "985", name: "Sheppard East Express" },
    { route: "989", name: "Weston Express" },
    { route: "995", name: "York Mills Express" },
    { route: "996", name: "Wilson Express" },
  ];

  const NIGHT_ROUTES = [
    { route: "300", name: "Bloor-Danforth" },
    { route: "302", name: "Danforth Rd-Kingston Rd" },
    { route: "307", name: "Bathurst" },
    { route: "313", name: "Jane" },
    { route: "314", name: "Glencairn" },
    { route: "315", name: "Evans" },
    { route: "316", name: "McCowan" },
    { route: "320", name: "Yonge" },
    { route: "322", name: "Coxwell" },
    { route: "324", name: "Victoria Park" },
    { route: "325", name: "Don Mills" },
    { route: "329", name: "Dufferin" },
    { route: "332", name: "Eglinton West" },
    { route: "334", name: "Eglinton East" },
    { route: "335", name: "Jane" },
    { route: "336", name: "Finch West" },
    { route: "337", name: "Islington" },
    { route: "339", name: "Finch East" },
    { route: "341", name: "Keele" },
    { route: "343", name: "Kennedy" },
    { route: "352", name: "Lawrence West" },
    { route: "353", name: "Steeles East" },
    { route: "354", name: "Lawrence East" },
    { route: "360", name: "Steeles West" },
    { route: "363", name: "Ossington" },
    { route: "368", name: "Warden" },
    { route: "385", name: "Sheppard East" },
  ];

  // Blue Night Streetcar routes (replace streetcar service at night)
  const NIGHT_STREETCAR_ROUTES = [
    { route: "301", name: "Queen" },
    { route: "304", name: "King" },
    { route: "305", name: "Dundas" },
    { route: "306", name: "Carlton" },
    { route: "310", name: "Spadina" },
    { route: "312", name: "St Clair" },
  ];

  const COMMUNITY_ROUTES = [
    { route: "400", name: "Lawrence Manor" },
    { route: "402", name: "Parkdale" },
    { route: "403", name: "South Don Mills" },
    { route: "404", name: "East York" },
    { route: "405", name: "Etobicoke" },
    { route: "406", name: "Scarborough-Guildwood" },
  ];

  // All regular bus routes (1-191) - excludes night, express, community, streetcar
  const REGULAR_BUS_ROUTES = [
    { route: "7", name: "Bathurst" },
    { route: "8", name: "Broadview" },
    { route: "9", name: "Bellamy" },
    { route: "10", name: "Van Horne" },
    { route: "11", name: "Bayview" },
    { route: "12", name: "Kingston Rd" },
    { route: "13", name: "Avenue Rd" },
    { route: "14", name: "Glencairn" },
    { route: "15", name: "Evans" },
    { route: "16", name: "McCowan" },
    { route: "17", name: "Birchmount" },
    { route: "19", name: "Bay" },
    { route: "20", name: "Cliffside" },
    { route: "21", name: "Brimley" },
    { route: "22", name: "Coxwell" },
    { route: "23", name: "Dawes" },
    { route: "24", name: "Victoria Park" },
    { route: "25", name: "Don Mills" },
    { route: "26", name: "Dupont" },
    { route: "28", name: "Bayview South" },
    { route: "29", name: "Dufferin" },
    { route: "30", name: "High Park North" },
    { route: "31", name: "Greenwood" },
    { route: "32", name: "Eglinton West" },
    { route: "33", name: "Forest Hill" },
    { route: "34", name: "Eglinton East" },
    { route: "35", name: "Jane" },
    { route: "36", name: "Finch West" },
    { route: "37", name: "Islington" },
    { route: "38", name: "Highland Creek" },
    { route: "39", name: "Finch East" },
    { route: "40", name: "Junction-Dundas West" },
    { route: "41", name: "Keele" },
    { route: "42", name: "Cummer" },
    { route: "43", name: "Kennedy" },
    { route: "44", name: "Kipling South" },
    { route: "45", name: "Kipling" },
    { route: "46", name: "Martin Grove" },
    { route: "47", name: "Lansdowne" },
    { route: "48", name: "Rathburn" },
    { route: "49", name: "Bloor West" },
    { route: "50", name: "Burnhamthorpe" },
    { route: "51", name: "Leslie" },
    { route: "52", name: "Lawrence West" },
    { route: "53", name: "Steeles East" },
    { route: "54", name: "Lawrence East" },
    { route: "55", name: "Warren Park" },
    { route: "56", name: "Leaside" },
    { route: "57", name: "Midland" },
    { route: "59", name: "Maple Leaf" },
    { route: "60", name: "Steeles West" },
    { route: "61", name: "Avenue Rd North" },
    { route: "62", name: "Mortimer" },
    { route: "63", name: "Ossington" },
    { route: "64", name: "Main" },
    { route: "65", name: "Parliament" },
    { route: "66", name: "Prince Edward" },
    { route: "67", name: "Pharmacy" },
    { route: "68", name: "Warden" },
    { route: "69", name: "Warden South" },
    { route: "70", name: "O'Connor" },
    { route: "71", name: "Runnymede" },
    { route: "72", name: "Pape" },
    { route: "73", name: "Royal York" },
    { route: "74", name: "Mount Pleasant" },
    { route: "75", name: "Sherbourne" },
    { route: "76", name: "Royal York South" },
    { route: "77", name: "Swansea" },
    { route: "78", name: "St Andrews" },
    { route: "79", name: "Scarlett Rd" },
    { route: "80", name: "Queensway" },
    { route: "82", name: "Rosedale" },
    { route: "83", name: "Jones" },
    { route: "84", name: "Sheppard West" },
    { route: "85", name: "Sheppard East" },
    { route: "86", name: "Scarborough" },
    { route: "87", name: "Cosburn" },
    { route: "88", name: "South Leaside" },
    { route: "89", name: "Weston" },
    { route: "90", name: "Vaughan" },
    { route: "91", name: "Woodbine" },
    { route: "92", name: "Woodbine South" },
    { route: "93", name: "Parkview Hills" },
    { route: "94", name: "Wellesley" },
    { route: "95", name: "York Mills" },
    { route: "96", name: "Wilson" },
    { route: "97", name: "Yonge" },
    { route: "98", name: "Willowdale-Senlac" },
    { route: "99", name: "Arrow Rd" },
    { route: "100", name: "Flemingdon Park" },
    { route: "101", name: "Downsview Park" },
    { route: "102", name: "Markham Rd" },
    { route: "103", name: "Mount Pleasant North" },
    { route: "104", name: "Faywood" },
    { route: "105", name: "Dufferin North" },
    { route: "106", name: "Sentinel" },
    { route: "107", name: "Alness-Chesswood" },
    { route: "108", name: "Driftwood" },
    { route: "109", name: "Ranee" },
    { route: "110", name: "Islington South" },
    { route: "111", name: "East Mall" },
    { route: "112", name: "West Mall" },
    { route: "113", name: "Danforth" },
    { route: "114", name: "Queens Quay East" },
    { route: "115", name: "Silver Hills" },
    { route: "116", name: "Morningside" },
    { route: "117", name: "Birchmount South" },
    { route: "118", name: "Thistle Down" },
    { route: "119", name: "Torbarrie" },
    { route: "120", name: "Calvington" },
    { route: "121", name: "Esplanade-River" },
    { route: "122", name: "Graydon Hall" },
    { route: "123", name: "Sherway" },
    { route: "124", name: "Sunnybrook" },
    { route: "125", name: "Drewry" },
    { route: "126", name: "Christie" },
    { route: "127", name: "Davenport" },
    { route: "129", name: "McCowan North" },
    { route: "130", name: "Middlefield" },
    { route: "131", name: "Nugget" },
    { route: "132", name: "Milner" },
    { route: "133", name: "Neilson" },
    { route: "134", name: "Progress" },
    { route: "135", name: "Gerrard" },
    { route: "149", name: "Etobicoke-Bloor" },
    { route: "154", name: "Curran Hall" },
    { route: "160", name: "Bathurst North" },
    { route: "161", name: "Rogers Rd" },
    { route: "162", name: "Lawrence-Donway" },
    { route: "164", name: "Castlefield" },
    { route: "165", name: "Weston Rd North" },
    { route: "166", name: "Toryork" },
    { route: "167", name: "Pharmacy North" },
    { route: "168", name: "Symington" },
    { route: "169", name: "Huntingwood" },
    { route: "171", name: "Mount Dennis" },
    { route: "184", name: "Ancaster Park" },
    { route: "185", name: "Sheppard Central" },
    { route: "189", name: "Stockyards" },
    { route: "190", name: "Scarborough Centre Rocket" },
    { route: "191", name: "Highway 27 Rocket" },
  ];

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
    ...SUBWAY_LINES.map((r) => ({ ...r, category: "subway" })),
    ...STREETCAR_ROUTES.map((r) => ({ ...r, category: "streetcar" })),
    ...EXPRESS_ROUTES.map((r) => ({ ...r, category: "express" })),
    ...NIGHT_ROUTES.map((r) => ({ ...r, category: "night-bus" })),
    ...NIGHT_STREETCAR_ROUTES.map((r) => ({
      ...r,
      category: "night-streetcar",
    })),
    ...COMMUNITY_ROUTES.map((r) => ({ ...r, category: "community" })),
    ...REGULAR_BUS_ROUTES.map((r) => ({ ...r, category: "bus" })),
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

  async function handleSignOut() {
    await signOut();
  }

  const categories = [
    { id: "all", label: "All", icon: LayoutGrid, routes: [] }, // Special "All" option
    {
      id: "subway",
      label: "Subway",
      icon: TrainFrontTunnel,
      routes: SUBWAY_LINES,
    },
    {
      id: "streetcar",
      label: "Streetcars",
      icon: TramFront,
      routes: STREETCAR_ROUTES,
    },
    { id: "bus", label: "Regular Bus", icon: Bus, routes: REGULAR_BUS_ROUTES },
    { id: "express", label: "Express Bus", icon: Zap, routes: EXPRESS_ROUTES },
    {
      id: "night-bus",
      label: "Blue Night Bus",
      icon: Moon,
      routes: NIGHT_ROUTES,
    },
    {
      id: "night-streetcar",
      label: "Blue Night Streetcar",
      icon: Moon,
      routes: NIGHT_STREETCAR_ROUTES,
    },
    {
      id: "community",
      label: "Community Bus",
      icon: Users,
      routes: COMMUNITY_ROUTES,
    },
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

<svelte:head>
  <title>Routes - TTC Alerts</title>
  <meta
    name="description"
    content="Browse all TTC routes - subway, streetcar, bus, express, and night service"
  />
</svelte:head>

<Header
  isAuthenticated={$isAuthenticated}
  username={$userName || ""}
  onSignOut={handleSignOut}
/>

<main class="content-area">
  <!-- Search -->
  <div class="mb-6">
    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 flex-shrink-0 text-muted-foreground"
      />
      <Input
        type="text"
        placeholder="Search routes by number or name..."
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
            {#each filteredRoutes as { route, name, category } (route)}
              {@const routeType =
                category === "subway"
                  ? "subway"
                  : category === "streetcar" || category === "night-streetcar"
                    ? "streetcar"
                    : "bus"}
              <div
                class="flex items-center gap-1 p-2 rounded-md border bg-card hover:bg-accent transition-colors"
              >
                <button
                  type="button"
                  onclick={() => handleRouteClick(route)}
                  class="flex items-center gap-2 text-left"
                >
                  <RouteBadge {route} size="sm" />
                  <span class="text-sm">{name}</span>
                </button>
                <BookmarkRouteButton
                  {route}
                  {name}
                  type={routeType}
                  size="sm"
                />
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Category Filter Toggles -->
  <div class="flex flex-wrap gap-2 mb-6">
    {#each categories as { id, label, icon: Icon }}
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
        {label}
      </button>
    {/each}
  </div>

  <!-- Route Categories -->
  <div class="space-y-8">
    {#each displayCategories as { id, label, icon: Icon, routes }}
      {@const routeType =
        id === "subway"
          ? "subway"
          : id === "streetcar" || id === "night-streetcar"
            ? "streetcar"
            : "bus"}
      <section id="category-{id}" class="scroll-mt-20">
        <h2 class="text-lg font-semibold flex items-center gap-2 mb-3">
          <Icon class="h-5 w-5" />
          {label}
          <span class="text-sm font-normal text-muted-foreground"
            >({routes.length})</span
          >
        </h2>

        <div class="flex flex-wrap gap-2">
          {#each routes as { route, name } (route)}
            <div
              class="flex items-center gap-1 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <button
                type="button"
                onclick={() => handleRouteClick(route)}
                class="flex items-center gap-2 text-left"
              >
                <RouteBadge {route} />
                <span class="text-sm">{name}</span>
              </button>
              <BookmarkRouteButton {route} {name} type={routeType} size="sm" />
            </div>
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
