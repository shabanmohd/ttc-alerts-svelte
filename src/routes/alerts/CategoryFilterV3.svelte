<script lang="ts">
  import { cn } from "$lib/utils";
  import { TriangleAlert, Gauge, Accessibility } from "lucide-svelte";

  type Category = "disruptions" | "delays" | "station-alerts";

  interface CategoryConfig {
    id: Category;
    label: string;
    icon: typeof TriangleAlert;
    ariaLabel: string;
  }

  let {
    selected = "disruptions",
    counts = { disruptions: 0, delays: 0, stationAlerts: 0 },
    onSelect,
  }: {
    selected: Category;
    counts?: { disruptions: number; delays: number; stationAlerts: number };
    onSelect: (category: Category) => void;
  } = $props();

  const categories: CategoryConfig[] = [
    {
      id: "disruptions",
      label: "Disruptions & Delays",
      icon: TriangleAlert,
      ariaLabel: "Show service disruptions and delays",
    },
    {
      id: "station-alerts",
      label: "Station Alerts",
      icon: Accessibility,
      ariaLabel: "Show station and facility alerts",
    },
    {
      id: "delays",
      label: "Slow Zones",
      icon: Gauge,
      ariaLabel: "Show subway slow zones",
    },
  ];

  function handleSelect(category: Category) {
    onSelect(category);
  }

  // Debug: log counts when they change
  $effect(() => {
    console.log("CategoryFilterV3 counts:", counts);
  });
</script>

<div class="category-filter-container">
  <div class="category-filter" role="tablist" aria-label="Filter by category">
    {#each categories as cat}
      {@const isActive = selected === cat.id}
      {@const Icon = cat.icon}
      {@const count = cat.id === 'station-alerts' ? counts.stationAlerts : counts[cat.id] || 0}
      <button
        class={cn("category-pill", cat.id, isActive && "active")}
        role="tab"
        aria-selected={isActive}
        aria-label={`${cat.ariaLabel} (${count} alerts)`}
        onclick={() => handleSelect(cat.id)}
        type="button"
      >
        <Icon class="pill-icon" aria-hidden="true" />
        <span class="pill-label">{cat.label}</span>
        {#if count > 0}
          <span class="pill-count">{count}</span>
        {/if}
      </button>
    {/each}
  </div>
  <div class="category-filter-fade" aria-hidden="true"></div>
</div>

<style>
  /* Container for pills with fade indicator */
  .category-filter-container {
    position: relative;
    margin-bottom: 1rem;
  }

  .category-filter {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .category-filter::-webkit-scrollbar {
    display: none;
  }

  /* Fade indicator on mobile to show more content */
  .category-filter-fade {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0.25rem;
    width: 2rem;
    pointer-events: none;
    background: linear-gradient(to right, transparent, hsl(var(--background)));
  }

  /* Desktop: wrap instead of scroll, hide fade */
  @media (min-width: 640px) {
    .category-filter {
      flex-wrap: wrap;
      overflow-x: visible;
    }

    .category-filter-fade {
      display: none;
    }
  }

  .category-pill {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: hsl(var(--muted));
    border: 1px solid transparent;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .category-pill:hover:not(.active) {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted-foreground) / 0.15);
  }

  /* Active state base */
  .category-pill.active {
    color: hsl(var(--foreground));
    background-color: hsl(var(--background));
    border-color: hsl(var(--border));
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.08);
  }

  /* Disruptions - Red accent */
  .category-pill.disruptions.active {
    color: hsl(0 72% 45%);
    border-color: hsl(0 72% 45% / 0.3);
    background-color: hsl(0 72% 45% / 0.08);
  }

  :global(.dark) .category-pill.disruptions.active {
    color: hsl(0 85% 65%);
    border-color: hsl(0 85% 65% / 0.3);
    background-color: hsl(0 85% 65% / 0.15);
  }

  /* Slow Zones - Amber accent */
  .category-pill.delays.active {
    color: hsl(45 93% 35%);
    border-color: hsl(45 93% 47% / 0.3);
    background-color: hsl(45 93% 47% / 0.1);
  }

  :global(.dark) .category-pill.delays.active {
    color: hsl(45 93% 57%);
    border-color: hsl(45 93% 57% / 0.3);
    background-color: hsl(45 93% 57% / 0.15);
  }

  /* Station Alerts - Blue accent */
  .category-pill.station-alerts.active {
    color: hsl(217 91% 45%);
    border-color: hsl(217 91% 60% / 0.3);
    background-color: hsl(217 91% 60% / 0.08);
  }

  :global(.dark) .category-pill.station-alerts.active {
    color: hsl(217 91% 70%);
    border-color: hsl(217 91% 70% / 0.3);
    background-color: hsl(217 91% 70% / 0.15);
  }

  .category-pill :global(.pill-icon) {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
  }

  .pill-label {
    line-height: 1;
  }

  .pill-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.125rem;
    height: 1.125rem;
    padding: 0 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    background-color: hsl(var(--muted-foreground) / 0.15);
    border-radius: 9999px;
    margin-left: 0.125rem;
  }

  /* Active state - category-specific colors */
  .category-pill.disruptions.active .pill-count {
    background-color: hsl(0 72% 45%);
    color: white;
  }

  .category-pill.delays.active .pill-count {
    background-color: hsl(45 93% 35%);
    color: white;
  }

  .category-pill.station-alerts.active .pill-count {
    background-color: hsl(217 91% 45%);
    color: white;
  }

  :global(.dark) .category-pill.disruptions.active .pill-count {
    background-color: hsl(0 85% 65%);
    color: hsl(0 0% 10%);
  }

  :global(.dark) .category-pill.delays.active .pill-count {
    background-color: hsl(45 93% 57%);
    color: hsl(0 0% 10%);
  }

  :global(.dark) .category-pill.station-alerts.active .pill-count {
    background-color: hsl(217 91% 70%);
    color: hsl(0 0% 10%);
  }
</style>
