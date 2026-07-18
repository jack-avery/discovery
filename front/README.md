# RRCRC Discovery — Frontend

Vite + React application for the Resource Discovery map.

## Prerequisites

- Node.js 20+ (or use the Docker-based build in the root `Justfile`)
- npm

## Environment variables

**Do not commit secrets.** Only `/.env.example` is tracked in Git.

### Local development setup

1. Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set your values:

   | Variable | Required | Notes |
   |----------|----------|-------|
   | `VITE_API_URL` | Yes | Backend URL (`http://localhost:5000` for local dev) |
   | `VITE_MAP_PROVIDER` | Yes | `maptiler` or `openstreetmap` |
   | `VITE_MAPTILER_API_KEY` | When using MapTiler | Obtain from [MapTiler Cloud](https://cloud.maptiler.com/) |
   | `VITE_MAP_STYLE` | No | Logical style id (default: `standard`) |
   | `VITE_MAP_DEV_FALLBACK` | No | Dev only — explicit OSM fallback when config is incomplete |

3. Start the dev server:

   ```bash
   npm install
   npm run dev
   ```

`.env.local` is gitignored and loaded by Vite in all modes.

### Why `.env.development` and `.env.production` are not tracked

Vite supports mode-specific env files (`.env.development`, `.env.production`), but this project **does not commit them** because:

- **Secrets leak risk** — API keys (e.g. MapTiler) must never enter version control.
- **Vite inlines `VITE_*` at build time** — production values belong in CI/CD secrets or the deployment platform, not a file in the repo.
- **One template is enough** — `.env.example` documents every variable; each developer or environment supplies its own `.env.local` or pipeline secrets.

### Production builds

`npm run build` inlines all `VITE_*` variables into the bundle. Set them in your CI/CD pipeline before building:

```bash
VITE_API_URL=https://api.example.com \
VITE_MAP_PROVIDER=maptiler \
VITE_MAPTILER_API_KEY=<from-secrets-manager> \
VITE_MAP_STYLE=standard \
npm run build
```

The Docker workflow in the root `Justfile` serves `front/dist` via Caddy — environment variables must be present **at build time**, not at container runtime.

### Optional: mode-specific local overrides

Vite also supports gitignored mode files if you need them:

- `.env.development.local` — overrides during `npm run dev`
- `.env.production.local` — overrides during `npm run build`

These are covered by `.env.*` in `.gitignore`. Most developers only need `.env.local`.
