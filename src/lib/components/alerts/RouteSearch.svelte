<script lang="ts">
  import { Search, X, Bookmark } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { Input } from '$lib/components/ui/input';
  import { savedRoutes } from '$lib/stores/savedRoutes';
  import RouteBadge from './RouteBadge.svelte';

  interface Props {
    onSelect?: (route: RouteInfo) => void;
    onClose?: () => void;
    placeholder?: string;
  }

  interface RouteInfo {
    route: string;
    name: string;
    category: string;
  }

  let { 
    onSelect,
    onClose,
    placeholder = 'Search routes by number or name...'
  }: Props = $props();

  // Route data - Complete TTC route list
  const SUBWAY_LINES = [
    { route: 'Line 1', name: 'Yonge-University', category: 'subway' },
    { route: 'Line 2', name: 'Bloor-Danforth', category: 'subway' },
    { route: 'Line 4', name: 'Sheppard', category: 'subway' }
  ];

  const STREETCAR_ROUTES = [
    { route: '501', name: 'Queen', category: 'streetcar' },
    { route: '503', name: 'Kingston Rd', category: 'streetcar' },
    { route: '504', name: 'King', category: 'streetcar' },
    { route: '505', name: 'Dundas', category: 'streetcar' },
    { route: '506', name: 'Carlton', category: 'streetcar' },
    { route: '507', name: 'Long Branch', category: 'streetcar' },
    { route: '508', name: 'Lake Shore', category: 'streetcar' },
    { route: '509', name: 'Harbourfront', category: 'streetcar' },
    { route: '510', name: 'Spadina', category: 'streetcar' },
    { route: '511', name: 'Bathurst', category: 'streetcar' },
    { route: '512', name: 'St Clair', category: 'streetcar' }
  ];

  const EXPRESS_ROUTES = [
    { route: '900', name: 'Airport Express', category: 'express' },
    { route: '902', name: 'Markham Rd Express', category: 'express' },
    { route: '903', name: 'Kennedy-Scarborough Express', category: 'express' },
    { route: '904', name: 'Sheppard-Kennedy Express', category: 'express' },
    { route: '905', name: 'Eglinton East Express', category: 'express' },
    { route: '924', name: 'Victoria Park Express', category: 'express' },
    { route: '925', name: 'Don Mills Express', category: 'express' },
    { route: '927', name: 'Highway 27 Express', category: 'express' },
    { route: '929', name: 'Dufferin Express', category: 'express' },
    { route: '935', name: 'Jane Express', category: 'express' },
    { route: '937', name: 'Islington Express', category: 'express' },
    { route: '938', name: 'Highland Creek Express', category: 'express' },
    { route: '939', name: 'Finch Express', category: 'express' },
    { route: '941', name: 'Keele Express', category: 'express' },
    { route: '944', name: 'Kipling South Express', category: 'express' },
    { route: '945', name: 'Kipling Express', category: 'express' },
    { route: '952', name: 'Lawrence West Express', category: 'express' },
    { route: '953', name: 'Steeles East Express', category: 'express' },
    { route: '954', name: 'Lawrence East Express', category: 'express' },
    { route: '960', name: 'Steeles West Express', category: 'express' },
    { route: '968', name: 'Warden Express', category: 'express' },
    { route: '984', name: 'Sheppard West Express', category: 'express' },
    { route: '985', name: 'Sheppard East Express', category: 'express' },
    { route: '986', name: 'Scarborough Express', category: 'express' },
    { route: '989', name: 'Weston Express', category: 'express' },
    { route: '995', name: 'York Mills Express', category: 'express' },
    { route: '996', name: 'Wilson Express', category: 'express' }
  ];

  const BUS_ROUTES = [
    { route: '7', name: 'Bathurst', category: 'bus' },
    { route: '8', name: 'Broadview', category: 'bus' },
    { route: '9', name: 'Bellamy', category: 'bus' },
    { route: '10', name: 'Van Horne', category: 'bus' },
    { route: '11', name: 'Bayview', category: 'bus' },
    { route: '12', name: 'Kingston Rd', category: 'bus' },
    { route: '13', name: 'Avenue Rd', category: 'bus' },
    { route: '14', name: 'Glencairn', category: 'bus' },
    { route: '15', name: 'Evans', category: 'bus' },
    { route: '16', name: 'McCowan', category: 'bus' },
    { route: '17', name: 'Birchmount', category: 'bus' },
    { route: '19', name: 'Bay', category: 'bus' },
    { route: '20', name: 'Cliffside', category: 'bus' },
    { route: '21', name: 'Brimley', category: 'bus' },
    { route: '22', name: 'Coxwell', category: 'bus' },
    { route: '23', name: 'Dawes', category: 'bus' },
    { route: '24', name: 'Victoria Park', category: 'bus' },
    { route: '25', name: 'Don Mills', category: 'bus' },
    { route: '26', name: 'Dupont', category: 'bus' },
    { route: '28', name: 'Bayview South', category: 'bus' },
    { route: '29', name: 'Dufferin', category: 'bus' },
    { route: '30', name: 'High Park North', category: 'bus' },
    { route: '31', name: 'Greenwood', category: 'bus' },
    { route: '32', name: 'Eglinton West', category: 'bus' },
    { route: '33', name: 'Forest Hill', category: 'bus' },
    { route: '34', name: 'Eglinton East', category: 'bus' },
    { route: '35', name: 'Jane', category: 'bus' },
    { route: '36', name: 'Finch West', category: 'bus' },
    { route: '37', name: 'Islington', category: 'bus' },
    { route: '38', name: 'Highland Creek', category: 'bus' },
    { route: '39', name: 'Finch East', category: 'bus' },
    { route: '40', name: 'Junction-Dundas West', category: 'bus' },
    { route: '41', name: 'Keele', category: 'bus' },
    { route: '42', name: 'Cummer', category: 'bus' },
    { route: '43', name: 'Kennedy', category: 'bus' },
    { route: '44', name: 'Kipling South', category: 'bus' },
    { route: '45', name: 'Kipling', category: 'bus' },
    { route: '46', name: 'Martin Grove', category: 'bus' },
    { route: '47', name: 'Lansdowne', category: 'bus' },
    { route: '48', name: 'Rathburn', category: 'bus' },
    { route: '49', name: 'Bloor West', category: 'bus' },
    { route: '50', name: 'Burnhamthorpe', category: 'bus' },
    { route: '51', name: 'Leslie', category: 'bus' },
    { route: '52', name: 'Lawrence West', category: 'bus' },
    { route: '53', name: 'Steeles East', category: 'bus' },
    { route: '54', name: 'Lawrence East', category: 'bus' },
    { route: '55', name: 'Warren Park', category: 'bus' },
    { route: '56', name: 'Leaside', category: 'bus' },
    { route: '57', name: 'Midland', category: 'bus' },
    { route: '59', name: 'Maple Leaf', category: 'bus' },
    { route: '60', name: 'Steeles West', category: 'bus' },
    { route: '61', name: 'Avenue Rd North', category: 'bus' },
    { route: '62', name: 'Mortimer', category: 'bus' },
    { route: '63', name: 'Ossington', category: 'bus' },
    { route: '64', name: 'Main', category: 'bus' },
    { route: '65', name: 'Parliament', category: 'bus' },
    { route: '66', name: 'Prince Edward', category: 'bus' },
    { route: '67', name: 'Pharmacy', category: 'bus' },
    { route: '68', name: 'Warden', category: 'bus' },
    { route: '69', name: 'Warden South', category: 'bus' },
    { route: '70', name: "O'Connor", category: 'bus' },
    { route: '71', name: 'Runnymede', category: 'bus' },
    { route: '72', name: 'Pape', category: 'bus' },
    { route: '73', name: 'Royal York', category: 'bus' },
    { route: '74', name: 'Mount Pleasant', category: 'bus' },
    { route: '75', name: 'Sherbourne', category: 'bus' },
    { route: '76', name: 'Royal York South', category: 'bus' },
    { route: '77', name: 'Swansea', category: 'bus' },
    { route: '78', name: 'St Andrews', category: 'bus' },
    { route: '79', name: 'Scarlett Rd', category: 'bus' },
    { route: '80', name: 'Queensway', category: 'bus' },
    { route: '82', name: 'Rosedale', category: 'bus' },
    { route: '83', name: 'Jones', category: 'bus' },
    { route: '84', name: 'Sheppard West', category: 'bus' },
    { route: '85', name: 'Sheppard East', category: 'bus' },
    { route: '86', name: 'Scarborough', category: 'bus' },
    { route: '87', name: 'Cosburn', category: 'bus' },
    { route: '88', name: 'South Leaside', category: 'bus' },
    { route: '89', name: 'Weston', category: 'bus' },
    { route: '90', name: 'Vaughan', category: 'bus' },
    { route: '91', name: 'Woodbine', category: 'bus' },
    { route: '92', name: 'Woodbine South', category: 'bus' },
    { route: '93', name: 'Parkview Hills', category: 'bus' },
    { route: '94', name: 'Wellesley', category: 'bus' },
    { route: '95', name: 'York Mills', category: 'bus' },
    { route: '96', name: 'Wilson', category: 'bus' },
    { route: '97', name: 'Yonge', category: 'bus' },
    { route: '98', name: 'Willowdale-Senlac', category: 'bus' },
    { route: '99', name: 'Arrow Rd', category: 'bus' },
    { route: '100', name: 'Flemingdon Park', category: 'bus' },
    { route: '101', name: 'Downsview Park', category: 'bus' },
    { route: '102', name: 'Markham Rd', category: 'bus' },
    { route: '103', name: 'Mount Pleasant North', category: 'bus' },
    { route: '104', name: 'Faywood', category: 'bus' },
    { route: '105', name: 'Dufferin North', category: 'bus' },
    { route: '106', name: 'Sentinel', category: 'bus' },
    { route: '107', name: 'Alness-Chesswood', category: 'bus' },
    { route: '108', name: 'Driftwood', category: 'bus' },
    { route: '109', name: 'Ranee', category: 'bus' },
    { route: '110', name: 'Islington South', category: 'bus' },
    { route: '111', name: 'East Mall', category: 'bus' },
    { route: '112', name: 'West Mall', category: 'bus' },
    { route: '113', name: 'Danforth', category: 'bus' },
    { route: '114', name: 'Queens Quay East', category: 'bus' },
    { route: '115', name: 'Silver Hills', category: 'bus' },
    { route: '116', name: 'Morningside', category: 'bus' },
    { route: '117', name: 'Birchmount South', category: 'bus' },
    { route: '118', name: 'Thistle Down', category: 'bus' },
    { route: '119', name: 'Torbarrie', category: 'bus' },
    { route: '120', name: 'Calvington', category: 'bus' },
    { route: '121', name: 'Esplanade-River', category: 'bus' },
    { route: '122', name: 'Graydon Hall', category: 'bus' },
    { route: '123', name: 'Sherway', category: 'bus' },
    { route: '124', name: 'Sunnybrook', category: 'bus' },
    { route: '125', name: 'Drewry', category: 'bus' },
    { route: '126', name: 'Christie', category: 'bus' },
    { route: '127', name: 'Davenport', category: 'bus' },
    { route: '129', name: 'McCowan North', category: 'bus' },
    { route: '130', name: 'Middlefield', category: 'bus' },
    { route: '131', name: 'Nugget', category: 'bus' },
    { route: '132', name: 'Milner', category: 'bus' },
    { route: '133', name: 'Neilson', category: 'bus' },
    { route: '134', name: 'Progress', category: 'bus' },
    { route: '135', name: 'Gerrard', category: 'bus' },
    { route: '149', name: 'Etobicoke-Bloor', category: 'bus' },
    { route: '154', name: 'Curran Hall', category: 'bus' },
    { route: '160', name: 'Bathurst North', category: 'bus' },
    { route: '161', name: 'Rogers Rd', category: 'bus' },
    { route: '162', name: 'Lawrence-Donway', category: 'bus' },
    { route: '164', name: 'Castlefield', category: 'bus' },
    { route: '165', name: 'Weston Rd North', category: 'bus' },
    { route: '166', name: 'Toryork', category: 'bus' },
    { route: '167', name: 'Pharmacy North', category: 'bus' },
    { route: '168', name: 'Symington', category: 'bus' },
    { route: '169', name: 'Huntingwood', category: 'bus' },
    { route: '171', name: 'Mount Dennis', category: 'bus' },
    { route: '184', name: 'Ancaster Park', category: 'bus' },
    { route: '185', name: 'Sheppard Central', category: 'bus' },
    { route: '189', name: 'Stockyards', category: 'bus' },
    { route: '191', name: 'Underhill', category: 'bus' }
  ];

  const NIGHT_ROUTES = [
    { route: '300', name: 'Bloor-Danforth Night', category: 'night' },
    { route: '302', name: 'Kingston Rd-McCowan Night', category: 'night' },
    { route: '307', name: 'Bathurst Night', category: 'night' },
    { route: '315', name: "Evans-Brown's Line Night", category: 'night' },
    { route: '320', name: 'Yonge Night', category: 'night' },
    { route: '322', name: 'Coxwell Night', category: 'night' },
    { route: '324', name: 'Victoria Park Night', category: 'night' },
    { route: '325', name: 'Don Mills Night', category: 'night' },
    { route: '329', name: 'Dufferin Night', category: 'night' },
    { route: '332', name: 'Eglinton West Night', category: 'night' },
    { route: '334', name: 'Eglinton East Night', category: 'night' },
    { route: '335', name: 'Jane Night', category: 'night' },
    { route: '336', name: 'Finch West Night', category: 'night' },
    { route: '337', name: 'Islington Night', category: 'night' },
    { route: '339', name: 'Finch East Night', category: 'night' },
    { route: '340', name: 'Junction Night', category: 'night' },
    { route: '341', name: 'Keele Night', category: 'night' },
    { route: '343', name: 'Kennedy Night', category: 'night' },
    { route: '352', name: 'Lawrence West Night', category: 'night' },
    { route: '353', name: 'Steeles Night', category: 'night' },
    { route: '354', name: 'Lawrence East Night', category: 'night' },
    { route: '363', name: 'Ossington Night', category: 'night' },
    { route: '365', name: 'Parliament Night', category: 'night' },
    { route: '384', name: 'Sheppard West Night', category: 'night' },
    { route: '385', name: 'Sheppard East Night', category: 'night' },
    { route: '386', name: 'Scarborough Night', category: 'night' },
    { route: '395', name: 'York Mills Night', category: 'night' },
    { route: '396', name: 'Wilson Night', category: 'night' }
  ];

  const COMMUNITY_ROUTES = [
    { route: '400', name: 'Lawrence Manor', category: 'community' },
    { route: '402', name: 'Parkdale', category: 'community' },
    { route: '403', name: 'South Don Mills', category: 'community' },
    { route: '404', name: 'East York', category: 'community' },
    { route: '405', name: 'Etobicoke', category: 'community' },
    { route: '406', name: 'Scarborough-Guildwood', category: 'community' }
  ];

  const ALL_ROUTES: RouteInfo[] = [
    ...SUBWAY_LINES,
    ...STREETCAR_ROUTES,
    ...EXPRESS_ROUTES,
    ...BUS_ROUTES,
    ...NIGHT_ROUTES,
    ...COMMUNITY_ROUTES
  ];

  let query = $state('');
  let showResults = $state(false);
  let inputRef = $state<HTMLInputElement | null>(null);
  let containerRef = $state<HTMLDivElement | null>(null);
  let highlightedIndex = $state(-1);

  // Handle click outside to close dropdown
  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      showResults = false;
      highlightedIndex = -1;
    }
  }

  onMount(() => {
    if (browser) {
      document.addEventListener('click', handleClickOutside);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('click', handleClickOutside);
    }
  });

  // Filter routes based on search
  let filteredRoutes = $derived(
    query.length > 0
      ? ALL_ROUTES.filter(r => 
          r.route.toLowerCase().includes(query.toLowerCase()) ||
          r.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 15)
      : []
  );

  // Check if route is saved
  function isRouteSaved(routeId: string): boolean {
    return savedRoutes.isSaved(routeId);
  }

  function handleInput() {
    highlightedIndex = -1;
    showResults = query.length > 0;
  }

  function selectRoute(route: RouteInfo) {
    const isSaved = isRouteSaved(route.route);
    
    if (isSaved) {
      // Remove if already saved
      savedRoutes.remove(route.route);
    } else {
      // Add if not saved
      const type = route.category === 'subway' ? 'subway' 
        : route.category === 'streetcar' ? 'streetcar' 
        : 'bus';
      savedRoutes.add({
        id: route.route,
        name: `${route.route} ${route.name}`,
        type
      });
    }
    
    onSelect?.(route);
    
    // Clear search after selection
    query = '';
    showResults = false;
    highlightedIndex = -1;
  }

  function clearSearch() {
    query = '';
    showResults = false;
    highlightedIndex = -1;
    inputRef?.focus();
  }

  function handleFocus() {
    if (query.length > 0) {
      showResults = true;
    }
  }

  function handleBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.route-search-results')) {
      return;
    }
    setTimeout(() => {
      showResults = false;
    }, 150);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!showResults || filteredRoutes.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, filteredRoutes.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredRoutes.length) {
          selectRoute(filteredRoutes[highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        showResults = false;
        highlightedIndex = -1;
        onClose?.();
        break;
    }
  }
</script>

<div class="relative w-full" bind:this={containerRef}>
  <!-- Search Input -->
  <div class="relative flex items-center">
    <Search
      class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
    />
    <Input
      type="text"
      bind:value={query}
      bind:ref={inputRef}
      {placeholder}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      class="pl-9 pr-8"
      autocomplete="off"
      aria-label="Search routes"
      aria-controls="route-results"
      aria-expanded={showResults}
      role="combobox"
    />
    {#if query}
      <button
        type="button"
        onclick={clearSearch}
        class="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 p-1"
        aria-label="Clear search"
      >
        <X class="h-4 w-4" />
      </button>
    {/if}
  </div>

  <!-- Results Dropdown -->
  {#if showResults && filteredRoutes.length > 0}
    <div 
      class="absolute top-full z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border shadow-lg"
      style="background-color: hsl(var(--popover)); color: hsl(var(--popover-foreground)); border-color: hsl(var(--border));"
      id="route-results"
      role="listbox"
      aria-label="Search results"
    >
      {#each filteredRoutes as route, index (route.route)}
        {@const saved = isRouteSaved(route.route)}
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-2 text-left outline-none transition-colors {index === highlightedIndex ? 'bg-accent' : 'hover:bg-accent'} {saved ? 'bg-primary/5' : ''}"
          role="option"
          aria-selected={index === highlightedIndex}
          onclick={() => selectRoute(route)}
        >
          <div class="flex items-center gap-2.5">
            <RouteBadge route={route.route} size="sm" />
            <span class="text-sm">{route.name}</span>
          </div>
          <Bookmark class="h-4 w-4 {saved ? 'text-amber-500 fill-current' : 'text-muted-foreground'}" />
        </button>
      {/each}
    </div>
  {:else if showResults && query.length > 0}
    <div 
      class="absolute top-full z-50 mt-1 w-full rounded-md border shadow-lg"
      style="background-color: hsl(var(--popover)); color: hsl(var(--popover-foreground)); border-color: hsl(var(--border));"
    >
      <div class="text-muted-foreground px-3 py-4 text-center text-sm">
        No routes found for "{query}"
      </div>
    </div>
  {/if}
</div>
