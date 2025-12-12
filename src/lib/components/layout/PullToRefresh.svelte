<script lang="ts">
  import { RefreshCw, ArrowDown, Check } from "lucide-svelte";
  import { onMount } from "svelte";

  let {
    onRefresh,
    children,
  }: {
    onRefresh: () => Promise<void>;
    children: any;
  } = $props();

  const THRESHOLD = 80;
  const MAX_PULL = 120;
  const RESISTANCE = 0.5;

  let containerEl: HTMLDivElement;
  let pullDistance = $state(0);
  let isRefreshing = $state(false);
  let showSuccess = $state(false);
  let isTouchDevice = $state(false);
  let startY = $state(0);
  let isPulling = $state(false);

  // Only enable on touch devices
  onMount(() => {
    isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  });

  function handleTouchStart(e: TouchEvent) {
    if (!isTouchDevice || isRefreshing) return;

    // Only start pull if at top of scroll
    const scrollTop = containerEl?.scrollTop ?? 0;
    if (scrollTop > 0) return;

    startY = e.touches[0].clientY;
    isPulling = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0) {
      // Apply resistance after threshold
      const resisted =
        diff > THRESHOLD ? THRESHOLD + (diff - THRESHOLD) * RESISTANCE : diff;
      pullDistance = Math.min(resisted, MAX_PULL);

      // Prevent default scroll when pulling
      if (pullDistance > 10) {
        e.preventDefault();
      }
    }
  }

  async function handleTouchEnd() {
    if (!isPulling) return;
    isPulling = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      isRefreshing = true;
      pullDistance = 60; // Keep indicator visible during refresh

      try {
        await onRefresh();
        showSuccess = true;
        setTimeout(() => {
          showSuccess = false;
        }, 800);
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        isRefreshing = false;
        pullDistance = 0;
      }
    } else {
      pullDistance = 0;
    }
  }

  // Calculate indicator opacity and rotation based on pull progress
  let indicatorOpacity = $derived(Math.min(pullDistance / 40, 1));
  let indicatorRotation = $derived((pullDistance / THRESHOLD) * 180);
  let isReady = $derived(pullDistance >= THRESHOLD);
</script>

<div
  class="pull-to-refresh-container"
  bind:this={containerEl}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  <!-- Pull indicator -->
  {#if isTouchDevice && (pullDistance > 0 || isRefreshing || showSuccess)}
    <div
      class="pull-indicator"
      style="transform: translateY({Math.max(
        pullDistance - 40,
        0
      )}px); opacity: {indicatorOpacity};"
    >
      <div
        class="pull-indicator-inner"
        class:ready={isReady}
        class:refreshing={isRefreshing}
        class:success={showSuccess}
      >
        {#if showSuccess}
          <Check class="w-5 h-5 text-green-500" />
        {:else if isRefreshing}
          <RefreshCw class="w-5 h-5 animate-spin" />
        {:else if isReady}
          <RefreshCw class="w-5 h-5" />
        {:else}
          <ArrowDown
            class="w-5 h-5 transition-transform"
            style="transform: rotate({indicatorRotation}deg);"
          />
        {/if}
      </div>
    </div>
  {/if}

  <!-- Content with transform during pull -->
  <div
    class="pull-content"
    style="transform: translateY({pullDistance}px); transition: {isPulling
      ? 'none'
      : 'transform 0.3s ease'};"
  >
    {@render children()}
  </div>
</div>

<style>
  .pull-to-refresh-container {
    position: relative;
    height: 100%;
  }

  .pull-indicator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
  }

  .pull-indicator-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    color: hsl(var(--muted-foreground));
    transition: all 0.2s ease;
  }

  .pull-indicator-inner.ready {
    color: hsl(var(--primary));
    border-color: hsl(var(--primary));
  }

  .pull-indicator-inner.refreshing {
    color: hsl(var(--primary));
  }

  .pull-indicator-inner.success {
    border-color: hsl(142 72% 40%);
  }

  .pull-content {
    min-height: 100%;
  }

  /* Dark mode adjustments */
  :global(.dark) .pull-indicator-inner {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
</style>
