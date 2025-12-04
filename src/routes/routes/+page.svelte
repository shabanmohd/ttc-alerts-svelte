<script lang="ts">
  import { Search, Train, TramFront, Bus, Moon, Zap, Users } from 'lucide-svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import RouteBadge from '$lib/components/alerts/RouteBadge.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { isAuthenticated, userName, signOut } from '$lib/stores/auth';
  import { activeFilters, setRouteFilter } from '$lib/stores/alerts';
  import { goto } from '$app/navigation';

  // Route data organized by category
  const SUBWAY_LINES = [
    { route: 'Line 1', name: 'Yonge-University' },
    { route: 'Line 2', name: 'Bloor-Danforth' },
    { route: 'Line 4', name: 'Sheppard' }
  ];

  const STREETCAR_ROUTES = [
    { route: '501', name: 'Queen' },
    { route: '503', name: 'Kingston Rd' },
    { route: '504', name: 'King' },
    { route: '505', name: 'Dundas' },
    { route: '506', name: 'Carlton' },
    { route: '507', name: 'Long Branch' },
    { route: '508', name: 'Lake Shore' },
    { route: '509', name: 'Harbourfront' },
    { route: '510', name: 'Spadina' },
    { route: '511', name: 'Bathurst' },
    { route: '512', name: 'St Clair' }
  ];

  const EXPRESS_ROUTES = [
    { route: '900', name: 'Airport Express' },
    { route: '902', name: 'Markham Rd Express' },
    { route: '905', name: 'Eglinton East Express' },
    { route: '907', name: 'Dufferin Express' },
    { route: '913', name: 'Jane Express' },
    { route: '924', name: 'Victoria Park Express' },
    { route: '925', name: 'Don Mills Express' },
    { route: '927', name: 'Highway 27 Express' },
    { route: '929', name: 'Dufferin Express' },
    { route: '935', name: 'Jane Express' },
    { route: '936', name: 'Finch West Express' },
    { route: '939', name: 'Finch Express' },
    { route: '941', name: 'Keele Express' },
    { route: '952', name: 'Lawrence West Express' },
    { route: '953', name: 'Steeles East Express' },
    { route: '954', name: 'Lawrence East Express' },
    { route: '960', name: 'Steeles West Express' },
    { route: '968', name: 'Warden Express' },
    { route: '984', name: 'Sheppard West Express' },
    { route: '985', name: 'Sheppard East Express' },
    { route: '989', name: 'Weston Express' },
    { route: '995', name: 'York Mills Express' },
    { route: '996', name: 'Wilson Express' }
  ];

  const NIGHT_ROUTES = [
    { route: '300', name: 'Bloor-Danforth' },
    { route: '301', name: 'Queen' },
    { route: '302', name: 'Danforth Rd-Kingston Rd' },
    { route: '304', name: 'King' },
    { route: '305', name: 'Dundas' },
    { route: '306', name: 'Carlton' },
    { route: '307', name: 'Bathurst' },
    { route: '310', name: 'Spadina' },
    { route: '312', name: 'St Clair' },
    { route: '313', name: 'Jane' },
    { route: '314', name: 'Glencairn' },
    { route: '315', name: 'Evans' },
    { route: '316', name: 'McCowan' },
    { route: '320', name: 'Yonge' },
    { route: '322', name: 'Coxwell' },
    { route: '324', name: 'Victoria Park' },
    { route: '325', name: 'Don Mills' },
    { route: '329', name: 'Dufferin' },
    { route: '332', name: 'Eglinton West' },
    { route: '334', name: 'Eglinton East' },
    { route: '335', name: 'Jane' },
    { route: '336', name: 'Finch West' },
    { route: '337', name: 'Islington' },
    { route: '339', name: 'Finch East' },
    { route: '341', name: 'Keele' },
    { route: '343', name: 'Kennedy' },
    { route: '352', name: 'Lawrence West' },
    { route: '353', name: 'Steeles East' },
    { route: '354', name: 'Lawrence East' },
    { route: '360', name: 'Steeles West' },
    { route: '363', name: 'Ossington' },
    { route: '368', name: 'Warden' },
    { route: '385', name: 'Sheppard East' }
  ];

  const COMMUNITY_ROUTES = [
    { route: '400', name: 'Lawrence Manor' },
    { route: '402', name: 'Parkdale' },
    { route: '403', name: 'Willowdale' },
    { route: '404', name: 'East York' },
    { route: '405', name: 'Etobicoke North' }
  ];

  // Popular bus routes (high-frequency)
  const POPULAR_BUS_ROUTES = [
    { route: '7', name: 'Bathurst' },
    { route: '25', name: 'Don Mills' },
    { route: '29', name: 'Dufferin' },
    { route: '32', name: 'Eglinton West' },
    { route: '34', name: 'Eglinton East' },
    { route: '35', name: 'Jane' },
    { route: '36', name: 'Finch West' },
    { route: '39', name: 'Finch East' },
    { route: '41', name: 'Keele' },
    { route: '52', name: 'Lawrence West' },
    { route: '54', name: 'Lawrence East' },
    { route: '60', name: 'Steeles West' },
    { route: '63', name: 'Ossington' },
    { route: '84', name: 'Sheppard West' },
    { route: '85', name: 'Sheppard East' },
    { route: '95', name: 'York Mills' },
    { route: '96', name: 'Wilson' },
    { route: '97', name: 'Yonge' },
    { route: '102', name: 'Markham Rd' },
    { route: '129', name: 'McCowan North' },
    { route: '190', name: 'Scarborough Centre Rocket' },
    { route: '191', name: 'Highway 27 Rocket' },
    { route: '199', name: 'Finch Rocket' }
  ];

  let searchQuery = $state('');
  let activeCategory = $state<string | null>(null);

  // All routes combined for search
  const allRoutes = [
    ...SUBWAY_LINES.map(r => ({ ...r, category: 'subway' })),
    ...STREETCAR_ROUTES.map(r => ({ ...r, category: 'streetcar' })),
    ...EXPRESS_ROUTES.map(r => ({ ...r, category: 'express' })),
    ...NIGHT_ROUTES.map(r => ({ ...r, category: 'night' })),
    ...COMMUNITY_ROUTES.map(r => ({ ...r, category: 'community' })),
    ...POPULAR_BUS_ROUTES.map(r => ({ ...r, category: 'bus' }))
  ];

  let filteredRoutes = $derived(
    searchQuery.length > 0
      ? allRoutes.filter(r => 
          r.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : []
  );

  function handleRouteClick(route: string) {
    // Set filter and navigate to home
    setRouteFilter(route);
    goto('/');
  }

  function handleSignIn() {
    // Navigate to preferences for sign in
    goto('/preferences');
  }

  async function handleSignOut() {
    await signOut();
  }

  const categories = [
    { id: 'subway', label: 'Subway', icon: Train, routes: SUBWAY_LINES },
    { id: 'streetcar', label: 'Streetcars', icon: TramFront, routes: STREETCAR_ROUTES },
    { id: 'express', label: 'Express', icon: Zap, routes: EXPRESS_ROUTES },
    { id: 'night', label: 'Night', icon: Moon, routes: NIGHT_ROUTES },
    { id: 'community', label: 'Community', icon: Users, routes: COMMUNITY_ROUTES },
    { id: 'bus', label: 'Popular Bus', icon: Bus, routes: POPULAR_BUS_ROUTES }
  ];
</script>

<svelte:head>
  <title>Routes - TTC Alerts</title>
  <meta name="description" content="Browse all TTC routes - subway, streetcar, bus, express, and night service" />
</svelte:head>

<Header 
  isAuthenticated={$isAuthenticated}
  username={$userName || ''}
  onSignIn={handleSignIn}
  onSignOut={handleSignOut}
/>

<main class="content-area">
  <!-- Search -->
  <div class="mb-6">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {#each filteredRoutes as { route, name } (route)}
              <button
                type="button"
                onclick={() => handleRouteClick(route)}
                class="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-left"
              >
                <RouteBadge {route} size="sm" />
                <span class="text-sm truncate">{name}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Category Quick Jump -->
  <div class="flex flex-wrap gap-2 mb-6">
    {#each categories as { id, label, icon: Icon }}
      <Button
        variant={activeCategory === id ? 'default' : 'outline'}
        size="sm"
        onclick={() => {
          activeCategory = activeCategory === id ? null : id;
          document.getElementById(`category-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      >
        <Icon class="h-4 w-4 mr-1" />
        {label}
      </Button>
    {/each}
  </div>

  <!-- Route Categories -->
  <div class="space-y-8">
    {#each categories as { id, label, icon: Icon, routes }}
      <section id="category-{id}" class="scroll-mt-20">
        <h2 class="text-lg font-semibold flex items-center gap-2 mb-3">
          <Icon class="h-5 w-5" />
          {label}
          <span class="text-sm font-normal text-muted-foreground">({routes.length})</span>
        </h2>
        
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {#each routes as { route, name } (route)}
            <button
              type="button"
              onclick={() => handleRouteClick(route)}
              class="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
            >
              <RouteBadge {route} />
              <span class="text-sm truncate flex-1">{name}</span>
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <!-- Back to Alerts -->
  <div class="mt-8 text-center">
    <Button variant="outline" onclick={() => goto('/')}>
      ← Back to Alerts
    </Button>
  </div>
</main>
