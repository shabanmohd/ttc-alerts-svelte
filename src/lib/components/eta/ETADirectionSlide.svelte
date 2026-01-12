<script lang="ts">
  import { _ } from "svelte-i18n";
  import { Radio, Clock } from "lucide-svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";
  import { cn } from "$lib/utils";
  import type { ETAPrediction } from "$lib/stores/eta";

  interface Props {
    prediction: ETAPrediction;
    class?: string;
  }

  let { prediction, class: className = "" }: Props = $props();

  /**
   * Translate cardinal direction word
   */
  function translateDirection(dir: string): string {
    const lower = dir.toLowerCase();
    if (lower === "north" || lower === "northbound")
      return $_("directions.northbound");
    if (lower === "south" || lower === "southbound")
      return $_("directions.southbound");
    if (lower === "east" || lower === "eastbound")
      return $_("directions.eastbound");
    if (lower === "west" || lower === "westbound")
      return $_("directions.westbound");
    return dir;
  }

  /**
   * Format direction text - split into up to 3 lines
   * Input examples:
   * - "North - 133 Neilson towards Morningside Heights via Scarborough Centre Stn and Centenary"
   * - "East - 116 Morningside towards Finch"
   * - "Southbound towards Kennedy Station"
   * - "Southbound to Vaughan Metropolitan Centre via Union" (NTAS format)
   */
  function parseDirection(direction: string): {
    line1: string;
    line2: string;
    line3: string;
  } {
    // Handle NTAS format: "Southbound to Vaughan..." or "Northbound to Finch"
    const boundMatch = direction.match(
      /^(North|South|East|West)bound\s+to\s+(.+)$/i
    );
    if (boundMatch) {
      const directionWord = boundMatch[1];
      const afterTo = boundMatch[2].trim();

      // Check for "via" in the destination
      const viaIndex = afterTo.toLowerCase().indexOf(" via ");
      if (viaIndex > -1) {
        const destination = afterTo.substring(0, viaIndex).trim();
        const viaDetails = afterTo.substring(viaIndex + 5).trim();
        return {
          line1: translateDirection(`${directionWord}bound`),
          line2: `${$_("eta.to")} ${destination}`,
          line3: `${$_("directions.via")} ${viaDetails}`,
        };
      }

      return {
        line1: translateDirection(`${directionWord}bound`),
        line2: `${$_("eta.to")} ${afterTo}`,
        line3: "",
      };
    }

    // Remove "bound" suffix for other formats
    const cleaned = direction.replace(/bound$/i, "").trim();

    // Pattern: "Direction - Route towards Destination via Details"
    // Split on " towards " first to get destination
    const towardsIndex = cleaned.toLowerCase().indexOf(" towards ");
    if (towardsIndex > -1) {
      const beforeTowards = cleaned.substring(0, towardsIndex).trim();
      const afterTowards = cleaned.substring(towardsIndex + 9).trim(); // 9 = " towards ".length

      // Translate direction word if it's at the start
      const dirMatch = beforeTowards.match(/^(North|South|East|West)(\s|$)/i);
      const translatedBefore = dirMatch
        ? translateDirection(dirMatch[1]) +
          beforeTowards.slice(dirMatch[1].length)
        : beforeTowards;

      // Check if there's a "via" in the destination
      const viaIndex = afterTowards.toLowerCase().indexOf(" via ");
      if (viaIndex > -1) {
        const destination = afterTowards.substring(0, viaIndex).trim();
        const viaDetails = afterTowards.substring(viaIndex + 5).trim(); // 5 = " via ".length
        return {
          line1: translatedBefore,
          line2: `${$_("directions.towards")} ${destination}`,
          line3: `${$_("directions.via")} ${viaDetails}`,
        };
      }

      return {
        line1: translatedBefore,
        line2: `${$_("directions.towards")} ${afterTowards}`,
        line3: "",
      };
    }

    // Pattern: "Direction - Route" (no towards)
    const dashMatch = cleaned.match(/^(\w+)\s*-\s*(.+)$/);
    if (dashMatch) {
      const dirWord = dashMatch[1].trim();
      const translatedDir = translateDirection(dirWord);
      return {
        line1: translatedDir !== dirWord ? translatedDir : dirWord,
        line2: dashMatch[2].trim(),
        line3: "",
      };
    }

    // Fallback: just show it all on line 1
    return { line1: cleaned, line2: "", line3: "" };
  }

  /**
   * Get primary arrival time (first in array)
   */
  const primaryTime = $derived(prediction.arrivals[0]);

  /**
   * Get secondary arrival times (max 2 more, so 3 total)
   */
  const secondaryTimes = $derived(prediction.arrivals.slice(1, 3));

  /**
   * Check if we have arrival data
   */
  const hasData = $derived(prediction.arrivals.length > 0);

  /**
   * Parsed direction for three-line display
   */
  const parsedDir = $derived(parseDirection(prediction.direction));
</script>

<div class={cn("eta-slide", className)}>
  <div class="flex items-center justify-between gap-4 w-full px-4 py-3">
    <!-- Left: Route Badge + Direction -->
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <RouteBadge route={prediction.route} size="lg" class="shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-foreground leading-tight truncate">
          {parsedDir.line1}
        </p>
        {#if parsedDir.line2}
          <p class="text-xs text-muted-foreground mt-0.5 truncate">
            {parsedDir.line2}
          </p>
        {/if}
        {#if parsedDir.line3}
          <p class="text-xs text-muted-foreground/70 truncate">
            {parsedDir.line3}
          </p>
        {/if}
      </div>
    </div>

    <!-- Right: Arrival Times -->
    {#if hasData}
      <div class="flex items-baseline gap-1 shrink-0">
        <span class="eta-primary-time">{primaryTime}</span>
        {#if secondaryTimes.length > 0}
          <span class="eta-secondary-times">, {secondaryTimes.join(", ")}</span>
        {/if}
        <span class="text-lg font-medium text-muted-foreground ml-1">min</span>
      </div>
    {:else}
      <!-- No Data -->
      <span class="eta-no-data shrink-0">–</span>
    {/if}
  </div>
</div>
