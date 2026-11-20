# trifidadminapp (staff web app)

Workspace rules and the server ↔ admin-app contract are in `../CLAUDE.md` (loaded automatically).
Full commands, layout and recipes: `README.md`.

## Commands

`npm run dev` (http://localhost:5173, proxies `/api` to the server on 4000) · `npm run typecheck` ·
`npm run lint` · `npm run format:check` · `npm run build`

## Atomic Design: where code goes

- `src/components/atoms|molecules|organisms|templates`: reusable UI only. No API calls, no business words.
- `src/pages/`: thin screens that compose templates and feature components.
- `src/features/<module>/`: everything for one business module: its components, `api.ts`, query hooks, Zod schemas.
- `src/services/api/`: the Axios client (`apiClient`), `ApiError`, the error-envelope schema.
- `src/app/`: providers, router (`router.tsx`), menu (`navigation.ts`).

## Conventions

- Keep it simple (see `../CLAUDE.md`): no abstraction or component "for later"; plain, readable React.

- Components never call the API. API functions live in `features/<module>/api.ts` (or `services/api/`) and
  parse every response with Zod: `apiClient.get<unknown>(...)` then `schema.parse(data)`.
- Server data in TanStack Query; screen state in `useState`. No Redux/Zustand.
- Imports use `@/` for `src/`. No `any`. Tailwind classes only; reuse atoms before adding new ones.
- New page: route in `app/router/router.tsx` + one line in `NAV_ITEMS` (`app/navigation.ts`).
- Money arrives in paise; convert to rupees only for display. The UI never decides what a role may see:
  the API omits hidden fields.
- Sign-in lives in `features/auth/` (`api.ts`, `hooks.ts`, `RequireAuth.tsx`, `UserMenu.tsx`). "Who is signed in" is the
  TanStack Query entry `['me']`; `null` means signed out. Pages that need a user go inside `RequireAuth` in the router.
- Staff management lives in `features/staff/`; the page is `pages/staff/StaffPage.tsx`. A menu entry can be limited to
  roles with `roles: [...]` in `app/navigation.ts` (only hides the link; the API is what enforces access).
- Masters live in `features/manufacturers|technicals|hsnCodes|products/` with pages in `pages/masters/` and
  `pages/products/`. Hide edit buttons with `useCanEditMasters()` (the API is what enforces it). Forms are validated with
  `checkForm(schema, values)` from `schemas/fields.ts`; GST is typed as percent and sent as basis points.
- Not yet built: MFA, company profile, tehsils, reason codes, margin matrix, other role-specific screens.
- Do not add: Redux, Zustand, React Hook Form, TanStack Table, analytics, auth/PDF libraries, paid UI kits
  (unless the task says so).
