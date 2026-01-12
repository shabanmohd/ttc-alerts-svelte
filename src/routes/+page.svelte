<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { _ } from "svelte-i18n";
  import Header from "$lib/components/layout/Header.svelte";
  import HomeSubTabs from "$lib/components/layout/HomeSubTabs.svelte";
  import MyStops from "$lib/components/stops/MyStops.svelte";
  import MyRouteAlerts from "$lib/components/alerts/MyRouteAlerts.svelte";
  import { fetchAlerts, subscribeToAlerts } from "$lib/stores/alerts";
  import { isVisible } from "$lib/stores/visibility";
  import SEO from "$lib/components/SEO.svelte";

  // Lazy load dialogs to reduce initial bundle size
  const HowToUseDialogPromise = import(
    "$lib/components/dialogs/HowToUseDialog.svelte"
  );
  const InstallPWADialogPromise = import(
    "$lib/components/dialogs/InstallPWADialog.svelte"
  );

  type HomeTab = "stops" | "routes";

  let activeDialog = $state<string | null>(null);
  let unsubscribeRealtime: (() => void) | null = null;

  // Get current home sub-tab from URL
  let currentHomeTab = $derived<HomeTab>(
    ($page.url.searchParams.get("home") as HomeTab) || "stops"
  );

  // Track visibility for polling control
  let hiddenSince: number | null = null;
  const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  // React to visibility changes
  $effect(() => {
    if ($isVisible) {
      if (hiddenSince && Date.now() - hiddenSince > STALE_THRESHOLD) {
        console.log(
          "[Visibility] Tab was hidden for too long, refreshing data..."
        );
        fetchAlerts();
      }
      hiddenSince = null;
    } else {
      hiddenSince = Date.now();
    }
  });

  onMount(async () => {
    // Initial data fetch
    await fetchAlerts();

    // Subscribe to Realtime updates
    unsubscribeRealtime = subscribeToAlerts();
  });

  onDestroy(() => {
    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }
  });

  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }
</script>

<SEO
  title={$_("pages.home.title")}
  description="Track TTC service alerts, subway closures, elevator outages & delays in real-time. Free transit tracker for Toronto subway, bus & streetcar routes."
/>

<Header onOpenDialog={handleOpenDialog} />

<main class="content-area">
  <!-- Home Sub-tabs -->
  <HomeSubTabs />

  <!-- Tab Content -->
  {#if currentHomeTab === "stops"}
    <!-- My Stops Tab -->
    <MyStops />
  {:else if currentHomeTab === "routes"}
    <!-- My Routes Tab -->
    <MyRouteAlerts />
  {/if}
</main>

<!-- Lazy-loaded Dialogs -->
{#if activeDialog === "how-to-use"}
  {#await HowToUseDialogPromise then { default: HowToUseDialog }}
    <HowToUseDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) activeDialog = null;
      }}
    />
  {/await}
{/if}

{#if activeDialog === "install-pwa"}
  {#await InstallPWADialogPromise then { default: InstallPWADialog }}
    <InstallPWADialog
      open={true}
      onOpenChange={(open) => {
        if (!open) activeDialog = null;
      }}
    />
  {/await}
{/if}
