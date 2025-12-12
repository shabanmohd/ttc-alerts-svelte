<script lang="ts">
  import { _ } from "svelte-i18n";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Fingerprint,
    Copy,
    Check,
    AlertTriangle,
    Loader2,
    ArrowLeft,
    ShieldCheck,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import {
    signUp,
    authError,
    clearAuthError,
    biometricsAvailable,
  } from "$lib/stores/auth";
  import {
    getDisplayNameError,
    checkDisplayNameAvailable,
  } from "$lib/services/webauthn";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSignIn?: () => void;
  }

  let { open = $bindable(false), onOpenChange, onSignIn }: Props = $props();

  // Form state
  let displayName = $state("");
  let isLoading = $state(false);
  let isCheckingName = $state(false);
  let nameAvailable = $state<boolean | null>(null);
  let recoveryCodes = $state<string[]>([]);
  let copiedIndex = $state<number | null>(null);
  let acknowledgedCodes = $state(false);
  let error = $state<string | null>(null);

  // UI state
  type Step = "displayName" | "biometric" | "recovery-codes" | "success";
  let step = $state<Step>("displayName");

  // Validation
  let displayNameError = $derived(
    displayName.trim() ? getDisplayNameError(displayName) : null
  );
  let isDisplayNameValid = $derived(
    !displayNameError &&
      displayName.trim().length >= 2 &&
      nameAvailable === true
  );

  // Debounced name availability check
  let checkTimeout: ReturnType<typeof setTimeout>;

  function handleDisplayNameInput() {
    nameAvailable = null;
    clearTimeout(checkTimeout);

    const currentName = displayName.trim();
    if (currentName.length >= 2 && !getDisplayNameError(currentName)) {
      isCheckingName = true;
      checkTimeout = setTimeout(async () => {
        const available = await checkDisplayNameAvailable(currentName);
        // Only update if name hasn't changed
        if (displayName.trim() === currentName) {
          nameAvailable = available;
          isCheckingName = false;
        }
      }, 500);
    }
  }

  async function handleContinue() {
    if (!isDisplayNameValid) return;

    error = null;
    step = "biometric";

    // Start biometric registration
    await handleBiometricRegistration();
  }

  async function handleBiometricRegistration() {
    if (isLoading) return;

    isLoading = true;
    error = null;

    try {
      const result = await signUp(displayName.trim());

      if (result.success && result.recoveryCodes) {
        recoveryCodes = result.recoveryCodes;
        step = "recovery-codes";
      } else {
        error = result.error || "Registration failed";
        step = "displayName";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Registration failed";
      step = "displayName";
    } finally {
      isLoading = false;
    }
  }

  async function copyCode(code: string, index: number) {
    try {
      await navigator.clipboard.writeText(code);
      copiedIndex = index;
      setTimeout(() => {
        copiedIndex = null;
      }, 2000);
    } catch {
      toast.error($_("toast.failedToCopyCode"));
    }
  }

  async function copyAllCodes() {
    try {
      const allCodes = recoveryCodes.join("\n");
      await navigator.clipboard.writeText(allCodes);
      toast.success($_("toasts.codesCopied"));
    } catch {
      toast.error($_("toasts.copyFailed"));
    }
  }

  function handleFinish() {
    if (!acknowledgedCodes) {
      toast.error($_("toasts.confirmSaveCodes"));
      return;
    }

    step = "success";
    setTimeout(() => {
      handleClose();
    }, 2000);
  }

  function handleClose() {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      displayName = "";
      recoveryCodes = [];
      acknowledgedCodes = false;
      copiedIndex = null;
      error = null;
      step = "displayName";
      nameAvailable = null;
      clearAuthError();
    }, 300);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && step === "displayName" && isDisplayNameValid) {
      handleContinue();
    }
  }

  function switchToSignIn() {
    handleClose();
    onSignIn?.();
  }
</script>

<Dialog.Root
  bind:open
  onOpenChange={(v) => {
    if (!v) handleClose();
  }}
>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        {#if step === "displayName"}
          Create Account
        {:else if step === "biometric"}
          Set Up Biometrics
        {:else if step === "recovery-codes"}
          Save Recovery Codes
        {:else}
          Account Created!
        {/if}
      </Dialog.Title>
      <Dialog.Description>
        {#if step === "displayName"}
          Create an account to save your preferences across devices
        {:else if step === "biometric"}
          Use Face ID, Touch ID, or fingerprint to secure your account
        {:else if step === "recovery-codes"}
          Save these codes in a safe place. You'll need them if you lose access
          to your device.
        {:else}
          You're all set!
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Error display -->
      {#if error || $authError}
        <div
          class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2"
        >
          <AlertTriangle class="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error || $authError}</span>
        </div>
      {/if}

      <!-- Step: Display Name -->
      {#if step === "displayName"}
        <div class="space-y-3 animate-fade-in">
          <div class="space-y-2">
            <Label for="create-displayName"
              >{$_("auth.chooseDisplayName")}</Label
            >
            <div class="relative">
              <Input
                id="create-displayName"
                type="text"
                bind:value={displayName}
                oninput={handleDisplayNameInput}
                placeholder={$_("auth.yourNamePlaceholder")}
                class="h-12 pr-10"
                disabled={isLoading}
                onkeydown={handleKeydown}
                autocomplete="nickname"
                autocapitalize="words"
                autofocus
              />
              {#if isCheckingName}
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              {:else if nameAvailable === true}
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check class="h-4 w-4 text-green-500" />
                </div>
              {:else if nameAvailable === false}
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                  <AlertTriangle class="h-4 w-4 text-destructive" />
                </div>
              {/if}
            </div>
            {#if displayNameError}
              <p class="text-xs text-destructive">{displayNameError}</p>
            {:else if nameAvailable === false}
              <p class="text-xs text-destructive">This name is already taken</p>
            {:else if nameAvailable === true}
              <p class="text-xs text-green-600 dark:text-green-400">
                Name is available!
              </p>
            {:else}
              <p class="text-xs text-muted-foreground">
                Enter a name to identify yourself. 2-50 characters.
              </p>
            {/if}
          </div>

          <Button
            onclick={handleContinue}
            class="w-full h-12"
            disabled={!isDisplayNameValid || isLoading || isCheckingName}
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
            Already have an account? <span class="text-primary font-medium"
              >Sign in</span
            >
          </button>
        </div>

        {#if !$biometricsAvailable}
          <div
            class="p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs"
          >
            <strong>Note:</strong> Biometric authentication may not be available
            on this device.
          </div>
        {/if}

        <!-- Step: Biometric -->
      {:else if step === "biometric"}
        <div class="text-center space-y-4 py-4">
          <div
            class="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse"
          >
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
              onclick={() => {
                step = "displayName";
                error = null;
              }}
            >
              <ArrowLeft class="h-4 w-4 mr-2" />
              Back
            </Button>
          {/if}
        </div>

        <!-- Step: Recovery Codes -->
      {:else if step === "recovery-codes"}
        <div class="space-y-4">
          <div
            class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
          >
            <div class="flex items-start gap-2">
              <AlertTriangle
                class="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5"
              />
              <div class="text-sm">
                <p class="font-medium text-yellow-700 dark:text-yellow-300">
                  Important!
                </p>
                <p class="text-yellow-600 dark:text-yellow-400 mt-1">
                  These codes are the <strong>only way</strong> to recover your account
                  if you lose access to your device. Save them now!
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

          <label
            class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
          >
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
      {:else if step === "success"}
        <div class="text-center space-y-4 py-8">
          <div
            class="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
          >
            <Check class="h-10 w-10 text-green-500" />
          </div>
          <div>
            <p class="font-medium text-lg">Welcome, {displayName}!</p>
            <p class="text-sm text-muted-foreground mt-1">
              Your account has been created successfully.
            </p>
          </div>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
