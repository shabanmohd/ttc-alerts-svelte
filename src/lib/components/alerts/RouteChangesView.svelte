<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { _ } from "svelte-i18n";
  import { CheckCircle, ExternalLink } from "lucide-svelte";
  import RouteBadge from "./RouteBadge.svelte";
  import {
    routeChanges,
    routeChangesLoading,
    routeChangesError,
    loadRouteChanges,
  } from "$lib/stores/route-changes";
  import { isVisible } from "$lib/stores/visibility";
  import type { RouteChange } from "$lib/services/route-changes";

  // Polling interval (5 minutes - same as maintenance)
  const POLLING_INTERVAL = 300_000;

  // Track polling interval ID
  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  // Load route changes on mount and set up polling
  onMount(() => {
    // Initial fetch
    loadRouteChanges();

    // Set up polling interval (every 5 minutes)
    pollingInterval = setInterval(() => {
      // Only poll when tab is visible
      if ($isVisible) {
        loadRouteChanges(true); // Force refresh
      }
    }, POLLING_INTERVAL);
  });

  // Clean up polling on destroy
  onDestroy(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  });

  /**
   * Format a date for full display with time
   */
  function formatFullDate(
    dateStr: string | null,
    timeStr: string | null
  ): string {
    if (!dateStr) return "";

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    // Format as "December 31, 2025"
    let formatted = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Add time if present (e.g., "- 11:30 PM")
    if (timeStr) {
      formatted += ` - ${timeStr}`;
    }

    return formatted;
  }

  /**
   * Get the display date range for a route change (full format)
   */
  function getDateDisplay(change: RouteChange): string {
    const parts: string[] = [];

    // Always show start date label if present (e.g., "starting as early as")
    if (change.startDateLabel) {
      // Capitalize first letter
      const label =
        change.startDateLabel.charAt(0).toUpperCase() +
        change.startDateLabel.slice(1);
      parts.push(label);
    }

    // Add start date with time
    if (change.startDate) {
      parts.push(formatFullDate(change.startDate, change.startTime));
    }

    // Add end date if present
    if (change.endDate) {
      parts.push("to");
      parts.push(formatFullDate(change.endDate, change.endTime));
    }

    // If nothing to display, return empty
    if (parts.length === 0) {
      return "";
    }

    return parts.join(" ");
  }

  /**
   * Capitalize first letter of each word (title case)
   * Handles hyphenated words like "Esplanade-River"
   */
  function formatRouteName(name: string): string {
    if (!name) return "";
    return name
      .split(" ")
      .map((word) => {
        // Handle hyphenated words like "Esplanade-River"
        if (word.includes("-")) {
          return word
            .split("-")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("-");
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
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
      <div
        class="route-change-card animate-fade-in-up"
        style="animation-delay: {Math.min(i * 50, 300)}ms"
      >
        <!-- Header: Route badges + Route name -->
        <div class="route-change-header">
          <div class="route-badges">
            {#each change.routes as route}
              <RouteBadge {route} size="lg" />
            {/each}
          </div>
          {#if change.routeName}
            <span class="route-name">{formatRouteName(change.routeName)}</span>
          {/if}
        </div>

        <!-- Title/Description -->
        <p class="card-title">{change.title}</p>

        <!-- Date info with full format -->
        {#if getDateDisplay(change)}
          <p class="card-date">{getDateDisplay(change)}</p>
        {/if}

        <!-- Link indicator - only this is clickable -->
        <a
          href={change.url}
          target="_blank"
          rel="noopener noreferrer"
          class="card-link"
        >
          {$_("common.moreDetails")}
          <ExternalLink class="link-icon" />
        </a>
      </div>
    {/each}
  </div>
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

  /* Route change card - matching AlertCard border, padding, and hover */
  .route-change-card {
    display: block;
    padding: 0.875rem 1rem;
    background-color: hsl(var(--card));
    border: 2px solid hsl(var(--border));
    border-radius: var(--radius);
    color: inherit;
    transition: box-shadow 0.2s ease;
  }

  @media (min-width: 640px) {
    .route-change-card {
      padding: 1rem 1.25rem;
    }
  }

  .route-change-card:hover {
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  /* Card header - badges + route name on same row (left-aligned) */
  .route-change-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .route-badges {
    display: inline-flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .route-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: hsl(var(--foreground));
  }

  /* Card title */
  .card-title {
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 1.4;
    margin: 0 0 0.375rem 0;
    color: hsl(var(--foreground));
  }

  /* Card date */
  .card-date {
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 0.5rem 0;
  }

  /* Card link */
  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--primary));
    text-decoration: none;
  }

  .card-link:hover {
    text-decoration: underline;
  }

  .card-link :global(.link-icon) {
    width: 0.75rem;
    height: 0.75rem;
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
