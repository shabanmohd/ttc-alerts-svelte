<script lang="ts">
  import { _ } from "svelte-i18n";
  import { LayoutGrid, CalendarDays, CheckCircle } from "lucide-svelte";
  import AlertCard from "./AlertCard.svelte";
  import { maintenanceItems } from "$lib/stores/alerts";
  import {
    formatTimeDisplay,
    formatDateDisplay,
  } from "$lib/utils/date-formatters";
  import type {
    PlannedMaintenance,
    ThreadWithAlerts,
  } from "$lib/types/database";

  // Filter state: "all" or "weekend"
  let activeFilter = $state<"all" | "weekend">("all");

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
   * Check if a nightly closure is still active (until 6am after end_date).
   */
  function isNightlyClosureStillActive(item: PlannedMaintenance): boolean {
    const startHour = parseTimeHour(item.start_time);
    if (startHour === null || startHour < 22) return false;

    const now = new Date();
    const endDate = parseLocalDate(item.end_date);
    const morningAfterEnd = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() + 1,
      6,
      0,
      0
    );
    return now < morningAfterEnd;
  }

  /**
   * Check if a maintenance item should be shown in scheduled view.
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

    if (startDateOnly > today) return true;
    if (endDateOnly >= today) return true;
    return isNightlyClosureStillActive(item);
  }

  /**
   * Get the upcoming weekend date range (Saturday to Sunday).
   */
  function getWeekendRange(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Calculate days until Saturday
    let daysUntilSat = 6 - dayOfWeek;
    if (dayOfWeek === 0) daysUntilSat = 6; // Sunday -> next Saturday
    if (dayOfWeek === 6) daysUntilSat = 0; // Already Saturday

    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSat);
    saturday.setHours(0, 0, 0, 0);

    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);

    return { start: saturday, end: sunday };
  }

  /**
   * Check if a maintenance item overlaps with the upcoming weekend.
   */
  function overlapsWeekend(item: PlannedMaintenance): boolean {
    const { start: weekendStart, end: weekendEnd } = getWeekendRange();
    const itemStart = parseLocalDate(item.start_date);
    const itemEnd = parseLocalDate(item.end_date);

    // Overlap: item starts before weekend ends AND item ends after weekend starts
    return itemStart <= weekendEnd && itemEnd >= weekendStart;
  }

  /**
   * Detect closure type based on start_time and date range.
   * - NIGHTLY_CLOSURE: Has start_time at 10 PM or later (22:00+)
   * - WEEKEND_CLOSURE: No start_time (all-day) and spans Sat-Sun
   * - SCHEDULED_CLOSURE: Everything else (generic scheduled closure)
   */
  function getClosureType(maintenance: PlannedMaintenance): string {
    const startHour = parseTimeHour(maintenance.start_time);

    // Nightly closure: starts at 10 PM (22:00) or later
    if (startHour !== null && startHour >= 22) {
      return "NIGHTLY_CLOSURE";
    }

    // Weekend closure: no specific start time and spans weekend days
    if (!maintenance.start_time) {
      const startDate = parseLocalDate(maintenance.start_date);
      const endDate = parseLocalDate(maintenance.end_date);
      const startDay = startDate.getDay(); // 0=Sun, 6=Sat
      const endDay = endDate.getDay();

      // Check if it's a typical weekend closure (Sat-Sun)
      // Or starts on Friday evening and ends Sunday
      if (
        (startDay === 6 && endDay === 0) || // Sat to Sun
        (startDay === 5 && endDay === 0) || // Fri to Sun
        (startDay === 6 && endDay === 1) // Sat to Mon
      ) {
        return "WEEKEND_CLOSURE";
      }
    }

    return "SCHEDULED_CLOSURE";
  }

  /**
   * Convert maintenance to ThreadWithAlerts format for AlertCard.
   */
  function maintenanceToThread(
    maintenance: PlannedMaintenance
  ): ThreadWithAlerts {
    const startTime = maintenance.start_time
      ? formatTimeDisplay(maintenance.start_time)
      : "";
    const startDate = formatDateDisplay(maintenance.start_date);
    const endDate = formatDateDisplay(maintenance.end_date);

    // Detect closure type for badge
    const closureType = getClosureType(maintenance);

    // Header: affected stations
    const headerText =
      maintenance.affected_stations || "Scheduled subway closure";

    // Description: date range and time
    let descriptionParts: string[] = [];

    // Date range
    if (maintenance.start_date === maintenance.end_date) {
      descriptionParts.push(startDate);
    } else {
      descriptionParts.push(`${startDate} – ${endDate}`);
    }

    // Time for nightly closures
    if (startTime) {
      descriptionParts.push(`from ${startTime}`);
    }

    const descriptionText =
      descriptionParts.length > 0 ? descriptionParts.join(" ") : null;

    return {
      thread_id: `maintenance-${maintenance.maintenance_id}`,
      title: `${maintenance.routes.join(", ")} - ${closureType.replace(/_/g, " ")}`,
      categories: [closureType, "SUBWAY"],
      affected_routes: maintenance.routes,
      is_resolved: false,
      resolved_at: null,
      created_at: maintenance.start_date,
      updated_at: maintenance.start_date,
      alerts: [],
      latestAlert: {
        alert_id: `maintenance-alert-${maintenance.maintenance_id}`,
        thread_id: `maintenance-${maintenance.maintenance_id}`,
        header_text: headerText,
        description_text: descriptionText,
        effect: closureType,
        categories: [closureType, "SUBWAY"],
        affected_routes: maintenance.routes,
        is_latest: true,
        created_at: maintenance.start_date,
        url: maintenance.url,
      },
    } as unknown as ThreadWithAlerts;
  }

  /**
   * Get sorted maintenance items as threads.
   * Using $derived.by() for complex computations that need function bodies.
   */
  const allMaintenance = $derived.by(() => {
    return $maintenanceItems.filter(shouldShowInScheduled).sort((a, b) => {
      const startA = parseLocalDate(a.start_date).getTime();
      const startB = parseLocalDate(b.start_date).getTime();
      return startA - startB;
    });
  });

  const weekendMaintenance = $derived.by(() => {
    return allMaintenance.filter(overlapsWeekend);
  });

  const sortedThreads = $derived.by(() => {
    const items =
      activeFilter === "weekend" ? weekendMaintenance : allMaintenance;
    return items.map(maintenanceToThread);
  });

  const allCount = $derived(allMaintenance.length);
  const weekendCount = $derived(weekendMaintenance.length);
  const totalCount = $derived(sortedThreads.length);
</script>

{#if $maintenanceItems.length === 0}
  <!-- Empty State: No closures at all -->
  <div class="empty-state success">
    <div class="empty-state-icon success">
      <CheckCircle class="h-8 w-8" />
    </div>
    <h3 class="empty-state-title">
      {$_("closures.noPlannedClosures")}
    </h3>
    <p class="empty-state-description">
      {$_("closures.operatingNormally")}
    </p>
  </div>
{:else}
  <!-- Header with Title -->
  <h2 class="text-lg font-semibold mb-3">{$_("closures.titleFull")}</h2>

  <!-- Filter Buttons (matching Routes page style) -->
  <div class="flex flex-wrap gap-2 mb-4">
    <button
      type="button"
      onclick={() => (activeFilter = "all")}
      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-3 border"
      style={activeFilter === "all"
        ? "background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary));"
        : ""}
      aria-pressed={activeFilter === "all"}
    >
      <LayoutGrid class="h-4 w-4" />
      {$_("closures.filterAll")}
      <span
        class="inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[1.25rem] h-5 px-1.5 {activeFilter ===
        'all'
          ? 'bg-primary-foreground/20'
          : 'bg-muted'}">{allCount}</span
      >
    </button>
    <button
      type="button"
      onclick={() => (activeFilter = "weekend")}
      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-3 border"
      style={activeFilter === "weekend"
        ? "background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary));"
        : ""}
      aria-pressed={activeFilter === "weekend"}
    >
      <CalendarDays class="h-4 w-4" />
      {$_("closures.filterWeekend")}
      <span
        class="inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[1.25rem] h-5 px-1.5 {activeFilter ===
        'weekend'
          ? 'bg-primary-foreground/20'
          : 'bg-muted'}">{weekendCount}</span
      >
    </button>
  </div>

  {#if totalCount === 0}
    <!-- Empty State: Filter applied but no results -->
    <div class="empty-state">
      <div class="empty-state-icon">
        <CalendarDays class="h-8 w-8" />
      </div>
      <h3 class="empty-state-title">
        {$_("closures.noClosuresForFilter")}
      </h3>
      <p class="empty-state-description">
        {$_("closures.tryOtherFilter")}
      </p>
    </div>
  {:else}
    <!-- Display closures as AlertCards -->
    <div class="space-y-3">
      {#each sortedThreads as thread, i (thread.thread_id)}
        <div
          class="animate-fade-in-up"
          style="animation-delay: {Math.min(i * 50, 300)}ms"
        >
          <AlertCard {thread} />
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
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
  }

  .empty-state.success {
    border-style: solid;
    border-color: hsl(142 76% 36% / 0.2);
    background-color: hsl(142 76% 36% / 0.05);
  }

  .empty-state-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    margin-bottom: 1rem;
  }

  .empty-state-icon.success {
    background-color: hsl(142 76% 36% / 0.1);
    color: hsl(142 76% 36%);
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
