<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { _ } from "svelte-i18n";
  import Header from "$lib/components/layout/Header.svelte";
  import HomeSubTabs from "$lib/components/layout/HomeSubTabs.svelte";
  import MyStops from "$lib/components/stops/MyStops.svelte";
  import MyRouteAlerts from "$lib/components/alerts/MyRouteAlerts.svelte";
  import { fetchAlerts, subscribeToAlerts } from "$lib/stores/alerts";
  import { isAuthenticated, userName, signOut } from "$lib/stores/auth";
  import { isVisible } from "$lib/stores/visibility";

  // Import dialogs
  import { HowToUseDialog, InstallPWADialog } from "$lib/components/dialogs";

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

  async function handleSignOut() {
    await signOut();
  }
</script>

<svelte:head>
  <title>{$_("pages.home.title")}</title>
  <meta name="description" content={$_("pages.home.description")} />
</svelte:head>

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

<!-- Dialogs -->
<HowToUseDialog
  open={activeDialog === "how-to-use"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>

<InstallPWADialog
  open={activeDialog === "install-pwa"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>
