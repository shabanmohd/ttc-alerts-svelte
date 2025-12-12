<script lang="ts">
  import { _ } from "svelte-i18n";
  import { Bookmark } from "lucide-svelte";
  import {
    savedStops,
    isAtMaxSavedStops,
    type SavedStop,
  } from "$lib/stores/savedStops";
  import type { TTCStop } from "$lib/data/stops-db";
  import { cn } from "$lib/utils";
  import { toast } from "svelte-sonner";

  let {
    stop,
    size = "md",
    class: className = "",
    showLabel = false,
  }: {
    stop: TTCStop | SavedStop;
    size?: "sm" | "md" | "lg";
    class?: string;
    showLabel?: boolean;
  } = $props();

  // Track saved state reactively
  let isSaved = $derived(savedStops.isSaved(stop.id));
  let atMax = $state(false);

  // Subscribe to max state
  $effect(() => {
    const unsubscribe = isAtMaxSavedStops.subscribe((value) => {
      atMax = value;
    });
    return unsubscribe;
  });

  const sizeClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  async function handleClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (isSaved) {
      await savedStops.remove(stop.id);
      toast.info($_("toasts.stopRemoved"), {
        description: stop.name,
      });
    } else if (!atMax) {
      const added = await savedStops.add({
        id: stop.id,
        name: stop.name,
        routes: stop.routes,
      });

      if (added) {
        toast.success($_("toasts.stopAdded"), {
          description: stop.name,
        });
      } else {
        toast.info($_("toasts.stopAlreadySaved"), {
          description: $_("toast.stopAlreadyInYourStops", {
            values: { stopName: stop.name },
          }),
        });
      }
    }
  }
</script>

<button
  type="button"
  onclick={handleClick}
  disabled={!isSaved && atMax}
  class={cn(
    "inline-flex items-center gap-1.5 rounded-md transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    isSaved
      ? "text-amber-500 hover:text-amber-600"
      : "text-muted-foreground hover:text-foreground",
    !isSaved && atMax && "opacity-50 cursor-not-allowed",
    sizeClasses[size],
    className
  )}
  aria-label={isSaved
    ? `Remove ${stop.name} from saved stops`
    : `Add ${stop.name} to saved stops`}
  title={!isSaved && atMax
    ? "Maximum 20 saved stops reached"
    : isSaved
      ? "Remove from saved stops"
      : "Save stop"}
>
  {#if isSaved}
    <Bookmark size={iconSizes[size]} class="fill-current" />
  {:else}
    <Bookmark size={iconSizes[size]} />
  {/if}

  {#if showLabel}
    <span class="text-sm">
      {isSaved ? "Saved" : "Save"}
    </span>
  {/if}
</button>
