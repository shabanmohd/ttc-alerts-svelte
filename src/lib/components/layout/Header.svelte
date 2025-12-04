<script lang="ts">
  import { RefreshCw, Sun, Moon, User, Menu, HelpCircle, LogOut, ChevronDown } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { hasUpdates, updateCount, lastUpdated, applyPendingUpdates, fetchAlerts } from '$lib/stores/alerts';
  
  let { 
    isAuthenticated = false,
    username = '',
    onOpenDialog,
    onSignIn,
    onSignOut
  }: {
    isAuthenticated?: boolean;
    username?: string;
    onOpenDialog?: (dialog: string) => void;
    onSignIn?: () => void;
    onSignOut?: () => void;
  } = $props();
  
  let isDark = $state(false);
  let isRefreshing = $state(false);
  let mobileMenuOpen = $state(false);
  
  // Derived classes to avoid quoted attribute warning
  const refreshButtonClass = $derived($hasUpdates ? 'refresh-pulse text-primary' : '');
  const refreshIconClass = $derived(`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`);
  
  $effect(() => {
    isDark = document.documentElement.classList.contains('dark');
  });
  
  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
  
  async function handleRefresh() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    
    if ($hasUpdates) {
      applyPendingUpdates();
    } else {
      await fetchAlerts();
    }
    
    isRefreshing = false;
  }
  
  function formatLastUpdated(date: Date | null): string {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }
  
  function getUserInitial(name: string): string {
    return name.charAt(0).toUpperCase() || 'U';
  }
</script>

<header class="sticky top-0 z-50 w-full border-b border-border bg-background backdrop-blur">
  <div class="flex h-14 items-center justify-between px-4">
    <!-- Logo (mobile only) -->
    <a href="/" class="lg:hidden flex items-center gap-2">
      <span class="text-xl">🚇</span>
      <span class="font-semibold">TTC Alerts</span>
    </a>
    
    <!-- Desktop: spacer to push right content -->
    <div class="hidden lg:block"></div>
    
    <!-- Right side actions -->
    <div class="flex items-center gap-2">
      <!-- Last updated + Refresh -->
      <div class="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
        {#if $lastUpdated}
          <span>{formatLastUpdated($lastUpdated)}</span>
        {/if}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onclick={handleRefresh}
        class={refreshButtonClass}
        disabled={isRefreshing}
      >
        <RefreshCw class={refreshIconClass} />
        {#if $hasUpdates && $updateCount > 0}
          <span class="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            {$updateCount}
          </span>
        {/if}
      </Button>
      
      <!-- Help button (desktop) -->
      <Button
        variant="ghost"
        size="icon"
        class="hidden sm:flex"
        onclick={() => onOpenDialog?.('how-to-use')}
      >
        <HelpCircle class="h-5 w-5" />
      </Button>
      
      <!-- Theme toggle (desktop) -->
      <Button
        variant="ghost"
        size="icon"
        class="hidden sm:flex"
        onclick={toggleTheme}
      >
        {#if isDark}
          <Sun class="h-5 w-5" />
        {:else}
          <Moon class="h-5 w-5" />
        {/if}
      </Button>
      
      <!-- Sign In / User Menu (desktop) -->
      {#if isAuthenticated}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild let:builder>
            <Button builders={[builder]} variant="ghost" class="hidden sm:flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span class="text-xs font-semibold text-primary-foreground">{getUserInitial(username)}</span>
              </div>
              <span class="text-sm font-medium max-w-[100px] truncate">{username}</span>
              <ChevronDown class="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-48">
            <DropdownMenu.Label>
              <p class="font-medium">{username}</p>
              <p class="text-xs text-muted-foreground">Signed in</p>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={onSignOut} class="text-destructive">
              <LogOut class="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        <Button
          variant="outline"
          class="hidden sm:flex gap-2"
          onclick={onSignIn}
        >
          <User class="h-4 w-4" />
          Sign In
        </Button>
      {/if}
      
      <!-- Mobile menu button -->
      <Button
        variant="ghost"
        size="icon"
        class="sm:hidden"
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
      >
        <Menu class="h-5 w-5" />
      </Button>
    </div>
  </div>
  
  <!-- Mobile menu dropdown -->
  {#if mobileMenuOpen}
    <div class="sm:hidden absolute left-0 right-0 top-full border-t border-border bg-background shadow-lg z-50">
      <div class="px-4 py-3 space-y-1">
        {#if isAuthenticated}
          <div class="flex items-center gap-3 px-3 py-2.5 border-b border-border mb-2">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span class="text-sm font-semibold text-primary-foreground">{getUserInitial(username)}</span>
            </div>
            <div>
              <p class="text-sm font-medium">{username}</p>
              <p class="text-xs text-muted-foreground">Signed in</p>
            </div>
          </div>
        {:else}
          <button
            onclick={() => { mobileMenuOpen = false; onSignIn?.(); }}
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
          >
            <User class="h-5 w-5" />
            <span class="text-sm font-medium">Sign In</span>
          </button>
        {/if}
        
        <button
          onclick={() => { mobileMenuOpen = false; onOpenDialog?.('how-to-use'); }}
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
        >
          <HelpCircle class="h-5 w-5" />
          <span class="text-sm">How to Use</span>
        </button>
        
        <button
          onclick={() => { mobileMenuOpen = false; toggleTheme(); }}
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
        >
          {#if isDark}
            <Sun class="h-5 w-5" />
            <span class="text-sm">Light Mode</span>
          {:else}
            <Moon class="h-5 w-5" />
            <span class="text-sm">Dark Mode</span>
          {/if}
        </button>
        
        {#if isAuthenticated}
          <button
            onclick={() => { mobileMenuOpen = false; onSignOut?.(); }}
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left text-destructive"
          >
            <LogOut class="h-5 w-5" />
            <span class="text-sm">Sign Out</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}
</header>
