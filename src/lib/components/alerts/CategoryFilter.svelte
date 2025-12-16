<script lang="ts">
  import { cn } from '$lib/utils';
  import { Accessibility, AlertTriangle, Clock, List } from 'lucide-svelte';
  
  /**
   * Severity category filter for alerts.
   * Categories based on TTC Live API effects:
   * - MAJOR: Disruptions, closures, detours, shuttles (NO_SERVICE, REDUCED_SERVICE, DETOUR, MODIFIED_SERVICE)
   * - MINOR: Delays, reduced speed zones (SIGNIFICANT_DELAYS, DELAY)
   * - ACCESSIBILITY: Elevator/escalator outages (ACCESSIBILITY_ISSUE)
   * - ALL: Show all alerts
   */
  
  type Category = 'MAJOR' | 'MINOR' | 'ACCESSIBILITY' | 'ALL';
  
  interface CategoryConfig {
    id: Category;
    label: string;
    icon: typeof AlertTriangle;
    ariaLabel: string;
    colorClass: string;
  }
  
  let { 
    selected = 'MAJOR',
    counts = { MAJOR: 0, MINOR: 0, ACCESSIBILITY: 0, ALL: 0 },
    onSelect
  }: { 
    selected: Category;
    counts?: { MAJOR: number; MINOR: number; ACCESSIBILITY: number; ALL: number };
    onSelect: (category: Category) => void;
  } = $props();
  
  const categories: CategoryConfig[] = [
    { 
      id: 'MAJOR', 
      label: 'Major', 
      icon: AlertTriangle,
      ariaLabel: 'Show major disruptions only',
      colorClass: 'category-major'
    },
    { 
      id: 'MINOR', 
      label: 'Minor', 
      icon: Clock,
      ariaLabel: 'Show minor delays only',
      colorClass: 'category-minor'
    },
    { 
      id: 'ACCESSIBILITY', 
      label: 'Accessibility', 
      icon: Accessibility,
      ariaLabel: 'Show accessibility alerts only',
      colorClass: 'category-accessibility'
    },
    { 
      id: 'ALL', 
      label: 'All', 
      icon: List,
      ariaLabel: 'Show all alerts',
      colorClass: 'category-all'
    }
  ];
  
  function handleSelect(category: Category) {
    onSelect(category);
  }
  
  function getCount(id: Category): number {
    return counts[id] || 0;
  }
</script>

<div 
  class="category-filter-container" 
  role="tablist" 
  aria-label="Filter alerts by severity"
>
  {#each categories as category}
    {@const isActive = selected === category.id}
    {@const Icon = category.icon}
    {@const count = getCount(category.id)}
    <button
      class={cn(
        'category-tab',
        category.colorClass,
        isActive && 'active'
      )}
      role="tab"
      aria-selected={isActive}
      aria-label={`${category.ariaLabel} (${count} alerts)`}
      onclick={() => handleSelect(category.id)}
      type="button"
    >
      <Icon class="category-icon" aria-hidden="true" />
      <span class="category-label">{category.label}</span>
      {#if count > 0}
        <span class="category-count">{count}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .category-filter-container {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background-color: hsl(var(--muted));
    border-radius: calc(var(--radius) + 2px);
    margin-bottom: 1rem;
  }

  .category-tab {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem 0.375rem;
    border-radius: var(--radius);
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .category-tab:hover:not(.active) {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted-foreground) / 0.1);
  }

  .category-tab.active {
    color: hsl(var(--foreground));
    background-color: hsl(var(--background));
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
  
  /* Category-specific active colors */
  .category-tab.category-major.active {
    color: hsl(0 72% 51%);
  }
  
  .category-tab.category-minor.active {
    color: hsl(38 92% 50%);
  }
  
  .category-tab.category-accessibility.active {
    color: hsl(217 91% 60%);
  }
  
  .category-tab.category-all.active {
    color: hsl(var(--foreground));
  }

  .category-tab.active::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 1.5rem;
    height: 2px;
    border-radius: 1px;
  }
  
  .category-tab.category-major.active::after {
    background: hsl(0 72% 51%);
  }
  
  .category-tab.category-minor.active::after {
    background: hsl(38 92% 50%);
  }
  
  .category-tab.category-accessibility.active::after {
    background: hsl(217 91% 60%);
  }
  
  .category-tab.category-all.active::after {
    background: hsl(var(--primary));
  }

  .category-icon {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
  }

  .category-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .category-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.125rem;
    height: 1.125rem;
    padding: 0 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    border-radius: 9999px;
    background-color: hsl(var(--muted-foreground) / 0.2);
    color: hsl(var(--muted-foreground));
  }
  
  .category-tab.active .category-count {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
  }
  
  .category-tab.category-major.active .category-count {
    background-color: hsl(0 72% 51% / 0.15);
    color: hsl(0 72% 51%);
  }
  
  .category-tab.category-minor.active .category-count {
    background-color: hsl(38 92% 50% / 0.15);
    color: hsl(38 60% 40%);
  }
  
  .category-tab.category-accessibility.active .category-count {
    background-color: hsl(217 91% 60% / 0.15);
    color: hsl(217 91% 60%);
  }

  /* Responsive */
  @media (max-width: 400px) {
    .category-tab {
      padding: 0.5rem 0.25rem;
      gap: 0.25rem;
      font-size: 0.6875rem;
    }
    
    .category-icon {
      width: 0.75rem;
      height: 0.75rem;
    }
    
    .category-count {
      min-width: 1rem;
      height: 1rem;
      font-size: 0.5625rem;
      padding: 0 0.1875rem;
    }
  }
  
  /* Extra small screens: icons only */
  @media (max-width: 320px) {
    .category-label {
      display: none;
    }
    
    .category-tab {
      padding: 0.625rem 0.5rem;
    }
  }
</style>
