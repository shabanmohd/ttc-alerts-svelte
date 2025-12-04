<script lang="ts">
  import { Bell, Star, Settings, HelpCircle, Bug, Lightbulb, Info, LogOut } from 'lucide-svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { Button } from '$lib/components/ui/button';
  import { page } from '$app/stores';
  import { isAuthenticated, userName, userInitial, signOut } from '$lib/stores/auth';
  
  let { onOpenDialog }: { onOpenDialog?: (dialog: string) => void } = $props();
  
  function handleDialog(dialog: string) {
    onOpenDialog?.(dialog);
  }
  
  async function handleSignOut() {
    await signOut();
  }
  
  function isNavActive(href: string, tab: string | null): boolean {
    const currentPath = $page.url.pathname;
    const currentTab = $page.url.searchParams.get('tab');
    
    if (href === '/preferences') {
      return currentPath === '/preferences';
    }
    if (tab === 'my') {
      return currentPath === '/' && currentTab === 'my';
    }
    return currentPath === '/' && !currentTab;
  }
</script>

<aside class="sidebar">
  <a href="/" class="sidebar-header">
    <span class="sidebar-logo">🚇</span>
    <span class="sidebar-title">TTC Alerts</span>
  </a>
  
  <nav class="sidebar-nav">
    <a 
      href="/"
      class="sidebar-nav-item {isNavActive('/', null) ? 'active' : ''}"
    >
      <Bell />
      <span>All Alerts</span>
    </a>
    <a 
      href="/?tab=my"
      class="sidebar-nav-item {isNavActive('/', 'my') ? 'active' : ''}"
    >
      <Star />
      <span>My Alerts</span>
    </a>
    <a 
      href="/preferences"
      class="sidebar-nav-item {isNavActive('/preferences', null) ? 'active' : ''}"
    >
      <Settings />
      <span>Preferences</span>
    </a>
  </nav>
  
  <div class="sidebar-footer">
    <!-- User Section (only show when authenticated) -->
    {#if $isAuthenticated}
      <div class="px-3 py-2 mb-2">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span class="text-sm font-bold text-primary-foreground">{$userInitial}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate">{$userName}</p>
            <p class="text-xs text-muted-foreground font-normal">Signed in</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          class="w-full mt-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onclick={handleSignOut}
        >
          <LogOut class="w-4 h-4 mr-2" aria-hidden="true" />
          Sign Out
        </Button>
      </div>
      <Separator class="my-2" />
    {/if}
    
    <!-- Help & Info Links -->
    <div class="sidebar-footer-links">
      <button 
        onclick={() => handleDialog('how-to-use')}
        class="sidebar-footer-link"
        title="How to Use"
      >
        <HelpCircle class="w-4 h-4" />
        <span>How to Use</span>
      </button>
      <button 
        onclick={() => handleDialog('report-bug')}
        class="sidebar-footer-link"
        title="Report a Bug"
      >
        <Bug class="w-4 h-4" />
        <span>Report Bug</span>
      </button>
      <button 
        onclick={() => handleDialog('feature-request')}
        class="sidebar-footer-link"
        title="Feature Request"
      >
        <Lightbulb class="w-4 h-4" />
        <span>Feature Request</span>
      </button>
      <button 
        onclick={() => handleDialog('about')}
        class="sidebar-footer-link"
        title="About"
      >
        <Info class="w-4 h-4" />
        <span>About</span>
      </button>
    </div>
  </div>
</aside>
