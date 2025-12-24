<script lang="ts">
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";
  import { CheckCircle, ExternalLink, Calendar, ArrowRight } from "lucide-svelte";
  import RouteBadge from "./RouteBadge.svelte";
  import StatusBadge from "./StatusBadge.svelte";
  import {
    routeChanges,
    routeChangesLoading,
    routeChangesError,
    loadRouteChanges,
  } from "$lib/stores/route-changes";
  import type { RouteChange } from "$lib/services/route-changes";

  // Load route changes on mount
  onMount(() => {
    loadRouteChanges();
  });

  /**
   * Format a date string like "December 31, 2025" to a shorter form.
   */
  function formatDateShort(dateStr: string | null): string {
    if (!dateStr) return "";

    // Try to parse the date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // If parsing fails, return the original
      return dateStr;
    }

    // Format as "Dec 31"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  /**
   * Format time for display
   */
  function formatTime(timeStr: string | null): string {
    if (!timeStr) return "";
    return timeStr;
  }

  /**
   * Get the display date range for a route change
   */
  function getDateDisplay(change: RouteChange): string {
    const parts: string[] = [];

    // Add start date label if present (e.g., "starting as early as")
    if (change.startDateLabel) {
      parts.push(change.startDateLabel);
    }

    // Add start date
    if (change.startDate) {
      let startStr = formatDateShort(change.startDate);
      if (change.startTime) {
        startStr += ` at ${formatTime(change.startTime)}`;
      }
      parts.push(startStr);
    }

    // Add end date if present
    if (change.endDate) {
      let endStr = formatDateShort(change.endDate);
      if (change.endTime) {
        endStr += ` at ${formatTime(change.endTime)}`;
      }
      parts.push(`to ${endStr}`);
    }

    // If no dates at all, return "Ongoing"
    if (parts.length === 0) {
      return "Ongoing";
    }

    return parts.join(" ");
  }

  /**
   * Get the short date for timestamp display (top right corner)
   */
  function getTimestampDate(change: RouteChange): string {
    if (change.startDate) {
      return formatDateShort(change.startDate);
    }
    return "Ongoing";
  }

  /**
   * Capitalize first letter of each word
   */
  function formatRouteName(name: string): string {
    if (!name) return "";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  const totalCount = $derived($routeChanges.length);
</script>

{#if $routeChangesLoading}
  <!-- Loading state -->
  <div class="loading-state">
    <div class="loading-spinner"></div>
    <p class="loading-text">{$_("common.loading")}</p>
  </div>
{:else if $routeChangesError}
  <!-- Error state -->
  <div class="error-state">
    <p class="error-text">{$routeChangesError}</p>
    <button class="retry-button" onclick={() => loadRouteChanges(true)}>
      {$_("common.tryAgain")}
    </button>
  </div>
{:else if totalCount === 0}
  <!-- Empty state -->
  <div class="empty-state success">
    <div class="empty-state-icon success">
      <CheckCircle class="h-8 w-8" />
    </div>
    <h3 class="empty-state-title">{$_("routeChanges.noChanges")}</h3>
    <p class="empty-state-description">
      {$_("routeChanges.operatingNormally")}
    </p>
  </div>
{:else}
  <!-- Route Changes List -->
  <div class="route-changes-list">
    {#each $routeChanges as change, i (change.id)}
      <a
        href={change.url}
        target="_blank"
        rel="noopener noreferrer"
        class="alert-card animate-fade-in-up"
        style="animation-delay: {Math.min(i * 50, 300)}ms"
      >
        <!-- Badge on left - fixed width for uniform alignment -->
        <div class="badge-column">
          {#if change.routes.length > 0}
            <RouteBadge route={change.routes[0]} size="lg" />
          {/if}
        </div>

        <!-- Status + Description on right -->
        <div class="content-column">
          <div class="card-header">
            <StatusBadge category="TEMPORARY_ROUTE_CHANGE" />
            <time class="card-timestamp">{getTimestampDate(change)}</time>
          </div>

          <!-- Title: Route name + description -->
          <p class="card-title">
            {#if change.routeName}
              {formatRouteName(change.routeName)}: {change.title}
            {:else}
              {change.title}
            {/if}
          </p>

          <!-- Date info -->
          {#if change.startDate || change.endDate}
            <p class="card-date">
              <Calendar class="h-3.5 w-3.5 flex-shrink-0" />
              <span>{getDateDisplay(change)}</span>
            </p>
          {/if}

          <!-- Link indicator -->
          <span class="card-link">
            {$_("common.moreDetails")} <ExternalLink class="h-3 w-3" />
          </span>
        </div>
      </a>
    {/each}
  </div>

  <!-- Footer link to TTC page -->
  <a
    href="https://www.ttc.ca/service-advisories/Service-Changes"
    target="_blank"
    rel="noopener noreferrer"
    class="view-all-link"
  >
    {$_("routeChanges.viewAllOnTtc")}
    <ArrowRight class="h-4 w-4" />
  </a>
{/if}

<style>
  /* Loading state */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    color: hsl(var(--muted-foreground));
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid hsl(var(--muted));
    border-top-color: hsl(var(--primary));
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-size: 0.875rem;
    margin: 0;
  }

  /* Error state */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    gap: 1rem;
  }

  .error-text {
    font-size: 0.875rem;
    color: hsl(0 84% 60%);
    margin: 0;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--primary));
    background: transparent;
    border: 1px solid hsl(var(--primary));
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .retry-button:hover {
    background: hsl(var(--primary) / 0.1);
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
    border: 1px solid hsl(142 76% 36% / 0.25);
    border-radius: 0.75rem;
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
    background-color: hsl(142 76% 36% / 0.1);
    border-radius: 9999px;
    margin-bottom: 1rem;
  }

  :global(.dark) .empty-state-icon.success {
    background-color: hsl(142 70% 45% / 0.15);
  }

  .empty-state-icon :global(svg) {
    color: hsl(142 76% 36%);
  }

  :global(.dark) .empty-state-icon.success :global(svg) {
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

  /* Route changes list */
  .route-changes-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Alert Card (matching AlertCard.svelte style) */
  .alert-card {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    text-decoration: none;
    color: inherit;
    transition: all 0.15s ease;
  }

  .alert-card:hover {
    border-color: hsl(262 83% 58% / 0.4);
    box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.08);
  }

  :global(.dark) .alert-card:hover {
    border-color: hsl(262 83% 68% / 0.4);
    background-color: hsl(var(--card) / 0.8);
  }

  /* Badge column - fixed width like AlertCard */
  .badge-column {
    width: 5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  /* Content column */
  .content-column {
    flex: 1;
    min-width: 0;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .card-timestamp {
    font-size: 0.6875rem;
    color: hsl(var(--muted-foreground));
    white-space: nowrap;
  }

  .card-title {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.45;
    margin: 0 0 0.375rem 0;
    color: hsl(var(--foreground));
  }

  .card-date {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 0.375rem 0;
    line-height: 1.3;
  }

  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--primary));
  }

  .alert-card:hover .card-link {
    text-decoration: underline;
  }

  /* View all link */
  .view-all-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(262 83% 50%);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  :global(.dark) .view-all-link {
    color: hsl(262 83% 68%);
  }

  .view-all-link:hover {
    text-decoration: underline;
  }

  /* Animation */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out forwards;
  }
</style>
