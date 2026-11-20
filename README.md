# trifidadminapp

The TriFid admin web app (boilerplate). The API lives in its own repo, `trifidserverapp`.

React 19 + TypeScript (strict) + Vite 8, laid out with Atomic Design.
Stack: React Router (Data Router), TanStack Query 5, Axios, Zod 4, Tailwind CSS 4. All free and open source.

## Run it

```powershell
npm install          # once
npm run dev          # http://localhost:5173
npm run typecheck    # TypeScript only
npm run build        # type-check, then build to dist/
npm run preview      # serve the built dist/ locally
npm run lint         # ESLint            (npm run lint:fix  fixes what it can)
npm run format       # Prettier, rewrites files   (npm run format:check  only reports)
```

Start `trifidserverapp` too (`npm run dev` in that folder). The Dashboard's **API status** card shows whether the
app can reach the API and whether the API is connected to MongoDB.

Copy `.env.example` to `.env` only if you need to change a value:

| Variable                | Default                 | Meaning                                                               |
| ----------------------- | ----------------------- | --------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | `/api/v1`               | Base URL of every API call.                                           |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:4000` | Dev only: where Vite forwards `/api`. Must match the server's `PORT`. |

Keep `VITE_API_BASE_URL=/api/v1` in dev. The browser then talks to Vite (same origin) and Vite forwards to the API, so
CORS never comes into play. If you set a full URL such as `http://localhost:4000/api/v1`, the browser calls the API
directly, and the API's `CORS_ORIGIN` must be exactly this dev server's address (including the port). If port 5173 is
taken, Vite silently moves to 5174 and every API call is then blocked by CORS (the app shows "Cannot reach the server").

## Code quality

- **ESLint** (`eslint.config.js`): TypeScript rules that use type information (for example a forgotten `await`), plus
  the Rules of Hooks. Async event handlers such as `onClick={save}` are allowed.
- **Prettier** (`.prettierrc.json`): single quotes, 100 columns. ESLint does not argue about formatting.
- **Git hook** (Husky + lint-staged): before each commit, ESLint and Prettier run on the staged files and the commit is
  refused if ESLint finds an error. Hooks are switched on by `npm install` _inside a git repository_. If you run
  `git init` or clone after installing, run `npm run prepare` once.
- **About `npm audit`.** It reports a dev-only `picomatch` advisory (GHSA-fc5q-39xc-vjpf) in the build and lint tooling.
  No patched version exists yet, and it only matters if untrusted text is fed to a glob matcher, which never happens
  here. **Do not run `npm audit fix --force`:** it downgrades Vite to 6 (the build then fails, because the config uses a
  Vite 8 option), breaks ESLint, and swaps this finding for real Vite dev-server vulnerabilities. The check that
  matters for production is `npm audit --omit=dev` (it reports 0).

## Where things go

```
src/
  app/          App.tsx, providers/ (QueryClient, error boundary), router/ (routes + AppShell), navigation.ts (menu)
  components/   UI only. Knows nothing about the business.
    atoms/        Button, Input, Select, Label, Badge, ActiveBadge, Spinner, Icon
    molecules/    FormField, SearchInput, PasswordField, Pagination, ErrorState, ErrorAlert, PageSpinner
    organisms/    Header, Sidebar, NavigationMenu, DataTableToolbar
    templates/    AuthLayout, DashboardLayout, PageLayout
  pages/        Thin screens: login, staff, masters/ (manufacturers, technicals, HSN codes), products/, dashboard
  features/     Business modules, one folder each (auth, staff, manufacturers, technicals, hsnCodes, products)
  services/     api/ (Axios client, ApiError, error envelope, system status)  query/ (QueryClient)
  schemas/      UI-only form validation (Zod)
  hooks/ lib/ utils/ types/ assets/ styles/
```

Rules of thumb:

- **Components never call the API.** API calls live in `services/api/` or `features/<name>/api.ts`.
- **Server data = TanStack Query. Screen state = `useState`.** No Redux or Zustand.
- **Parse every API response with Zod** (`apiClient.get<unknown>(...)` then `schema.parse(data)`).
- Import with `@/` (means `src/`), configured once in `tsconfig.json`; Vite reads it from there.
- Money is integer paise from the API; convert to rupees only for display.

## Sign-in (features/auth)

`LoginPage` validates the form and calls `useLogin()`. The server sets the session cookie and the signed-in user is
saved in the query cache (`['me']`). `RequireAuth` (in `router.tsx`) sends anyone else to `/login`; `UserMenu` in the
header shows the name and the Sign out button. If any call later answers 401 `UNAUTHENTICATED` (session timed out), the
user is forgotten and the login page appears.

A person on a temporary password (new account or reset) is sent to `/change-password` and cannot open anything else until
they choose their own. Anyone can open the same page later from "Change password" in the header.

## Staff (features/staff)

`/staff` (menu entry shown to Founder and Admin) lists staff and lets them add a person, change a role, turn an account
off or on, and reset a password. The server makes up a temporary password and returns it once; the page shows it in a
yellow box to hand over privately. The API enforces who may do what; the page only hides what would be refused.

## Masters (features/manufacturers, technicals, hsnCodes, products)

Menu: Products, Manufacturers, Technicals, HSN codes. Everyone can look; the add / edit / turn-off buttons show only to
Founder and Admin (`useCanEditMasters()`; the API enforces it too). Each feature folder has the same shape: `api.ts`
(Zod-parsed calls), `hooks.ts` (TanStack Query), a form and a table. The three small masters load their whole list and
search it in the browser; **Products** is searched and paged by the server (`/products?q&page`).

- A form is checked with a function from `schemas/` (`checkForm` gives either clean data or one message per field).
  GST is typed as a percentage ("18", "2.5") and sent as basis points (1800, 250): see `percentToBp` in `schemas/fields.ts`.
- Add and edit share one form: pass the record to edit it, leave it out to add (`ManufacturerForm`, `TechnicalForm`, ...).
- `/products/new` creates a product with its first pack(s) in one request. `/products/:id` shows the details and the packs
  (add, edit, turn off). Picking an HSN code fills in its GST rate; the person can still change it for that product.
- Products store ids; `useProductLookups()` loads the three lists so screens can show names.

## Recipes

**Add a page**: create it in `pages/` (or `features/<name>/` if it belongs to a module), add a route in
`app/router/router.tsx`, add one line to `NAV_ITEMS` in `app/navigation.ts`.

**Add an icon**: add one entry to `components/atoms/Icon.tsx`.

**Call a new endpoint**: add a function in `features/<name>/api.ts` (or `services/api/`) that uses `apiClient`
and parses the result with a Zod schema.

## What the API client does (`services/api/client.ts`)

- Sends cookies (`withCredentials`) and has a 15 s timeout.
- Adds a fresh `Idempotency-Key` to every POST, PUT, PATCH and DELETE, unless the caller passes one.
- Turns every failure into an `ApiError` (`status`, `code`, `message`, `details`, `requestId`), reading the
  server's `{ error: { code, message, details, requestId } }` body.
- Never retries by itself. TanStack Query retries failed reads at most twice and never retries 4xx or writes.

## Not built yet (on purpose)

MFA, company profile, tehsils, reason codes, margin matrix, and the business modules after masters (parties, orders, …).
