<script lang="ts">
  import { _ } from "svelte-i18n";
  import { networkStatus } from "$lib/stores/networkStatus";
  import { CloudOff, AlertTriangle, RefreshCw, X } from "lucide-svelte";
  import { slide } from "svelte/transition";

  // TEST MODE: Set to true to always show banner for testing
  const TEST_MODE = false;
  const TEST_STATUS: "offline" | "degraded" = "degraded";

  // Only show when offline or degraded (not connecting)
  let showBanner = $derived(
    TEST_MODE ||
      $networkStatus.status === "offline" ||
      $networkStatus.status === "degraded"
  );

  // Get effective status (test or real)
  let effectiveStatus = $derived(
    TEST_MODE ? TEST_STATUS : $networkStatus.status
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
    class:offline={effectiveStatus === "offline"}
    class:degraded={effectiveStatus === "degraded"}
    transition:slide={{ duration: 200 }}
    role="alert"
  >
    <div class="banner-content">
      <div class="banner-icon">
        {#if effectiveStatus === "offline"}
          <CloudOff class="h-4 w-4" />
        {:else}
          <AlertTriangle class="h-4 w-4" />
        {/if}
      </div>
      <div class="banner-text">
        <span class="banner-message"
          >{$_(`networkStatus.${effectiveStatus}.message`)}</span
        >
        <span class="banner-separator">•</span>
        <span class="banner-description">
          {$_(`networkStatus.${effectiveStatus}.description`)} —
          <button
            class="retry-link"
            onclick={handleRetry}
            aria-label={$_("common.retry")}
          >
            {$_("common.retry")}
            <RefreshCw class="h-3.5 w-3.5 inline-icon" />
          </button>
        </span>
      </div>
    </div>
    <div class="banner-actions">
      <button
        class="banner-button dismiss"
        onclick={handleDismiss}
        aria-label={$_("common.close")}
      >
        <X class="h-4 w-4" />
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
    align-items: flex-start;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }

  .banner-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
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

  .banner-separator {
    display: none;
    opacity: 0.6;
    flex-shrink: 0;
  }

  @media (min-width: 640px) {
    .banner-separator {
      display: inline;
    }
  }

  .banner-description {
    font-weight: 400;
    opacity: 0.9;
  }

  .retry-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: inherit;
    background: none;
    border: none;
    padding: 0;
    font-size: inherit;
    font-family: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 500;
    opacity: 0.9;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .retry-link:hover {
    opacity: 1;
  }

  .retry-link :global(.inline-icon) {
    flex-shrink: 0;
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
</style>
