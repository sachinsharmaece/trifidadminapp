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
  pages/        Thin screens: login, staff, masters/ (company, manufacturers, technicals, HSN codes, tehsils, reason codes), parties/ (sellers, buyers), listings/, products/, dashboard
  features/     Business modules, one folder each (auth, staff, company, manufacturers, technicals, hsnCodes, products, tehsils, reasonCodes, sellers, buyers, listings)
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

## Masters (features/manufacturers, technicals, hsnCodes, products, tehsils, reasonCodes, company)

Menu: Products, Manufacturers, Technicals, HSN codes, Tehsils, Reason codes, Company. Everyone can look; the add / edit / turn-off buttons show only to
Founder and Admin (`useCanEditMasters()`; the API enforces it too). Each feature folder has the same shape: `api.ts`
(Zod-parsed calls), `hooks.ts` (TanStack Query), a form and a table. The small masters (manufacturers, technicals, HSN
codes, reason codes) load their whole list and search it in the browser; **Products** and **Tehsils** (thousands of
rows) are searched and paged by the server (`?q&page`).

- A form is checked with a function from `schemas/` (`checkForm` gives either clean data or one message per field).
  GST is typed as a percentage ("18", "2.5") and sent as basis points (1800, 250): see `percentToBp` in `schemas/fields.ts`.
- Add and edit share one form: pass the record to edit it, leave it out to add (`ManufacturerForm`, `TechnicalForm`, ...).
- `/products/new` creates a product with its first pack(s) in one request. `/products/:id` shows the details and the packs
  (add, edit, turn off). Picking an HSN code fills in its GST rate; the person can still change it for that product.
- Products store ids; `useProductLookups()` loads the three lists so screens can show names.
- **Tehsils**: the pincodes are typed in one box, separated by spaces, commas or new lines; each must be 6 digits.
  Search accepts a pincode or part of the state / district / tehsil name.
- **Company** (`/company`): one form, not a table. Founder and Admin edit it; everyone else sees a read-only summary.
  The bank account number box is always empty: the server never sends the saved number, only its last 4 digits (shown
  as `•••• •••• 4321`). Leave it empty to keep the saved number, or type a new one to replace it. The GSTIN is checked
  with the same check-character rule as the server (`schemas/ids.ts`), ready for the buyer and seller forms later.
- **Reason codes**: the "Used for" choice starts empty on purpose (no default context) and, with the code, is locked
  after the reason is created. The filter above the table narrows the list to one context.

## Parties (features/sellers, buyers)

Menu: **Buyers** (Sales, Controller, Founder, Admin) and **Sellers** (Purchase, Controller, Founder, Admin). The menu
entry only hides the link: the API answers 403 to the other roles, and the page then shows "Could not load ...". The
folders have the same shape as the masters (`api.ts`, `hooks.ts`, a form, a table); the pages in `pages/parties/` search
and page on the server like Tehsils. Anyone who can open the page can add, edit and turn off.

- Two shared pickers: `TehsilPicker` (`features/tehsils/`: nothing is listed until 2 characters are typed, and only tehsils
  that are turned on can be chosen) and `ManufacturerChecklist` (`features/manufacturers/`: the "dealer of" ticks).
- **Seller**: the bank account number works like the Company's: the box is empty when editing, empty means "keep the saved
  number", and the table shows `•••• •••• 9012`. The cut-off is a time box.
- **Buyer**: mobile numbers go in one box separated by commas (1 to 5). The GSTIN is optional: empty means a consumer, and
  the server works out the state from the tehsil. The rate tier shows "Indicative" until **Classify now** is clicked.
- A duplicate (same GSTIN, mobile or bank account) comes back from the server as a message naming the existing party; it is
  shown above the form. Form checks are in `schemas/sellerForm.ts` and `schemas/buyerForm.ts`; the trade positions and
  tier names are in `types/party.ts` (a copy of the server enum).

## Listings (features/listings)

Menu: **Listings** (Purchase, Controller, Founder, Admin; any other role gets the API's 403, shown as "Could not load
listings"). The page (`pages/listings/ListingsPage.tsx`) lists sellers' offers newest first, with a search box (seller or
product) and a status filter that starts on **Active**. Pausing or withdrawing a listing therefore moves it out of that
view: choose **Paused** or **All statuses** to see it again.

- **Add listing** opens `ListingForm`. The seller and the pack are chosen with `SellerPicker` (`features/sellers/`) and
  `SkuPicker` (`features/products/`): type 2 or more characters, and only active sellers, and the active packs of active
  products, are offered.
- Rates are typed in rupees (`rupeesToPaise()` in `schemas/fields.ts`, up to 2 decimals) and sent as paise. **FOR Indore**
  has one rate box; **Ex rate + COL** has the Ex rate per unit and the COL per box.
- **What this comes to** asks the server (`POST /listings/preview`) once the form is complete and typing has paused. It
  shows the landed rate per unit, the value of one box and of the minimum order. If the seller already has the same offer
  live it says so and **Add listing** is disabled. If the rate is lower than the allowed drop it shows the percent and
  both rates and asks for a tick (**Yes, the lower rate is correct**), which sends `confirmDecrease`. Changing the rate
  clears the tick.
- A listing is never edited. The table has **Pause**, **Resume** and **Withdraw** (withdrawing asks first and is final).
  The seller, pack and rate type are shown in the row; an Ex listing also shows the Ex rate and COL it came from.
- Form checks are in `schemas/listingForm.ts`; the choices and their labels are in `types/listing.ts` (copies of the server
  enums: change both together). "Company billing" is the label for the `SOURCED` source.

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

MFA, margin matrix, the Sales-side rate board, and the business modules after listings (orders, trades, …).
