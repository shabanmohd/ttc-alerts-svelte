<script lang="ts">
    import { X } from "lucide-svelte";
    import { onMount, onDestroy } from "svelte";
    import type { Snippet } from "svelte";

    interface Props {
        onDelete: () => void;
        children: Snippet;
    }

    let { onDelete, children }: Props = $props();

    // Fixed values matching edit mode exactly
    const DELETE_BUTTON_WIDTH = 40; // 2.5rem = 40px
    const SWIPE_THRESHOLD = 30; // Trigger reveal after 30px swipe

    // State
    let translateX = $state(0);
    let isDragging = $state(false);
    let startX = $state(0);
    let startY = $state(0);
    let containerRef = $state<HTMLDivElement | null>(null);
    let isVerticalScroll = $state(false);
    let isRevealed = $state(false);

    // Touch event handlers
    function handleTouchStart(e: TouchEvent) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        isVerticalScroll = false;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        // First movement - determine direction
        if (
            !isVerticalScroll &&
            Math.abs(diffY) > Math.abs(diffX) &&
            Math.abs(diffY) > 5
        ) {
            isVerticalScroll = true;
            isDragging = false;
            return;
        }

        // Horizontal swipe - prevent scrolling
        if (Math.abs(diffX) > 5) {
            e.preventDefault();
        }

        // Calculate new position
        if (isRevealed) {
            // Already revealed - allow swiping back
            const newTranslateX = -DELETE_BUTTON_WIDTH + diffX;
            translateX = Math.max(
                -DELETE_BUTTON_WIDTH,
                Math.min(0, newTranslateX),
            );
        } else {
            // Not revealed - only allow left swipe
            if (diffX < 0) {
                translateX = Math.max(diffX, -DELETE_BUTTON_WIDTH);
            }
        }
    }

    function handleTouchEnd() {
        if (!isDragging) return;
        isDragging = false;

        // Snap logic
        if (Math.abs(translateX) > SWIPE_THRESHOLD) {
            // Show delete button
            translateX = -DELETE_BUTTON_WIDTH;
            isRevealed = true;
        } else {
            // Hide delete button
            translateX = 0;
            isRevealed = false;
        }
    }

    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
        if (
            containerRef &&
            !containerRef.contains(event.target as Node) &&
            isRevealed
        ) {
            translateX = 0;
            isRevealed = false;
        }
    }

    // Delete handler
    function handleDelete() {
        translateX = 0;
        isRevealed = false;
        setTimeout(() => {
            onDelete();
        }, 150);
    }

    // Close other cards when this one opens (via event)
    function closeCard() {
        if (isRevealed) {
            translateX = 0;
            isRevealed = false;
        }
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        document.addEventListener("swipecard:close", closeCard);
    });

    onDestroy(() => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("swipecard:close", closeCard);
    });

    // When revealed, dispatch event to close other cards
    $effect(() => {
        if (isRevealed) {
            document.dispatchEvent(new CustomEvent("swipecard:close"));
        }
    });
</script>

<div
    bind:this={containerRef}
    class="swipeable-container"
    class:revealed={isRevealed}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
>
    <!-- Delete button (matching edit mode exactly) -->
    <div class="delete-action">
        <button
            type="button"
            onclick={handleDelete}
            aria-label="Remove stop"
            class="delete-button"
        >
            <X class="h-4 w-4" />
        </button>
    </div>

    <!-- Swipeable content -->
    <div
        class="swipeable-content"
        class:dragging={isDragging}
        style="transform: translateX({translateX}px)"
    >
        {@render children()}
    </div>
</div>

<style>
    .swipeable-container {
        position: relative;
        overflow: hidden;
        touch-action: pan-y;
    }

    .swipeable-content {
        transition: transform 0.2s ease-out;
        will-change: transform;
        position: relative;
        z-index: 2;
        background: hsl(var(--background));
    }

    .swipeable-content.dragging {
        transition: none;
    }

    /* Delete action container - positioned behind content */
    .delete-action {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 2.5rem; /* Matches edit mode exactly */
        display: flex;
        align-items: stretch;
        justify-content: center;
        z-index: 1;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease-out;
    }

    .swipeable-container.revealed .delete-action {
        opacity: 1;
        pointer-events: auto;
    }

    /* Delete button - exact copy of .card-remove-button from edit mode */
    .delete-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        background-color: hsl(var(--destructive) / 0.1);
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
        color: hsl(var(--destructive));
        transition: all 0.15s;
    }

    .delete-button:hover,
    .delete-button:active {
        background-color: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
    }
</style>
