# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript-based Kintone customization development environment using Vite. Manages multiple Kintone apps in a single project with hot-reload, sync functionality, and schema management.

## Common Commands

```bash
# Development with hot-reload (auto build & upload on file change)
npm run dev                      # All apps
npm run dev -- my-app            # Specific app
npm run dev -- app1,app2         # Multiple apps

# Production build (minified with Terser)
npm run build                    # All apps
npm run build -- my-app          # Specific app

# Upload to Kintone
npm run upload -- my-app

# Sync existing Kintone files to local
npm run sync -- my-app

# Schema management
npm run schema -- my-app                    # Fetch schema (dev env)
KINTONE_ENV=prod npm run schema -- my-app   # Fetch schema (prod env)
npm run schema:diff                         # Compare dev vs prod

# App management (interactive)
npm run create                   # Create new app
npm run remove                   # Remove app

# Type checking
npm run typecheck
```

## Architecture

### Directory Structure

- `src/apps/<app-name>/` - App source code (index.ts + style.css per app)
- `src/types/kintone.d.ts` - Kintone API type definitions
- `scripts/` - Build and management scripts (TypeScript, run via tsx)
- `dist/<app-name>/` - Build output (git-ignored)
- `.kintone/<app-name>/` - Synced existing files and schema (git-ignored)

### Configuration Files

- `kintone.config.ts` - App registry (maps app names to IDs from .env)
- `vite.config.ts` - Auto-discovers apps in src/apps/ as entry points
- `.env` - Environment variables (KINTONE_BASE_URL, app IDs, credentials)

### Build Flow

1. Vite scans `src/apps/` and creates entry points per app
2. Each app builds to `dist/<app>/<app>.js` and `dist/<app>/<app>.css`
3. Upload preserves existing Kintone files via `.kintone/<app>/manifest.json`

### Key Patterns

- **App auto-discovery**: vite.config.ts dynamically finds all apps in src/apps/
- **File persistence**: `npm run sync` saves existing Kintone files; subsequent uploads preserve them
- **Multi-environment**: KINTONE_ENV variable tags schema files (dev/prod)
- **WSL compatibility**: File watcher uses polling mode for WSL environments

## Adding a New App

1. Run `npm run create` (interactive)
2. Or manually:
   - Create `src/apps/<app-name>/index.ts` and `style.css`
   - Add `<APP_NAME>_ID=xxx` to `.env`
   - Add entry to `kintone.config.ts` apps object

## App Source Template

```typescript
// src/apps/my-app/index.ts
import './style.css';

(() => {
  'use strict';

  kintone.events.on('app.record.index.show', (event) => {
    // Record list view
    return event;
  });
})();
```

## Claude Code Custom Commands

Available in `.claude/commands/`:
- `/kintone-schema` - Fetch app schema
- `/kintone-diff` - Compare environment schemas
- `/kintone-fields` - Display field list from schema
