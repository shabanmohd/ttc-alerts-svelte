<script lang="ts">
  import { _ } from "svelte-i18n";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Select from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import { Turnstile } from "$lib/components/ui/turnstile";
  import {
    Flag,
    Loader2,
    CheckCircle,
    AlertCircle,
    Bug,
    AlertTriangle,
    Database,
    MessageSquare,
    HelpCircle,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();

  // Issue types configuration
  const issueTypes = [
    { value: "bug", label: "feedback.issueTypes.bug", icon: Bug },
    {
      value: "usability",
      label: "feedback.issueTypes.usability",
      icon: AlertTriangle,
    },
    {
      value: "data-error",
      label: "feedback.issueTypes.dataError",
      icon: Database,
    },
    {
      value: "complaint",
      label: "feedback.issueTypes.complaint",
      icon: MessageSquare,
    },
    { value: "other", label: "feedback.issueTypes.other", icon: HelpCircle },
  ] as const;

  // Form state
  let issueType = $state<string>("bug");
  let title = $state("");
  let description = $state("");
  let email = $state("");
  let turnstileToken = $state<string | null>(null);
  let isLoading = $state(false);
  let submitStatus = $state<"idle" | "success" | "error">("idle");

  // Turnstile ref
  let turnstileComponent = $state<Turnstile | null>(null);

  // Get selected issue type details
  let selectedIssueType = $derived(
    issueTypes.find((t) => t.value === issueType) || issueTypes[0]
  );

  // Email validation - only validate if email is provided
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let isEmailValid = $derived(
    email.trim() === "" || emailRegex.test(email.trim())
  );

  // Validation
  let isValid = $derived(
    issueType &&
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
      // Use direct fetch to get better error details
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: issueType,
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
    } catch (err: unknown) {
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
    issueType = "bug";
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
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 mt-0.5"
        >
          <Flag class="h-5 w-5 text-red-500" />
        </div>
        <div>
          <Dialog.Title class="text-lg font-semibold"
            >{$_("feedback.reportIssue")}</Dialog.Title
          >
          <Dialog.Description class="text-sm text-left opacity-50">
            {$_("feedback.reportIssueDesc")}
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
        <!-- Issue Type -->
        <div class="space-y-2">
          <Label for="issue-type">
            {$_("feedback.issueType")} <span class="text-destructive">*</span>
          </Label>
          <Select.Root type="single" bind:value={issueType}>
            <Select.Trigger class="w-full" disabled={isLoading}>
              <div class="flex items-center gap-2">
                {#if selectedIssueType}
                  {@const Icon = selectedIssueType.icon}
                  <Icon class="h-4 w-4" />
                  <span>{$_(selectedIssueType.label)}</span>
                {:else}
                  <span class="text-muted-foreground"
                    >{$_("feedback.selectIssueType")}</span
                  >
                {/if}
              </div>
            </Select.Trigger>
            <Select.Content class="z-[100] bg-zinc-800">
              {#each issueTypes as type}
                {@const TypeIcon = type.icon}
                <Select.Item value={type.value}>
                  <div class="flex items-center gap-2">
                    <TypeIcon class="h-4 w-4" />
                    <span>{$_(type.label)}</span>
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Title -->
        <div class="space-y-2">
          <Label for="issue-title">
            {$_("feedback.title")} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="issue-title"
            type="text"
            placeholder={$_("feedback.titlePlaceholder")}
            bind:value={title}
            disabled={isLoading}
            maxlength={100}
          />
          <p class="text-xs text-muted-foreground/60 text-right">
            {title.length}/100
          </p>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="issue-description">
            {$_("feedback.description")} <span class="text-destructive">*</span>
          </Label>
          <Textarea
            id="issue-description"
            placeholder={$_("feedback.descriptionPlaceholderBug")}
            bind:value={description}
            disabled={isLoading}
            maxlength={2000}
            class="min-h-[120px]"
          />
          <p class="text-xs text-muted-foreground/60 text-right">
            {description.length}/2000
          </p>
        </div>

        <!-- Email (optional) -->
        <div class="space-y-2">
          <Label for="issue-email">
            {$_("feedback.email")}
            <span class="opacity-50 text-xs"
              >({$_("common.optional")})</span
            >
          </Label>
          <Input
            id="issue-email"
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
          class="w-full sm:w-auto"
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
