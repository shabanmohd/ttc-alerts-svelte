import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Get git commit hash for build info
function getGitCommitHash(): string {
	try {
		return execSync('git rev-parse HEAD').toString().trim();
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
		__COMMIT_HASH__: JSON.stringify(getGitCommitHash())
	}
});
