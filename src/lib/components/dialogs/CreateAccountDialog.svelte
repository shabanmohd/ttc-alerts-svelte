<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Fingerprint, Copy, Check, AlertTriangle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { signUp, authError, clearAuthError, biometricsAvailable } from '$lib/stores/auth';
  import { getUsernameError, checkUsernameAvailable } from '$lib/services/webauthn';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSignIn?: () => void;
  }

  let { open = $bindable(false), onOpenChange, onSignIn }: Props = $props();
  
  // Form state
  let username = $state('');
  let isLoading = $state(false);
  let isCheckingUsername = $state(false);
  let usernameAvailable = $state<boolean | null>(null);
  let recoveryCodes = $state<string[]>([]);
  let copiedIndex = $state<number | null>(null);
  let acknowledgedCodes = $state(false);
  let error = $state<string | null>(null);
  
  // UI state
  type Step = 'username' | 'biometric' | 'recovery-codes' | 'success';
  let step = $state<Step>('username');
  
  // Validation
  let usernameError = $derived(username.trim() ? getUsernameError(username) : null);
  let isUsernameValid = $derived(!usernameError && username.trim().length >= 3 && usernameAvailable === true);
  
  // Debounced username availability check
  let checkTimeout: ReturnType<typeof setTimeout>;
  
  function handleUsernameInput() {
    usernameAvailable = null;
    clearTimeout(checkTimeout);
    
    const currentUsername = username.trim().toLowerCase();
    if (currentUsername.length >= 3 && !getUsernameError(currentUsername)) {
      isCheckingUsername = true;
      checkTimeout = setTimeout(async () => {
        const available = await checkUsernameAvailable(currentUsername);
        // Only update if username hasn't changed
        if (username.trim().toLowerCase() === currentUsername) {
          usernameAvailable = available;
          isCheckingUsername = false;
        }
      }, 500);
    }
  }
  
  async function handleContinue() {
    if (!isUsernameValid) return;
    
    error = null;
    step = 'biometric';
    
    // Start biometric registration
    await handleBiometricRegistration();
  }
  
  async function handleBiometricRegistration() {
    if (isLoading) return;
    
    isLoading = true;
    error = null;
    
    try {
      const result = await signUp(username.trim());
      
      if (result.success && result.recoveryCodes) {
        recoveryCodes = result.recoveryCodes;
        step = 'recovery-codes';
      } else {
        error = result.error || 'Registration failed';
        step = 'username';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Registration failed';
      step = 'username';
    } finally {
      isLoading = false;
    }
  }
  
  async function copyCode(code: string, index: number) {
    try {
      await navigator.clipboard.writeText(code);
      copiedIndex = index;
      setTimeout(() => { copiedIndex = null; }, 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  }
  
  async function copyAllCodes() {
    try {
      const allCodes = recoveryCodes.join('\n');
      await navigator.clipboard.writeText(allCodes);
      toast.success('All recovery codes copied!');
    } catch {
      toast.error('Failed to copy codes');
    }
  }
  
  function handleFinish() {
    if (!acknowledgedCodes) {
      toast.error('Please confirm you have saved your recovery codes');
      return;
    }
    
    step = 'success';
    setTimeout(() => {
      handleClose();
    }, 2000);
  }
  
  function handleClose() {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      username = '';
      recoveryCodes = [];
      acknowledgedCodes = false;
      copiedIndex = null;
      error = null;
      step = 'username';
      usernameAvailable = null;
      clearAuthError();
    }, 300);
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && step === 'username' && isUsernameValid) {
      handleContinue();
    }
  }
  
  function switchToSignIn() {
    handleClose();
    onSignIn?.();
  }
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) handleClose(); }}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        {#if step === 'username'}
          Create Account
        {:else if step === 'biometric'}
          Set Up Biometrics
        {:else if step === 'recovery-codes'}
          Save Recovery Codes
        {:else}
          Account Created!
        {/if}
      </Dialog.Title>
      <Dialog.Description>
        {#if step === 'username'}
          Create an account to save your preferences across devices
        {:else if step === 'biometric'}
          Use Face ID, Touch ID, or fingerprint to secure your account
        {:else if step === 'recovery-codes'}
          Save these codes in a safe place. You'll need them if you lose access to your device.
        {:else}
          You're all set!
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Error display -->
      {#if error || $authError}
        <div class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle class="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error || $authError}</span>
        </div>
      {/if}
      
      <!-- Step: Username -->
      {#if step === 'username'}
        <div class="space-y-3">
          <div class="space-y-2">
            <Label for="create-username">Choose a username</Label>
            <div class="relative">
              <Input 
                id="create-username"
                type="text"
                bind:value={username}
                oninput={handleUsernameInput}
                placeholder="your_username"
                class="h-12 pr-10"
                disabled={isLoading}
                onkeydown={handleKeydown}
                autocomplete="username"
                autocapitalize="none"
              />
              {#if isCheckingUsername}
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              {:else if usernameAvailable === true}
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check class="h-4 w-4 text-green-500" />
                </div>
              {:else if usernameAvailable === false}
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                  <AlertTriangle class="h-4 w-4 text-destructive" />
                </div>
              {/if}
            </div>
            {#if usernameError}
              <p class="text-xs text-destructive">{usernameError}</p>
            {:else if usernameAvailable === false}
              <p class="text-xs text-destructive">This username is already taken</p>
            {:else if usernameAvailable === true}
              <p class="text-xs text-green-600 dark:text-green-400">Username is available!</p>
            {:else}
              <p class="text-xs text-muted-foreground">Letters, numbers, and underscores only. 3-30 characters.</p>
            {/if}
          </div>
          
          <Button 
            onclick={handleContinue} 
            class="w-full h-12" 
            disabled={!isUsernameValid || isLoading || isCheckingUsername}
          >
            <Fingerprint class="h-5 w-5 mr-2" />
            Continue with Biometrics
          </Button>
        </div>
        
        <div class="text-center pt-2">
          <button 
            type="button"
            class="text-sm text-muted-foreground hover:text-foreground"
            onclick={switchToSignIn}
          >
            Already have an account? <span class="text-primary font-medium">Sign in</span>
          </button>
        </div>
        
        {#if !$biometricsAvailable}
          <div class="p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs">
            <strong>Note:</strong> Biometric authentication may not be available on this device.
          </div>
        {/if}
      
      <!-- Step: Biometric -->
      {:else if step === 'biometric'}
        <div class="text-center space-y-4 py-4">
          <div class="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Fingerprint class="h-10 w-10 text-primary" />
          </div>
          <p class="text-sm text-muted-foreground">
            {#if isLoading}
              Follow your device's prompts to set up biometric authentication...
            {:else}
              Click below to set up Face ID, Touch ID, or fingerprint
            {/if}
          </p>
          
          {#if !isLoading}
            <Button onclick={handleBiometricRegistration} class="w-full h-12">
              <Fingerprint class="h-5 w-5 mr-2" />
              Set Up Biometrics
            </Button>
            
            <Button 
              variant="outline" 
              class="w-full"
              onclick={() => { step = 'username'; error = null; }}
            >
              <ArrowLeft class="h-4 w-4 mr-2" />
              Back
            </Button>
          {/if}
        </div>
      
      <!-- Step: Recovery Codes -->
      {:else if step === 'recovery-codes'}
        <div class="space-y-4">
          <div class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div class="flex items-start gap-2">
              <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div class="text-sm">
                <p class="font-medium text-yellow-700 dark:text-yellow-300">Important!</p>
                <p class="text-yellow-600 dark:text-yellow-400 mt-1">
                  These codes are the <strong>only way</strong> to recover your account if you lose access to your device. Save them now!
                </p>
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-2">
            {#each recoveryCodes as code, i}
              <button
                type="button"
                class="flex items-center justify-between p-2 rounded-md bg-muted font-mono text-sm hover:bg-muted/80 transition-colors"
                onclick={() => copyCode(code, i)}
              >
                <span>{code}</span>
                {#if copiedIndex === i}
                  <Check class="h-4 w-4 text-green-500" />
                {:else}
                  <Copy class="h-4 w-4 text-muted-foreground" />
                {/if}
              </button>
            {/each}
          </div>
          
          <Button variant="outline" class="w-full" onclick={copyAllCodes}>
            <Copy class="h-4 w-4 mr-2" />
            Copy All Codes
          </Button>
          
          <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
            <input 
              type="checkbox" 
              bind:checked={acknowledgedCodes}
              class="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span class="text-sm">
              I have saved these recovery codes in a safe place
            </span>
          </label>
          
          <Button 
            class="w-full h-12" 
            onclick={handleFinish}
            disabled={!acknowledgedCodes}
          >
            <ShieldCheck class="h-5 w-5 mr-2" />
            Continue to App
          </Button>
        </div>
      
      <!-- Step: Success -->
      {:else if step === 'success'}
        <div class="text-center space-y-4 py-8">
          <div class="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check class="h-10 w-10 text-green-500" />
          </div>
          <div>
            <p class="font-medium text-lg">Welcome, {username}!</p>
            <p class="text-sm text-muted-foreground mt-1">
              Your account has been created successfully.
            </p>
          </div>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
