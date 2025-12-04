<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Fingerprint, Copy, Check, AlertTriangle, Mail, Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { signInWithGoogle, signInWithMagicLink } from '$lib/stores/auth';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();
  
  let activeTab = $state('oauth');
  let email = $state('');
  let isLoading = $state(false);
  let magicLinkSent = $state(false);

  async function handleGoogleSignIn() {
    isLoading = true;
    const { error } = await signInWithGoogle();
    isLoading = false;
    
    if (error) {
      toast.error(error.message);
    }
    // OAuth will redirect, so no need to close dialog
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    
    isLoading = true;
    const { error } = await signInWithMagicLink(email);
    isLoading = false;
    
    if (error) {
      toast.error(error.message);
    } else {
      magicLinkSent = true;
      toast.success('Check your email for the sign-in link!');
    }
  }

  function handleClose() {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      email = '';
      magicLinkSent = false;
      activeTab = 'oauth';
    }, 300);
  }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Create Account</Dialog.Title>
      <Dialog.Description>
        Create an account to save your preferences and access them on any device.
      </Dialog.Description>
    </Dialog.Header>

    <Tabs.Root bind:value={activeTab} class="mt-4">
      <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="oauth">Quick Sign Up</Tabs.Trigger>
        <Tabs.Trigger value="email">Email</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="oauth" class="space-y-4 pt-4">
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Sign up instantly with your Google account. No password needed.
        </p>
        
        <Button 
          variant="outline" 
          class="w-full gap-2" 
          onclick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {#if isLoading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <svg class="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          {/if}
          Continue with Google
        </Button>
      </Tabs.Content>

      <Tabs.Content value="email" class="space-y-4 pt-4">
        {#if magicLinkSent}
          <div class="flex flex-col items-center py-4 text-center">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
              <Mail class="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <h3 class="font-medium">Check your email</h3>
            <p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              We sent a sign-in link to <strong>{email}</strong>
            </p>
            <Button variant="ghost" class="mt-4" onclick={() => { magicLinkSent = false; }}>
              Use a different email
            </Button>
          </div>
        {:else}
          <p class="text-sm text-[hsl(var(--muted-foreground))]">
            Enter your email to receive a magic sign-in link. No password needed.
          </p>
          
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="you@example.com"
              bind:value={email}
              disabled={isLoading}
            />
          </div>
          
          <Button 
            class="w-full gap-2" 
            onclick={handleMagicLink}
            disabled={isLoading || !email}
          >
            {#if isLoading}
              <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
              <Mail class="h-4 w-4" />
            {/if}
            Send Magic Link
          </Button>
        {/if}
      </Tabs.Content>
    </Tabs.Root>

    <div class="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
      By creating an account, you agree to our Terms of Service and Privacy Policy.
    </div>
  </Dialog.Content>
</Dialog.Root>
