<script lang="ts">
  import "../routes/layout.css";
  import "$lib/styles/ttc-theme.css";
  import { Toaster } from "$lib/components/ui/sonner";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import MobileBottomNav from "$lib/components/layout/MobileBottomNav.svelte";
  import PullToRefresh from "$lib/components/layout/PullToRefresh.svelte";
  import { HowToUseDialog } from "$lib/components/dialogs";
  import { onMount, onDestroy } from "svelte";
  import {
    subscribeToAlerts,
    fetchAlerts,
    refreshAlerts,
  } from "$lib/stores/alerts";
  import { etaStore } from "$lib/stores/eta";
  import { initializeStorage } from "$lib/services/storage";
  import { savedStops } from "$lib/stores/savedStops";
  import { savedRoutes } from "$lib/stores/savedRoutes";
  import { localPreferences } from "$lib/stores/localPreferences";
  import { initLanguage } from "$lib/stores/language";
  import { initI18n } from "$lib/i18n";

  // Initialize i18n translations
  initI18n();

  // Initialize language (sets <html lang> attribute and syncs with i18n)
  initLanguage();

  let { children } = $props();

  let activeDialog = $state<string | null>(null);
  let unsubscribeAlerts: (() => void) | null = null;

  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }

  function handleCloseDialog() {
    activeDialog = null;
  }

  // Pull-to-refresh handler
  async function handlePullRefresh() {
    await Promise.all([refreshAlerts(), etaStore.refreshAll()]);
  }

  // Initialize app on mount
  onMount(async () => {
    // Initialize IndexedDB storage (with migration from old localStorage)
    await initializeStorage();

    // Initialize stores from IndexedDB
    // Note: localPreferences.init() handles theme application automatically
    await Promise.all([
      savedStops.init(),
      savedRoutes.init(),
      localPreferences.init(),
    ]);

    // Fetch initial alerts
    await fetchAlerts();

    // Subscribe to realtime alert updates
    unsubscribeAlerts = subscribeToAlerts();
  });

  onDestroy(() => {
    // Cleanup subscriptions
    if (unsubscribeAlerts) unsubscribeAlerts();
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<!-- Desktop Sidebar -->
<Sidebar onOpenDialog={handleOpenDialog} />

<!-- Main wrapper with pull-to-refresh -->
<PullToRefresh onRefresh={handlePullRefresh}>
  <div class="main-wrapper">
    {@render children()}
  </div>
</PullToRefresh>

<!-- Mobile Bottom Navigation -->
<MobileBottomNav />

<!-- Global Dialogs (triggered from sidebar) -->
<HowToUseDialog
  open={activeDialog === "how-to-use"}
  onOpenChange={(open) => {
    if (!open) activeDialog = null;
  }}
/>

<Toaster />
