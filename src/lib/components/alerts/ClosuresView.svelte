<script lang="ts">
  import { _ } from "svelte-i18n";
  import { ExternalLink, Train } from "lucide-svelte";
  import RouteBadge from "./RouteBadge.svelte";
  import { maintenanceItems } from "$lib/stores/alerts";
  import type { PlannedMaintenance } from "$lib/types/database";

  /**
   * Parse date string as local time to avoid UTC shift.
   */
  function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    if (dateStr.length === 10 && dateStr.includes("-")) {
      return new Date(dateStr + "T00:00:00");
    }
    if (!dateStr.includes("Z") && !dateStr.includes("+")) {
      return new Date(dateStr);
    }
    return new Date(dateStr);
  }

  /**
   * Parse time string to get hour (0-23).
   */
  function parseTimeHour(timeStr: string | null): number | null {
    if (!timeStr) return null;
    const time = timeStr.trim().toLowerCase();
    const match24 = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) return parseInt(match24[1], 10);
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
   * Format time for display (e.g., "11 PM")
   */
  function formatTime(timeStr: string | null): string | null {
    if (!timeStr) return null;
    const hour = parseTimeHour(timeStr);
    if (hour === null) return timeStr;
    const minMatch = timeStr.match(/:(\d{2})/);
    const minutes = minMatch ? minMatch[1] : "00";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    if (minutes === "00") return `${displayHour} ${ampm}`;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  /**
   * Get closure badge type and label.
   * Detects full weekend closures (Fri night to Sun, or Sat to Sun) and nightly early closures.
   */
  function getClosureBadge(
    item: PlannedMaintenance
  ): { type: "nightly" | "weekend"; translationKey: string } | null {
    const start = parseLocalDate(item.start_date);
    const end = parseLocalDate(item.end_date);
    const startDay = start.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const endDay = end.getDay();

    // Full weekend closure detection:
    // 1. Classic: Sat (6) to Sun (0)
    // 2. Extended: Fri (5) to Sun (0) - weekend closure starting Friday night
    // 3. Extended: Fri (5) to Mon (1) - through the weekend
    const isWeekendClosure =
      (startDay === 6 && endDay === 0) || // Sat-Sun
      (startDay === 5 && endDay === 0) || // Fri-Sun (starts Friday night)
      (startDay === 5 && endDay === 1) || // Fri-Mon (through weekend)
      (startDay === 6 && endDay === 1); // Sat-Mon

    if (isWeekendClosure) {
      return { type: "weekend", translationKey: "closures.fullWeekendClosure" };
    }

    // Nightly early closure: starts at 10 PM or later
    const startHour = parseTimeHour(item.start_time);
    if (startHour !== null && startHour >= 22) {
      return {
        type: "nightly",
        translationKey: "closures.nightlyEarlyClosure",
      };
    }
    return null;
  }

  /**
   * Check if a nightly closure is still active (until 6am after end_date).
   * Used to keep nightly closures visible in scheduled maintenance view.
   */
  function isNightlyClosureStillActive(item: PlannedMaintenance): boolean {
    const startHour = parseTimeHour(item.start_time);
    if (startHour === null || startHour < 22) return false; // Not a nightly closure

    const now = new Date();
    const endDate = parseLocalDate(item.end_date);

    // Calculate morning after end_date at 6 AM
    const morningAfterEnd = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() + 1, // Day after end_date
      6, // 6 AM
      0,
      0
    );

    // Nightly closure is still active if now is before 6 AM the morning after end_date
    return now < morningAfterEnd;
  }

  /**
   * Check if a maintenance item should be shown in scheduled view.
   * Items are shown if:
   * 1. Start date is in the future, OR
   * 2. End date is today or in the future, OR
   * 3. For nightly closures: until 6 AM the morning after end_date
   */
  function shouldShowInScheduled(item: PlannedMaintenance): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = parseLocalDate(item.start_date);
    const endDate = parseLocalDate(item.end_date);
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

    // Future start date - always show
    if (startDateOnly > today) return true;

    // End date is today or future - always show
    if (endDateOnly >= today) return true;

    // Past end date: check if it's a nightly closure still active (until 6am)
    return isNightlyClosureStillActive(item);
  }

  /**
   * Get all maintenance items sorted by start date.
   * Filters out past items (except nightly closures until 6am).
   */
  const sortedItems = $derived(() => {
    return $maintenanceItems
      .filter(shouldShowInScheduled)
      .sort((a, b) => {
        const startA = parseLocalDate(a.start_date).getTime();
        const startB = parseLocalDate(b.start_date).getTime();
        return startA - startB;
      });
  });

  function formatDateRange(startDate: string, endDate: string): string {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const now = new Date();
    const currentYear = now.getFullYear();

    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const startDateNum = start.getDate();
    const startYear = start.getFullYear();

    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const endDateNum = end.getDate();
    const endYear = end.getFullYear();

    if (start.toDateString() === end.toDateString()) {
      const yearStr = startYear !== currentYear ? ` ${startYear}` : "";
      return `${startMonth} ${startDateNum}${yearStr}`;
    }

    if (startMonth === endMonth && startYear === endYear) {
      const yearStr = startYear !== currentYear ? ` ${startYear}` : "";
      return `${startMonth} ${startDateNum}–${endDateNum}${yearStr}`;
    }

    const yearStr =
      startYear !== currentYear || endYear !== currentYear ? ` ${endYear}` : "";
    return `${startMonth} ${startDateNum} – ${endMonth} ${endDateNum}${yearStr}`;
  }

  const totalCount = $derived(sortedItems().length);
</script>

<section class="closures-view" aria-labelledby="closures-heading">
  <!-- Header -->
  <div class="closures-header">
    <div class="closures-header-content">
      <h2 id="closures-heading" class="closures-title">
        <span class="closures-title-short">{$_("closures.title")}</span>
        <span class="closures-title-full">{$_("closures.titleFull")}</span>
      </h2>
    </div>
  </div>

  {#if totalCount === 0}
    <!-- Empty State -->
    <div class="closures-empty">
      <div class="closures-empty-icon">
        <Train class="h-8 w-8" />
      </div>
      <h3 class="closures-empty-title">{$_("closures.noPlannedClosures")}</h3>
      <p class="closures-empty-description">
        {$_("closures.operatingNormally")}
      </p>
    </div>
  {:else}
    <!-- All Closures List (sorted by start date) -->
    <div class="closures-items">
      {#each sortedItems() as item, i}
        {@const closureBadge = getClosureBadge(item)}
        {@const startTime = formatTime(item.start_time)}
        <article
          class="closure-card animate-fade-in-up"
          style="animation-delay: {Math.min(i * 50, 200)}ms"
        >
          <div class="closure-card-grid">
            <div class="closure-card-left">
              <p class="closure-card-stations">{item.affected_stations}</p>
              <div class="closure-card-badges">
                {#each item.routes as route}
                  <RouteBadge {route} />
                {/each}
              </div>
            </div>
            <div class="closure-card-datetime">
              <time class="closure-card-date" datetime={item.start_date}>
                {formatDateRange(item.start_date, item.end_date)}
              </time>
              {#if startTime && closureBadge?.type !== "weekend"}
                <span class="closure-card-time"
                  >{$_("closures.fromTime", {
                    values: { time: startTime },
                  })}</span
                >
              {/if}
            </div>
          </div>
          <div class="closure-card-footer">
            {#if closureBadge}
              <span class="closure-type-badge {closureBadge.type}">
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
                class="closure-card-link"
              >
                {$_("common.moreDetails")}
                <ExternalLink class="h-3 w-3" aria-hidden="true" />
              </a>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .closures-view {
    background-color: hsl(var(--card));
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
    overflow: hidden;
  }

  .closures-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: hsl(var(--muted) / 0.3);
    border-bottom: 1px solid hsl(var(--border));
  }

  .closures-header-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .closures-title {
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  /* Mobile: show short title */
  .closures-title-short {
    display: inline;
  }

  .closures-title-full {
    display: none;
  }

  /* Desktop: show full title */
  @media (min-width: 640px) {
    .closures-title-short {
      display: none;
    }

    .closures-title-full {
      display: inline;
    }
  }

  /* Empty State */
  .closures-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 1.5rem;
  }

  .closures-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background-color: hsl(142 76% 36% / 0.1);
    color: hsl(142 76% 36%);
    margin-bottom: 1rem;
  }

  .closures-empty-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
  }

  .closures-empty-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    max-width: 280px;
  }

  /* Items */
  .closures-items {
    padding: 0.75rem;
  }

  .closure-card {
    padding: 1rem;
    background-color: hsl(var(--card));
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
    margin-bottom: 0.75rem;
  }

  .closure-card:last-child {
    margin-bottom: 0;
  }

  .closure-card-grid {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .closure-card-left {
    flex: 1;
    min-width: 0;
  }

  .closure-card-stations {
    font-size: 0.9375rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .closure-card-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .closure-card-datetime {
    text-align: right;
    flex-shrink: 0;
  }

  .closure-card-date {
    display: block;
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .closure-card-time {
    display: block;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.125rem;
  }

  .closure-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
  }

  .closure-type-badge {
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .closure-type-badge.nightly {
    background-color: hsl(210 100% 50% / 0.15);
    color: hsl(210 100% 35%);
  }

  :global(.dark) .closure-type-badge.nightly {
    background-color: hsl(210 100% 50% / 0.2);
    color: hsl(210 100% 70%);
  }

  .closure-type-badge.weekend {
    background-color: hsl(38 92% 50% / 0.15);
    color: hsl(30 90% 30%);
  }

  :global(.dark) .closure-type-badge.weekend {
    background-color: hsl(38 92% 50% / 0.2);
    color: hsl(38 92% 65%);
  }

  .closure-card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: hsl(var(--primary));
    text-decoration: none;
    font-weight: 500;
  }

  .closure-card-link:hover {
    text-decoration: underline;
  }
</style>
