<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { ArrowLeft, Bookmark, BookmarkCheck, Bell, CheckCircle } from 'lucide-svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import RouteBadge from '$lib/components/alerts/RouteBadge.svelte';
  import AlertCard from '$lib/components/alerts/AlertCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { threadsWithAlerts, isLoading, fetchAlerts } from '$lib/stores/alerts';
  import { savedRoutes } from '$lib/stores/savedRoutes';
  import { isAuthenticated, userName, signOut } from '$lib/stores/auth';
  import type { ThreadWithAlerts } from '$lib/types/database';
  
  // Import dialogs
  import { HowToUseDialog, InstallPWADialog } from '$lib/components/dialogs';
  
  // Get route from URL param
  let routeId = $derived($page.params.route);
  
  // Get route details
  const ROUTE_NAMES: Record<string, string> = {
    'Line 1': 'Yonge-University',
    'Line 2': 'Bloor-Danforth',
    'Line 4': 'Sheppard',
    '501': 'Queen',
    '503': 'Kingston Rd',
    '504': 'King',
    '505': 'Dundas',
    '506': 'Carlton',
    '507': 'Long Branch',
    '508': 'Lake Shore',
    '509': 'Harbourfront',
    '510': 'Spadina',
    '511': 'Bathurst',
    '512': 'St Clair',
    '7': 'Bathurst',
    '25': 'Don Mills',
    '29': 'Dufferin',
    '32': 'Eglinton West',
    '34': 'Eglinton East',
    '35': 'Jane',
    '36': 'Finch West',
    '39': 'Finch East',
    '41': 'Keele',
    '52': 'Lawrence West',
    '54': 'Lawrence East',
    '60': 'Steeles West',
    '63': 'Ossington',
    '84': 'Sheppard West',
    '85': 'Sheppard East',
    '95': 'York Mills',
    '96': 'Wilson',
    '97': 'Yonge'
  };
  
  let routeName = $derived(ROUTE_NAMES[routeId] || '');
  
  // Check if route is saved
  let isSaved = $derived($savedRoutes.some(r => r.id === routeId));
  
  // Filter alerts for this route
  let routeAlerts = $derived<ThreadWithAlerts[]>(() => {
    return $threadsWithAlerts.filter(thread => {
      const threadRoutes = Array.isArray(thread.affected_routes) ? thread.affected_routes : [];
      const alertRoutes = Array.isArray(thread.latestAlert?.affected_routes) ? thread.latestAlert.affected_routes : [];
      const allRoutes = [...new Set([...threadRoutes, ...alertRoutes])];
      
      return allRoutes.some(r => 
        r.toLowerCase() === routeId.toLowerCase() ||
        r.includes(routeId) ||
        routeId.includes(r)
      );
    });
  });
  
  let activeDialog = $state<string | null>(null);
  let showToast = $state(false);
  let toastMessage = $state('');
  
  onMount(async () => {
    // Ensure alerts are loaded
    await fetchAlerts();
  });
  
  async function toggleSaveRoute() {
    if (isSaved) {
      // Remove route
      await savedRoutes.remove(routeId);
      showToastMessage(`${routeId} removed from My Routes`);
    } else {
      // Add route - determine type from routeId
      let type: 'bus' | 'streetcar' | 'subway' = 'bus';
      if (routeId.startsWith('Line')) {
        type = 'subway';
      } else if (['501', '503', '504', '505', '506', '507', '508', '509', '510', '511', '512'].includes(routeId)) {
        type = 'streetcar';
      }
      
      await savedRoutes.add({
        id: routeId,
        name: `${routeId}${routeName ? ` ${routeName}` : ''}`,
        type
      });
      showToastMessage(`${routeId} added to My Routes`);
    }
  }
  
  function showToastMessage(message: string) {
    toastMessage = message;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, 3000);
  }
  
  function handleBack() {
    goto('/routes');
  }
  
  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }
  
  async function handleSignOut() {
    await signOut();
  }
</script>

<svelte:head>
  <title>{routeId} {routeName ? `- ${routeName}` : ''} - TTC Alerts</title>
  <meta name="description" content="Service alerts for TTC route {routeId} {routeName}" />
</svelte:head>

<Header 
  isAuthenticated={$isAuthenticated}
  username={$userName || ''}
  onOpenDialog={handleOpenDialog}
  onSignOut={handleSignOut}
/>

<main class="content-area">
  <!-- Back Button -->
  <Button
    variant="ghost"
    size="sm"
    class="mb-4 -ml-2 text-muted-foreground"
    onclick={handleBack}
  >
    <ArrowLeft class="h-4 w-4 mr-1" />
    Back to Routes
  </Button>
  
  <!-- Route Header -->
  <div class="route-header">
    <div class="route-header-info">
      <RouteBadge route={routeId} size="xl" />
      <div class="route-header-text">
        <h1 class="route-title">{routeId}</h1>
        {#if routeName}
          <p class="route-name">{routeName}</p>
        {/if}
      </div>
    </div>
    
    <Button
      variant={isSaved ? 'default' : 'outline'}
      size="sm"
      onclick={toggleSaveRoute}
      class={isSaved ? 'bg-primary' : ''}
    >
      {#if isSaved}
        <BookmarkCheck class="h-4 w-4 mr-2" />
        Saved
      {:else}
        <Bookmark class="h-4 w-4 mr-2" />
        Save Route
      {/if}
    </Button>
  </div>
  
  <!-- Active Alerts Section -->
  <section class="mt-6">
    <h2 class="section-title">
      <Bell class="h-4 w-4" />
      Active Alerts
    </h2>
    
    <div class="space-y-3 mt-3">
      {#if $isLoading}
        {#each Array(2) as _}
          <div class="alert-card" aria-hidden="true">
            <div class="alert-card-content">
              <div class="alert-card-header">
                <div class="alert-card-badges">
                  <Skeleton class="h-6 w-16 rounded-md" />
                  <Skeleton class="h-5 w-20 rounded-full" />
                </div>
                <Skeleton class="h-4 w-16" />
              </div>
              <Skeleton class="h-4 w-full mt-3" />
              <Skeleton class="h-4 w-3/4 mt-2" />
            </div>
          </div>
        {/each}
      {:else if routeAlerts().length === 0}
        <div class="no-alerts">
          <div class="no-alerts-icon">
            <CheckCircle class="h-6 w-6" />
          </div>
          <p class="no-alerts-title">No active alerts</p>
          <p class="no-alerts-description">
            Service is running normally on {routeId}
          </p>
        </div>
      {:else}
        {#each routeAlerts() as thread (thread.thread_id)}
          <AlertCard {thread} />
        {/each}
      {/if}
    </div>
  </section>
</main>

<!-- Toast Notification -->
{#if showToast}
  <div class="toast" role="alert">
    <CheckCircle class="h-4 w-4 text-green-500" />
    <span>{toastMessage}</span>
  </div>
{/if}

<!-- Dialogs -->
<HowToUseDialog 
  open={activeDialog === 'how-to-use'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }} 
/>

<InstallPWADialog 
  open={activeDialog === 'install-pwa'} 
  onOpenChange={(open) => { if (!open) activeDialog = null; }} 
/>

<style>
  .route-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: hsl(var(--card));
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
  }
  
  .route-header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .route-header-text {
    display: flex;
    flex-direction: column;
  }
  
  .route-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    line-height: 1.2;
  }
  
  .route-name {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.125rem;
  }
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }
  
  .no-alerts {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2.5rem 1.5rem;
    background-color: hsl(var(--muted) / 0.3);
    border-radius: var(--radius);
    border: 1px dashed hsl(var(--border));
  }
  
  .no-alerts-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background-color: hsl(142 76% 36% / 0.1);
    color: hsl(142 76% 36%);
    margin-bottom: 0.75rem;
  }
  
  .no-alerts-title {
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.25rem;
  }
  
  .no-alerts-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }
  
  /* Toast */
  .toast {
    position: fixed;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    box-shadow: 0 4px 12px hsl(var(--foreground) / 0.15);
    font-size: 0.875rem;
    color: hsl(var(--foreground));
    z-index: 100;
    animation: toast-slide-up 0.3s ease-out;
  }
  
  @keyframes toast-slide-up {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  /* Mobile: stack header vertically */
  @media (max-width: 400px) {
    .route-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>
