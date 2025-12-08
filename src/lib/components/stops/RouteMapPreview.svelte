<script lang="ts">
  import { onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import type { TTCStop, DirectionLabel } from "$lib/data/stops-db";
  import {
    ChevronDown,
    ChevronUp,
    Map,
    MapPin,
    AlertCircle,
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";

  // Props
  let {
    stops = [],
    routeColor = "#C8102E",
    routeName = "",
    routeNumber = "",
    direction = "All Stops" as DirectionLabel,
    initialExpanded = false,
    onStopClick,
  }: {
    stops: TTCStop[];
    routeColor?: string;
    routeName?: string;
    routeNumber?: string;
    direction?: DirectionLabel;
    initialExpanded?: boolean;
    onStopClick?: (stop: TTCStop) => void;
  } = $props();

  // State
  let mapContainer: HTMLDivElement | undefined = $state();
  let map: L.Map | null = $state(null);
  let isExpanded = $state(false);
  let isLoading = $state(true);
  let hasError = $state(false);
  let leafletCSSLoaded = $state(false);
  let shapesData: Record<
    string,
    Record<string, { coords: [number, number][] }>
  > | null = $state(null);

  // Sync expanded state with prop
  $effect(() => {
    isExpanded = initialExpanded;
  });

  // Load shapes data on mount
  $effect(() => {
    if (browser && !shapesData) {
      loadShapesData();
    }
  });

  async function loadShapesData() {
    try {
      const response = await fetch("/data/ttc-shapes.json");
      if (response.ok) {
        const data = await response.json();
        shapesData = data.shapes;
      }
    } catch (error) {
      console.warn("Could not load route shapes:", error);
    }
  }

  // Leaflet type reference (loaded dynamically)
  let L: typeof import("leaflet") | null = null;

  /**
   * Load Leaflet CSS via link tag (more reliable than import)
   */
  function loadLeafletCSS(): Promise<void> {
    return new Promise((resolve) => {
      if (leafletCSSLoaded) {
        resolve();
        return;
      }

      // Check if already loaded
      const existing = document.querySelector('link[href*="leaflet"]');
      if (existing) {
        leafletCSSLoaded = true;
        resolve();
        return;
      }

      // Create and load CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      link.onload = () => {
        leafletCSSLoaded = true;
        resolve();
      };
      link.onerror = () => {
        console.warn("Failed to load Leaflet CSS from CDN, trying local...");
        // Try loading local as fallback
        resolve();
      };
      document.head.appendChild(link);
    });
  }

  /**
   * Get the route shape coordinates for the current direction
   */
  function getRouteShapeCoords(): [number, number][] | null {
    if (!shapesData || !routeNumber) return null;

    // Normalize route number for subway lines ("Line 6" -> "6")
    let normalizedRoute = routeNumber;
    const subwayMatch = routeNumber.match(/^Line\s+(\d+)$/i);
    if (subwayMatch) {
      normalizedRoute = subwayMatch[1];
    }

    const routeShapes = shapesData[normalizedRoute];
    if (!routeShapes) return null;

    // Map our direction labels to shape keys
    // Shape data uses: direction0, direction1, eastbound, westbound, northbound, southbound
    const directionMap: Record<string, string[]> = {
      Eastbound: ["eastbound", "direction0"],
      Westbound: ["westbound", "direction1"],
      Northbound: ["northbound", "direction0"],
      Southbound: ["southbound", "direction1"],
      "All Stops": ["direction0", "eastbound", "northbound"], // Default to first available
    };

    const possibleKeys = directionMap[direction] || [
      "direction0",
      "direction1",
    ];

    for (const key of possibleKeys) {
      if (routeShapes[key]?.coords) {
        return routeShapes[key].coords;
      }
    }

    // Fall back to any available direction
    const firstKey = Object.keys(routeShapes)[0];
    return routeShapes[firstKey]?.coords || null;
  }

  /**
   * Draw the actual route shape polyline on the map
   */
  function drawRouteShape() {
    if (!L || !map) return;

    const coords = getRouteShapeCoords();
    if (!coords || coords.length < 2) return;

    // Draw the actual route polyline
    L.polyline(coords as [number, number][], {
      color: routeColor,
      weight: 4,
      opacity: 0.7,
    }).addTo(map);
  }

  /**
   * Initialize Leaflet map when container is available
   */
  async function initMap() {
    if (!browser || !mapContainer || stops.length === 0) return;

    try {
      isLoading = true;
      hasError = false;

      // Load CSS first
      await loadLeafletCSS();

      // Dynamically import Leaflet
      L = await import("leaflet");

      // Calculate bounds
      const bounds = L.latLngBounds(
        stops.map((s) => [s.lat, s.lon] as [number, number])
      );

      // Destroy existing map if present
      if (map) {
        map.remove();
        map = null;
      }

      // Detect dark mode
      const isDarkMode =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      // Create map
      map = L.map(mapContainer, {
        zoomControl: true,
        scrollWheelZoom: false, // Prevent accidental zoom while scrolling page
        attributionControl: true,
      });

      // Add map tiles - use dark tiles for dark mode
      if (isDarkMode) {
        // CartoDB Dark Matter - good dark mode tile
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
          }
        ).addTo(map);
      } else {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(map);
      }

      // Fit map to bounds with padding
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15, // Prevent zooming in too much for short routes
      });

      // Create custom marker icon using divIcon with stop numbers
      // ALWAYS show numbers on all stops (no skipping)
      const createStopIcon = (
        index: number,
        isTerminal: boolean,
        total: number
      ) => {
        const displayNum = index + 1; // 1-based numbering

        // Use larger markers for terminals
        const size = isTerminal ? 26 : 22;
        const halfSize = size / 2;

        return L!.divIcon({
          className: "route-stop-marker numbered",
          html: `<div class="marker-numbered ${isTerminal ? "terminal" : ""}" style="background-color: ${routeColor}; width: ${size}px; height: ${size}px;">
            <span class="marker-num">${displayNum}</span>
          </div>`,
          iconSize: [size, size],
          iconAnchor: [halfSize, halfSize],
        });
      };

      // Add markers for each stop
      stops.forEach((stop, index) => {
        if (!L || !map) return;

        const isTerminal = index === 0 || index === stops.length - 1;
        const marker = L.marker([stop.lat, stop.lon], {
          icon: createStopIcon(index, isTerminal, stops.length),
          zIndexOffset: isTerminal ? 1000 : stops.length - index, // First/last on top
        }).addTo(map);

        // Clean stop name for popup (remove platform direction info for subways)
        let displayName = stop.name;
        // Remove "Eastbound Platform", "Westbound Platform", etc.
        displayName = displayName.replace(
          /\s+(Eastbound|Westbound|Northbound|Southbound)\s+Platform$/i,
          ""
        );
        // Remove trailing "Platform" if still present
        displayName = displayName.replace(/\s+Platform$/i, "");
        // Remove "- Subway Platform" and similar suffixes
        displayName = displayName.replace(/\s*-\s*Subway\s+Platform$/i, "");
        displayName = displayName.replace(
          /\s*-\s*(Eastbound|Westbound|Northbound|Southbound)$/i,
          ""
        );
        // Clean up trailing hyphens and whitespace
        displayName = displayName.replace(/\s*-\s*$/g, "").trim();

        // Popup with stop info
        const popupContent = `
          <div class="stop-popup">
            <strong>${displayName}</strong>
            <br/>
            <span class="stop-id">Stop #${stop.id}</span>
          </div>
        `;
        marker.bindPopup(popupContent);

        // Click handler
        if (onStopClick) {
          marker.on("click", () => {
            onStopClick(stop);
          });
        }
      });

      // Draw route shape from GTFS shapes data
      drawRouteShape();

      // Force map to recalculate size after a slight delay
      setTimeout(() => {
        map?.invalidateSize();
      }, 100);

      isLoading = false;
    } catch (error) {
      console.error("Failed to initialize map:", error);
      hasError = true;
      isLoading = false;
    }
  }

  /**
   * Toggle map expansion
   */
  function toggleExpanded() {
    isExpanded = !isExpanded;

    // Initialize map on first expansion
    if (isExpanded && !map && !hasError) {
      // Small delay to allow container to expand
      setTimeout(() => initMap(), 100);
    }

    // Invalidate map size when toggling (Leaflet needs this)
    if (isExpanded && map) {
      setTimeout(() => map?.invalidateSize(), 150);
    }
  }

  /**
   * Cleanup on component destroy
   */
  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });

  // Track stops reference to detect changes
  let prevStopsRef: TTCStop[] | null = null;

  // Re-initialize map when stops change OR when expanded for first time
  $effect(() => {
    // Check if stops reference changed (new direction selected)
    const stopsChanged = stops !== prevStopsRef;

    if (stops.length > 0 && isExpanded) {
      if (stopsChanged || !map) {
        // Destroy existing map if stops changed
        if (map && stopsChanged) {
          map.remove();
          map = null;
        }
        prevStopsRef = stops;

        // Small delay to ensure container is ready
        setTimeout(() => initMap(), 50);
      }
    }
  });
</script>

<div class="route-map-container animate-fade-in">
  <!-- Toggle Header -->
  <button
    type="button"
    class="map-toggle-header"
    onclick={toggleExpanded}
    aria-expanded={isExpanded}
    aria-controls="route-map"
  >
    <div class="toggle-left">
      <Map class="h-4 w-4 text-muted-foreground" />
      <span class="toggle-label">
        {isExpanded ? "Hide Map" : "Show Map"}
      </span>
      {#if stops.length > 0}
        <span class="stop-count">{stops.length} stops</span>
      {/if}
    </div>
    <div class="toggle-icon">
      {#if isExpanded}
        <ChevronUp class="h-4 w-4" />
      {:else}
        <ChevronDown class="h-4 w-4" />
      {/if}
    </div>
  </button>

  <!-- Map Container -->
  <div
    id="route-map"
    class="map-wrapper"
    class:expanded={isExpanded}
    aria-hidden={!isExpanded}
  >
    {#if isExpanded}
      {#if isLoading}
        <div class="map-loading">
          <Skeleton class="h-full w-full rounded-lg" />
          <div class="loading-overlay">
            <MapPin class="h-6 w-6 animate-pulse text-muted-foreground" />
            <span class="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      {:else if hasError}
        <div class="map-error">
          <MapPin class="h-8 w-8 text-destructive" />
          <p class="text-sm text-muted-foreground">Failed to load map</p>
          <Button variant="outline" size="sm" onclick={initMap}>
            Try Again
          </Button>
        </div>
      {:else if stops.length === 0}
        <div class="map-empty">
          <MapPin class="h-8 w-8 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">No stops to display</p>
        </div>
      {/if}
      <div
        bind:this={mapContainer}
        class="map-container"
        class:hidden={isLoading || hasError || stops.length === 0}
      ></div>
      {#if !isLoading && !hasError && stops.length > 0}
        <p class="map-note">
          Tap numbered stops for details • Route line from TTC GTFS data
        </p>
      {/if}
    {/if}
  </div>
</div>

<style>
  .route-map-container {
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    overflow: hidden;
    background: hsl(var(--card));
  }

  .map-toggle-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: hsl(var(--muted) / 0.5);
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .map-toggle-header:hover {
    background: hsl(var(--muted));
  }

  .toggle-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  .stop-count {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--muted));
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
  }

  .toggle-icon {
    color: hsl(var(--muted-foreground));
    transition: transform 0.2s ease;
  }

  .map-wrapper {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
  }

  .map-wrapper.expanded {
    max-height: 350px;
  }

  .map-container {
    height: 300px;
    width: 100%;
  }

  .map-container.hidden {
    display: none;
  }

  .map-note {
    font-size: 0.625rem;
    color: hsl(var(--muted-foreground));
    text-align: center;
    padding: 0.375rem 1rem;
    background: hsl(var(--muted) / 0.3);
    border-top: 1px solid hsl(var(--border));
  }

  .map-loading,
  .map-error,
  .map-empty {
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: hsl(var(--muted) / 0.3);
  }

  .map-loading {
    position: relative;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  /* Custom marker styles (injected into Leaflet) */
  :global(.route-stop-marker) {
    background: transparent !important;
    border: none !important;
  }

  :global(.marker-dot) {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  :global(.marker-numbered) {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2.5px solid white;
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.marker-numbered.terminal) {
    border-width: 3px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.5),
      0 0 0 2px rgba(0, 0, 0, 0.2);
  }

  :global(.marker-num) {
    font-size: 11px;
    font-weight: 800;
    color: white;
    line-height: 1;
    font-family: system-ui, sans-serif;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  :global(.stop-popup) {
    font-family: Lexend, system-ui, sans-serif;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  :global(.stop-popup .stop-id) {
    color: #666;
    font-size: 0.75rem;
  }

  :global(.stop-popup .stop-dir) {
    font-size: 0.75rem;
    color: #888;
  }

  /* Leaflet popup customization */
  :global(.leaflet-popup-content-wrapper) {
    border-radius: 8px;
  }

  :global(.leaflet-popup-content) {
    margin: 10px 12px;
  }

  /* Ensure Leaflet container has proper dimensions */
  :global(.leaflet-container) {
    height: 100%;
    width: 100%;
    background: hsl(var(--muted));
  }
</style>
