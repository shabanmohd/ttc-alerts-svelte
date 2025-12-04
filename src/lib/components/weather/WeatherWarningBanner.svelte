<script lang="ts">
  import { onMount } from 'svelte';
  import { AlertTriangle, X, ChevronDown, ChevronUp, CloudSnow, Thermometer, Wind, CloudRain } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { browser } from '$app/environment';

  interface WeatherWarning {
    id: string;
    title: string;
    summary: string;
    type: 'warning' | 'watch' | 'advisory' | 'statement';
    icon: typeof CloudSnow;
    updated: Date;
  }

  // Environment Canada RSS feed for Toronto
  const WEATHER_RSS = 'https://weather.gc.ca/rss/city/on-143_e.xml';
  const CACHE_KEY = 'weather-warnings';
  const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  let warnings = $state<WeatherWarning[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let expandedId = $state<string | null>(null);
  let dismissedIds = $state<Set<string>>(new Set());

  // Transit-relevant weather keywords
  const TRANSIT_KEYWORDS = [
    'snow', 'ice', 'freezing', 'blizzard', 'winter storm',
    'extreme cold', 'wind chill', 'frost',
    'thunderstorm', 'tornado', 'flood',
    'heat', 'extreme heat', 'humidex'
  ];

  /**
   * Determine if a warning is transit-relevant
   */
  function isTransitRelevant(title: string, summary: string): boolean {
    const text = `${title} ${summary}`.toLowerCase();
    return TRANSIT_KEYWORDS.some(kw => text.includes(kw));
  }

  /**
   * Get the appropriate icon for the warning type
   */
  function getWarningIcon(title: string): typeof CloudSnow {
    const t = title.toLowerCase();
    if (t.includes('snow') || t.includes('blizzard') || t.includes('winter')) return CloudSnow;
    if (t.includes('cold') || t.includes('heat') || t.includes('temperature')) return Thermometer;
    if (t.includes('wind') || t.includes('tornado')) return Wind;
    if (t.includes('rain') || t.includes('flood') || t.includes('thunderstorm')) return CloudRain;
    return AlertTriangle;
  }

  /**
   * Parse warning type from title
   */
  function parseWarningType(title: string): WeatherWarning['type'] {
    const t = title.toLowerCase();
    if (t.includes('warning')) return 'warning';
    if (t.includes('watch')) return 'watch';
    if (t.includes('advisory')) return 'advisory';
    return 'statement';
  }

  /**
   * Load dismissed IDs from localStorage
   */
  function loadDismissed(): Set<string> {
    if (!browser) return new Set();
    try {
      const stored = localStorage.getItem('weather-dismissed');
      if (!stored) return new Set();
      const { ids, expires } = JSON.parse(stored);
      if (Date.now() > expires) {
        localStorage.removeItem('weather-dismissed');
        return new Set();
      }
      return new Set(ids);
    } catch {
      return new Set();
    }
  }

  /**
   * Save dismissed IDs to localStorage
   */
  function saveDismissed(ids: Set<string>) {
    if (!browser) return;
    try {
      localStorage.setItem('weather-dismissed', JSON.stringify({
        ids: [...ids],
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      }));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Fetch and parse weather warnings
   */
  async function fetchWarnings(): Promise<WeatherWarning[]> {
    // Check cache first
    if (browser) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, expires } = JSON.parse(cached);
          if (Date.now() < expires) {
            return data.map((w: any) => ({ ...w, updated: new Date(w.updated) }));
          }
        }
      } catch {
        // Cache miss
      }
    }

    // Fetch via CORS proxy or directly (may fail due to CORS)
    // Using a public CORS proxy for demo - in production, use your own
    try {
      // Try direct fetch first (works if headers allow)
      const response = await fetch(WEATHER_RSS);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const text = await response.text();
      return parseRSS(text);
    } catch {
      // If direct fails, try with allorigins proxy
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(WEATHER_RSS)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy failed');
        
        const text = await response.text();
        return parseRSS(text);
      } catch {
        console.warn('Weather warnings unavailable (CORS)');
        return [];
      }
    }
  }

  /**
   * Parse RSS XML into warnings
   */
  function parseRSS(xml: string): WeatherWarning[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const entries = doc.querySelectorAll('entry');
    const result: WeatherWarning[] = [];

    entries.forEach((entry, i) => {
      const title = entry.querySelector('title')?.textContent || '';
      const summary = entry.querySelector('summary')?.textContent || '';
      const updated = entry.querySelector('updated')?.textContent || '';

      // Only include transit-relevant warnings
      if (isTransitRelevant(title, summary)) {
        result.push({
          id: `weather-${i}-${Date.now()}`,
          title: title.replace(/\s+/g, ' ').trim(),
          summary: summary.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
          type: parseWarningType(title),
          icon: getWarningIcon(title),
          updated: new Date(updated)
        });
      }
    });

    // Cache the results
    if (browser && result.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: result,
          expires: Date.now() + CACHE_TTL
        }));
      } catch {
        // Ignore cache errors
      }
    }

    return result;
  }

  function dismiss(id: string) {
    dismissedIds = new Set([...dismissedIds, id]);
    saveDismissed(dismissedIds);
  }

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  // Visible warnings (not dismissed)
  let visibleWarnings = $derived(
    warnings.filter(w => !dismissedIds.has(w.id))
  );

  onMount(async () => {
    dismissedIds = loadDismissed();
    
    try {
      warnings = await fetchWarnings();
    } catch (e) {
      error = 'Unable to load weather warnings';
    } finally {
      isLoading = false;
    }
  });

  // Type colors
  const typeColors = {
    warning: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
    watch: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    advisory: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
    statement: 'bg-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-400'
  };
</script>

{#if visibleWarnings.length > 0}
  <div class="space-y-2 mb-4">
    {#each visibleWarnings as warning (warning.id)}
      {@const Icon = warning.icon}
      <div 
        class="rounded-lg border p-3 {typeColors[warning.type]}"
        role="alert"
      >
        <div class="flex items-start gap-3">
          <Icon class="h-5 w-5 flex-shrink-0 mt-0.5" />
          
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <button
                type="button"
                onclick={() => toggleExpand(warning.id)}
                class="text-left flex-1"
              >
                <h3 class="font-medium text-sm leading-tight">
                  {warning.title}
                </h3>
              </button>
              
              <div class="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6"
                  onclick={() => toggleExpand(warning.id)}
                  aria-label={expandedId === warning.id ? 'Collapse' : 'Expand'}
                >
                  {#if expandedId === warning.id}
                    <ChevronUp class="h-4 w-4" />
                  {:else}
                    <ChevronDown class="h-4 w-4" />
                  {/if}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6"
                  onclick={() => dismiss(warning.id)}
                  aria-label="Dismiss warning"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>

            {#if expandedId === warning.id}
              <p class="text-sm mt-2 opacity-90">
                {warning.summary}
              </p>
              <p class="text-xs mt-2 opacity-70">
                Updated: {warning.updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}
