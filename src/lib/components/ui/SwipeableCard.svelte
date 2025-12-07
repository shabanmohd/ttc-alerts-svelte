<script lang="ts">
  import { Trash2 } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    onDelete: () => void;
    threshold?: number;
    deleteButtonWidth?: number;
    disabled?: boolean;
    children: Snippet;
  }

  let {
    onDelete,
    threshold = 70,
    deleteButtonWidth = 80,
    disabled = false,
    children
  }: Props = $props();

  // State
  let translateX = $state(0);
  let isDragging = $state(false);
  let startX = $state(0);
  let startY = $state(0);
  let containerRef = $state<HTMLDivElement | null>(null);
  let isVerticalScroll = $state(false);

  // Touch event handlers
  function handleTouchStart(e: TouchEvent) {
    if (disabled) return;
    
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
    isVerticalScroll = false;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || disabled) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;

    // Determine if this is a vertical scroll (prioritize native scrolling)
    if (!isVerticalScroll && Math.abs(diffY) > Math.abs(diffX)) {
      isVerticalScroll = true;
      isDragging = false;
      return;
    }

    // If horizontal swipe, prevent default to avoid conflicts
    if (Math.abs(diffX) > 5) {
      e.preventDefault();
    }

    // Allow left swipe (negative diff) and right swipe to close
    if (diffX < 0) {
      // Swiping left
      translateX = Math.max(diffX, -deleteButtonWidth);
    } else if (translateX < 0) {
      // Swiping back right to close - use absolute diffX for smooth close
      const newTranslateX = translateX + diffX;
      translateX = Math.min(0, newTranslateX);
    }
  }

  function handleTouchEnd() {
    if (!isDragging || disabled) return;
    
    isDragging = false;

    // Snap to revealed or closed based on threshold
    if (Math.abs(translateX) > threshold) {
      translateX = -deleteButtonWidth; // Reveal delete
    } else {
      translateX = 0; // Reset
    }
  }

  // Click outside to close
  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      if (translateX < 0) {
        translateX = 0;
      }
    }
  }

  // Delete handler with animation
  function handleDelete() {
    // Close the swipe first for smooth animation
    translateX = 0;
    // Small delay then trigger delete
    setTimeout(() => {
      onDelete();
    }, 200);
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  // Close when disabled (edit mode activated)
  $effect(() => {
    if (disabled && translateX < 0) {
      translateX = 0;
    }
  });
</script>

<div 
  bind:this={containerRef}
  class="swipeable-container"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  <!-- Delete button background (behind content) -->
  <div class="delete-button">
    <button
      type="button"
      onclick={handleDelete}
      aria-label="Delete stop"
      class="delete-button-inner"
    >
      <Trash2 class="h-5 w-5" />
    </button>
  </div>

  <!-- Swipeable content -->
  <div 
    class="swipeable-content"
    class:dragging={isDragging}
    style="--translate-x: {translateX}px"
  >
    {@render children()}
  </div>
</div>

<style>
  .swipeable-container {
    position: relative;
    overflow: hidden;
    touch-action: pan-y; /* Allow vertical scrolling but capture horizontal */
  }

  .swipeable-content {
    transform: translateX(var(--translate-x, 0));
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
    position: relative;
    z-index: 2;
  }

  .swipeable-content.dragging {
    transition: none; /* Instant feedback while dragging */
  }

  .delete-button {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 80px;
    background: hsl(var(--destructive));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease-in-out;
    border-radius: var(--radius);
  }

  .swipeable-container:has(.swipeable-content[style*="--translate-x: -"]) .delete-button {
    opacity: 1;
    pointer-events: auto;
  }

  .delete-button-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: none;
    border: none;
    color: hsl(var(--destructive-foreground));
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
  }

  .delete-button-inner:active {
    background-color: hsl(var(--destructive) / 0.9);
  }
</style>
