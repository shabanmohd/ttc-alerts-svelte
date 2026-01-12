# GTFS Update Checker - Cloudflare Worker

Automatically checks for TTC GTFS schedule updates weekly using Cloudflare Cron Triggers.

## How It Works

1. **Weekly Cron Trigger** - Runs every Sunday at 6:00 AM UTC (2:00 AM EST)
2. **HEAD Request** - Checks `Last-Modified` header without downloading the 15MB+ file
3. **KV Storage** - Stores previous state to detect changes
4. **GitHub Issue** - Automatically creates an issue when updates are detected
5. **Discord Notification** (optional) - Sends alert to Discord webhook

## Setup

### 1. Create KV Namespace

```bash
cd workers/gtfs-checker
wrangler kv:namespace create GTFS_STATE
```

Copy the ID and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "GTFS_STATE"
id = "YOUR_KV_ID_HERE"
```

### 2. Set Secrets

```bash
# Required: GitHub token with repo access
wrangler secret put GITHUB_TOKEN

# Optional: Discord webhook URL
wrangler secret put DISCORD_WEBHOOK_URL
```

### 3. Deploy

```bash
npm install
npm run deploy
```

## Testing

### Test Scheduled Trigger Locally
```bash
npm run test
# Then in another terminal:
curl "http://localhost:8787/__scheduled?cron=0+6+*+*+0"
```

### Manual HTTP Trigger
```bash
# Check for updates
curl https://gtfs-checker.<your-subdomain>.workers.dev/check

# View current state
curl https://gtfs-checker.<your-subdomain>.workers.dev/status
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Worker info |
| `/check` | Manually trigger GTFS update check |
| `/status` | View current KV state |

## Cost

**Free** on Cloudflare Workers Free Plan:
- 5 Cron Triggers per account (we use 1)
- 100,000 requests/day
- 10ms CPU time (HEAD request uses minimal CPU)

## Configuration

Edit `wrangler.toml` to change:
- Cron schedule (currently weekly on Sunday 6:00 AM UTC)
- GTFS URL (if Toronto Open Data changes)
- GitHub repo
