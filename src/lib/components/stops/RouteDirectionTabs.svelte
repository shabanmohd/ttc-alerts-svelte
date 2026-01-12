<script lang="ts">
  import { DIRECTION_COLORS, type DirectionLabel } from "$lib/data/stops-db";
  import { cn } from "$lib/utils";
  import { _ } from "svelte-i18n";
  import {
    ArrowRight,
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    CircleDot,
  } from "lucide-svelte";

  /**
   * Direction item for tabs - includes both internal key and display label
   */
  export interface DirectionItem {
    /** Internal key (e.g., "Westbound", "Westbound2") - used for selection and keying */
    key: string;
    /** User-friendly display label (e.g., "Towards Renforth Station") */
    label: string;
  }

  // Props - accepts array of DirectionItem objects with key and label
  let {
    directions = [],
    selected,
    onSelect,
    stopCounts = {} as Record<string, number>,
  }: {
    directions: DirectionItem[];
    selected: string;
    onSelect: (directionKey: string) => void;
    stopCounts?: Record<string, number>;
  } = $props();

  /**
   * Get icon component for direction label
   * Handles both cardinal directions and "Towards X" style labels
   */
  function getDirectionIcon(direction: string) {
    // Cardinal directions (legacy, for fallback)
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

    // For "Towards X" labels, use generic right arrow (destination indicator)
    if (direction.startsWith("Towards ")) {
      return ArrowRight;
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
   * Handles both cardinal directions and "Towards X" labels
   */
  function getShortLabel(direction: string): string {
    // Cardinal directions (legacy fallback)
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

    // Extract destination from "Towards X" labels
    // "Towards Kennedy Station" -> "Kennedy Stn"
    // "Towards Finch and Morningside" -> "Finch/Morningside"
    if (direction.startsWith("Towards ")) {
      let terminal = direction.replace("Towards ", "");

      // Shorten common suffixes
      terminal = terminal.replace(" Station", " Stn");
      terminal = terminal.replace(" and ", "/");

      // Specific shortenings for known long names
      if (terminal === "Sheppard-Yonge") return "Shep-Yonge";
      if (terminal === "Humber College") return "Humber";
      if (terminal === "Finch West") return "Finch W";
      if (terminal.includes("Metropolitan Centre")) return "VMC";

      // Truncate if still too long
      if (terminal.length > 15) {
        terminal = terminal.substring(0, 14) + "…";
      }

      return terminal;
    }

    return direction;
  }

  /**
   * Get color class for direction key
   * Handles both standard directions and branch variants (e.g., "Westbound2")
   */
  function getColorClass(dirKey: string): string {
    // Check standard direction colors first
    if (DIRECTION_COLORS[dirKey]) {
      return DIRECTION_COLORS[dirKey];
    }

    // Handle branch variants (e.g., "Westbound2" -> use Westbound color)
    if (dirKey.startsWith("Eastbound")) return DIRECTION_COLORS["Eastbound"];
    if (dirKey.startsWith("Westbound")) return DIRECTION_COLORS["Westbound"];
    if (dirKey.startsWith("Northbound")) return DIRECTION_COLORS["Northbound"];
    if (dirKey.startsWith("Southbound")) return DIRECTION_COLORS["Southbound"];

    // For "Towards X" labels, use a neutral accent color
    if (dirKey.startsWith("Towards ")) {
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
    }

    return "bg-muted text-muted-foreground";
  }

  /**
   * Translate direction label for i18n
   * "Towards X" -> $_("eta.towardsDestination", { values: { destination: "X" }})
   * "Eastbound" -> $_("directions.eastbound")
   */
  function translateLabel(label: string): string {
    // Handle "Towards X" labels
    if (label.startsWith("Towards ")) {
      const destination = label.replace("Towards ", "");
      return $_("eta.towardsDestination", { values: { destination } });
    }

    // Handle cardinal directions
    const dirKey = label.toLowerCase();
    if (
      ["eastbound", "westbound", "northbound", "southbound"].includes(dirKey)
    ) {
      return $_(`directions.${dirKey}`);
    }

    return label;
  }

  /**
   * Translate short label for mobile display
   */
  function translateShortLabel(label: string): string {
    const shortLabel = getShortLabel(label);

    // Translate short cardinal directions
    switch (shortLabel) {
      case "East":
        return $_("directions.east");
      case "West":
        return $_("directions.west");
      case "North":
        return $_("directions.north");
      case "South":
        return $_("directions.south");
      default:
        return shortLabel;
    }
  }
</script>

<div class="direction-tabs" role="tablist" aria-label="Route directions">
  {#each directions as dir (dir.key)}
    {@const Icon = getDirectionIcon(dir.label)}
    {@const isSelected = selected === dir.key}
    {@const colorClass = getColorClass(dir.key)}
    {@const count = stopCounts[dir.key] || 0}

    <button
      type="button"
      role="tab"
      class={cn("direction-tab", isSelected && "selected", colorClass)}
      class:selected={isSelected}
      aria-selected={isSelected}
      onclick={() => onSelect(dir.key)}
    >
      <Icon class="tab-icon h-4 w-4" />
      <span class="tab-label">
        <span class="full-label">{translateLabel(dir.label)}</span>
        <span class="short-label">{translateShortLabel(dir.label)}</span>
      </span>
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
