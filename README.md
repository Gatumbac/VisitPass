# VisitPass

Prototype of VisitPass, a web app that manages visitor access in gated
communities: residents authorize visits from their phone, the gate validates
them with a QR pass, and the administration reviews every entry in reports.

Course project for CCPG1054 Sistemas de Información (ESPOL). The interface is
in Spanish.

This is a front-end prototype. There is no backend: sample data is generated
in the browser and kept in `localStorage`, and every person, ID number and
plate in it is fictitious.

## Roles

| Role | What it covers |
|---|---|
| Resident | Authorize visits, share the QR pass, answer gate requests, history and notices |
| Guard | Scan passes, register walk-in visits, entry and exit log, incidents, offline backup mode |
| Administrator | Reports dashboard, units and residents, guards, full log, settings |
| Visitor | Opens the shared pass link, no account needed |

## Sign in

The role comes from the account. Any password with six or more characters is
accepted.

| Role | Email |
|---|---|
| Resident | `villa24@losceibosdelrio.ec` |
| Guard | `garita@losceibosdelrio.ec` |
| Administrator | `administracion@losceibosdelrio.ec` |

The app clock is fixed: it starts on Thursday 12 November 2026 at 16h02 and
runs from there. Open `#/reset` to restore the sample data and the clock.

On the guard's scan screen, **Escanear** reads the most recent valid pass.
Press and hold it (or Shift + click) to read an expired one.

## Run locally

Requires Node 22 and pnpm 10.

```bash
pnpm install
pnpm run dev
```

The app is served at `http://localhost:8443`.

| Command | What it does |
|---|---|
| `pnpm run dev` | Start the dev server |
| `pnpm run build` | Build the static site into `dist/` |
| `pnpm exec tsc --noEmit` | Typecheck |
| `pnpm run format src` | Format the source |

## Stack

React 19, TypeScript, Vite and Tailwind CSS v4, on the Figma Make project
scaffold. No runtime dependencies besides React.

```
src/
  App.tsx        route table and role guards
  index.css      design tokens and fonts
  lib/           router, state, sample data, pass rules, reports
  components/    UI primitives, layouts, pass ticket, QR, bar chart
  screens/       login, resident, guard, admin, visitor
```

## Deployment

- **Figma Make**: `.figma/make/` holds the scripts Make uses to install,
  preview and publish the project. Keep that folder as is.
- **Static hosting**: `pnpm run build` produces a static site in `dist/` that
  any static host can serve. Routes live in the URL hash, so no rewrite rules
  are needed.

## Fonts

Bricolage Grotesque and IBM Plex Mono are bundled under `src/assets/fonts/`
with their SIL Open Font License texts.
