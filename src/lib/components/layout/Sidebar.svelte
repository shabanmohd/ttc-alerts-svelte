<script lang="ts">
  import { Bell, Star, Settings, HelpCircle, Bug, Lightbulb, Info, Sun, Moon } from 'lucide-svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { page } from '$app/stores';
  
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
  
  const navItems = [
    { href: '/', icon: Bell, label: 'All Alerts' },
    { href: '/?tab=my', icon: Star, label: 'My Alerts' },
    { href: '/preferences', icon: Settings, label: 'Preferences' }
  ];
  
  const footerLinks = [
    { id: 'how-to-use', icon: HelpCircle, label: 'How to Use' },
    { id: 'report-bug', icon: Bug, label: 'Report Bug' },
    { id: 'feature-request', icon: Lightbulb, label: 'Feature Request' },
    { id: 'about', icon: Info, label: 'About' }
  ];
</script>

<aside class="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-40">
  <!-- Header -->
  <a href="/" class="flex items-center gap-3 px-6 h-14 border-b border-border">
    <span class="text-2xl">🚇</span>
    <span class="text-lg font-semibold">TTC Alerts</span>
  </a>
  
  <!-- Navigation -->
  <nav class="flex-1 py-4 px-3 flex flex-col gap-1">
    {#each navItems as item}
      {@const isActive = $page.url.pathname === item.href || 
        (item.href === '/?tab=my' && $page.url.searchParams.get('tab') === 'my') ||
        (item.href === '/' && $page.url.pathname === '/' && !$page.url.searchParams.get('tab'))}
      <a 
        href={item.href}
        class="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors
               {isActive 
                 ? 'bg-accent text-foreground' 
                 : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
      >
        <item.icon class="w-5 h-5 shrink-0" />
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>
  
  <!-- Footer -->
  <div class="p-3 border-t border-border">
    <div class="flex flex-col gap-1">
      {#each footerLinks as link}
        <button 
          onclick={() => handleDialog(link.id)}
          class="flex items-center gap-3 px-3 py-2 text-[13px] text-muted-foreground rounded-md
                 hover:bg-accent hover:text-foreground transition-colors w-full text-left"
        >
          <link.icon class="w-4 h-4 shrink-0 opacity-70" />
          <span>{link.label}</span>
        </button>
      {/each}
    </div>
    
    <Separator class="my-2" />
    
    <button 
      onclick={toggleTheme}
      class="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium w-full
             text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {#if isDark}
        <Sun class="w-5 h-5 shrink-0" />
        <span>Light Mode</span>
      {:else}
        <Moon class="w-5 h-5 shrink-0" />
        <span>Dark Mode</span>
      {/if}
    </button>
  </div>
</aside>
