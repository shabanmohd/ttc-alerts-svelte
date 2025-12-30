import tailwindcss from '@tailwindcss/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Sentry plugin for source maps and instrumentation
		// Note: Source map upload requires SENTRY_AUTH_TOKEN env variable
		// Get a token from: https://sentry.io/settings/auth-tokens/
		sentrySvelteKit({
			sourceMapsUploadOptions: {
				org: 'rideto',
				project: 'rideto-pwa',
				// Auth token from environment variable (for CI/CD)
				authToken: process.env.SENTRY_AUTH_TOKEN,
			},
			// Auto-instrument load functions for tracing
			autoInstrument: {
				load: true,
				serverLoad: false, // Disabled for static adapter
			},
		}),
		tailwindcss(),
		sveltekit()
	],
	// Generate source maps for production builds
	build: {
		sourcemap: true,
	},
});
