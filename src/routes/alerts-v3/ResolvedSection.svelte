<script lang="ts">
  import { CheckCircle } from "lucide-svelte";
  import AlertCard from "$lib/components/alerts/AlertCard.svelte";
  import type { ThreadWithAlerts } from "$lib/types/database";

  let { alerts }: { alerts: ThreadWithAlerts[] } = $props();
</script>

<section class="resolved-section">
  <div class="resolved-header">
    <div class="header-left">
      <span class="header-icon"><CheckCircle /></span>
      <span class="header-title">Recently Resolved</span>
      {#if alerts.length > 0}
        <span class="header-count">{alerts.length}</span>
      {:else}
        <span class="header-none">None in last 6 hours</span>
      {/if}
    </div>
  </div>

  {#if alerts.length > 0}
    <div id="resolved-content" class="resolved-content">
      {#each alerts as thread (thread.thread_id)}
        <AlertCard {thread} />
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
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-icon {
    display: flex;
    align-items: center;
    width: 1.125rem;
    height: 1.125rem;
    color: hsl(142 71% 45%);
  }

  .header-icon :global(svg) {
    width: 1.125rem;
    height: 1.125rem;
  }

  .header-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .header-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.375rem;
    height: 1.375rem;
    padding: 0 0.4375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: hsl(142 71% 45% / 0.15);
    color: hsl(142 71% 35%);
    border-radius: 9999px;
  }

  .header-none {
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground) / 0.6);
  }

  :global(.dark) .header-count {
    background-color: hsl(142 71% 45% / 0.2);
    color: hsl(142 71% 55%);
  }

  .resolved-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }
</style>
