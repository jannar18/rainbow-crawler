---
title: "feat: Deploy to Netlify via rainbow-crawler repo"
type: feat
status: active
date: 2026-02-16
---

# feat: Deploy to Netlify via rainbow-crawler repo

Deploy the Rainbow Crawler game to Netlify as a static site. Push `julianna` branch as `main` to a new standalone `rainbow-crawler` GitHub repo, connect it to Netlify, and add a `netlify.toml` for reproducible builds.

## Acceptance Criteria

- [x] New `rainbow-crawler` GitHub repo created (public)
- [x] `julianna` branch pushed as `main` to the new repo
- [x] `netlify.toml` added to repo with build command, publish dir, and Node version
- [ ] Netlify site connected to `rainbow-crawler` repo and auto-deploying from `main`
- [ ] Game loads and plays correctly at the Netlify URL
- [x] `npm run build` passes cleanly (TypeScript + Vite build)

## Context

- Build: `npm run build` runs `tsc && vite build`, outputs to `dist/`
- No backend, no env vars, no API keys — pure static site
- Vite config is default (`defineConfig({})`) — no special handling needed
- Current remote: `origin` → `fractal-bootcamp/claude-game.git`
- New remote: `neworigin` → new `rainbow-crawler` repo

## MVP

### netlify.toml (new file at repo root)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

### Git commands

```bash
# Create new repo and push
gh repo create rainbow-crawler --public --source=. --remote=neworigin --push

# Or manually:
git remote add neworigin https://github.com/USERNAME/rainbow-crawler.git
git push neworigin julianna:main
```

### Netlify dashboard setup

1. Connect `rainbow-crawler` repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Production branch: `main`

## References

- Brainstorm: `docs/brainstorms/2026-02-16-netlify-deployment-brainstorm.md`
- Build config: `package.json` (scripts.build = `tsc && vite build`)
- Vite config: `vite.config.ts` (default config)
