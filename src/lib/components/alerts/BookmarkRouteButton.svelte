<script lang="ts">
  import { Bookmark, Check } from "lucide-svelte";
  import { savedRoutes, isAtMaxSavedRoutes } from "$lib/stores/savedRoutes";
  import { cn } from "$lib/utils";

  let {
    route,
    name,
    type = "bus",
    size = "md",
    class: className = "",
    showLabel = false,
  }: {
    route: string;
    name: string;
    type?: "bus" | "streetcar" | "subway";
    size?: "sm" | "md" | "lg";
    class?: string;
    showLabel?: boolean;
  } = $props();

  // Track saved state reactively
  let isSaved = $state(false);
  let atMax = $state(false);
  let showSavedFeedback = $state(false);

  // Subscribe to saved state
  $effect(() => {
    const unsubscribe = savedRoutes.subscribe((routes) => {
      isSaved = routes.some((r) => r.id === route);
    });
    return unsubscribe;
  });

  // Subscribe to max state
  $effect(() => {
    const unsubscribe = isAtMaxSavedRoutes.subscribe((value) => {
      atMax = value;
    });
    return unsubscribe;
  });

  // Reset saved feedback after animation
  $effect(() => {
    if (showSavedFeedback) {
      const timeout = setTimeout(() => {
        showSavedFeedback = false;
      }, 2000);
      return () => clearTimeout(timeout);
    }
  });

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (isSaved) {
      savedRoutes.remove(route);
    } else if (!atMax) {
      savedRoutes.add({ id: route, name, type });
      showSavedFeedback = true;
    }
  }
</script>

<button
  type="button"
  onclick={handleClick}
  disabled={!isSaved && atMax}
  class={cn(
    "save-route-button",
    isSaved && "saved",
    showSavedFeedback && "show-feedback",
    className
  )}
  aria-label={isSaved
    ? `Remove route ${route} from saved routes`
    : `Save route ${route} to My Routes`}
  title={!isSaved && atMax
    ? "Maximum 20 saved routes reached"
    : isSaved
      ? "Remove from My Routes"
      : "Save to My Routes"}
>
  {#if showSavedFeedback}
    <Check size={iconSizes[size]} />
    {#if showLabel}
      <span>Saved!</span>
    {/if}
  {:else if isSaved}
    <Bookmark size={iconSizes[size]} class="fill-current" />
    {#if showLabel}
      <span>Saved to My Routes</span>
    {/if}
  {:else}
    <Bookmark size={iconSizes[size]} />
    {#if showLabel}
      <span>Save to My Routes</span>
    {/if}
  {/if}
</button>

<style>
  /* Save route button - matches save-stop-button styling */
  .save-route-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: var(--radius);
    background: transparent;
    border: 1px solid hsl(var(--border));
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .save-route-button:hover:not(:disabled) {
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
    border-color: hsl(var(--accent));
  }

  .save-route-button.saved {
    color: rgb(180, 83, 9);
    border-color: rgb(217, 119, 6, 0.4);
    background: rgb(254, 243, 199);
  }

  .save-route-button.saved:hover:not(:disabled) {
    background: rgb(253, 230, 138);
    color: rgb(146, 64, 14);
  }

  :global(.dark) .save-route-button.saved {
    color: rgb(252, 211, 77);
    border-color: rgb(245, 158, 11, 0.4);
    background: rgb(120, 53, 15, 0.3);
  }

  :global(.dark) .save-route-button.saved:hover:not(:disabled) {
    background: rgb(120, 53, 15, 0.5);
    color: rgb(253, 224, 71);
  }

  .save-route-button.show-feedback {
    color: rgb(21, 128, 61);
    border-color: rgb(34, 197, 94, 0.4);
    background: rgb(220, 252, 231);
    animation: pulse-success 0.3s ease-out;
  }

  :global(.dark) .save-route-button.show-feedback {
    color: rgb(134, 239, 172);
    border-color: rgb(34, 197, 94, 0.4);
    background: rgb(20, 83, 45, 0.4);
  }

  .save-route-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  @keyframes pulse-success {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
