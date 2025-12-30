# rideTO PWA

Real-time Toronto Transit Commission service alerts progressive web app.

**Live URLs:**

- **Production (Version A)**: https://ttc-alerts-svelte.pages.dev
- **Beta (Version B)**: https://version-b.ttc-alerts-svelte.pages.dev

---

## 📚 Documentation

| Document                                                                       | Purpose                                               |
| ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [APP_IMPLEMENTATION.md](APP_IMPLEMENTATION.md)                                 | **Start Here** - File inventory, status, architecture |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)                               | Feature roadmap & phase progress                      |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)                                           | UI design tokens, colors, typography                  |
| [alert-categorization-and-threading.md](alert-categorization-and-threading.md) | Edge Function logic, alert threading                  |
| [CODEBASE_ACTION_PLAN.md](CODEBASE_ACTION_PLAN.md)                             | Code optimization (completed)                         |
| [SECURITY_AUDIT.md](SECURITY_AUDIT.md)                                         | Security review findings                              |

### Reference Docs

| Document                                           | Purpose                               |
| -------------------------------------------------- | ------------------------------------- |
| [TTC-ROUTE-CONFLICTS.md](TTC-ROUTE-CONFLICTS.md)   | Route number conflicts (39/939, etc.) |
| [TTC-BUS-ROUTES.md](TTC-BUS-ROUTES.md)             | Bus route reference                   |
| [TTC-STREETCAR-ROUTES.md](TTC-STREETCAR-ROUTES.md) | Streetcar route reference             |
| [ROUTE_BADGE_STYLES.md](ROUTE_BADGE_STYLES.md)     | Route badge color system              |

---

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Frontend     | Svelte 5 + TypeScript + Tailwind CSS + shadcn-svelte |
| Typography   | Lexend (dyslexic-friendly)                           |
| Backend      | Supabase (PostgreSQL + Edge Functions + Realtime)    |
| Hosting      | Cloudflare Pages                                     |
| Data Sources | Bluesky @ttcalerts, TTC Live API, TTC NTAS           |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone repository
git clone https://github.com/shabanmohd/ttc-alerts-svelte.git
cd ttc-alerts-svelte

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Development

```bash
# Start dev server
npm run dev

# With translation file watching
npm run dev:watch

# Type checking
npm run check
```

### Building

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

---

## Project Structure

```
src/
├── lib/
│   ├── components/      # UI components
│   │   ├── alerts/      # Alert display components
│   │   ├── dialogs/     # Modal dialogs
│   │   ├── eta/         # ETA feature components
│   │   ├── layout/      # Header, nav, sidebar
│   │   ├── stops/       # Stop search & bookmarks
│   │   └── ui/          # shadcn-svelte base components
│   ├── data/            # Static data (routes, stops)
│   ├── i18n/            # Internationalization (en/fr)
│   ├── services/        # API clients, storage
│   ├── stores/          # Svelte stores
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── routes/              # SvelteKit pages
└── app.html             # HTML template

supabase/
├── functions/           # Edge Functions
│   ├── poll-alerts/     # Alert polling & threading
│   ├── get-eta/         # ETA predictions
│   ├── scrape-maintenance/  # Maintenance scraping
│   └── submit-feedback/     # Feedback form handler
└── migrations/          # Database migrations

static/
├── data/                # GTFS data files
├── icons/               # PWA icons
└── manifest.json        # PWA manifest
```

---

## Environment Variables

```bash
# Required
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Optional (for DeepL translations)
DEEPL_API_KEY=xxx
```

---

## Contributing

1. Check [APP_IMPLEMENTATION.md](APP_IMPLEMENTATION.md) for current status
2. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for roadmap
3. Follow patterns in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

---

## License

MIT
