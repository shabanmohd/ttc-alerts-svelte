<script lang="ts">
    import { X } from "lucide-svelte";
    import { onMount, onDestroy } from "svelte";
    import type { Snippet } from "svelte";

    interface Props {
        onDelete: () => void;
        children: Snippet;
    }

    let { onDelete, children }: Props = $props();

    const DELETE_BUTTON_WIDTH = 48;
    const SWIPE_THRESHOLD = 20;

    let translateX = $state(0);
    let isDragging = $state(false);
    let startX = $state(0);
    let startY = $state(0);
    let containerRef = $state<HTMLDivElement | null>(null);
    let isRevealed = $state(false);
    let directionLocked = $state<"horizontal" | "vertical" | null>(null);

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

<!-- 
  This mimics the exact structure of edit mode:
  .eta-card-wrapper.editing { display: flex; gap: 0.5rem; background: destructive/0.05; padding: 0.25rem }
-->
<div
    bind:this={containerRef}
    class="swipeable-row"
    class:revealed={isRevealed}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    ontouchcancel={handleTouchEnd}
>
    <!-- Card content -->
    <div
        class="card-content"
        class:dragging={isDragging}
        style="transform: translateX({translateX}px)"
    >
        {@render children()}
    </div>

    <!-- Delete button - same as .card-remove-button -->
    <button
        type="button"
        onclick={handleDelete}
        aria-label="Remove stop"
        class="card-remove-button"
    >
        <X class="h-4 w-4" />
    </button>
</div>

<style>
    /* Exact copy of .eta-card-wrapper.editing from MyStops */
    .swipeable-row {
        display: flex;
        align-items: stretch;
        gap: 0.5rem;
        border-radius: var(--radius);
        touch-action: pan-y pinch-zoom;
        transition:
            background-color 0.15s,
            padding 0.15s;
    }

    .swipeable-row.revealed {
        background-color: hsl(var(--destructive) / 0.05);
        padding: 0.25rem;
    }

    .card-content {
        flex: 1;
        min-width: 0;
        transition: transform 0.2s ease-out;
        will-change: transform;
    }

    .card-content.dragging {
        transition: none;
    }

    /* Exact copy of .card-remove-button from MyStops */
    .card-remove-button {
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
        transition: all 0.15s;
        flex-shrink: 0;
        opacity: 0;
    }

    .swipeable-row.revealed .card-remove-button {
        width: 2.5rem;
        opacity: 1;
    }

    .card-remove-button:hover,
    .card-remove-button:active {
        background-color: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
    }
</style>
