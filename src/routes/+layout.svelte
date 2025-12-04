<script lang="ts">
  import '../routes/layout.css';
  import '$lib/styles/ttc-theme.css';
  import { Toaster } from '$lib/components/ui/sonner';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
  import { SignInDialog, HowToUseDialog } from '$lib/components/dialogs';
  import { onMount, onDestroy } from 'svelte';
  import { initAuth, subscribeToAuth, isAuthenticated, userName } from '$lib/stores/auth';
  import { subscribeToAlerts, fetchAlerts } from '$lib/stores/alerts';
  import { loadPreferences } from '$lib/stores/preferences';
  
  let { children } = $props();
  
  let activeDialog = $state<string | null>(null);
  let unsubscribeAuth: (() => void) | null = null;
  let unsubscribeAlerts: (() => void) | null = null;
  
  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }
  
  function handleCloseDialog() {
    activeDialog = null;
  }
  
  // Initialize app on mount
  onMount(async () => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Initialize auth and subscribe to changes
    await initAuth();
    unsubscribeAuth = subscribeToAuth();
    
    // Load user preferences
    await loadPreferences();
    
    // Fetch initial alerts
    await fetchAlerts();
    
    // Subscribe to realtime alert updates
    unsubscribeAlerts = subscribeToAlerts();
  });
  
  onDestroy(() => {
    // Cleanup subscriptions
    if (unsubscribeAuth) unsubscribeAuth();
    if (unsubscribeAlerts) unsubscribeAlerts();
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<!-- Desktop Sidebar -->
<Sidebar onOpenDialog={handleOpenDialog} />

<!-- Main wrapper -->
<div class="main-wrapper">
  {@render children()}
</div>

<!-- Mobile Bottom Navigation -->
<MobileBottomNav />

<!-- Global Dialogs (triggered from sidebar) -->
<SignInDialog 
  open={activeDialog === 'sign-in'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }}
/>

<HowToUseDialog 
  open={activeDialog === 'how-to-use'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }} 
/>

<Toaster />
