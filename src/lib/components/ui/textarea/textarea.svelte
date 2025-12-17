<script lang="ts">
  import type { HTMLTextareaAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils.js";

  type Props = WithElementRef<HTMLTextareaAttributes>;

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    "data-slot": dataSlot = "textarea",
    ...restProps
  }: Props = $props();
</script>

<textarea
  bind:this={ref}
  data-slot={dataSlot}
  class={cn(
    "selection:bg-primary selection:text-primary-foreground ring-offset-background shadow-xs flex min-h-[100px] w-full min-w-0 rounded-md border px-3 py-2 text-base outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    "placeholder:text-zinc-500 dark:placeholder:text-zinc-500",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    className
  )}
  style="background-color: hsl(var(--muted)); border-color: hsl(var(--border)); resize: vertical;"
  bind:value
  {...restProps}
></textarea>
