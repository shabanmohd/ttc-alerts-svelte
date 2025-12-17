import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

type DialogType = 'report-bug' | 'feature-request' | null;

// Store for which dialog is currently open
export const activeDialog = writable<DialogType>(null);

// Function to open a dialog
export function openDialog(dialog: string) {
  // For pages, navigate instead of opening dialog
  if (dialog === 'how-to-use') {
    goto('/help');
    return;
  }
  if (dialog === 'about') {
    goto('/about');
    return;
  }
  // For forms, open dialog
  activeDialog.set(dialog as DialogType);
}

// Function to close the current dialog
export function closeDialog() {
  activeDialog.set(null);
}
