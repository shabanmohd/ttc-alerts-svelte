# TTC Alerts i18n (Internationalization)

## 🚀 Fully Automated Translation Workflow

This project uses **DeepL API** with **100% automated** translation:

### When Translations Happen Automatically

| Trigger             | What Happens                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Translates before dev server starts                                 |
| `npm run build`     | Translates before production build                                  |
| `npm run dev:watch` | **Live translation** - translates instantly when you save `en.json` |
| Git commit          | Pre-commit hook checks for missing translations                     |

## Quick Start

### Option 1: Standard Dev (translates on start)

```bash
npm run dev
```

### Option 2: Live Translation (recommended for i18n work)

```bash
npm run dev:watch
```

Now when you save `en.json`, French is auto-generated instantly!

## Adding New Text

1. **Add English text** to `src/lib/i18n/en.json`:

   ```json
   {
     "myFeature": {
       "title": "My New Feature"
     }
   }
   ```

2. **Use in component**:

   ```svelte
   <script lang="ts">
     import { _ } from 'svelte-i18n';
   </script>

   <h1>{$_('myFeature.title')}</h1>
   ```

3. **Save** → French translation appears automatically (if using `dev:watch`)

## Commands

| Command                   | Description                           |
| ------------------------- | ------------------------------------- |
| `npm run dev`             | Dev server (translates once at start) |
| `npm run dev:watch`       | Dev server + live translation watcher |
| `npm run build`           | Production build (translates first)   |
| `npm run translate`       | Manual translation                    |
| `npm run translate:check` | Check for missing translations        |
| `npm run translate:watch` | Watch mode (standalone)               |

## Setup

Add DeepL API key to `.env`:

```
DEEPL_KEY=your-api-key-here
```

Falls back to MyMemory (free, no key) if DEEPL_KEY not set.

## Daily Workflow

### Adding New UI Text

1. **Add English key** to `src/lib/i18n/en.json`:

   ```json
   {
     "myFeature": {
       "title": "My New Feature",
       "description": "This is a great feature"
     }
   }
   ```

2. **Use in component**:

   ```svelte
   <script lang="ts">
     import { _ } from 'svelte-i18n';
   </script>

   <h1>{$_('myFeature.title')}</h1>
   <p>{$_('myFeature.description')}</p>
   ```

3. **Commit** - French is auto-generated! ✨

## Commands

```bash
# Check for missing translations (dry run)
npm run translate:check

# Auto-translate missing keys (100% free!)
npm run translate
```

## Automatic Flow

```
en.json → npm run translate → LibreTranslate API → fr.json
               ↑
         Pre-commit hook
```

1. **Pre-commit hook** runs `translate:check` before every commit
2. If missing translations → run `npm run translate`
3. Translated keys are added to `fr.json`
4. Commit proceeds with all translations in place

## Manual Override

If LibreTranslate's translation isn't perfect, manually edit `fr.json`. The script preserves existing translations.

## File Structure

```
src/lib/i18n/
├── index.ts       # i18n initialization
├── en.json        # English (source of truth)
├── fr.json        # French (auto-generated + manual tweaks)
└── README.md      # This file
```
