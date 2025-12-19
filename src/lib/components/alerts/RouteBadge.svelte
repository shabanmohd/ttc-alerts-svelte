<script lang="ts">
  import { Check } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let {
    route,
    size = "default",
    selectable = false,
    selected = false,
    class: className = "",
  }: {
    route: string;
    size?: "sm" | "default" | "lg";
    selectable?: boolean;
    selected?: boolean;
    class?: string;
  } = $props();

  /**
   * Extract just the route number for determining the style.
   */
  function getRouteNumber(route: string): number {
    const match = route.match(/^\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * Determine route type for accessibility announcement.
   */
  function getRouteType(route: string): string {
    const routeLower = route.toLowerCase();
    const routeNum = getRouteNumber(route);

    if (routeLower.includes("line")) return "Subway";
    if (routeNum >= 300 && routeNum < 400) return "Night bus";
    if (routeNum >= 400 && routeNum < 500) return "Community bus";
    if (routeNum >= 500 && routeNum < 600) return "Streetcar";
    if (routeNum >= 900) return "Express bus";
    return "Bus";
  }

  /**
   * Determine route type and style class.
   * TTC brand colors are used with appropriate contrast ratios.
   *
   * IMPORTANT: Only match subway lines when explicitly mentioned as "Line X"
   * or when the route is a single digit (1-6). Do NOT match based on street
   * names like "Eglinton" or "Bloor" as those are also bus route names.
   */
  function getRouteClass(route: string): string {
    const routeLower = route.toLowerCase();
    const routeNum = getRouteNumber(route);

    // Only treat as subway if:
    // 1. Explicitly says "Line X" (e.g., "Line 1", "Line 2")
    // 2. Route is just a single digit 1-6 (e.g., "1", "2", "4")
    const isExplicitSubwayLine = routeLower.match(/^line\s*[1-6]/);
    const isSingleDigitSubway = route.match(/^[1-6]$/);

    // Subway lines - only match explicit Line references or single digits
    if (isExplicitSubwayLine || isSingleDigitSubway) {
      // Extract the line number
      const lineNumMatch = route.match(/([1-6])/);
      const lineNum = lineNumMatch ? lineNumMatch[1] : "";

      if (lineNum === "1") return "route-line-1";
      if (lineNum === "2") return "route-line-2";
      if (lineNum === "4") return "route-line-4";
      if (lineNum === "5") return "route-line-5";
      if (lineNum === "6") return "route-line-6";
    }

    // Night routes (300-series)
    if (routeNum >= 300 && routeNum < 400) {
      return "route-night";
    }

    // Community routes (400-series)
    if (routeNum >= 400 && routeNum < 500) {
      return "route-community";
    }

    // Streetcar routes (500-series)
    if (routeNum >= 500 && routeNum < 600) {
      // Limited service streetcars
      if (routeNum === 507 || routeNum === 508) {
        return "route-limited";
      }
      return "route-streetcar";
    }

    // Express routes (900-series)
    if (routeNum >= 900) {
      return "route-express";
    }

    // Limited service buses
    const limitedBuses = [10, 99, 115, 119, 160, 162, 166, 167, 169];
    if (limitedBuses.includes(routeNum)) {
      return "route-limited";
    }

    // Default: regular bus
    return "route-bus";
  }

  const ariaLabel = $derived(
    selectable
      ? `${getRouteType(route)} route ${route}${selected ? ", selected" : ", not selected"}`
      : `${getRouteType(route)} route ${route}`
  );
</script>

{#if selectable}
  <button
    type="button"
    class={cn(
      "route-badge",
      getRouteClass(route),
      size === "sm" && "route-badge-sm",
      size === "lg" && "route-badge-lg",
      "route-badge-selectable",
      selected && "selected",
      className
    )}
    role="checkbox"
    aria-checked={selected}
    aria-label={ariaLabel}
    translate="no"
  >
    <span class="route-check" aria-hidden="true">
      <Check class="check-icon" />
    </span>
    {route}
  </button>
{:else}
  <span
    class={cn(
      "route-badge",
      getRouteClass(route),
      size === "sm" && "route-badge-sm",
      size === "lg" && "route-badge-lg",
      className
    )}
    role="status"
    aria-label={ariaLabel}
    translate="no"
  >
    {route}
  </span>
{/if}
