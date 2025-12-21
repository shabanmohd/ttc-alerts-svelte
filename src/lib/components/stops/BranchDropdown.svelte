<script lang="ts">
  import { cn } from "$lib/utils";
  import { ChevronDown } from "lucide-svelte";
  import RouteBadge from "$lib/components/alerts/RouteBadge.svelte";

  /**
   * Branch info with badge ID and destination label
   */
  export interface BranchItem {
    /** Branch identifier (e.g., "102A", "102B", "102C", "102D") */
    id: string;
    /** Destination label (e.g., "Towards Major Mackenzie") */
    title: string;
    /** Stop count for this branch */
    stopCount?: number;
  }

  let {
    branches = [],
    selected,
    onSelect,
    routeNumber = "",
  }: {
    branches: BranchItem[];
    selected: string;
    onSelect: (branchId: string) => void;
    routeNumber?: string;
  } = $props();

  let isOpen = $state(false);

  // Get selected branch info
  let selectedBranch = $derived(
    branches.find((b) => b.id === selected) || branches[0]
  );

  function handleSelect(branchId: string) {
    onSelect(branchId);
    isOpen = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      isOpen = false;
    } else if (event.key === "ArrowDown" && !isOpen) {
      isOpen = true;
      event.preventDefault();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".branch-dropdown")) {
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

{#if branches.length > 1}
  <div
    class="branch-dropdown"
    class:open={isOpen}
    role="listbox"
    aria-label="Select branch"
    aria-expanded={isOpen}
  >
    <!-- Dropdown trigger button -->
    <button
      type="button"
      class="branch-trigger"
      onclick={() => (isOpen = !isOpen)}
      onkeydown={handleKeyDown}
      aria-haspopup="listbox"
    >
      <div class="branch-selected">
        <RouteBadge route={selectedBranch?.id || routeNumber} size="sm" />
        <span class="branch-title"
          >{selectedBranch?.title || "Select branch"}</span
        >
      </div>
      <ChevronDown
        class={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
      />
    </button>

    <!-- Dropdown menu -->
    {#if isOpen}
      <div class="branch-menu" role="listbox">
        {#each branches as branch (branch.id)}
          <button
            type="button"
            role="option"
            class="branch-option"
            class:selected={branch.id === selected}
            aria-selected={branch.id === selected}
            onclick={() => handleSelect(branch.id)}
          >
            <RouteBadge route={branch.id} size="sm" />
            <span class="branch-option-title">{branch.title}</span>
            {#if branch.stopCount}
              <span class="branch-stop-count">{branch.stopCount} stops</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{:else if branches.length === 1}
  <!-- Single branch - show as static info, no dropdown -->
  <div class="branch-single">
    <RouteBadge route={branches[0].id} size="sm" />
    <span class="branch-title">{branches[0].title}</span>
  </div>
{/if}

<style>
  .branch-dropdown {
    position: relative;
    width: 100%;
    z-index: 50;
  }

  .branch-dropdown.open {
    z-index: 9999;
  }

  .branch-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    background: hsl(var(--muted));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .branch-trigger:hover {
    border-color: hsl(var(--primary) / 0.5);
    background: hsl(var(--muted) / 0.8);
  }

  .branch-dropdown.open .branch-trigger {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1);
  }

  .branch-selected {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }

  .branch-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .branch-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 9999;
    background: hsl(var(--popover));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    box-shadow:
      0 10px 25px -5px hsl(var(--foreground) / 0.15),
      0 8px 10px -6px hsl(var(--foreground) / 0.1);
    overflow: hidden;
    animation: dropdownFadeIn 0.15s ease-out;
  }

  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .branch-option {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.1s ease;
    text-align: left;
  }

  .branch-option:hover {
    background: hsl(var(--muted) / 0.5);
  }

  .branch-option.selected {
    background: hsl(var(--primary) / 0.1);
  }

  .branch-option-title {
    flex: 1;
    font-size: 0.875rem;
    color: hsl(var(--foreground));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .branch-stop-count {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    white-space: nowrap;
  }

  /* Single branch (no dropdown) */
  .branch-single {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
    background: hsl(var(--muted) / 0.3);
    border: 1px dashed hsl(var(--border));
    border-radius: var(--radius);
  }

  .branch-single .branch-title {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }
</style>
