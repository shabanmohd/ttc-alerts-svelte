<script lang="ts">
  import { _ } from "svelte-i18n";
  import { networkStatus } from "$lib/stores/networkStatus";
  import { CloudOff, AlertTriangle, RefreshCw } from "lucide-svelte";
  import { slide } from "svelte/transition";

  // Only show when offline or degraded (not connecting)
  let showBanner = $derived(
    $networkStatus.status === "offline" || $networkStatus.status === "degraded"
  );

  // Dismiss state - resets when status changes
  let dismissed = $state(false);
  let lastStatus = $state($networkStatus.status);

  $effect(() => {
    // Reset dismissed state when status changes
    if ($networkStatus.status !== lastStatus) {
      dismissed = false;
      lastStatus = $networkStatus.status;
    }
  });

  function handleDismiss() {
    dismissed = true;
  }

  function handleRetry() {
    // Trigger a page reload to attempt reconnection
    window.location.reload();
  }
</script>

{#if showBanner && !dismissed}
  <div
    class="status-banner"
    class:offline={$networkStatus.status === "offline"}
    class:degraded={$networkStatus.status === "degraded"}
    transition:slide={{ duration: 200 }}
    role="alert"
  >
    <div class="banner-content">
      <div class="banner-icon">
        {#if $networkStatus.status === "offline"}
          <CloudOff class="h-4 w-4" />
        {:else}
          <AlertTriangle class="h-4 w-4" />
        {/if}
      </div>
      <div class="banner-text">
        <span class="banner-message"
          >{$_(`networkStatus.${$networkStatus.status}.message`)}</span
        >
        <span class="banner-description"
          >{$_(`networkStatus.${$networkStatus.status}.description`)}</span
        >
      </div>
    </div>
    <div class="banner-actions">
      {#if $networkStatus.status === "degraded"}
        <button
          class="banner-button retry"
          onclick={handleRetry}
          aria-label={$_("common.retry")}
        >
          <RefreshCw class="h-4 w-4" />
        </button>
      {/if}
      <button
        class="banner-button dismiss"
        onclick={handleDismiss}
        aria-label={$_("common.close")}
      >
        ×
      </button>
    </div>
  </div>
{/if}

<style>
  .status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    gap: 0.75rem;
    font-size: calc(0.875rem * var(--text-scale, 1));
    border-bottom: 1px solid;
  }

  .status-banner.offline {
    background-color: hsl(var(--muted));
    border-color: hsl(var(--border));
    color: hsl(var(--muted-foreground));
  }

  .status-banner.degraded {
    background-color: hsl(45 93% 47% / 0.1);
    border-color: hsl(45 93% 47% / 0.3);
    color: hsl(45 93% 35%);
  }

  :global(.dark) .status-banner.degraded {
    background-color: hsl(45 93% 47% / 0.15);
    color: hsl(45 93% 58%);
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }

  .banner-icon {
    flex-shrink: 0;
  }

  .banner-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  @media (min-width: 640px) {
    .banner-text {
      flex-direction: row;
      gap: 0.5rem;
      align-items: center;
    }
  }

  .banner-message {
    font-weight: 600;
    white-space: nowrap;
  }

  .banner-description {
    font-weight: 400;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (min-width: 640px) {
    .banner-description::before {
      content: "—";
      margin-right: 0.5rem;
    }
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .banner-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--radius);
    background: transparent;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition:
      opacity 0.15s ease,
      background-color 0.15s ease;
  }

  .banner-button:hover {
    opacity: 1;
    background-color: hsl(var(--foreground) / 0.1);
  }

  .banner-button.dismiss {
    font-size: calc(1.25rem * var(--text-scale, 1));
    font-weight: 500;
    line-height: 1;
  }
</style>
