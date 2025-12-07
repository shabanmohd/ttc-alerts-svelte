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
    const DELETE_BUTTON_WIDTH = 48; // 2.5rem + gap = ~48px total
    const SWIPE_THRESHOLD = 20;

    // State
    let translateX = $state(0);
    let isDragging = $state(false);
    let startX = $state(0);
    let startY = $state(0);
    let containerRef = $state<HTMLDivElement | null>(null);
    let isRevealed = $state(false);
    let directionLocked = $state<"horizontal" | "vertical" | null>(null);

    // Touch event handlers
    function handleTouchStart(e: TouchEvent) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        directionLocked = null;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        // Lock direction on first significant movement
        if (!directionLocked) {
            if (Math.abs(diffY) > 10 && Math.abs(diffY) > Math.abs(diffX)) {
                directionLocked = "vertical";
                isDragging = false;
                return;
            }
            if (Math.abs(diffX) > 10) {
                directionLocked = "horizontal";
            }
        }

        if (directionLocked === "horizontal") {
            e.preventDefault();

            let newTranslateX: number;
            if (isRevealed) {
                newTranslateX = -DELETE_BUTTON_WIDTH + diffX;
            } else {
                newTranslateX = diffX;
            }

            translateX = Math.max(
                -DELETE_BUTTON_WIDTH,
                Math.min(0, newTranslateX),
            );
        }
    }

    function handleTouchEnd() {
        if (!isDragging && directionLocked !== "horizontal") return;
        isDragging = false;
        directionLocked = null;

        if (translateX < -SWIPE_THRESHOLD) {
            translateX = -DELETE_BUTTON_WIDTH;
            isRevealed = true;
            closeOtherCards();
        } else {
            translateX = 0;
            isRevealed = false;
        }
    }

    function closeOtherCards() {
        document.dispatchEvent(
            new CustomEvent("swipecard:close", { detail: containerRef }),
        );
    }

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

    function handleDelete() {
        translateX = 0;
        isRevealed = false;
        setTimeout(() => {
            onDelete();
        }, 150);
    }

    function handleOtherCardOpened(event: CustomEvent) {
        if (event.detail !== containerRef && isRevealed) {
            translateX = 0;
            isRevealed = false;
        }
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        document.addEventListener(
            "swipecard:close",
            handleOtherCardOpened as EventListener,
        );
    });

    onDestroy(() => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener(
            "swipecard:close",
            handleOtherCardOpened as EventListener,
        );
    });
</script>

<div
    bind:this={containerRef}
    class="swipeable-container"
    class:revealed={isRevealed}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    ontouchcancel={handleTouchEnd}
>
    <!-- Wrapper that mimics .eta-card-wrapper.editing background -->
    <div class="swipe-wrapper" class:active={isRevealed || translateX < 0}>
        <!-- Card content that slides -->
        <div
            class="swipeable-content"
            class:dragging={isDragging}
            style="transform: translateX({translateX}px)"
        >
            {@render children()}
        </div>

        <!-- Delete button (matching edit mode exactly) -->
        <button
            type="button"
            onclick={handleDelete}
            aria-label="Remove stop"
            class="delete-button"
            class:visible={isRevealed || translateX < 0}
        >
            <X class="h-4 w-4" />
        </button>
    </div>
</div>

<style>
    .swipeable-container {
        position: relative;
        touch-action: pan-y pinch-zoom;
    }

    /* Wrapper mimics .eta-card-wrapper.editing */
    .swipe-wrapper {
        display: flex;
        align-items: stretch;
        gap: 0.5rem; /* Same gap as edit mode */
        border-radius: var(--radius);
        transition:
            background-color 0.15s ease-out,
            padding 0.15s ease-out;
    }

    .swipe-wrapper.active {
        background-color: hsl(var(--destructive) / 0.05);
        padding: 0.25rem;
    }

    .swipeable-content {
        flex: 1;
        min-width: 0;
        transition: transform 0.2s ease-out;
        will-change: transform;
    }

    .swipeable-content.dragging {
        transition: none;
    }

    /* Delete button - exact copy of .card-remove-button from edit mode */
    .delete-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 0;
        overflow: hidden;
        background-color: hsl(var(--destructive) / 0.1);
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
        color: hsl(var(--destructive));
        transition: all 0.2s ease-out;
        flex-shrink: 0;
    }

    .delete-button.visible {
        width: 2.5rem; /* Same as edit mode */
    }

    .delete-button:hover,
    .delete-button:active {
        background-color: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
    }
</style>
