<script lang="ts">
  import "../routes/layout.css";
  import "$lib/styles/ttc-theme.css";
  import { Toaster } from "$lib/components/ui/sonner";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import MobileBottomNav from "$lib/components/layout/MobileBottomNav.svelte";
  import PullToRefresh from "$lib/components/layout/PullToRefresh.svelte";
  import StatusBanner from "$lib/components/layout/StatusBanner.svelte";
  import HolidayBanner from "$lib/components/layout/HolidayBanner.svelte";
  import {
    ReportIssueDialog,
    FeatureRequestDialog,
  } from "$lib/components/dialogs";
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
  import { activeDialog, openDialog, closeDialog } from "$lib/stores/dialogs";
  import { initNetworkListeners } from "$lib/stores/networkStatus";
  import { toast } from "svelte-sonner";
  import { _ } from "svelte-i18n";

  // Initialize i18n translations
  initI18n();

  // Initialize language (sets <html lang> attribute and syncs with i18n)
  initLanguage();

  let { children } = $props();

  let unsubscribeAlerts: (() => void) | null = null;
  let cleanupNetworkListeners: (() => void) | undefined;
  let updateToastShown = false; // Prevent duplicate update toasts

  // Pull-to-refresh handler
  async function handlePullRefresh() {
    await Promise.all([refreshAlerts(), etaStore.refreshAll()]);
  }

  // Handle app update available
  function handleAppUpdate() {
    // Prevent duplicate toasts if multiple updates occur while app is open
    if (updateToastShown) {
      console.log("[App] Update toast already shown, skipping duplicate");
      return;
    }
    updateToastShown = true;

    // Dismiss any existing update toast first (belt and suspenders)
    toast.dismiss("sw-update-toast");

    toast.info($_("app.updateAvailable") || "App update available", {
      id: "sw-update-toast", // Use fixed ID to prevent duplicates at toast level too
      description:
        $_("app.updateDescription") ||
        "Tap to refresh and get the latest version",
      duration: Infinity, // Don't auto-dismiss
      action: {
        label: $_("common.refresh") || "Refresh",
        onClick: async () => {
          // Signal that user requested the refresh (for controllerchange handler)
          if (
            typeof window !== "undefined" &&
            (window as any).__swRefreshRequested
          ) {
            (window as any).__swRefreshRequested();
          }

          // Get the waiting service worker and tell it to activate
          const registration = await navigator.serviceWorker?.getRegistration();
          if (registration?.waiting) {
            // Tell the waiting SW to skip waiting and take over
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          } else {
            // No waiting SW, just reload
            window.location.reload();
          }
        },
      },
    });
  }

  // Initialize app on mount
  onMount(async () => {
    // Initialize network status listeners
    cleanupNetworkListeners = initNetworkListeners();

    // Listen for service worker updates
    window.addEventListener("sw-update-available", handleAppUpdate);

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
    if (cleanupNetworkListeners) cleanupNetworkListeners();
    window.removeEventListener("sw-update-available", handleAppUpdate);
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

<!-- Skip to main content link (WCAG 2.4.1) -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Desktop Sidebar -->
<Sidebar onOpenDialog={openDialog} />

<!-- iOS PWA Safe Area Cover - fixed background behind translucent status bar -->
<div
  class="fixed top-0 left-0 right-0 pointer-events-none safe-area-cover"
  style="height: env(safe-area-inset-top, 0px); background-color: hsl(var(--background)); z-index: 9999;"
  aria-hidden="true"
></div>

<!-- Main wrapper with pull-to-refresh -->
<PullToRefresh onRefresh={handlePullRefresh}>
  <div class="main-wrapper" id="main-content" tabindex="-1">
    <!-- Banners at top of main content -->
    <div class="banners-container">
      <!-- Network Status Banner (shows when offline - overlays header) -->
      <StatusBanner />

      <!-- Holiday Schedule Banner (shows when today/tomorrow is a TTC holiday) -->
      <HolidayBanner />
    </div>
    {@render children()}
  </div>
</PullToRefresh>

<!-- Mobile Bottom Navigation -->
<MobileBottomNav />

<!-- Global Dialogs (triggered from sidebar or header) -->
<ReportIssueDialog
  open={$activeDialog === "report-bug"}
  onOpenChange={(open) => {
    if (!open) closeDialog();
  }}
/>

<FeatureRequestDialog
  open={$activeDialog === "feature-request"}
  onOpenChange={(open) => {
    if (!open) closeDialog();
  }}
/>

<Toaster />
