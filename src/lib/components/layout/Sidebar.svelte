<script lang="ts">
  import { Bell, Star, Settings, HelpCircle, Bug, Lightbulb, Info, Sun, Moon, User, LogOut } from 'lucide-svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { Button } from '$lib/components/ui/button';
  import { page } from '$app/stores';
  import { isAuthenticated, userName, userInitial, signOut } from '$lib/stores/auth';
  
  let { onOpenDialog }: { onOpenDialog?: (dialog: string) => void } = $props();
  
  let isDark = $state(false);
  
  $effect(() => {
    isDark = document.documentElement.classList.contains('dark');
  });
  
  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
  
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
    <!-- User Section -->
    {#if $isAuthenticated}
      <div class="px-3 py-2 mb-2">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
            <span class="text-sm font-semibold text-[hsl(var(--primary-foreground))]">{$userInitial}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{$userName}</p>
            <p class="text-xs text-muted-foreground">Signed in</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          class="w-full mt-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onclick={handleSignOut}
        >
          <LogOut class="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <Separator class="my-2" />
    {:else}
      <div class="px-3 py-2 mb-2">
        <Button 
          variant="outline" 
          class="w-full justify-start"
          onclick={() => handleDialog('sign-in')}
        >
          <User class="w-4 h-4 mr-2" />
          Sign In
        </Button>
        <p class="text-xs text-muted-foreground mt-2 px-1">
          Sign in to sync preferences across devices
        </p>
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
    
    <Separator class="my-2" />
    
    <button 
      onclick={toggleTheme}
      class="sidebar-nav-item w-full"
    >
      {#if isDark}
        <Sun class="w-5 h-5" />
        <span>Light Mode</span>
      {:else}
        <Moon class="w-5 h-5" />
        <span>Dark Mode</span>
      {/if}
    </button>
  </div>
</aside>
