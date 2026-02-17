# Netlify Deployment Brainstorm

**Date:** 2026-02-16
**Status:** Draft

## What We're Building

Deploy the Rainbow Crawler dungeon game to Netlify as a static site. The Vite build (`npm run build`) outputs to `dist/` — Netlify serves that directly.

## Why Netlify

- Already have an account
- Purpose-built for static sites
- Auto-deploys on push
- Free tier is more than enough for a game like this
- Sevalla is overkill (no backend needed), GitHub Pages has fewer features

## Key Decisions

1. **Deploy branch:** `main` (in the new `rainbow-crawler` repo, which is `julianna` pushed as `main`)
2. **Domain:** Default Netlify URL (e.g., `rainbow-crawler.netlify.app`)
3. **Build command:** `npm run build`
4. **Publish directory:** `dist`
5. **No backend/serverless functions needed** — pure static game

## Separate Repo

Push the `julianna` branch as `main` to a new standalone repo (keeps `claude-game` untouched):

```bash
gh repo create rainbow-crawler --public --source=. --remote=neworigin --push
```

Or manually:
1. Create empty repo on GitHub (e.g., `rainbow-crawler`)
2. Add as a second remote and push:
```bash
git remote add neworigin https://github.com/YOUR_USERNAME/rainbow-crawler.git
git push neworigin julianna:main
```

Then point Netlify at the new `rainbow-crawler` repo's `main` branch instead.

## Setup Steps

1. Create new `rainbow-crawler` repo and push `julianna` as `main` (see above)
2. Connect the new repo to Netlify via the Netlify dashboard
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Production branch: `main`
4. Optionally add a `netlify.toml` to the repo for reproducible config

## Optional: netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

## Resolved Questions

1. **Platform** — Netlify (already have account, best fit for static Vite game)
2. **Repo** — New `rainbow-crawler` repo with `julianna` pushed as `main`; Netlify deploys from `main`
3. **Domain** — Default Netlify subdomain for now
