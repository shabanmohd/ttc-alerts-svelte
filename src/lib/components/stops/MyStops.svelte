<script lang="ts">
  import { _ } from "svelte-i18n";
  import { onMount, onDestroy } from "svelte";
  import {
    MapPin,
    Clock,
    Plus,
    RefreshCw,
    X,
    Pencil,
    Search,
    Loader2,
    Trash2,
  } from "lucide-svelte";
  import { browser } from "$app/environment";
  import { savedStops, savedStopsCount } from "$lib/stores/savedStops";
  import { etaStore, etaList, isAnyLoading } from "$lib/stores/eta";
  import StopSearch from "$lib/components/stops/StopSearch.svelte";
  import ETACard from "$lib/components/eta/ETACard.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { cn } from "$lib/utils";
  import type { TTCStop } from "$lib/data/stops-db";
  import { initStopsDB, findNearbyStops } from "$lib/data/stops-db";
  import { toast } from "svelte-sonner";

  interface Props {
    maxDisplay?: number;
    class?: string;
  }

  let { maxDisplay = 10, class: className = "" }: Props = $props();

  let count = $state(0);
  let etas = $state<typeof $etaList>([]);
  let loading = $state(false);

  let isEditMode = $state(false);
  let nearbyError = $state<string | null>(null);

  // Subscribe to stores
  $effect(() => {
    const unsubscribeCount = savedStopsCount.subscribe((value) => {
      count = value;
    });
    const unsubscribeEtas = etaList.subscribe((value) => {
      etas = value;
    });
    const unsubscribeLoading = isAnyLoading.subscribe((value) => {
      loading = value;
    });
    return () => {
      unsubscribeCount();
      unsubscribeEtas();
      unsubscribeLoading();
    };
  });

  // Auto-exit edit mode when all stops are deleted
  $effect(() => {
    if (count === 0 && isEditMode) {
      isEditMode = false;
    }
  });

  // Initialize on mount
  onMount(async () => {
    etaStore.startAutoRefresh();
  });

  onDestroy(() => {
    etaStore.stopAutoRefresh();
  });

  async function handleStopSelect(stop: TTCStop) {
    const added = await savedStops.add({
      id: stop.id,
      name: stop.name,
      routes: stop.routes,
    });

    if (!added) {
      toast.info($_("toasts.stopAlreadySaved"), {
        description: $_("toast.stopAlreadyInYourStops", {
          values: { stopName: stop.name },
        }),
      });
    } else {
      toast.success($_("toasts.stopAdded"), {
        description: stop.name,
      });
    }
  }

  // Confirmation dialog state
  let confirmDeleteStop = $state<{ id: string; name: string } | null>(null);

  function promptRemoveStop(stopId: string, stopName: string) {
    confirmDeleteStop = { id: stopId, name: stopName };
  }

  function confirmRemoveStop() {
    if (!confirmDeleteStop) return;
    savedStops.remove(confirmDeleteStop.id);
    toast.success($_("toasts.stopRemoved"), {
      description: confirmDeleteStop.name,
    });
    confirmDeleteStop = null;
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
  }

  let hasStops = $derived(count > 0);

  // Reference to StopSearch component for focus
  let stopSearchRef: { focus: () => void } | undefined = $state();
</script>

<div class={cn("my-stops", className)}>
  <!-- Search Bar with Inline Dropdown -->
  <div class="search-section">
    <StopSearch
      bind:this={stopSearchRef}
      placeholder={$_("search.placeholderStop")}
      showNearbyButton={true}
      showBookmarkButton={true}
      onSelect={handleStopSelect}
    />
  </div>

  {#if hasStops}
    <!-- Header with Saved Stops and Controls -->
    <div class="stops-header">
      <div class="header-left">
        <h2 class="section-title">
          <Clock class="h-4 w-4 text-primary" />
          {$_("stops.liveArrivals")}
          {#if loading}
            <RefreshCw class="h-3 w-3 animate-spin text-muted-foreground" />
          {/if}
        </h2>
      </div>
      <div class="header-right">
        <Button
          variant="ghost"
          size="sm"
          class="h-8 text-xs"
          onclick={toggleEditMode}
        >
          {#if isEditMode}
            {$_("common.done")}
          {:else}
            <Pencil class="h-3 w-3 mr-1" />
            {$_("common.edit")}
          {/if}
        </Button>
      </div>
    </div>

    <!-- ETA Cards -->
    <div class="eta-cards-section">
      {#each etas.slice(0, maxDisplay) as eta, i (eta.stopId)}
        <div
          class="eta-card-wrapper animate-fade-in-up"
          class:editing={isEditMode}
          style="animation-delay: {Math.min(i * 60, 300)}ms"
        >
          <ETACard
            {eta}
            showRemove={false}
            onRefresh={etaStore.refreshStop}
            class="flex-1"
          />
          {#if isEditMode}
            <button
              type="button"
              class="card-remove-button"
              onclick={() => promptRemoveStop(eta.stopId, eta.stopName)}
              aria-label="Remove stop"
            >
              <X class="h-4 w-4" />
            </button>
          {/if}
        </div>
      {/each}
    </div>

    {#if etas.length > maxDisplay}
      <p class="text-xs text-muted-foreground text-center mt-2">
        +{etas.length - maxDisplay} more stops
      </p>
    {/if}
  {:else}
    <!-- Empty State -->
    <button
      type="button"
      class="empty-state animate-fade-in"
      onclick={() => stopSearchRef?.focus()}
    >
      <div class="empty-state-icon">
        <MapPin class="h-8 w-8" />
      </div>
      <h3 class="empty-state-title">{$_("stops.addFirstStop")}</h3>
      <p class="empty-state-description">
        {$_("stops.addFirstStopDescription")}
      </p>
    </button>
  {/if}
</div>

<!-- Delete Stop Confirmation Dialog -->
<Dialog.Root
  open={confirmDeleteStop !== null}
  onOpenChange={(open) => {
    if (!open) confirmDeleteStop = null;
  }}
>
  <Dialog.Content
    class="sm:max-w-md"
    style="background-color: hsl(var(--background)); border: 1px solid hsl(var(--border));"
  >
    <Dialog.Header>
      <div
        class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
      >
        <Trash2 class="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <Dialog.Title class="text-center text-lg font-semibold"
        >{$_("stops.removeStopTitle")}</Dialog.Title
      >
      <Dialog.Description class="text-center text-sm text-muted-foreground">
        {$_("stops.removeStopConfirm", {
          values: { name: confirmDeleteStop?.name },
        })}
        {$_("toasts.canAddBackAnytime")}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer
      class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-center"
    >
      <Button
        variant="outline"
        class="w-full sm:w-auto"
        onclick={() => (confirmDeleteStop = null)}>{$_("common.cancel")}</Button
      >
      <Button
        variant="destructive"
        class="w-full sm:w-auto"
        style="background-color: hsl(var(--destructive)); color: white;"
        onclick={confirmRemoveStop}
      >
        {$_("stops.removeStop")}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .my-stops {
    min-height: 200px;
  }

  .search-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    position: relative;
    z-index: 50;
  }

  .stops-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .eta-cards-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: relative;
    z-index: 1;
  }

  .eta-card-wrapper {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
  }

  .eta-card-wrapper.editing {
    background-color: hsl(var(--destructive) / 0.05);
    border-radius: var(--radius);
    padding: 0.25rem;
  }

  .card-remove-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    background-color: hsl(var(--destructive) / 0.1);
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    color: hsl(var(--destructive));
    transition: all 0.15s;
  }

  .card-remove-button:hover {
    background-color: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    padding: 3rem 1.5rem;
    background-color: hsl(var(--muted) / 0.3);
    border-radius: var(--radius);
    border: 1px dashed hsl(var(--border));
    cursor: pointer;
    position: relative;
    z-index: 0;
  }

  .empty-state-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background-color: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
    margin-bottom: 1rem;
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }

  .empty-state-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    max-width: 280px;
    line-height: 1.5;
  }
</style>
