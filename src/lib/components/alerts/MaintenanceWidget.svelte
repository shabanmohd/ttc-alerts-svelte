<script lang="ts">
  import { Wrench, ChevronDown, ExternalLink } from 'lucide-svelte';
  import RouteBadge from './RouteBadge.svelte';
  import type { PlannedMaintenance } from '$lib/types/database';
  
  let { items = [] }: { items?: PlannedMaintenance[] } = $props();
  
  let isExpanded = $state(false);
  let activeTab = $state<'starting-soon' | 'weekend' | 'coming-up'>('starting-soon');
  
  // Categorize maintenance items
  const categorizedItems = $derived(() => {
    const now = new Date();
    const startOfWeekend = getNextWeekendStart();
    const endOfWeekend = getNextWeekendEnd();
    
    const startingSoon: PlannedMaintenance[] = [];
    const weekend: PlannedMaintenance[] = [];
    const comingUp: PlannedMaintenance[] = [];
    
    items.forEach(item => {
      const startDate = new Date(item.start_date);
      const daysDiff = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Starting within 24 hours
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
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSaturday);
    saturday.setHours(0, 0, 0, 0);
    return saturday;
  }
  
  function getNextWeekendEnd(): Date {
    const saturday = getNextWeekendStart();
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }
  
  function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startStr = start.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const endStr = end.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const timeStr = start.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit'
    });
    
    if (startStr === endStr) {
      return `${startStr} • Starting at ${timeStr}`;
    }
    
    return `${startStr} to ${endStr}`;
  }
  
  function isFullWeekendClosure(item: PlannedMaintenance): boolean {
    // Check if it spans a full weekend
    const start = new Date(item.start_date);
    const end = new Date(item.end_date);
    const startDay = start.getDay();
    const endDay = end.getDay();
    
    return (startDay === 6 || startDay === 0) && (endDay === 0 || endDay === 1);
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
</script>

{#if totalCount > 0}
  <div class="maintenance-widget mb-4">
    <button 
      class="maintenance-toggle" 
      onclick={() => isExpanded = !isExpanded}
    >
      <div class="maintenance-toggle-content">
        <Wrench class="maintenance-toggle-icon" />
        <span class="maintenance-toggle-title">Planned Maintenance</span>
        <span class="maintenance-toggle-badge">{totalCount} upcoming</span>
      </div>
      <ChevronDown class="maintenance-toggle-chevron {isExpanded ? 'rotate-180' : ''}" />
    </button>
    
    {#if isExpanded}
      <div class="maintenance-content">
        <!-- Maintenance Tabs -->
        <div class="maintenance-tabs scrollbar-hide">
          <button 
            class="maintenance-tab {activeTab === 'starting-soon' ? 'active' : ''}" 
            onclick={() => activeTab = 'starting-soon'}
          >
            <span>Starting Soon</span>
            <span class="maintenance-tab-count">{tabCounts()['starting-soon']}</span>
          </button>
          <button 
            class="maintenance-tab {activeTab === 'weekend' ? 'active' : ''}" 
            onclick={() => activeTab = 'weekend'}
          >
            <span>This Weekend</span>
            <span class="maintenance-tab-count">{tabCounts()['weekend']}</span>
          </button>
          <button 
            class="maintenance-tab {activeTab === 'coming-up' ? 'active' : ''}" 
            onclick={() => activeTab = 'coming-up'}
          >
            <span>Coming Up</span>
            <span class="maintenance-tab-count">{tabCounts()['coming-up']}</span>
          </button>
        </div>
        
        <!-- Maintenance Items -->
        <div class="maintenance-items">
          {#if currentItems().length === 0}
            <p class="text-sm text-[hsl(var(--muted-foreground))] p-4">
              No {activeTab === 'starting-soon' ? 'imminent' : activeTab === 'weekend' ? 'weekend' : 'upcoming'} maintenance scheduled.
            </p>
          {:else}
            {#each currentItems() as item}
              <div class="maintenance-item">
                <div class="maintenance-item-header">
                  {#each item.routes as route}
                    <RouteBadge {route} />
                  {/each}
                </div>
                {#if isFullWeekendClosure(item)}
                  <span class="maintenance-item-closure-badge">Full Weekend Closure</span>
                {/if}
                <p class="maintenance-item-description">{item.description}</p>
                <p class="maintenance-item-dates">{formatDateRange(item.start_date, item.end_date)}</p>
                {#if item.url}
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="maintenance-item-link"
                  >
                    More info <ExternalLink class="h-3 w-3" />
                  </a>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}
