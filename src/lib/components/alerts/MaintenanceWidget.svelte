<script lang="ts">
  import { _ } from "svelte-i18n";
  import { AlarmClock, ChevronDown, ExternalLink } from "lucide-svelte";
  import RouteBadge from "./RouteBadge.svelte";
  import { cn } from "$lib/utils";
  import type { PlannedMaintenance } from "$lib/types/database";

  let { items = [] }: { items?: PlannedMaintenance[] } = $props();

  let isExpanded = $state(false);

  /**
   * Parse date string as local time to avoid UTC shift.
   * Handles both "2025-12-04" and "2025-12-04T00:00:00" formats.
   */
  function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // If it's just a date (YYYY-MM-DD), add time to parse as local
    if (dateStr.length === 10 && dateStr.includes("-")) {
      return new Date(dateStr + "T00:00:00");
    }
    // If it already has time but no timezone, parse as-is (local)
    if (!dateStr.includes("Z") && !dateStr.includes("+")) {
      return new Date(dateStr);
    }
    // Otherwise parse normally (has timezone info)
    return new Date(dateStr);
  }

  /**
   * Parse time string to get hour (0-23).
   * Handles formats: "23:59", "23:59:00", "11:59 PM", "11:59 p.m."
   */
  function parseTimeHour(timeStr: string | null): number | null {
    if (!timeStr) return null;

    const time = timeStr.trim().toLowerCase();

    // Try 24-hour format (HH:MM or HH:MM:SS)
    const match24 = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      return parseInt(match24[1], 10);
    }

    // Try 12-hour format (H:MM AM/PM)
    const match12 = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)$/i);
    if (match12) {
      let hour = parseInt(match12[1], 10);
      const isPM = match12[3].toLowerCase().startsWith("p");
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return hour;
    }

    return null;
  }

  /**
   * Format time for display (e.g., "11:59 PM")
   */
  function formatTime(timeStr: string | null): string | null {
    if (!timeStr) return null;

    const hour = parseTimeHour(timeStr);
    if (hour === null) return timeStr; // Return as-is if can't parse

    // Extract minutes (handle HH:MM:SS format)
    const minMatch = timeStr.match(/:(\d{2})/);
    const minutes = minMatch ? minMatch[1] : "00";

    // Format as 12-hour
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";

    // Don't show :00 minutes for cleaner display
    if (minutes === "00") {
      return `${displayHour} ${ampm}`;
    }

    return `${displayHour}:${minutes} ${ampm}`;
  }

  /**
   * Get closure badge type and label.
   * Returns null if no special badge needed.
   */
  function getClosureBadge(
    item: PlannedMaintenance
  ): { type: "nightly" | "weekend"; translationKey: string } | null {
    const start = parseLocalDate(item.start_date);
    const end = parseLocalDate(item.end_date);

    // Full weekend closure: Saturday (6) to Sunday (0)
    if (start.getDay() === 6 && end.getDay() === 0) {
      return { type: "weekend", translationKey: "closures.fullWeekendClosure" };
    }

    // Nightly early closure: starts 10 PM (22:00) or later
    const startHour = parseTimeHour(item.start_time);
    if (startHour !== null && startHour >= 22) {
      return {
        type: "nightly",
        translationKey: "closures.nightlyEarlyClosure",
      };
    }

    return null;
  }

  function formatDateRange(startDate: string, endDate: string): string {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const now = new Date();
    const currentYear = now.getFullYear();

    // Short month
    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const startDateNum = start.getDate();
    const startYear = start.getFullYear();

    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const endDateNum = end.getDate();
    const endYear = end.getFullYear();

    // Same day
    if (start.toDateString() === end.toDateString()) {
      const yearStr = startYear !== currentYear ? ` ${startYear}` : "";
      return `${startMonth} ${startDateNum}${yearStr}`;
    }

    // Same month
    if (startMonth === endMonth && startYear === endYear) {
      const yearStr = startYear !== currentYear ? ` ${startYear}` : "";
      return `${startMonth} ${startDateNum}–${endDateNum}${yearStr}`;
    }

    // Different months
    const yearStr =
      startYear !== currentYear || endYear !== currentYear ? ` ${endYear}` : "";
    return `${startMonth} ${startDateNum} – ${endMonth} ${endDateNum}${yearStr}`;
  }

  const totalCount = $derived(items.length);

  /**
   * Sort items by start date (soonest first)
   */
  const sortedItems = $derived(() => {
    return [...items].sort((a, b) => {
      const startA = parseLocalDate(a.start_date);
      const startB = parseLocalDate(b.start_date);
      return startA.getTime() - startB.getTime();
    });
  });
</script>

{#if totalCount > 0}
  <section
    class="maintenance-widget mb-4"
    aria-labelledby="maintenance-heading"
  >
    <button
      class="maintenance-toggle"
      onclick={() => (isExpanded = !isExpanded)}
      aria-expanded={isExpanded}
      aria-controls="maintenance-content"
      type="button"
    >
      <div class="maintenance-toggle-content">
        <AlarmClock class="maintenance-toggle-icon" aria-hidden="true" />
        <span class="maintenance-toggle-title" id="maintenance-heading"
          >Planned Subway Closures</span
        >
        <span
          class="maintenance-toggle-badge"
          aria-label="{totalCount} upcoming maintenance items"
        >
          {totalCount} upcoming
        </span>
      </div>
      <ChevronDown
        class={cn("maintenance-toggle-chevron", isExpanded && "rotate-180")}
        aria-hidden="true"
      />
    </button>

    {#if isExpanded}
      <div class="maintenance-content" id="maintenance-content">
        <!-- All Maintenance Items (no tabs) -->
        <div class="maintenance-items">
          {#if sortedItems().length === 0}
            <p class="text-sm text-muted-foreground p-4">
              No planned maintenance scheduled.
            </p>
          {:else}
            {#each sortedItems() as item}
              {@const closureBadge = getClosureBadge(item)}
              {@const startTime = formatTime(item.start_time)}
              <article class="maintenance-item">
                <div class="maintenance-item-grid">
                  <div class="maintenance-item-left">
                    <p class="maintenance-item-stations">
                      {item.affected_stations}
                    </p>
                    <div class="maintenance-item-badges">
                      {#each item.routes as route}
                        <RouteBadge {route} />
                      {/each}
                    </div>
                  </div>
                  <div class="maintenance-item-datetime">
                    <time
                      class="maintenance-item-date"
                      datetime={item.start_date}
                    >
                      {formatDateRange(item.start_date, item.end_date)}
                    </time>
                    {#if startTime && closureBadge?.type !== "weekend"}
                      <span class="maintenance-item-start-time"
                        >from {startTime}</span
                      >
                    {/if}
                  </div>
                </div>
                <div class="maintenance-item-footer">
                  {#if closureBadge}
                    <span
                      class="maintenance-item-closure-badge {closureBadge.type}"
                    >
                      {$_(closureBadge.translationKey)}
                    </span>
                  {:else}
                    <span></span>
                  {/if}
                  {#if item.url}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="maintenance-item-link"
                    >
                      Details <ExternalLink
                        class="h-3 w-3"
                        aria-hidden="true"
                      />
                      <span class="sr-only">(opens in new tab)</span>
                    </a>
                  {/if}
                </div>
              </article>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .maintenance-widget {
    background: hsl(var(--card));
    border: 2px solid hsl(var(--border));
    border-radius: var(--radius);
    overflow: hidden;
  }

  .maintenance-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .maintenance-toggle:hover {
    background: hsl(var(--muted) / 0.5);
  }

  .maintenance-toggle-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .maintenance-toggle-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: hsl(var(--primary));
  }

  .maintenance-toggle-title {
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .maintenance-toggle-badge {
    background: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
  }

  .maintenance-toggle-chevron {
    width: 1.25rem;
    height: 1.25rem;
    color: hsl(var(--muted-foreground));
    transition: transform 0.2s ease;
  }

  .maintenance-content {
    border-top: 1px solid hsl(var(--border));
  }

  .maintenance-items {
    max-height: 400px;
    overflow-y: auto;
  }

  .maintenance-item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  .maintenance-item:last-child {
    border-bottom: none;
  }

  .maintenance-item-grid {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .maintenance-item-left {
    flex: 1;
    min-width: 0;
  }

  .maintenance-item-stations {
    font-weight: 500;
    color: hsl(var(--foreground));
    margin: 0 0 0.375rem 0;
    line-height: 1.3;
  }

  .maintenance-item-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .maintenance-item-datetime {
    text-align: right;
    flex-shrink: 0;
  }

  .maintenance-item-date {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  .maintenance-item-start-time {
    display: block;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  .maintenance-item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .maintenance-item-closure-badge {
    font-size: 0.7rem;
    font-weight: 500;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .maintenance-item-closure-badge.nightly {
    background: hsl(220 90% 56% / 0.15);
    color: hsl(220 90% 56%);
  }

  .maintenance-item-closure-badge.weekend {
    background: hsl(280 70% 56% / 0.15);
    color: hsl(280 70% 56%);
  }

  .maintenance-item-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: hsl(var(--primary));
    text-decoration: underline;
  }

  .maintenance-item-link:hover {
    opacity: 0.9;
  }

  /* Dark mode adjustments */
  :global(.dark) .maintenance-item-closure-badge.nightly {
    background: hsl(220 90% 56% / 0.2);
    color: hsl(220 90% 70%);
  }

  :global(.dark) .maintenance-item-closure-badge.weekend {
    background: hsl(280 70% 56% / 0.2);
    color: hsl(280 70% 70%);
  }
</style>
