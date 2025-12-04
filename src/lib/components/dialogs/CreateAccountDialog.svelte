<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Fingerprint, Loader2, ArrowLeft } from 'lucide-svelte';
  
  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onBack?: () => void;
  }
  
  let { open = $bindable(false), onOpenChange, onBack }: Props = $props();
  let displayName = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let step = $state<'name' | 'passkey'>('name');
  
  async function handleCreatePasskey() {
    if (!displayName.trim()) {
      error = 'Please enter a display name';
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      // TODO: Implement WebAuthn registration
      // const options = await fetch('/api/auth/webauthn/register/options', {
      //   method: 'POST',
      //   body: JSON.stringify({ displayName })
      // }).then(r => r.json());
      // const credential = await startRegistration(options);
      // const result = await fetch('/api/auth/webauthn/register/verify', {...});
      
      await new Promise(r => setTimeout(r, 1000));
      error = 'WebAuthn registration not yet implemented';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Registration failed';
    } finally {
      isLoading = false;
    }
  }
  
  function goBack() {
    if (step === 'passkey') {
      step = 'name';
    } else {
      open = false;
      onBack?.();
    }
  }
  
  function proceedToPasskey() {
    if (!displayName.trim()) {
      error = 'Please enter a display name';
      return;
    }
    error = null;
    step = 'passkey';
  }
</script>

<Dialog.Root bind:open onOpenChange={(v) => { onOpenChange?.(v); if (!v) step = 'name'; }}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon" class="h-8 w-8" onclick={goBack}>
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <Dialog.Title class="text-xl">Create Account</Dialog.Title>
          <Dialog.Description>
            {step === 'name' ? 'Choose a display name' : 'Set up your passkey'}
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>
    
    <div class="space-y-4 py-4">
      {#if error}
        <div class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      {/if}
      
      {#if step === 'name'}
        <div class="space-y-2">
          <Label for="displayName">Display Name</Label>
          <Input 
            id="displayName"
            bind:value={displayName}
            placeholder="e.g., John's iPhone"
            class="h-12"
          />
          <p class="text-xs text-muted-foreground">
            This helps you identify this device when managing your passkeys.
          </p>
        </div>
        
        <Button onclick={proceedToPasskey} class="w-full h-12">
          Continue
        </Button>
      {:else}
        <div class="text-center space-y-4">
          <div class="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Fingerprint class="h-8 w-8 text-primary" />
          </div>
          
          <div>
            <p class="font-medium">Ready to create your passkey</p>
            <p class="text-sm text-muted-foreground">
              You'll be prompted to use Face ID, Touch ID, or your device PIN.
            </p>
          </div>
          
          <Button 
            onclick={handleCreatePasskey} 
            class="w-full h-12" 
            disabled={isLoading}
          >
            {#if isLoading}
              <Loader2 class="h-5 w-5 mr-2 animate-spin" />
              Creating Passkey...
            {:else}
              <Fingerprint class="h-5 w-5 mr-2" />
              Create Passkey
            {/if}
          </Button>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
