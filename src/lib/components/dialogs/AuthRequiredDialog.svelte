<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Bell, UserPlus, LogIn } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSignIn?: () => void;
    onSignUp?: () => void;
    title?: string;
    description?: string;
  }

  let { 
    open = $bindable(false), 
    onOpenChange, 
    onSignIn, 
    onSignUp,
    title = 'Account Required',
    description = 'Create an account to save your preferences and get personalized alerts for your routes.'
  }: Props = $props();

  function handleSignIn() {
    onOpenChange(false);
    onSignIn?.();
  }

  function handleSignUp() {
    onOpenChange(false);
    onSignUp?.();
  }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Bell class="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <Dialog.Title class="text-center">{title}</Dialog.Title>
      <Dialog.Description class="text-center">
        {description}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="rounded-lg border bg-muted/50 p-4">
        <h4 class="mb-2 font-medium">With an account you can:</h4>
        <ul class="space-y-2 text-sm text-muted-foreground">
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true"></span>
            Save your favorite routes
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true"></span>
            Get personalized alerts
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true"></span>
            Set quiet hours for notifications
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true"></span>
            Access your preferences on any device
          </li>
        </ul>
      </div>
    </div>

    <Dialog.Footer class="flex-col gap-2 sm:flex-col">
      <Button class="w-full" onclick={handleSignUp}>
        <UserPlus class="mr-2 h-4 w-4" />
        Create Account
      </Button>
      <Button variant="outline" class="w-full" onclick={handleSignIn}>
        <LogIn class="mr-2 h-4 w-4" />
        Sign In
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
