<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  
  let error = $state<string | null>(null);
  let loading = $state(true);
  
  onMount(async () => {
    try {
      // Handle the OAuth callback
      const { data, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        error = authError.message;
        return;
      }
      
      if (data.session) {
        // Successfully authenticated, redirect to home
        goto('/');
      } else {
        // No session, check for error in URL
        const params = new URLSearchParams(window.location.hash.slice(1));
        const errorDescription = params.get('error_description');
        
        if (errorDescription) {
          error = errorDescription;
        } else {
          // No error, just redirect
          goto('/');
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Authentication failed';
    } finally {
      loading = false;
    }
  });
</script>

<div class="flex min-h-screen items-center justify-center">
  <div class="text-center">
    {#if loading}
      <div class="flex flex-col items-center gap-4">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p class="text-muted-foreground">Completing sign in...</p>
      </div>
    {:else if error}
      <div class="flex flex-col items-center gap-4">
        <div class="rounded-full bg-destructive/10 p-3">
          <svg class="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p class="font-medium text-destructive">Authentication Failed</p>
          <p class="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <a href="/" class="text-primary hover:underline text-sm">Return to home</a>
      </div>
    {/if}
  </div>
</div>
