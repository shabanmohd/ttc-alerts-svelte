<script lang="ts">
  import { AlarmClock, ChevronDown, ExternalLink } from 'lucide-svelte';
  import RouteBadge from './RouteBadge.svelte';
  import { cn } from '$lib/utils';
  import type { PlannedMaintenance } from '$lib/types/database';
  
  let { items = [] }: { items?: PlannedMaintenance[] } = $props();
  
  let isExpanded = $state(false);
  let activeTab = $state<'starting-soon' | 'weekend' | 'coming-up'>('starting-soon');
  
  /**
   * Parse date string as local time to avoid UTC shift.
   * Handles both "2025-12-04" and "2025-12-04T00:00:00" formats.
   */
  function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // If it's just a date (YYYY-MM-DD), add time to parse as local
    if (dateStr.length === 10 && dateStr.includes('-')) {
      return new Date(dateStr + 'T00:00:00');
    }
    // If it already has time but no timezone, parse as-is (local)
    if (!dateStr.includes('Z') && !dateStr.includes('+')) {
      return new Date(dateStr);
    }
    // Otherwise parse normally (has timezone info)
    return new Date(dateStr);
  }
  
  /**
   * Parse time string to get hour (0-23).
   * Handles formats: "23:59", "23:59:00", "11:59 PM", "11:59 p.m."
   */
  function parseTimeHour(timeStr: string | null): number | null {
    if (!timeStr) return null;
    
    const time = timeStr.trim().toLowerCase();
    
    // Try 24-hour format (HH:MM or HH:MM:SS)
    const match24 = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      return parseInt(match24[1], 10);
    }
    
    // Try 12-hour format (H:MM AM/PM)
    const match12 = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)$/i);
    if (match12) {
      let hour = parseInt(match12[1], 10);
      const isPM = match12[3].toLowerCase().startsWith('p');
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return hour;
    }
    
    return null;
  }
  
  /**
   * Format time for display (e.g., "11:59 PM")
   */
  function formatTime(timeStr: string | null): string | null {
    if (!timeStr) return null;
    
    const hour = parseTimeHour(timeStr);
    if (hour === null) return timeStr; // Return as-is if can't parse
    
    // Extract minutes (handle HH:MM:SS format)
    const minMatch = timeStr.match(/:(\d{2})/);
    const minutes = minMatch ? minMatch[1] : '00';
    
    // Format as 12-hour
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    // Don't show :00 minutes for cleaner display
    if (minutes === '00') {
      return `${displayHour} ${ampm}`;
    }
    
    return `${displayHour}:${minutes} ${ampm}`;
  }
  
  /**
   * Get closure badge type and label.
   * Returns null if no special badge needed.
   */
  function getClosureBadge(item: PlannedMaintenance): { type: 'nightly' | 'weekend'; label: string } | null {
    const start = parseLocalDate(item.start_date);
    const end = parseLocalDate(item.end_date);
    
    // Full weekend closure: Saturday (6) to Sunday (0)
    if (start.getDay() === 6 && end.getDay() === 0) {
      return { type: 'weekend', label: 'Full weekend closure' };
    }
    
    // Nightly early closure: starts 10 PM (22:00) or later
    const startHour = parseTimeHour(item.start_time);
    if (startHour !== null && startHour >= 22) {
      return { type: 'nightly', label: 'Nightly early closure' };
    }
    
    return null;
  }
  
  /**
   * Categorize maintenance items by timeframe.
   */
  const categorizedItems = $derived(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeekend = getNextWeekendStart();
    const endOfWeekend = getNextWeekendEnd();
    
    const startingSoon: PlannedMaintenance[] = [];
    const weekend: PlannedMaintenance[] = [];
    const comingUp: PlannedMaintenance[] = [];
    
    items.forEach(item => {
      const startDate = parseLocalDate(item.start_date);
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const daysDiff = Math.ceil((startDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Starting today or tomorrow (within ~24 hours)
      if (daysDiff <= 1) {
        startingSoon.push(item);
      }
      // This weekend
      else if (startDate >= startOfWeekend && startDate <= endOfWeekend) {
        weekend.push(item);
      }
      // Coming up (everything else)
      else {
        comingUp.push(item);
      }
    });
    
    return { startingSoon, weekend, comingUp };
  });
  
  function getNextWeekendStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // If today is Saturday (6) or Sunday (0), use today/tomorrow
    if (dayOfWeek === 6) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }
    if (dayOfWeek === 0) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }
    // Otherwise, find next Saturday
    const daysUntilSaturday = 6 - dayOfWeek;
    const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday, 0, 0, 0);
    return saturday;
  }
  
  function getNextWeekendEnd(): Date {
    const start = getNextWeekendStart();
    const dayOfWeek = start.getDay();
    // If start is Saturday, end is Sunday
    if (dayOfWeek === 6) {
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 23, 59, 59);
    }
    // If start is Sunday, end is same day
    return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);
  }
  
  function formatDateRange(startDate: string, endDate: string): string {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Short month
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDateNum = start.getDate();
    const startYear = start.getFullYear();
    
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDateNum = end.getDate();
    const endYear = end.getFullYear();
    
    // Same day
    if (start.toDateString() === end.toDateString()) {
      const yearStr = startYear !== currentYear ? ` ${startYear}` : '';
      return `${startMonth} ${startDateNum}${yearStr}`;
    }
    
    // Same month
    if (startMonth === endMonth && startYear === endYear) {
      const yearStr = startYear !== currentYear ? ` ${startYear}` : '';
      return `${startMonth} ${startDateNum}–${endDateNum}${yearStr}`;
    }
    
    // Different months
    const yearStr = startYear !== currentYear || endYear !== currentYear ? ` ${endYear}` : '';
    return `${startMonth} ${startDateNum} – ${endMonth} ${endDateNum}${yearStr}`;
  }
  
  const totalCount = $derived(items.length);
  const currentItems = $derived(() => {
    const cats = categorizedItems();
    switch (activeTab) {
      case 'starting-soon': return cats.startingSoon;
      case 'weekend': return cats.weekend;
      case 'coming-up': return cats.comingUp;
      default: return [];
    }
  });
  
  const tabCounts = $derived(() => {
    const cats = categorizedItems();
    return {
      'starting-soon': cats.startingSoon.length,
      'weekend': cats.weekend.length,
      'coming-up': cats.comingUp.length
    };
  });
  
  /**
   * Tab configuration for consistent rendering.
   */
  const tabs = [
    { id: 'starting-soon', label: 'Starting Soon', ariaLabel: 'View maintenance starting soon' },
    { id: 'weekend', label: 'This Weekend', ariaLabel: 'View weekend maintenance' },
    { id: 'coming-up', label: 'Coming Up', ariaLabel: 'View upcoming maintenance' }
  ] as const;
</script>

{#if totalCount > 0}
  <section 
    class="maintenance-widget mb-4" 
    aria-labelledby="maintenance-heading"
  >
    <button 
      class="maintenance-toggle" 
      onclick={() => isExpanded = !isExpanded}
      aria-expanded={isExpanded}
      aria-controls="maintenance-content"
      type="button"
    >
      <div class="maintenance-toggle-content">
        <AlarmClock class="maintenance-toggle-icon" aria-hidden="true" />
        <span class="maintenance-toggle-title" id="maintenance-heading">Planned Subway Closures</span>
        <span class="maintenance-toggle-badge" aria-label="{totalCount} upcoming maintenance items">
          {totalCount} upcoming
        </span>
      </div>
      <ChevronDown 
        class={cn(
          'maintenance-toggle-chevron',
          isExpanded && 'rotate-180'
        )} 
        aria-hidden="true"
      />
    </button>
    
    {#if isExpanded}
      <div class="maintenance-content" id="maintenance-content">
        <!-- Maintenance Tabs -->
        <div class="maintenance-tabs-wrapper">
          <div 
            class="maintenance-tabs" 
            role="tablist" 
            aria-label="Maintenance timeframe"
          >
            {#each tabs as tab}
              {@const count = tabCounts()[tab.id]}
              <button 
                class={cn('maintenance-tab', activeTab === tab.id && 'active')}
                onclick={() => activeTab = tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="maintenance-panel-{tab.id}"
                id="maintenance-tab-{tab.id}"
                aria-label="{tab.ariaLabel} ({count} items)"
                type="button"
              >
                <span>{tab.label}</span>
                <span class="maintenance-tab-count">{count}</span>
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Maintenance Items -->
        <div 
          class="maintenance-items"
          role="tabpanel"
          id="maintenance-panel-{activeTab}"
          aria-labelledby="maintenance-tab-{activeTab}"
        >
          {#if currentItems().length === 0}
            <p class="text-sm text-muted-foreground p-4">
              No {activeTab === 'starting-soon' ? 'imminent' : activeTab === 'weekend' ? 'weekend' : 'upcoming'} maintenance scheduled.
            </p>
          {:else}
            {#each currentItems() as item}
              {@const closureBadge = getClosureBadge(item)}
              {@const startTime = formatTime(item.start_time)}
              <article class="maintenance-item">
                <div class="maintenance-item-grid">
                  <div class="maintenance-item-left">
                    <p class="maintenance-item-stations">{item.affected_stations}</p>
                    <div class="maintenance-item-badges">
                      {#each item.routes as route}
                        <RouteBadge {route} />
                      {/each}
                    </div>
                  </div>
                  <div class="maintenance-item-datetime">
                    <time class="maintenance-item-date" datetime={item.start_date}>
                      {formatDateRange(item.start_date, item.end_date)}
                    </time>
                    {#if startTime && closureBadge?.type !== 'weekend'}
                      <span class="maintenance-item-start-time">from {startTime}</span>
                    {/if}
                  </div>
                </div>
                <div class="maintenance-item-footer">
                  {#if closureBadge}
                    <span class="maintenance-item-closure-badge {closureBadge.type}">
                      {closureBadge.label}
                    </span>
                  {:else}
                    <span></span>
                  {/if}
                  {#if item.url}
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      class="maintenance-item-link"
                    >
                      Details <ExternalLink class="h-3 w-3" aria-hidden="true" />
                      <span class="sr-only">(opens in new tab)</span>
                    </a>
                  {/if}
                </div>
              </article>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </section>
{/if}
