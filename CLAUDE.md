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
- Masters live in `features/company|manufacturers|technicals|hsnCodes|products|tehsils|reasonCodes/` with pages in `pages/masters/` and
  `pages/products/`. Hide edit buttons with `useCanEditMasters()` (the API is what enforces it). Forms are validated with
  `checkForm(schema, values)` from `schemas/fields.ts`; GST is typed as percent and sent as basis points.
- The bank account number is never in the browser: the form's number box starts empty and the API returns only the last
  4 digits (`maskedAccount()` in `utils/format.ts`).
- Parties live in `features/sellers` and `features/buyers` with pages in `pages/parties/`; their menu entries are limited
  by `roles` (Sellers: Purchase side, Buyers: Sales side). Use `TehsilPicker` and `ManufacturerChecklist` for those fields.
- Listings live in `features/listings` with the page in `pages/listings/` (Purchase side, limited by `roles`). The form
  asks `POST /listings/preview` for the box value, duplicates and rate drops; use `SellerPicker` and `SkuPicker` for the
  seller and pack. Rupees are typed and sent as paise with `rupeesToPaise()` (`schemas/fields.ts`); show money with
  `formatRupees()` (`utils/format.ts`).
- The margin matrix lives in `features/margins` with the page in `pages/masters/MarginMatrixPage.tsx` (Controller, Founder,
  Admin see it; only Founder/Admin get the change button). Saving asks for the password first (`useCreateMarginCell`
  calls `confirmPassword()` then saves): copy that pattern for any other step-up action.
- The Sales rate board lives in `features/board` with the page in `pages/board/RateBoardPage.tsx`; the buyer is chosen with
  `BuyerPicker` (`features/buyers`). Rates arrive finished from the API (`buyerRatePaisePerUnit`); the admin app never works
  out a margin and the API never sends a seller, landed rate or margin to this screen. A `null` rate shows "Rate unavailable".
- Not yet built: MFA, the SKU ₹/unit matrix, the buyer funnel on the board and other role-specific screens.
- Do not add: Redux, Zustand, React Hook Form, TanStack Table, analytics, auth/PDF libraries, paid UI kits
  (unless the task says so).
