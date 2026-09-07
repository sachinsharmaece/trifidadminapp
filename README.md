# trifid-adminapp

React, Vite and TypeScript. The seven internal staff surfaces for TriFid (see `ARCHITECTURE.md` §2
for the naming warning — this repository is not only the Admin/masters screen).

Business rules, the data model, the API contract and every decision behind this code live in the
SSOT (`trifid-docs` / `trifid-ssot`), not here.

## Setup

```bash
npm install
copy .env.example .env
```

`trifid-serverapp` must be running (`npm run dev` there) before this app can sign anyone in.

```bash
npm run dev
```

## Scripts

- `npm run dev` — Vite dev server.
- `npm run build` — production build (`tsc -b && vite build`).
- `npm run lint` / `npm run format` / `npm run format:check` — ESLint / Prettier.
- `npm run typecheck` (alias `type-check`) — type-checks `src/` and `tests/`.
- `npm test` — Vitest + React Testing Library.

## Layout

`src/api` one file per server module, request/response types copied from
`trifid-serverapp/src/shared/dto` (`API_CONTRACT.md` §11.2 — no shared package, a contract change
is a reviewable diff in both places) · `src/auth` session context, login, MFA, the route guard ·
`src/components` shared UI, including the eight-state `AsyncBoundary` (`ARCHITECTURE.md` §7.2) ·
`src/desks` one folder per surface — only `admin/` (the employee list) exists so far · `src/lib`
env, permissions, the async-data hook.

**Session note (`TD-006`):** the access token lives in React state only, never `localStorage` —
these are shared shop devices. A page reload silently re-authenticates via the httpOnly refresh
cookie; if that fails, the user lands back on `/login`.
