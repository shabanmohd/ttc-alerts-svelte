<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import Check from "lucide-svelte/icons/check";
	import X from "lucide-svelte/icons/x";

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> = $props();
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	class={cn(
		"switch-track focus-visible:ring-ring/50 peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
		checked ? "switch-checked" : "switch-unchecked",
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		data-slot="switch-thumb"
		class={cn(
			"pointer-events-none flex items-center justify-center size-5 rounded-full shadow-md ring-0 transition-transform",
			checked ? "translate-x-[1.35rem] switch-thumb-checked" : "translate-x-0.5 switch-thumb-unchecked"
		)}
	>
		{#if checked}
			<Check class="h-3 w-3 switch-icon-checked" strokeWidth={3} />
		{:else}
			<X class="h-3 w-3 switch-icon-unchecked" strokeWidth={3} />
		{/if}
	</SwitchPrimitive.Thumb>
</SwitchPrimitive.Root>

<style>
	:global(.switch-track) {
		transition: background-color 0.2s, border-color 0.2s;
	}
	/* Light mode - Off state: light gray track */
	:global(.switch-unchecked) {
		background-color: #e5e5e5 !important;
		border-color: #e5e5e5 !important;
	}
	/* Light mode - On state: dark/black track */
	:global(.switch-checked) {
		background-color: hsl(var(--foreground)) !important;
		border-color: hsl(var(--foreground)) !important;
	}
	/* Thumb - unchecked: dark gray */
	:global(.switch-thumb-unchecked) {
		background-color: #737373 !important;
	}
	/* Thumb - checked: white */
	:global(.switch-thumb-checked) {
		background-color: white !important;
	}
	/* Icon colors */
	:global(.switch-icon-unchecked) {
		color: white !important;
	}
	:global(.switch-icon-checked) {
		color: hsl(var(--foreground)) !important;
	}
	
	/* Dark mode adjustments */
	:global(.dark .switch-unchecked) {
		background-color: hsl(var(--muted-foreground) / 0.3) !important;
		border-color: hsl(var(--muted-foreground) / 0.4) !important;
	}
	:global(.dark .switch-checked) {
		background-color: hsl(var(--foreground) / 0.15) !important;
		border-color: hsl(var(--foreground) / 0.3) !important;
	}
	:global(.dark .switch-thumb-unchecked) {
		background-color: hsl(var(--muted-foreground) / 0.7) !important;
	}
	:global(.dark .switch-thumb-checked) {
		background-color: white !important;
	}
	:global(.dark .switch-icon-unchecked) {
		color: hsl(var(--background)) !important;
	}
	:global(.dark .switch-icon-checked) {
		color: #171717 !important;
	}
</style>
