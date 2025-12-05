<script lang="ts">
  import { AlertCircle, MapPin, X, Moon, Clock } from 'lucide-svelte';
  import { bookmarks } from '$lib/stores/bookmarks';
  import { type StopETA, type ETAPrediction } from '$lib/stores/eta';
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
   * Parse direction into multiple lines
   */
  function parseDirection(direction: string): { line1: string; line2: string; line3: string } {
    const cleaned = direction.replace(/bound$/i, '').trim();
    
    const towardsIndex = cleaned.toLowerCase().indexOf(' towards ');
    if (towardsIndex > -1) {
      const beforeTowards = cleaned.substring(0, towardsIndex).trim();
      const afterTowards = cleaned.substring(towardsIndex + 9).trim();
      
      const viaIndex = afterTowards.toLowerCase().indexOf(' via ');
      if (viaIndex > -1) {
        const destination = afterTowards.substring(0, viaIndex).trim();
        const viaDetails = afterTowards.substring(viaIndex + 5).trim();
        return {
          line1: beforeTowards,
          line2: `towards ${destination}`,
          line3: `via ${viaDetails}`
        };
      }
      
      return {
        line1: beforeTowards,
        line2: `towards ${afterTowards}`,
        line3: ''
      };
    }
    
    const dashMatch = cleaned.match(/^(\w+)\s*-\s*(.+)$/);
    if (dashMatch) {
      return {
        line1: dashMatch[1].trim(),
        line2: dashMatch[2].trim(),
        line3: ''
      };
    }
    
    return { line1: cleaned, line2: '', line3: '' };
  }

  function handleRemove() {
    bookmarks.remove(eta.stopId);
  }

  let sortedPredictions = $derived(sortPredictions(eta.predictions));
</script>

<div
  class={cn(
    'w-full rounded-lg border bg-card overflow-hidden',
    eta.error && 'border-destructive/30',
    className
  )}
>
  <!-- Header -->
  <div class="flex items-center justify-between gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-b">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <MapPin class="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <h4 class="font-medium text-base truncate">{eta.stopName}</h4>
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
    <!-- Stacked Route Cards -->
    <div class="divide-y divide-border">
      {#each sortedPredictions as prediction (prediction.route + prediction.direction)}
        {@const parsed = parseDirection(prediction.direction)}
        {@const primaryTime = prediction.arrivals[0]}
        {@const secondaryTimes = prediction.arrivals.slice(1)}
        
        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <!-- Left: Route Badge + Direction -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <RouteBadge route={prediction.route} size="lg" class="flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-foreground leading-tight truncate">
                {parsed.line1}
              </p>
              {#if parsed.line2}
                <p class="text-xs text-muted-foreground mt-0.5 truncate">
                  {parsed.line2}
                </p>
              {/if}
              {#if parsed.line3}
                <p class="text-xs text-muted-foreground/70 truncate">
                  {parsed.line3}
                </p>
              {/if}
            </div>
          </div>
          
          <!-- Right: Arrival Times -->
          {#if prediction.arrivals.length > 0}
            <div class="flex items-baseline gap-1 flex-shrink-0">
              <span class="text-4xl font-bold text-foreground tabular-nums">{primaryTime}</span>
              {#if secondaryTimes.length > 0}
                <span class="text-base text-foreground/70 tabular-nums">, {secondaryTimes.join(', ')}</span>
              {/if}
              <span class="text-base text-foreground/70 ml-1">min</span>
            </div>
          {:else}
            <span class="text-4xl font-bold text-muted-foreground/50">–</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
