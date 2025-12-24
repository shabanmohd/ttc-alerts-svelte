<script lang="ts">
  import { Construction, GitBranch } from "lucide-svelte";
  import ClosuresView from "$lib/components/alerts/ClosuresView.svelte";
  import RouteChangesView from "$lib/components/alerts/RouteChangesView.svelte";
  import { maintenanceItems } from "$lib/stores/alerts";
  import { routeChangesCount, loadRouteChanges } from "$lib/stores/route-changes";
  import type { PlannedMaintenance } from "$lib/types/database";
  import { onMount } from "svelte";

  // Sub-tab state
  let activeSubTab: "closures" | "changes" = $state("closures");

  // Load route changes when switching to that tab or on mount
  onMount(() => {
    // Preload route changes in background
    loadRouteChanges();
  });

  // Helper to check if maintenance should show in scheduled view
  function shouldShowInScheduled(item: PlannedMaintenance): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(item.start_date + "T00:00:00");
    const endDate = new Date(item.end_date + "T00:00:00");
    const startDateOnly = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const endDateOnly = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    if (startDateOnly > today) return true;
    if (endDateOnly >= today) return true;
    return false;
  }

  // Get count of subway closures for the badge (from store)
  let closuresCount = $derived(
    $maintenanceItems.filter(
      (m) =>
        shouldShowInScheduled(m) &&
        m.routes.some((r) => r.toLowerCase().includes("line"))
    ).length
  );
</script>

<!-- Sub-tabs: Closures | Route Changes -->
<div class="sub-tabs" role="tablist" aria-label="Scheduled alert types">
  <button
    class="sub-tab closures"
    class:active={activeSubTab === "closures"}
    role="tab"
    aria-selected={activeSubTab === "closures"}
    onclick={() => (activeSubTab = "closures")}
  >
    <Construction class="sub-tab-icon" aria-hidden="true" />
    <span class="sub-tab-label">Closures</span>
    {#if closuresCount > 0}
      <span class="sub-tab-count">{closuresCount}</span>
    {/if}
  </button>
  <button
    class="sub-tab changes"
    class:active={activeSubTab === "changes"}
    role="tab"
    aria-selected={activeSubTab === "changes"}
    onclick={() => (activeSubTab = "changes")}
  >
    <GitBranch class="sub-tab-icon" aria-hidden="true" />
    <span class="sub-tab-label">Route Changes</span>
    {#if $routeChangesCount > 0}
      <span class="sub-tab-count">{$routeChangesCount}</span>
    {/if}
  </button>
</div>

{#if activeSubTab === "closures"}
  <!-- Reuse ClosuresView component for consistent display with old alerts page -->
  <ClosuresView />
{:else}
  <!-- Route Changes - fetched from TTC website -->
  <RouteChangesView />
{/if}

<style>
  /* Sub-tabs - pill style matching CategoryFilterV3 */
  .sub-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
  }

  .sub-tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: hsl(var(--muted));
    border: 1px solid transparent;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .sub-tab:hover:not(.active) {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted-foreground) / 0.15);
  }

  /* Closures - Orange accent (construction) */
  .sub-tab.closures.active {
    color: hsl(25 95% 45%);
    border-color: hsl(25 95% 53% / 0.3);
    background-color: hsl(25 95% 53% / 0.1);
  }

  :global(.dark) .sub-tab.closures.active {
    color: hsl(25 95% 60%);
    border-color: hsl(25 95% 60% / 0.3);
    background-color: hsl(25 95% 60% / 0.15);
  }

  /* Route Changes - Purple accent */
  .sub-tab.changes.active {
    color: hsl(262 83% 50%);
    border-color: hsl(262 83% 58% / 0.3);
    background-color: hsl(262 83% 58% / 0.1);
  }

  :global(.dark) .sub-tab.changes.active {
    color: hsl(262 83% 68%);
    border-color: hsl(262 83% 68% / 0.3);
    background-color: hsl(262 83% 68% / 0.15);
  }

  .sub-tab :global(.sub-tab-icon) {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
  }

  .sub-tab-label {
    line-height: 1;
  }

  .sub-tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background-color: hsl(var(--muted-foreground) / 0.15);
    border-radius: 9999px;
    margin-left: 0.125rem;
  }

  /* Active state counts */
  .sub-tab.closures.active .sub-tab-count {
    background-color: hsl(25 95% 45%);
    color: white;
  }

  :global(.dark) .sub-tab.closures.active .sub-tab-count {
    background-color: hsl(25 95% 60%);
    color: hsl(0 0% 10%);
  }

  .sub-tab.changes.active .sub-tab-count {
    background-color: hsl(262 83% 50%);
    color: white;
  }

  :global(.dark) .sub-tab.changes.active .sub-tab-count {
    background-color: hsl(262 83% 68%);
    color: hsl(0 0% 10%);
  }

</style>
