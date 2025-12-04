<script lang="ts">
  import { Bell, Star, Settings } from 'lucide-svelte';
  import { page } from '$app/stores';
  
  const navItems = [
    { href: '/', icon: Bell, label: 'All Alerts', tab: null },
    { href: '/?tab=my', icon: Star, label: 'My Alerts', tab: 'my' },
    { href: '/preferences', icon: Settings, label: 'Preferences', tab: null }
  ];
  
  function isActive(item: typeof navItems[0]): boolean {
    const currentPath = $page.url.pathname;
    const currentTab = $page.url.searchParams.get('tab');
    
    if (item.href === '/preferences') {
      return currentPath === '/preferences';
    }
    if (item.tab === 'my') {
      return currentPath === '/' && currentTab === 'my';
    }
    return currentPath === '/' && !currentTab;
  }
</script>

<nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border
            flex justify-around items-center py-2 z-50 mobile-bottom-nav">
  {#each navItems as item}
    {@const active = isActive(item)}
    <a 
      href={item.href}
      class="nav-item flex flex-col items-center justify-center py-2 px-4 gap-1 flex-1 relative
             rounded-lg transition-all duration-200
             {active ? 'active' : 'text-muted-foreground'}"
    >
      <item.icon class="w-[22px] h-[22px] {active ? 'stroke-[2.5]' : 'stroke-2'}" />
      <span class="text-[0.7rem] {active ? 'font-semibold' : 'font-medium'}">{item.label}</span>
    </a>
  {/each}
</nav>
