<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Loader2, Fingerprint, KeyRound, AlertCircle, ArrowLeft } from 'lucide-svelte';
  import { signIn, recover, authError, clearAuthError, biometricsAvailable } from '$lib/stores/auth';
  import { getUsernameError } from '$lib/services/webauthn';
  
  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCreateAccount?: () => void;
  }
  
  let { open = $bindable(false), onOpenChange, onCreateAccount }: Props = $props();
  
  // Form state
  let username = $state('');
  let recoveryCode = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  // UI state
  type Step = 'username' | 'biometric' | 'recovery';
  let step = $state<Step>('username');
  
  // Validation
  let usernameError = $derived(username.trim() ? getUsernameError(username) : null);
  let isUsernameValid = $derived(!usernameError && username.trim().length >= 3);
  
  async function handleContinue() {
    if (!isUsernameValid) return;
    
    error = null;
    step = 'biometric';
    
    // Automatically start biometric auth
    await handleBiometricAuth();
  }
  
  async function handleBiometricAuth() {
    if (isLoading) return;
    
    isLoading = true;
    error = null;
    
    try {
      const result = await signIn(username.trim());
      
      if (result.success) {
        // Success - close dialog
        handleOpenChange(false);
      } else {
        error = result.error || 'Authentication failed';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Authentication failed';
    } finally {
      isLoading = false;
    }
  }
  
  async function handleRecovery() {
    if (!recoveryCode.trim()) return;
    
    isLoading = true;
    error = null;
    
    try {
      const result = await recover(username.trim(), recoveryCode.trim());
      
      if (result.success) {
        // Success - close dialog
        handleOpenChange(false);
        
        // Notify about remaining codes if low
        if (result.remainingCodes !== undefined && result.remainingCodes <= 2) {
          // Could show a toast here about low recovery codes
          console.warn(`Only ${result.remainingCodes} recovery codes remaining`);
        }
      } else {
        error = result.error || 'Invalid recovery code';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Recovery failed';
    } finally {
      isLoading = false;
    }
  }
  
  function handleOpenChange(value: boolean) {
    onOpenChange?.(value);
    if (!value) {
      // Reset state when dialog closes
      username = '';
      recoveryCode = '';
      error = null;
      step = 'username';
      clearAuthError();
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (step === 'username' && isUsernameValid) {
        handleContinue();
      } else if (step === 'recovery' && recoveryCode.trim()) {
        handleRecovery();
      }
    }
  }
  
  function switchToCreateAccount() {
    handleOpenChange(false);
    onCreateAccount?.();
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title class="text-xl">
        {#if step === 'username'}
          Sign In
        {:else if step === 'biometric'}
          Verify Your Identity
        {:else}
          Account Recovery
        {/if}
      </Dialog.Title>
      <Dialog.Description>
        {#if step === 'username'}
          Sign in to access your saved preferences
        {:else if step === 'biometric'}
          Use Face ID, Touch ID, or fingerprint to sign in
        {:else}
          Enter one of your recovery codes
        {/if}
      </Dialog.Description>
    </Dialog.Header>
    
    <div class="space-y-4 py-4">
      <!-- Error display -->
      {#if error || $authError}
        <div class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
          <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error || $authError}</span>
        </div>
      {/if}
      
      <!-- Step: Username -->
      {#if step === 'username'}
        <div class="space-y-3">
          <div class="space-y-2">
            <Label for="username">Username</Label>
            <Input 
              id="username"
              type="text"
              bind:value={username}
              placeholder="your_username"
              class="h-12"
              disabled={isLoading}
              onkeydown={handleKeydown}
              autocomplete="username"
              autocapitalize="none"
            />
            {#if usernameError}
              <p class="text-xs text-destructive">{usernameError}</p>
            {/if}
          </div>
          
          <Button 
            onclick={handleContinue} 
            class="w-full h-12" 
            disabled={!isUsernameValid || isLoading}
          >
            {#if isLoading}
              <Loader2 class="h-5 w-5 mr-2 animate-spin" />
              Loading...
            {:else}
              <Fingerprint class="h-5 w-5 mr-2" />
              Continue with Biometrics
            {/if}
          </Button>
        </div>
        
        <div class="text-center pt-2">
          <button 
            type="button"
            class="text-sm text-muted-foreground hover:text-foreground"
            onclick={switchToCreateAccount}
          >
            Don't have an account? <span class="text-primary font-medium">Create one</span>
          </button>
        </div>
      
      <!-- Step: Biometric -->
      {:else if step === 'biometric'}
        <div class="text-center space-y-4 py-4">
          {#if isLoading}
            <div class="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Fingerprint class="h-10 w-10 text-primary" />
            </div>
            <p class="text-sm text-muted-foreground">
              Waiting for biometric authentication...
            </p>
          {:else}
            <div class="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Fingerprint class="h-10 w-10 text-muted-foreground" />
            </div>
            
            <Button onclick={handleBiometricAuth} class="w-full h-12">
              <Fingerprint class="h-5 w-5 mr-2" />
              Try Again
            </Button>
          {/if}
        </div>
        
        <div class="flex gap-2">
          <Button 
            variant="outline" 
            class="flex-1"
            onclick={() => { step = 'username'; error = null; }}
          >
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            variant="outline" 
            class="flex-1"
            onclick={() => { step = 'recovery'; error = null; }}
          >
            <KeyRound class="h-4 w-4 mr-2" />
            Use Recovery Code
          </Button>
        </div>
      
      <!-- Step: Recovery -->
      {:else if step === 'recovery'}
        <div class="space-y-3">
          <div class="space-y-2">
            <Label for="recovery-code">Recovery Code</Label>
            <Input 
              id="recovery-code"
              type="text"
              bind:value={recoveryCode}
              placeholder="XXXX-XXXX"
              class="h-12 font-mono text-center tracking-wider"
              disabled={isLoading}
              onkeydown={handleKeydown}
              autocomplete="off"
              autocapitalize="characters"
            />
            <p class="text-xs text-muted-foreground">
              Enter one of the 8-character recovery codes you saved when creating your account.
            </p>
          </div>
          
          <Button 
            onclick={handleRecovery} 
            class="w-full h-12" 
            disabled={!recoveryCode.trim() || isLoading}
          >
            {#if isLoading}
              <Loader2 class="h-5 w-5 mr-2 animate-spin" />
              Verifying...
            {:else}
              <KeyRound class="h-5 w-5 mr-2" />
              Sign In with Recovery Code
            {/if}
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          class="w-full"
          onclick={() => { step = 'biometric'; error = null; recoveryCode = ''; }}
        >
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Biometric
        </Button>
      {/if}
    </div>
    
    {#if step === 'username' && !$biometricsAvailable}
      <div class="p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs">
        <strong>Note:</strong> Biometric authentication may not be available on this device. 
        You may need to use a recovery code to sign in.
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
