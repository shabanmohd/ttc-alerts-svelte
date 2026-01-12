/**
 * GTFS Update Checker - Cloudflare Worker with Cron Trigger
 * 
 * Runs weekly to check if Toronto's GTFS data has been updated.
 * Uses HEAD request to check Last-Modified header (avoids downloading 15MB+ file).
 * Creates GitHub issue if new version detected.
 */

export interface Env {
	GTFS_STATE: KVNamespace;
	GTFS_URL: string;
	GITHUB_REPO: string;
	GITHUB_TOKEN?: string;
	DISCORD_WEBHOOK_URL?: string;
}

interface GTFSState {
	lastModified: string;
	lastChecked: string;
	etag?: string;
}

export default {
	// Handle scheduled cron trigger
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(`GTFS check triggered at ${new Date().toISOString()}`);
		await checkGTFSUpdate(env);
	},

	// Also allow manual HTTP trigger for testing
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		if (url.pathname === '/check') {
			const result = await checkGTFSUpdate(env);
			return new Response(JSON.stringify(result, null, 2), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		if (url.pathname === '/status') {
			const state = await env.GTFS_STATE.get<GTFSState>('gtfs-metadata', 'json');
			return new Response(JSON.stringify({
				lastState: state,
				currentTime: new Date().toISOString()
			}, null, 2), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			name: 'gtfs-checker',
			endpoints: {
				'/check': 'Manually trigger GTFS update check',
				'/status': 'View current state'
			}
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

async function checkGTFSUpdate(env: Env): Promise<{
	updated: boolean;
	message: string;
	lastModified?: string;
	previousLastModified?: string;
}> {
	try {
		// Get previous state from KV
		const previousState = await env.GTFS_STATE.get<GTFSState>('gtfs-metadata', 'json');
		
		// Check GTFS file metadata using HEAD request (no download!)
		const response = await fetch(env.GTFS_URL, {
			method: 'HEAD',
			headers: {
				'User-Agent': 'TTC-Alerts-GTFS-Checker/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`GTFS HEAD request failed: ${response.status}`);
		}

		const lastModified = response.headers.get('Last-Modified') || '';
		const etag = response.headers.get('ETag') || '';
		const contentLength = response.headers.get('Content-Length') || 'unknown';

		console.log(`GTFS metadata - Last-Modified: ${lastModified}, ETag: ${etag}, Size: ${contentLength}`);

		// Compare with previous state
		const hasUpdate = previousState 
			? (lastModified !== previousState.lastModified || etag !== previousState.etag)
			: false;

		// Save new state
		const newState: GTFSState = {
			lastModified,
			lastChecked: new Date().toISOString(),
			etag: etag || undefined
		};
		await env.GTFS_STATE.put('gtfs-metadata', JSON.stringify(newState));

		if (hasUpdate) {
			console.log('GTFS update detected!');
			
			// Create GitHub issue
			if (env.GITHUB_TOKEN) {
				await createGitHubIssue(env, lastModified, previousState?.lastModified || 'unknown');
			}

			// Send Discord notification (optional)
			if (env.DISCORD_WEBHOOK_URL) {
				await sendDiscordNotification(env, lastModified);
			}

			return {
				updated: true,
				message: 'GTFS update detected! GitHub issue created.',
				lastModified,
				previousLastModified: previousState?.lastModified
			};
		}

		if (!previousState) {
			return {
				updated: false,
				message: 'Initial state saved. Will check for updates on next run.',
				lastModified
			};
		}

		return {
			updated: false,
			message: 'No GTFS update detected.',
			lastModified
		};

	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		console.error('GTFS check failed:', errorMsg);
		return {
			updated: false,
			message: `Error checking GTFS: ${errorMsg}`
		};
	}
}

async function createGitHubIssue(
	env: Env, 
	newLastModified: string, 
	oldLastModified: string
): Promise<void> {
	const issueBody = `## 🚌 TTC GTFS Data Update Detected

A new version of the TTC GTFS schedule data has been published.

### Details
- **Previous Last-Modified:** ${oldLastModified}
- **New Last-Modified:** ${newLastModified}
- **Detected at:** ${new Date().toISOString()}

### Action Required
1. Download the new GTFS data
2. Run the processing scripts:
   \`\`\`bash
   npm run gtfs:download
   npm run gtfs:process
   \`\`\`
3. Update \`DATA_VERSION\` in \`src/lib/services/schedule-lookup.ts\`
4. Test schedule lookups
5. Deploy

### Data Source
[TTC Routes and Schedules Data](https://open.toronto.ca/dataset/ttc-routes-and-schedules/)

---
*This issue was automatically created by the GTFS Checker Cloudflare Worker.*`;

	const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
		method: 'POST',
		headers: {
			'Authorization': `token ${env.GITHUB_TOKEN}`,
			'Accept': 'application/vnd.github.v3+json',
			'User-Agent': 'TTC-Alerts-GTFS-Checker/1.0',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			title: `🚌 TTC GTFS Schedule Update Available - ${new Date().toISOString().split('T')[0]}`,
			body: issueBody,
			labels: ['gtfs-update', 'automated']
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create GitHub issue: ${response.status} - ${error}`);
	}

	console.log('GitHub issue created successfully');
}

async function sendDiscordNotification(env: Env, lastModified: string): Promise<void> {
	const response = await fetch(env.DISCORD_WEBHOOK_URL!, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			content: `🚌 **TTC GTFS Update Detected**\n\nNew schedule data available (Last-Modified: ${lastModified})\n\nCheck GitHub for the automated issue.`
		})
	});

	if (!response.ok) {
		console.error('Failed to send Discord notification');
	}
}
