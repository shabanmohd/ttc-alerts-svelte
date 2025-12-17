<script lang="ts">
  import { _ } from "svelte-i18n";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import { Turnstile } from "$lib/components/ui/turnstile";
  import { Lightbulb, Loader2, CheckCircle, AlertCircle } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();

  // Form state
  let title = $state("");
  let description = $state("");
  let email = $state("");
  let turnstileToken = $state<string | null>(null);
  let isLoading = $state(false);
  let submitStatus = $state<"idle" | "success" | "error">("idle");

  // Turnstile ref
  let turnstileComponent = $state<Turnstile | null>(null);

  // Email validation - only validate if email is provided
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let isEmailValid = $derived(
    email.trim() === "" || emailRegex.test(email.trim())
  );

  // Validation
  let isValid = $derived(
    title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      isEmailValid &&
      turnstileToken !== null
  );

  function handleTurnstileSuccess(token: string) {
    turnstileToken = token;
  }

  function handleTurnstileError() {
    turnstileToken = null;
    toast.error($_("feedback.captchaError"));
  }

  function handleTurnstileExpire() {
    turnstileToken = null;
  }

  async function handleSubmit() {
    if (!isValid || isLoading) return;

    isLoading = true;
    submitStatus = "idle";

    try {
      // Use direct fetch for better error handling
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: "feature",
            title: title.trim(),
            description: description.trim(),
            email: email.trim() || undefined,
            turnstileToken,
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      submitStatus = "success";
      toast.success($_("feedback.submitted"));

      // Reset form after delay
      setTimeout(() => {
        resetForm();
        open = false;
        onOpenChange?.(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      submitStatus = "error";
      toast.error($_("feedback.submitError"));

      // Reset turnstile on error
      turnstileComponent?.reset();
      turnstileToken = null;
    } finally {
      isLoading = false;
    }
  }

  function resetForm() {
    title = "";
    description = "";
    email = "";
    turnstileToken = null;
    submitStatus = "idle";
    turnstileComponent?.reset();
  }

  // Reset form when dialog closes
  $effect(() => {
    if (!open) {
      // Small delay to allow close animation
      setTimeout(resetForm, 200);
    }
  });
</script>

<Dialog.Root bind:open onOpenChange={(v) => onOpenChange?.(v)}>
  <Dialog.Content
    class="max-w-md bg-white dark:bg-zinc-900 
           !fixed !inset-x-0 !bottom-0 !top-auto !start-0 !translate-x-0 !translate-y-0 
           !rounded-t-2xl !rounded-b-none !max-h-[85vh] overflow-y-auto !max-w-full
           sm:!inset-auto sm:!top-1/2 sm:!left-1/2 sm:!start-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 
           sm:!rounded-lg sm:!max-w-md
           [&_[data-dialog-close]]:size-6 [&_[data-dialog-close]_svg]:size-5"
  >
    <Dialog.Header class="text-left">
      <div class="flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 mt-0.5"
        >
          <Lightbulb class="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <Dialog.Title class="text-lg font-semibold"
            >{$_("feedback.featureRequest")}</Dialog.Title
          >
          <Dialog.Description class="text-sm text-left opacity-50">
            {$_("feedback.featureRequestDesc")}
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>

    {#if submitStatus === "success"}
      <!-- Success State -->
      <div class="flex flex-col items-center justify-center py-8 gap-4">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10"
        >
          <CheckCircle class="h-8 w-8 text-green-500" />
        </div>
        <div class="text-center">
          <p class="font-semibold text-lg">{$_("feedback.thankYou")}</p>
          <p class="text-sm text-muted-foreground mt-1">
            {$_("feedback.willReview")}
          </p>
        </div>
      </div>
    {:else}
      <!-- Form -->
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        class="space-y-4 py-4"
      >
        <!-- Title -->
        <div class="space-y-2">
          <Label for="feature-title">
            {$_("feedback.title")} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="feature-title"
            type="text"
            placeholder={$_("feedback.titlePlaceholderFeature")}
            bind:value={title}
            disabled={isLoading}
            maxlength={100}
            class={title.trim().length > 0 && title.trim().length < 3
              ? "border-amber-500 focus-visible:ring-amber-500/50"
              : ""}
          />
          <div class="flex justify-between text-xs">
            <span
              class={title.trim().length > 0 && title.trim().length < 3
                ? "text-amber-500"
                : "text-muted-foreground/60"}
            >
              {#if title.trim().length > 0 && title.trim().length < 3}
                {$_("feedback.titleCharsNeeded", {
                  values: { count: 3 - title.trim().length },
                })}
              {:else}
                {$_("feedback.titleMinChars")}
              {/if}
            </span>
            <span class="text-muted-foreground/60">{title.length}/100</span>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="feature-description">
            {$_("feedback.description")} <span class="text-destructive">*</span>
          </Label>
          <Textarea
            id="feature-description"
            placeholder={$_("feedback.descriptionPlaceholderFeature")}
            bind:value={description}
            disabled={isLoading}
            maxlength={2000}
            class={`min-h-[120px] ${
              description.trim().length > 0 && description.trim().length < 10
                ? "border-amber-500 focus-visible:ring-amber-500/50"
                : ""
            }`}
          />
          <div class="flex justify-between text-xs">
            <span
              class={description.trim().length > 0 &&
              description.trim().length < 10
                ? "text-amber-500"
                : "text-muted-foreground/60"}
            >
              {#if description.trim().length > 0 && description.trim().length < 10}
                {$_("feedback.descriptionCharsNeeded", {
                  values: { count: 10 - description.trim().length },
                })}
              {:else}
                {$_("feedback.descriptionMinChars")}
              {/if}
            </span>
            <span class="text-muted-foreground/60"
              >{description.length}/2000</span
            >
          </div>
        </div>

        <!-- Email (optional) -->
        <div class="space-y-2">
          <Label for="feature-email">
            {$_("feedback.email")}
            <span class="opacity-50 text-xs">({$_("common.optional")})</span>
          </Label>
          <Input
            id="feature-email"
            type="email"
            placeholder={$_("feedback.emailPlaceholder")}
            bind:value={email}
            disabled={isLoading}
            class={email.trim() && !isEmailValid
              ? "border-destructive focus-visible:ring-destructive"
              : ""}
          />
          {#if email.trim() && !isEmailValid}
            <p class="text-xs text-destructive">
              {$_("feedback.invalidEmail")}
            </p>
          {:else}
            <p class="text-xs opacity-50">
              {$_("feedback.emailHint")}
            </p>
          {/if}
        </div>

        <!-- Turnstile Captcha -->
        <div class="pt-2">
          <Turnstile
            bind:this={turnstileComponent}
            onSuccess={handleTurnstileSuccess}
            onError={handleTurnstileError}
            onExpire={handleTurnstileExpire}
          />
        </div>

        <!-- Error message -->
        {#if submitStatus === "error"}
          <div
            class="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            <AlertCircle class="h-4 w-4 flex-shrink-0" />
            <span>{$_("feedback.submitError")}</span>
          </div>
        {/if}
      </form>

      <Dialog.Footer class="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          class="w-full sm:w-auto"
          onclick={() => {
            open = false;
            onOpenChange?.(false);
          }}
          disabled={isLoading}
        >
          {$_("common.cancel")}
        </Button>
        <Button
          class="w-full sm:w-auto bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          onclick={handleSubmit}
          disabled={!isValid || isLoading}
        >
          {#if isLoading}
            <Loader2 class="h-4 w-4 mr-2 animate-spin" />
          {/if}
          {$_("feedback.submit")}
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
