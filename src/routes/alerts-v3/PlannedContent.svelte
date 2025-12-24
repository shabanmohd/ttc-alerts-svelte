<script lang="ts">
  import {
    CalendarDays,
    Construction,
    GitBranch,
    CheckCircle,
  } from "lucide-svelte";
  import type { PlannedMaintenance } from "$lib/types/database";

  let { maintenance }: { maintenance: PlannedMaintenance[] } = $props();

  // Sub-tab state
  let activeSubTab: "closures" | "changes" = $state("closures");

  /**
   * Parse date string as local time.
   */
  function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    if (dateStr.length === 10 && dateStr.includes("-")) {
      return new Date(dateStr + "T00:00:00");
    }
    return new Date(dateStr);
  }

  /**
   * Check if maintenance should be shown (not past).
   */
  function shouldShow(item: PlannedMaintenance): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = parseLocalDate(item.end_date);
    return endDate >= today;
  }

  /**
   * Format date range for display.
   */
  function formatDateRange(startDate: string, endDate: string): string {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };

    if (startDate === endDate) {
      return start.toLocaleDateString("en-US", options);
    }
    return `${start.toLocaleDateString("en-US", options)} – ${end.toLocaleDateString("en-US", options)}`;
  }

  /**
   * Format time for display.
   */
  function formatTime(timeStr: string | null): string {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  // Filter visible maintenance items
  let visibleMaintenance = $derived(maintenance.filter(shouldShow));

  // Closures (subway line closures)
  let closures = $derived(
    visibleMaintenance.filter((m) =>
      m.routes.some((r) => r.toLowerCase().includes("line"))
    )
  );

  // Route changes (placeholder - would need different data source)
  let routeChanges = $derived<PlannedMaintenance[]>([]);
</script>

<!-- Sub-tabs: Closures | Route Changes -->
<div class="sub-tabs" role="tablist" aria-label="Planned alert types">
  <button
    class="sub-tab closures"
    class:active={activeSubTab === "closures"}
    role="tab"
    aria-selected={activeSubTab === "closures"}
    onclick={() => (activeSubTab = "closures")}
  >
    <Construction class="sub-tab-icon" aria-hidden="true" />
    <span class="sub-tab-label">Closures</span>
    {#if closures.length > 0}
      <span class="sub-tab-count">{closures.length}</span>
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
    {#if routeChanges.length > 0}
      <span class="sub-tab-count">{routeChanges.length}</span>
    {/if}
  </button>
</div>

{#if activeSubTab === "closures"}
  {#if closures.length > 0}
    <div class="closures-list">
      {#each closures as item (item.maintenance_id)}
        <article class="closure-card">
          <header class="closure-header">
            <div class="closure-line">
              {#each item.routes as route}
                <span class="line-badge" data-line={route}>{route}</span>
              {/each}
            </div>
            <time class="closure-date">
              <span class="date-icon"><CalendarDays /></span>
              {formatDateRange(item.start_date, item.end_date)}
            </time>
          </header>

          <div class="closure-body">
            <p class="closure-stations">{item.affected_stations}</p>
            {#if item.description}
              <p class="closure-description">{item.description}</p>
            {/if}
            {#if item.start_time && item.end_time}
              <p class="closure-time">
                {formatTime(item.start_time)} – {formatTime(item.end_time)}
              </p>
            {/if}
          </div>

          {#if item.url}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              class="closure-link"
            >
              View details →
            </a>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <div class="empty-state success">
      <div class="empty-state-icon success">
        <CheckCircle class="icon" />
      </div>
      <h3 class="empty-state-title">No scheduled closures</h3>
      <p class="empty-state-description">
        No scheduled subway closures at this time.
      </p>
    </div>
  {/if}
{:else}
  <!-- Route Changes tab -->
  <div class="empty-state">
    <div class="empty-state-icon">
      <GitBranch class="icon" />
    </div>
    <h3 class="empty-state-title">No route changes</h3>
    <p class="empty-state-description">
      No scheduled route changes at this time.
    </p>
  </div>
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

  /* Closures list */
  .closures-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .closure-card {
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    padding: 1rem;
    transition: all 0.15s ease;
  }

  .closure-card:hover {
    border-color: hsl(var(--border) / 0.8);
    box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.08);
  }

  .closure-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .closure-line {
    display: flex;
    gap: 0.375rem;
  }

  .line-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: hsl(var(--muted));
    border-radius: 4px;
  }

  /* TTC Line colors */
  .line-badge[data-line*="Line 1"] {
    background-color: #ffc524;
    color: #000000;
  }
  .line-badge[data-line*="Line 2"] {
    background-color: #00853f;
    color: #ffffff;
  }
  .line-badge[data-line*="Line 4"] {
    background-color: #a12f7d;
    color: #ffffff;
  }
  .line-badge[data-line*="Line 6"] {
    background-color: #808285;
    color: #ffffff;
  }

  .closure-date {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
  }

  .date-icon {
    display: flex;
    align-items: center;
    width: 0.875rem;
    height: 0.875rem;
  }

  .date-icon :global(svg) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .closure-body {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .closure-stations {
    font-size: 0.9375rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    margin: 0;
  }

  .closure-description {
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    margin: 0;
  }

  .closure-time {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground) / 0.8);
    margin: 0;
  }

  .closure-link {
    display: inline-block;
    margin-top: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--primary));
    text-decoration: none;
  }

  .closure-link:hover {
    text-decoration: underline;
  }

  /* Empty state - follows design system */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
    border: 1px dashed hsl(var(--border));
    border-radius: 0.75rem;
    background-color: hsl(var(--muted) / 0.3);
  }

  :global(.dark) .empty-state:not(.success) {
    background-color: hsl(var(--muted) / 0.2);
  }

  .empty-state.success {
    border-style: solid;
    border-color: hsl(142 76% 36% / 0.25);
    background-color: hsl(142 76% 36% / 0.08);
  }

  :global(.dark) .empty-state.success {
    border-color: hsl(142 70% 45% / 0.25);
    background-color: hsl(142 70% 45% / 0.08);
  }

  .empty-state-icon {
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(var(--muted));
    border-radius: 9999px;
    margin-bottom: 1rem;
  }

  .empty-state-icon.success {
    background-color: hsl(142 76% 36% / 0.1);
  }

  :global(.dark) .empty-state-icon.success {
    background-color: hsl(142 70% 45% / 0.15);
  }

  .empty-state-icon :global(.icon) {
    width: 2rem;
    height: 2rem;
    color: hsl(var(--muted-foreground));
  }

  .empty-state-icon.success :global(.icon) {
    color: hsl(142 76% 36%);
  }

  :global(.dark) .empty-state-icon.success :global(.icon) {
    color: hsl(142 70% 45%);
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin: 0 0 0.25rem 0;
  }

  .empty-state-description {
    font-size: 0.875rem;
    margin: 0;
    max-width: 280px;
  }
</style>
