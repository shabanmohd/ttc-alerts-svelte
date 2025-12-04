<script lang="ts">
  import { RefreshCw, Sun, Moon, User, Menu, HelpCircle, LogOut, ChevronDown, Settings } from 'lucide-svelte';
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

<header class="sticky top-0 z-50 w-full border-b border-border bg-background backdrop-blur relative">
  <div class="header-container">
    <!-- Logo (mobile only) -->
    <a href="/" class="header-left">
      <span class="text-xl">🚇</span>
      <span class="font-semibold">TTC Alerts</span>
    </a>
    
    <!-- Right side actions -->
    <div class="header-right">
      <!-- Last updated + Refresh -->
      <div class="flex items-center gap-1 text-xs text-muted-foreground">
        {#if $lastUpdated}
          <span id="last-updated">Updated {formatLastUpdated($lastUpdated)}</span>
        {/if}
        <button 
          class="p-1.5 rounded-md hover:bg-accent transition-colors {$hasUpdates ? 'refresh-pulse' : ''}"
          onclick={handleRefresh}
          title="Refresh"
          aria-label="Refresh alerts"
          disabled={isRefreshing}
        >
          <RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" aria-hidden="true" />
        </button>
      </div>
      
      <!-- Help button (tablet only - hidden on mobile and desktop) -->
      <button 
        class="max-sm:hidden lg:hidden flex p-2 rounded-md hover:bg-accent transition-colors"
        onclick={() => onOpenDialog?.('how-to-use')}
        title="How to Use"
        aria-label="How to use this app"
      >
        <HelpCircle class="w-5 h-5" aria-hidden="true" />
      </button>
      
      <!-- Theme toggle (tablet only - hidden on mobile and desktop) -->
      <button 
        class="max-sm:hidden lg:hidden flex p-2 rounded-md hover:bg-accent transition-colors"
        onclick={toggleTheme}
        title="Toggle theme"
        aria-label="Toggle light or dark mode"
      >
        {#if isDark}
          <Sun class="w-5 h-5" aria-hidden="true" />
        {:else}
          <Moon class="w-5 h-5" aria-hidden="true" />
        {/if}
      </button>
      
      <!-- Sign In / User Menu (desktop) -->
      {#if isAuthenticated}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild let:builder>
            <button 
              use:builder.action
              {...builder}
              class="max-sm:hidden lg:hidden inline-flex items-center gap-2 h-9 px-3 py-2 rounded-md hover:bg-accent transition-colors"
            >
              <div class="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span class="text-xs font-semibold text-primary-foreground">{getUserInitial(username)}</span>
              </div>
              <span class="text-sm font-medium max-w-[100px] truncate">{username}</span>
              <ChevronDown class="w-4 h-4" aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-48">
            <div class="px-3 py-2 border-b border-border">
              <p class="text-sm font-medium">{username}</p>
              <p class="text-xs text-muted-foreground">Signed in</p>
            </div>
            <DropdownMenu.Item href="/preferences">
              <Settings class="w-4 h-4 mr-2" aria-hidden="true" />
              Preferences
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={onSignOut} class="text-destructive">
              <LogOut class="w-4 h-4 mr-2" aria-hidden="true" />
              Sign Out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        <button
          class="max-sm:hidden lg:hidden inline-flex items-center justify-center h-9 px-4 py-2 rounded-md border border-border bg-transparent text-sm font-medium hover:bg-accent transition-colors gap-2"
          onclick={onSignIn}
        >
          <User class="w-4 h-4" aria-hidden="true" />
          <span>Sign In</span>
        </button>
      {/if}
      
      <!-- Mobile Menu Button -->
      <button 
        class="hidden max-sm:flex p-2 rounded-md hover:bg-accent transition-colors"
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
        title="Menu"
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
      >
        <Menu class="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  </div>
  
  <!-- Mobile Menu Dropdown (overlay) -->
  {#if mobileMenuOpen}
    <!-- Backdrop to close menu when clicking outside -->
    <button 
      class="sm:hidden fixed inset-0 z-40 bg-black/50" 
      onclick={() => mobileMenuOpen = false}
      aria-label="Close menu"
    ></button>
    <div class="sm:hidden absolute left-0 right-0 top-full border-t border-border shadow-lg z-50" style="background-color: hsl(var(--card));">
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
            <User class="w-5 h-5" aria-hidden="true" />
            <span class="text-sm font-medium">Sign In</span>
          </button>
        {/if}
        
        <button
          onclick={() => { mobileMenuOpen = false; onOpenDialog?.('how-to-use'); }}
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
        >
          <HelpCircle class="w-5 h-5" aria-hidden="true" />
          <span class="text-sm">How to Use</span>
        </button>
        
        <button
          onclick={() => { mobileMenuOpen = false; toggleTheme(); }}
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
        >
          {#if isDark}
            <Sun class="w-5 h-5" aria-hidden="true" />
            <span class="text-sm">Light Mode</span>
          {:else}
            <Moon class="w-5 h-5" aria-hidden="true" />
            <span class="text-sm">Dark Mode</span>
          {/if}
        </button>
        
        {#if isAuthenticated}
          <a
            href="/preferences"
            onclick={() => mobileMenuOpen = false}
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
          >
            <Settings class="w-5 h-5" aria-hidden="true" />
            <span class="text-sm">Preferences</span>
          </a>
          <button
            onclick={() => { mobileMenuOpen = false; onSignOut?.(); }}
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left text-destructive"
          >
            <LogOut class="w-5 h-5" aria-hidden="true" />
            <span class="text-sm">Sign Out</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}
</header>
