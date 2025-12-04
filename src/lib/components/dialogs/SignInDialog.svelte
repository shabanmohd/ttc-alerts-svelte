<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Fingerprint, KeyRound, Loader2 } from 'lucide-svelte';
  
  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCreateAccount?: () => void;
  }
  
  let { open = $bindable(false), onOpenChange, onCreateAccount }: Props = $props();
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  async function handlePasskeySignIn() {
    isLoading = true;
    error = null;
    
    try {
      // TODO: Implement WebAuthn authentication
      // const options = await fetch('/api/auth/webauthn/authenticate/options').then(r => r.json());
      // const credential = await startAuthentication(options);
      // const result = await fetch('/api/auth/webauthn/authenticate/verify', {...});
      
      // For now, simulate
      await new Promise(r => setTimeout(r, 1000));
      error = 'WebAuthn not yet implemented';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Authentication failed';
    } finally {
      isLoading = false;
    }
  }
  
  function switchToCreateAccount() {
    open = false;
    onCreateAccount?.();
  }
</script>

<Dialog.Root bind:open onOpenChange={(v) => onOpenChange?.(v)}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title class="text-xl">Sign In</Dialog.Title>
      <Dialog.Description>
        Sign in to sync your preferences across devices
      </Dialog.Description>
    </Dialog.Header>
    
    <div class="space-y-4 py-4">
      {#if error}
        <div class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      {/if}
      
      <Button 
        onclick={handlePasskeySignIn} 
        class="w-full h-12" 
        disabled={isLoading}
      >
        {#if isLoading}
          <Loader2 class="h-5 w-5 mr-2 animate-spin" />
          Authenticating...
        {:else}
          <Fingerprint class="h-5 w-5 mr-2" />
          Sign in with Passkey
        {/if}
      </Button>
      
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      
      <Button variant="outline" onclick={switchToCreateAccount} class="w-full">
        <KeyRound class="h-4 w-4 mr-2" />
        Create New Account
      </Button>
    </div>
    
    <p class="text-xs text-muted-foreground text-center">
      Passkeys use your device's biometric authentication (Face ID, Touch ID, or fingerprint) for secure, passwordless sign-in.
    </p>
  </Dialog.Content>
</Dialog.Root>
