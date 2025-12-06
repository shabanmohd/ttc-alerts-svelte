<script lang="ts">
  import { AlertCircle, MapPin, X, Moon, Clock } from 'lucide-svelte';
  import { savedStops } from '$lib/stores/savedStops';
  import { type StopETA, type ETAPrediction } from '$lib/stores/eta';
  import LiveSignalIcon from './LiveSignalIcon.svelte';
  import RouteBadge from '$lib/components/alerts/RouteBadge.svelte';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  interface Props {
    eta: StopETA;
    compact?: boolean;
    showRemove?: boolean;
    class?: string;
  }

  let { 
    eta, 
    compact = false,
    showRemove = true,
    class: className = ''
  }: Props = $props();

  /**
   * Format stop name as cross-streets
   * "Morningside Ave At Sheppard Ave" → "Morningside Ave / Sheppard Ave"
   * Also handles: "Opp", "Near", "North Side", "South Side", etc.
   */
  function formatCrossStreets(stopName: string): string {
    return stopName
      .replace(/\s+At\s+/gi, ' / ')
      .replace(/\s+Opp\s+/gi, ' / Opp ')
      .replace(/\s+Near\s+/gi, ' / Near ')
      .replace(/\s+North Side\s*/gi, ' (North Side)')
      .replace(/\s+South Side\s*/gi, ' (South Side)')
      .replace(/\s+East Side\s*/gi, ' (East Side)')
      .replace(/\s+West Side\s*/gi, ' (West Side)');
  }

  /**
   * Get context-aware empty state message based on time of day
   */
  function getEmptyStateMessage(): { icon: 'moon' | 'clock'; title: string; subtitle: string } {
    const now = new Date();
    const hour = now.getHours();
    
    // Late night hours (1am - 5am) - most routes don't run
    if (hour >= 1 && hour < 5) {
      return {
        icon: 'moon',
        title: 'Limited service',
        subtitle: 'Most routes run 6am–1am'
      };
    }
    
    // Early morning (5am - 6am) - service starting up
    if (hour >= 5 && hour < 6) {
      return {
        icon: 'clock',
        title: 'Service starting soon',
        subtitle: 'First buses arrive around 6am'
      };
    }
    
    // Normal hours - no predictions could mean various things
    return {
      icon: 'clock',
      title: 'No arrivals scheduled',
      subtitle: 'Check back in a few minutes'
    };
  }

  /**
   * Sort predictions by route number
   */
  function sortPredictions(predictions: ETAPrediction[]): ETAPrediction[] {
    return [...predictions].sort((a, b) => {
      const aNum = parseInt(a.route, 10);
      const bNum = parseInt(b.route, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.route.localeCompare(b.route);
    });
  }

  /**
   * Parse direction into a single destination line
   * "North - 133 Neilson towards Morningside Heights via Scarborough Centre Stn" 
   * → { direction: "North", destination: "Morningside Heights via Scarborough Centre Stn" }
   */
  function parseDirection(direction: string): { direction: string; destination: string } {
    const cleaned = direction.replace(/bound$/i, '').trim();
    
    // Pattern: "Direction - Route towards Destination via Details"
    const towardsIndex = cleaned.toLowerCase().indexOf(' towards ');
    if (towardsIndex > -1) {
      const beforeTowards = cleaned.substring(0, towardsIndex).trim();
      const afterTowards = cleaned.substring(towardsIndex + 9).trim(); // 9 = " towards ".length
      
      // Extract direction from "North - 133 Neilson" → "North"
      const dashMatch = beforeTowards.match(/^(North|South|East|West)\s*-/i);
      const dir = dashMatch ? dashMatch[1] : beforeTowards.split(/\s+/)[0];
      
      return {
        direction: dir,
        destination: afterTowards
      };
    }
    
    // Pattern: "Direction - Route" (no towards)
    const dashMatch = cleaned.match(/^(North|South|East|West)\s*-\s*(.+)$/i);
    if (dashMatch) {
      return {
        direction: dashMatch[1].trim(),
        destination: dashMatch[2].trim()
      };
    }
    
    // Fallback: check for directional keywords at start
    const dirMatch = cleaned.match(/^(North|South|East|West)/i);
    if (dirMatch) {
      return {
        direction: dirMatch[1],
        destination: cleaned.substring(dirMatch[1].length).trim()
      };
    }
    
    return { direction: '', destination: cleaned };
  }

  function handleRemove() {
    savedStops.remove(eta.stopId);
  }

  /**
   * Extract primary direction from predictions for display in header
   * Returns simplified direction like "Eastbound" or "Westbound"
   */
  function getPrimaryDirection(predictions: ETAPrediction[]): string | null {
    if (predictions.length === 0) return null;
    
    // Get the first prediction's direction
    const direction = predictions[0].direction;
    if (!direction) return null;
    
    // Try to extract just the direction part (e.g., "West" from "West - 116 Morningside")
    const dashMatch = direction.match(/^(North|South|East|West)\s*-/i);
    if (dashMatch) {
      return `${dashMatch[1]}bound`;
    }
    
    // Fallback: check for directional keywords at start
    const dirMatch = direction.match(/^(North|South|East|West)(?:bound)?/i);
    if (dirMatch) {
      return `${dirMatch[1]}bound`;
    }
    
    return null;
  }

  let sortedPredictions = $derived(sortPredictions(eta.predictions));
  let primaryDirection = $derived(getPrimaryDirection(eta.predictions));
  let crossStreets = $derived(formatCrossStreets(eta.stopName));
</script>

<div
  class={cn(
    'w-full rounded-lg border bg-card overflow-hidden',
    eta.error && 'border-destructive/30',
    className
  )}
>
  <!-- Header: Stop Name + Direction Badge + Stop ID -->
  <div class="flex items-start justify-between gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-b">
    <div class="flex items-start gap-2.5 min-w-0 flex-1">
      <MapPin class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div class="min-w-0 flex-1">
        <h4 class="font-medium text-base leading-tight">{crossStreets}</h4>
        <div class="flex items-center gap-2 mt-1">
          {#if primaryDirection}
            {@const dirColor = primaryDirection.toLowerCase().includes('east') ? 'bg-sky-600/20 text-sky-700 dark:text-sky-400 border-sky-600/40' 
              : primaryDirection.toLowerCase().includes('west') ? 'bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/40'
              : primaryDirection.toLowerCase().includes('north') ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40'
              : primaryDirection.toLowerCase().includes('south') ? 'bg-rose-600/20 text-rose-700 dark:text-rose-400 border-rose-600/40'
              : 'bg-muted text-muted-foreground border-muted-foreground/30'}
            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase {dirColor}">
              {primaryDirection}
            </span>
          {/if}
          <span class="text-xs text-muted-foreground">#{eta.stopId}</span>
        </div>
      </div>
    </div>
    {#if showRemove}
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        onclick={handleRemove}
        aria-label="Remove stop"
      >
        <X class="h-4 w-4" />
      </Button>
    {/if}
  </div>

  <!-- Content -->
  {#if eta.error}
    <!-- Error State -->
    <div class="flex items-center gap-2 text-destructive text-sm p-4">
      <AlertCircle class="h-4 w-4 flex-shrink-0" />
      <span>{eta.error}</span>
    </div>
  {:else if eta.isLoading && eta.predictions.length === 0}
    <!-- Loading State -->
    <div class="p-4 space-y-3">
      {#each [1, 2] as _}
        <div class="animate-pulse flex items-center gap-3">
          <div class="h-10 w-14 bg-muted rounded-lg flex-shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-32 bg-muted rounded"></div>
            <div class="h-3 w-24 bg-muted rounded"></div>
          </div>
          <div class="h-8 w-16 bg-muted rounded"></div>
        </div>
      {/each}
    </div>
  {:else if sortedPredictions.length === 0}
    <!-- No Predictions - Context-aware message -->
    {@const emptyState = getEmptyStateMessage()}
    <div class="p-5 flex flex-col items-center gap-1.5 text-center">
      {#if emptyState.icon === 'moon'}
        <Moon class="h-6 w-6 text-muted-foreground/50 mb-1" />
      {:else}
        <Clock class="h-6 w-6 text-muted-foreground/50 mb-1" />
      {/if}
      <p class="text-sm font-medium text-muted-foreground">{emptyState.title}</p>
      <p class="text-xs text-muted-foreground/70">{emptyState.subtitle}</p>
    </div>
  {:else}
    <!-- Stacked Route Cards with Dividers -->
    <div class="divide-y divide-border">
      {#each sortedPredictions as prediction (prediction.route + prediction.direction)}
        {@const parsed = parseDirection(prediction.direction)}
        {@const primaryTime = prediction.arrivals[0]}
        {@const secondaryTimes = prediction.arrivals.slice(1)}
        
        <!-- Mobile: Vertical layout | Desktop: Original horizontal layout -->
        <div class="px-4 py-3">
          <!-- Desktop: Single row with badge + direction left, times right -->
          <div class="hidden sm:flex items-center justify-between gap-4">
            <!-- Left: Route Badge + Direction -->
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <RouteBadge route={prediction.route} size="lg" class="flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-foreground leading-snug">
                  {parsed.direction}{parsed.direction && parsed.destination ? ' to ' : ''}{parsed.destination}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {crossStreets}
                </p>
              </div>
            </div>
            <!-- Right: Arrival Times -->
            {#if prediction.arrivals.length > 0}
              <div class="flex items-baseline gap-1 flex-shrink-0">
                <span class="text-4xl font-bold text-foreground tabular-nums">{primaryTime}</span>
                <LiveSignalIcon size="md" class="self-start mt-1" />
                {#if secondaryTimes.length > 0}
                  {#each secondaryTimes as time}
                    <span class="text-base text-foreground/70 tabular-nums">, {time}</span>
                    <LiveSignalIcon size="sm" class="self-center" />
                  {/each}
                {/if}
                <span class="text-base text-foreground/70 ml-1">min</span>
              </div>
            {:else}
              <span class="text-4xl font-bold text-muted-foreground/50">–</span>
            {/if}
          </div>

          <!-- Mobile: Vertical layout with text on top, ETAs below -->
          <div class="sm:hidden">
            <!-- Row 1: Route Badge + Direction/Destination Text -->
            <div class="flex items-start gap-3">
              <RouteBadge route={prediction.route} size="lg" class="flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground leading-snug">
                  {parsed.direction}{parsed.direction && parsed.destination ? ' to ' : ''}{parsed.destination}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {crossStreets}
                </p>
              </div>
            </div>
            <!-- Row 2: ETA Times (right aligned) -->
            <div class="flex items-baseline justify-end gap-2 mt-2">
              {#if prediction.arrivals.length > 0}
                <span class="text-5xl font-bold text-foreground tabular-nums">{primaryTime}</span>
                <LiveSignalIcon size="lg" class="self-start mt-1.5" />
                {#if secondaryTimes.length > 0}
                  {#each secondaryTimes as time}
                    <span class="text-3xl font-semibold text-muted-foreground tabular-nums">, {time}</span>
                    <LiveSignalIcon size="md" class="self-start mt-1" />
                  {/each}
                {/if}
                <span class="text-lg text-muted-foreground ml-1">min</span>
              {:else}
                <span class="text-5xl font-bold text-muted-foreground/50">–</span>
                <span class="text-lg text-muted-foreground">min</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
