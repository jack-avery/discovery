# Community Resource Discovery Map — Frontend

## Overview

This directory contains the frontend for a community resource discovery
platform. It supports map-based resource discovery, public contributions,
resource update requests, events, and role-based staff moderation and
management.

The current deployment was developed for the Rideau-Rockcliffe Community
Resource Centre (RRCRC). The software is reusable: downstream deployments can
replace RRCRC-specific branding, geography, content, and assets without
retaining that identity.

## Tech Stack

- React and TypeScript
- Vite
- React Router
- Tailwind CSS
- Leaflet, React Leaflet, and Leaflet MarkerCluster
- Node.js test runner through `tsx`

## Getting Started

### Prerequisites

Direct frontend development uses a Linux or WSL environment with Node.js and
npm. Application development also requires access to the backend API and a
configured map provider.

The repository root provides a Docker-based frontend build through its
`Makefile`.

### Environment Variables

From `front/`, copy the tracked environment template:

```bash
cp .env.example .env.local
```

Configure only the values needed by the deployment:

| Variable | Required | Purpose | Safe example |
| --- | --- | --- | --- |
| `VITE_API_URL` | Yes | Backend API origin or same-origin prefix | `http://localhost:5000` or `/api/v1` |
| `VITE_MAP_PROVIDER` | Yes | Active map provider | `maptiler` or `openstreetmap` |
| `VITE_MAPTILER_API_KEY` | When using MapTiler | MapTiler browser API key | `<your-maptiler-key>` |
| `VITE_MAP_STYLE` | No | Logical or provider-native map style; defaults to `standard` | `standard`, `satellite`, `terrain`, or `outdoor` |
| `VITE_MAP_DEV_FALLBACK` | No | Explicit development-only fallback provider | `openstreetmap` |

Do not commit `.env.local` or real credentials. Vite embeds `VITE_*` values in
the browser bundle at build time, so production values must be supplied to the
build process.

### Install and Run

From `front/`:

```bash
npm ci
npm run dev
```

Vite prints the local development URL. To build or preview the production
bundle:

```bash
npm run build
npm run preview
```

The build output is written to `front/dist/`.

From the repository root, the verified Docker workflows are:

```bash
make front
make build
```

`make front` builds the frontend in a Node container. `make build` builds the
frontend and then the Docker Compose services.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/discover` | Map-based resource discovery and resource details |
| `/submit` | Public contribution flow |
| `/sign-in` | Staff authentication |
| `/setup-password` | Password setup using an issued token |
| `/staff` | Staff dashboard |
| `/staff/submissions` | Submission review and moderation |
| `/staff/skills-follow-ups` | Accepted Skills/Services follow-ups |
| `/staff/users` | Administrator user management |

Resource updates are started from Discover. The compatibility route
`/request-update` redirects into that flow. There is no `/home` route.

## Contributions and Image Uploads

The public contribution flow supports:

- **New Resource** — add a community organization, program, service, or place.
- **Update Existing Resource** — propose changes to a published resource.
- **Event** — submit a one-time or recurring community event.
- **Skills/Services** — offer personal skills, time, space, equipment, or
  similar support for staff follow-up.

Images are optional for New Resource, Event, and Update Existing Resource
contributions. Skills/Services contributions do not use image uploads.

The client accepts JPEG, PNG, and WebP images up to 5 MiB. An existing resource
image is preserved when an update does not provide a replacement.

## Staff Portal

The authenticated staff workspace provides:

- submission moderation, including resource update review;
- New Resource, Event, and Skills/Services review workflows;
- Skills/Services follow-up management;
- category and filter management within staff editing workflows;
- administrator user and role management.

Capabilities are role-based. The staff portal is intentionally unavailable on
mobile-sized viewports; public routes remain available on mobile.

## Testing and Production Build

Tests are colocated with the modules they cover as `*.test.ts` files. Run the
complete frontend suite from `front/`:

```bash
npm test
```

This command supplies its own test-only API base, and tests mock network
requests; a running backend is not required. Targeted `test:*` scripts remain
available in `package.json` for focused development.

Create a production build with:

```bash
npm run build
```

The build runs TypeScript verification before Vite creates the bundle.

## Project Structure

- `src/app` — application layouts, providers, routing, and route protection.
- `src/pages` — route-level pages.
- `src/features` — feature-specific Discover, submission, map, landing, and
  staff implementation.
- `src/components` — shared application and UI components.
- `src/services` — API clients, request mapping, and service integrations.
- `src/types` — shared TypeScript and API models.
- `src/utils` — shared utilities.
- `src/config` — deployment and application-shell configuration.
- `src/styles` — global styles and design tokens.
- `src/assets` and `public` — bundled and browser-served assets.

The `@/` import alias resolves to `src/`.

## Customization and Branding

Organizations can customize deployment identity without changing core feature
logic:

- `src/config/appBranding.ts` controls the community name, short text mark,
  application name, and browser title used by the application shell.
- `src/config/deploymentConfig.ts` controls deployment geography, including the
  initial map centre and address defaults.
- `src/styles/tokens.css` contains centralized colours, typography, spacing,
  and other design-system values.
- `src/assets` contains bundled landing and placeholder images; `public`
  contains browser-served assets such as the favicon.

Some landing-page marketing copy remains in `src/features/landing` and should
also be reviewed for each deployment. Branding is therefore not controlled by
a single file.

## Known Limitations

- The staff portal is designed for desktop and laptop layouts and displays an
  unavailable message on mobile. Public functionality remains available.
- Landing-page featured resource cards do not yet open a specific resource
  detail in Discover. Discover detail selection currently lives in in-memory
  workspace state and does not have a URL-addressable resource-detail contract.
