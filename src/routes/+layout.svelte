<script lang="ts">
  import '../routes/layout.css';
  import '$lib/styles/ttc-theme.css';
  import { Toaster } from '$lib/components/ui/sonner';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
  import { onMount } from 'svelte';
  
  let { children } = $props();
  
  let activeDialog = $state<string | null>(null);
  
  function handleOpenDialog(dialog: string) {
    activeDialog = dialog;
  }
  
  function handleCloseDialog() {
    activeDialog = null;
  }
  
  // Initialize theme from localStorage
  onMount(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="flex min-h-screen font-sans">
  <Sidebar onOpenDialog={handleOpenDialog} />
  
  <div class="flex-1 lg:ml-64 flex flex-col min-h-screen pb-20 lg:pb-0">
    {@render children()}
  </div>
  
  <MobileBottomNav />
</div>

<Toaster />
