<script lang="ts">
  import { DIRECTION_COLORS, type DirectionLabel } from "$lib/data/stops-db";
  import { cn } from "$lib/utils";
  import {
    ArrowRight,
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    CircleDot,
  } from "lucide-svelte";

  // Props
  let {
    directions = [],
    selected,
    onSelect,
    stopCounts = {} as Record<DirectionLabel, number>,
  }: {
    directions: DirectionLabel[];
    selected: DirectionLabel;
    onSelect: (direction: DirectionLabel) => void;
    stopCounts?: Record<DirectionLabel, number>;
  } = $props();

  /**
   * Get icon component for direction
   */
  function getDirectionIcon(direction: DirectionLabel) {
    // Cardinal directions
    switch (direction) {
      case "Eastbound":
        return ArrowRight;
      case "Westbound":
        return ArrowLeft;
      case "Northbound":
        return ArrowUp;
      case "Southbound":
        return ArrowDown;
    }
    
    // Subway terminal directions - map to appropriate arrows
    // Line 1: VMC is northwest, Finch is north
    if (direction === "Towards VMC") return ArrowLeft;
    if (direction === "Towards Finch") return ArrowRight;
    // Line 2: Kennedy is east, Kipling is west  
    if (direction === "Towards Kennedy") return ArrowRight;
    if (direction === "Towards Kipling") return ArrowLeft;
    // Line 4: Don Mills is east, Sheppard-Yonge is west
    if (direction === "Towards Don Mills") return ArrowRight;
    if (direction === "Towards Sheppard-Yonge") return ArrowLeft;
    // Line 6: Finch West is east, Humber College is west
    if (direction === "Towards Finch West") return ArrowRight;
    if (direction === "Towards Humber College") return ArrowLeft;
    
    return CircleDot;
  }

  /**
   * Get short label for mobile display
   */
  function getShortLabel(direction: DirectionLabel): string {
    // Cardinal directions
    switch (direction) {
      case "Eastbound":
        return "East";
      case "Westbound":
        return "West";
      case "Northbound":
        return "North";
      case "Southbound":
        return "South";
      case "All Stops":
        return "All";
    }
    
    // Subway terminal names - extract terminal station
    // "Towards VMC" -> "VMC"
    // "Towards Kennedy" -> "Kennedy"
    // "Towards Sheppard-Yonge" -> "Shep-Yonge"
    if (direction.startsWith("Towards ")) {
      const terminal = direction.replace("Towards ", "");
      // Shorten long station names
      if (terminal === "Sheppard-Yonge") return "Shep-Yonge";
      if (terminal === "Humber College") return "Humber";
      if (terminal === "Finch West") return "Finch W";
      if (terminal === "Don Mills") return "Don Mills";
      return terminal;
    }
    
    return direction;
  }
</script>

<div class="direction-tabs" role="tablist" aria-label="Route directions">
  {#each directions as direction (direction)}
    {@const Icon = getDirectionIcon(direction)}
    {@const isSelected = selected === direction}
    {@const colorClass = DIRECTION_COLORS[direction]}
    {@const count = stopCounts[direction] || 0}

    <button
      type="button"
      role="tab"
      class={cn("direction-tab", isSelected && "selected", colorClass)}
      class:selected={isSelected}
      aria-selected={isSelected}
      onclick={() => onSelect(direction)}
    >
      <Icon class="tab-icon h-4 w-4" />
      <span class="tab-label">
        <span class="full-label">{direction}</span>
        <span class="short-label">{getShortLabel(direction)}</span>
      </span>
      {#if count > 0}
        <span class="stop-count">{count}</span>
      {/if}
      {#if isSelected}
        <span class="selected-indicator"></span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .direction-tabs {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: hsl(var(--muted) / 0.5);
    border-radius: var(--radius);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .direction-tabs::-webkit-scrollbar {
    display: none;
  }

  .direction-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: calc(var(--radius) - 2px);
    background: transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
    flex: 1;
    min-width: fit-content;
    justify-content: center;
  }

  .direction-tab:hover:not(.selected) {
    background: hsl(var(--muted));
  }

  .direction-tab.selected {
    background: hsl(var(--background));
    box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
  }

  .tab-icon {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .tab-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  /* Responsive labels */
  .full-label {
    display: none;
  }

  .short-label {
    display: inline;
  }

  @media (min-width: 640px) {
    .full-label {
      display: inline;
    }

    .short-label {
      display: none;
    }
  }

  .stop-count {
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    background: hsl(var(--muted));
    border-radius: 9999px;
    color: hsl(var(--muted-foreground));
  }

  .direction-tab.selected .stop-count {
    background: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
  }

  .selected-indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 2rem;
    height: 2px;
    background: hsl(var(--primary));
    border-radius: 1px;
    animation: slideIn 0.15s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(-50%) scaleX(0);
    }
    to {
      transform: translateX(-50%) scaleX(1);
    }
  }

  /* Override background colors for direction tabs */
  .direction-tab.bg-sky-100 {
    background: transparent;
  }
  .direction-tab.bg-amber-100 {
    background: transparent;
  }
  .direction-tab.bg-emerald-100 {
    background: transparent;
  }
  .direction-tab.bg-rose-100 {
    background: transparent;
  }
  .direction-tab.bg-muted {
    background: transparent;
  }

  .direction-tab.selected.bg-sky-100 {
    background: hsl(199 89% 96%);
  }
  .direction-tab.selected.bg-amber-100 {
    background: hsl(48 96% 95%);
  }
  .direction-tab.selected.bg-emerald-100 {
    background: hsl(152 81% 95%);
  }
  .direction-tab.selected.bg-rose-100 {
    background: hsl(356 100% 97%);
  }

  :global(.dark) .direction-tab.selected.bg-sky-100,
  :global(.dark) .direction-tab.selected.bg-sky-900\/30 {
    background: hsl(199 89% 20% / 0.3);
  }
  :global(.dark) .direction-tab.selected.bg-amber-100,
  :global(.dark) .direction-tab.selected.bg-amber-900\/30 {
    background: hsl(48 96% 20% / 0.3);
  }
  :global(.dark) .direction-tab.selected.bg-emerald-100,
  :global(.dark) .direction-tab.selected.bg-emerald-900\/30 {
    background: hsl(152 81% 20% / 0.3);
  }
  :global(.dark) .direction-tab.selected.bg-rose-100,
  :global(.dark) .direction-tab.selected.bg-rose-900\/30 {
    background: hsl(356 100% 20% / 0.3);
  }
</style>
