<script lang="ts">
  import { ChevronDown, CheckCircle } from "lucide-svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import { cn } from "$lib/utils";
  import type { ThreadWithAlerts } from "$lib/types/database";

  let { alerts }: { alerts: ThreadWithAlerts[] } = $props();

  // Collapsed state
  let isExpanded = $state(false);

  /**
   * Format relative time since resolution.
   */
  function getRelativeTime(dateStr: string): string {
    const resolved = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - resolved.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  }
</script>

<section class="resolved-section">
  <button
    class="resolved-header"
    onclick={() => (isExpanded = !isExpanded)}
    aria-expanded={isExpanded}
    aria-controls="resolved-content"
    disabled={alerts.length === 0}
  >
    <div class="header-left">
      <span class="header-icon"><CheckCircle /></span>
      <span class="header-title">Recently Resolved</span>
      {#if alerts.length > 0}
        <span class="header-count">{alerts.length}</span>
      {:else}
        <span class="header-none">None in last 4h</span>
      {/if}
    </div>
    {#if alerts.length > 0}
      <span class={cn("chevron", isExpanded && "rotated")}><ChevronDown /></span
      >
    {/if}
  </button>

  {#if isExpanded && alerts.length > 0}
    <div id="resolved-content" class="resolved-content">
      {#each alerts as thread (thread.thread_id)}
        <div class="resolved-item">
          <AlertCard {thread} />
          {#if thread.resolved_at}
            <span class="resolved-time"
              >Resolved {getRelativeTime(thread.resolved_at)}</span
            >
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .resolved-section {
    margin-top: 1.5rem;
    border-top: 1px solid hsl(var(--border));
    padding-top: 1rem;
  }

  .resolved-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 0;
    background: transparent;
    border: none;
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    transition: color 0.15s ease;
  }

  .resolved-header:hover {
    color: hsl(var(--foreground));
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-icon {
    display: flex;
    align-items: center;
    width: 1rem;
    height: 1rem;
    color: hsl(142 71% 45%);
  }

  .header-icon :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  .header-title {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .header-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background-color: hsl(142 71% 45% / 0.15);
    color: hsl(142 71% 35%);
    border-radius: 9999px;
  }

  .header-none {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground) / 0.6);
  }

  .resolved-header:disabled {
    cursor: default;
  }

  .resolved-header:disabled:hover {
    color: hsl(var(--muted-foreground));
  }

  :global(.dark) .header-count {
    background-color: hsl(142 71% 45% / 0.2);
    color: hsl(142 71% 55%);
  }

  .chevron {
    display: flex;
    align-items: center;
    width: 1.25rem;
    height: 1.25rem;
    transition: transform 0.2s ease;
  }

  .chevron :global(svg) {
    width: 1.25rem;
    height: 1.25rem;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .resolved-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  .resolved-item {
    position: relative;
  }

  .resolved-item :global(.alert-card) {
    opacity: 0.7;
  }

  .resolved-time {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: hsl(142 71% 45%);
    text-align: right;
  }
</style>
