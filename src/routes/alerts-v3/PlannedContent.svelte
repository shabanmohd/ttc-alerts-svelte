<script lang="ts">
  import { CalendarDays, Construction, ArrowRightLeft } from "lucide-svelte";
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
    class="sub-tab"
    class:active={activeSubTab === "closures"}
    role="tab"
    aria-selected={activeSubTab === "closures"}
    onclick={() => (activeSubTab = "closures")}
  >
    <span class="sub-tab-icon"><Construction /></span>
    <span>Closures</span>
    {#if closures.length > 0}
      <span class="sub-tab-count">{closures.length}</span>
    {/if}
  </button>
  <button
    class="sub-tab"
    class:active={activeSubTab === "changes"}
    role="tab"
    aria-selected={activeSubTab === "changes"}
    onclick={() => (activeSubTab = "changes")}
  >
    <span class="sub-tab-icon"><ArrowRightLeft /></span>
    <span>Route Changes</span>
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
    <div class="empty-state">
      <div class="empty-icon">
        <CalendarDays class="icon" />
      </div>
      <h3>No Planned Closures</h3>
      <p>No upcoming subway closures scheduled</p>
    </div>
  {/if}
{:else}
  <!-- Route Changes tab -->
  <div class="empty-state">
    <div class="empty-icon changes">
      <ArrowRightLeft class="icon" />
    </div>
    <h3>Coming Soon</h3>
    <p>Temporary route changes and detours will appear here</p>
  </div>
{/if}

<style>
  /* Sub-tabs */
  .sub-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .sub-tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sub-tab:hover:not(.active) {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted) / 0.5);
  }

  .sub-tab.active {
    color: hsl(var(--foreground));
    background-color: hsl(var(--muted));
    border-color: hsl(var(--border));
  }

  .sub-tab-icon {
    display: flex;
    align-items: center;
    width: 1rem;
    height: 1rem;
  }

  .sub-tab-icon :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  .sub-tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.125rem;
    height: 1.125rem;
    padding: 0 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    background-color: hsl(var(--muted-foreground) / 0.15);
    border-radius: 9999px;
  }

  .sub-tab.active .sub-tab-count {
    background-color: hsl(var(--foreground) / 0.15);
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

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
  }

  .empty-icon {
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(var(--muted));
    border-radius: 9999px;
    margin-bottom: 1rem;
  }

  .empty-icon.changes {
    background-color: hsl(217 91% 60% / 0.15);
  }

  .empty-icon :global(.icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: hsl(var(--muted-foreground));
  }

  .empty-icon.changes :global(.icon) {
    color: hsl(217 91% 60%);
  }

  .empty-state h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin: 0 0 0.25rem 0;
  }

  .empty-state p {
    font-size: 0.875rem;
    margin: 0;
  }
</style>
