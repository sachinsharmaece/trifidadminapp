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

Start `trifidserverapp` too (`npm run dev` in that folder). The Dashboard's **API status** card (Founder and Admin) shows whether the
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
  pages/        Thin screens: login, staff, masters/ (company, manufacturers, technicals, HSN codes, tehsils, reason codes), parties/ (sellers, buyers), listings/, products/, board/, trades/, salesOrders/, purchaseOrders/, books/ (payments, to be billed, ledgers, bank accounts), dock/ (dock, return notes), trips/, reports/ (registers, trial balance, integrity), dashboard
  features/     Business modules, one folder each (auth, staff, company, manufacturers, technicals, hsnCodes, products, tehsils, reasonCodes, sellers, buyers, listings, margins, board, trades, salesOrders, payments, purchaseOrders, ledgers, bankAccounts, dock, billing, trips)
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

Menu: Products, Manufacturers, Technicals, HSN codes, Tehsils, Reason codes, Company (the Margin matrix has its own section below). Everyone can look; the add / edit / turn-off buttons show only to
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

## Margin matrix (features/margins)

Menu: **Margin matrix** (Controller, Founder, Admin; any other role would get the API's 403, so the link is hidden from
them). The page (`pages/masters/MarginMatrixPage.tsx`) has a 3 × 4 grid (class A/B/C down, buyer tier across) showing
the margin in use now ("since 12 Nov 2026"), and under it a table of every change ever made, newest first, each marked
**In use**, **Scheduled** or **Replaced**. A box nobody has set shows "Not set": real margins are not entered yet
(Q-PRC-07; in development, `npm run db:seed-demo` in the server fills them with made-up values), and the Rate board says "Rate unavailable: margin cell missing" for a pair with no cell.

- Only Founder and Admin (`useCanEditMasters()`) see **Change a margin** and the small button inside each box. The form
  (`MarginForm`) takes the class, the tier, the margin as a percent ("12.5", sent as basis points), the date it starts
  (today or later, in Indian time) and **Your password**.
- The password is asked every time, even though the server accepts a check made in the last 5 minutes: it is the step-up
  from SRS-AUTH-05. `useCreateMarginCell()` first calls `confirmPassword()` (`features/auth/api.ts`, `POST /auth/step-up`) and then saves the cell. A wrong password stays on the form with "The password is not correct." and
  does not sign the person out.
- A margin is never edited: **Change** adds a new cell. If the date is today the new margin is in use at once; a later
  date shows as "Then 14% from 1 Dec 2026" in the grid. Starting on or before the pair's latest cell is refused by the
  server (409) and shown above the form.
- Form checks are in `schemas/marginForm.ts` (`validateMarginForm`); the class and tier lists are in `types/margin.ts`.
- `formatDate()` (`utils/format.ts`) always shows Indian time, whatever the computer's own time zone is.

## Rate board (features/board)

Menu: **Rate board**, next to Buyers (Sales, Controller, Founder, Admin; the API gives anyone else a 403). The page
(`pages/board/RateBoardPage.tsx`) is the Sales price list for one buyer: pick the buyer, then see every offer we can quote
him today with **our rate per unit** and the value of a box.

- The buyer is chosen with `BuyerPicker` (`features/buyers/`, like `SellerPicker`): type 2 or more characters; only buyers
  that are turned on are offered. Nothing is shown until a buyer is chosen. Changing the buyer clears the search.
- `useBoard()` (`features/board/hooks.ts`) asks `GET /buyers/:id/board`. It never uses a cached copy (`staleTime: 0`): a
  quoted rate must match what is saved now. The search box filters by product name on the server; the table is paged.
- A row shows product, pack, units per box and maker, the buyer rate, the box value, minimum / available boxes and shelf life.
  The rate comes finished from the server (landed rate plus margin). The page never sees the seller, the seller's rate or the
  margin, because the API does not send them.
- **Rate unavailable: margin cell missing** takes the place of the rate when the margin matrix has no cell for that pack's
  class and the buyer's tier. Fill the box on the Margin matrix screen.
- A buyer who is not classified yet is priced as a Retailer: the page shows an **Indicative** badge, a note, and "indicative"
  under each rate. **Classify now** on the Buyers page confirms his tier and the board then uses it.
- Sales, Founder and Admin (the Controller only looks): **Open** on a row starts a trade for this buyer and goes to its deal card (opening the same row again goes
  back to the same open trade). **Ask for an item not listed** (top right, once a buyer is chosen) records what the buyer
  wants that is not on the board, and also goes to the deal card.

## Deal cards and funnels (features/trades)

One trade engine on the server (Q-WF-01, Option 3); these screens only show a trade and press its buttons.

- **Deal card** (`pages/trades/TradePage.tsx`, `/trades/:id`): the trade number, its stages (`b1 Viewing` … on the buyer
  side, `s0`/`s1` on the seller side), what is due by when, the buttons, what this person may see, and the history.
- The buttons come from the server (`trade.actions`): the page never decides who may press what. A button of another desk
  is greyed with who does it ("Purchase does this"); Founder and Admin may press every button (they have every right,
  Q-ROL-01). Pressing one opens its small form (`actionForms.tsx`, one per
  action) under the buttons. The server checks every rule again, and its field messages show under the fields
  (`serverFieldErrors()` in `schemas/fields.ts`).
- Every press sends the trade's `version`. If someone else moved the trade first, the server says 409 and saves nothing:
  the card reloads, the open form closes, the new stage shows, and a red note says "Someone else acted on this trade
  first, so your change was not saved" (`TradeActions.tsx`, `isChangedByOthers()` in `hooks.ts`).
- What a person sees comes from the API: Sales gets the buyer side (buyer, board rate or the offer), Purchase the seller
  side (seller, landed rate, his answer), Controller/Founder/Admin both. `TradeFacts.tsx` shows the parts that came back.
- After the seller answers, Sales presses **Send to buyer** (the form says what to tell him: boxes, rate, box value,
  expiry), then **Buyer says yes** (raises his sales order; the card links it) or **Buyer says no** (a reason from the
  reason codes, context "Buyer said no"). At b6 **Buyer drops the order** cancels the order (context "Lost at stage
  B6"); a lost trade shows why, and **Reopen** takes it back to b2. At b6 Sales also presses **Enter payment** (our
  bank account, UTR, amount, the day it came in; the form shows what is still open), and Accounts **Confirm payment** /
  **Payment not received** (pick the waiting payment). The card lists the payments and what is still due; once paid
  in full it moves to b7 and links the PO. Reasons come from `useReasonCodes()`, filtered to the
  form's context and turned-on codes. The "no" buttons are the quieter (white) ones.
- **Buyer funnels** (Sales, Controller, Founder, Admin) and **Seller funnels** (Purchase's queue; Purchase, Controller,
  Founder, Admin): `FunnelView.tsx`, one list with a tab per stage (with counts), search and paging. Whoever must act
  soonest is first. A seller decline sends Purchase back to the Seller funnels.
- Data: `features/trades/api.ts` (Zod schemas, one `runAction(trade, action, input)` for every button) and `hooks.ts`
  (`useTrade`, `useFunnel`, `useTradeAction`; a change refreshes the card and both lists). Nothing is cached: another
  desk may have acted.

## Sales orders (features/salesOrders)

Menu: **Sales orders** (Sales, Accounts, Controller, Founder, Admin; the API gives anyone else a 403). Read only: an
order is raised by **Buyer says yes** and cancelled by **Buyer drops the order** on the deal card (one trade engine).

- `/sales-orders` (`pages/salesOrders/SalesOrdersPage.tsx`): newest first, search by order number or buyer, filter by
  status, paged. Shows when payment is due (red once overdue).
- `/sales-orders/:id` (`SalesOrderPage.tsx`): the buyer as on the order, the frozen line (rate per unit, box value,
  boxes, line total, HSN, GST rate, expiry and batch), and the total with the GST worked back out of it (CGST + SGST in
  Madhya Pradesh, IGST for another state). The server sends the seller and his rate only to Controller, Founder and
  Admin, so the page shows the "Seller rate" column only when it came back. "Open the deal card" is shown to the roles
  that can open trades (not Accounts).
- The order page also shows "Still due" and its payments (waiting, confirmed with the voucher number, or not received
  with the note).
- Data: `features/salesOrders/api.ts` (Zod schemas) and `hooks.ts`. The query keys sit under `['trades']`, so a deal
  card button also refreshes the order list and page. `SalesOrderStatusBadge` shows the status everywhere.

## Dispatch and the dock (features/dock, trades/dockActionForms.tsx)

After the PO (Build 3, LOCK-40). Every button presses an engine action; the server checks everything again.

- **Record dispatch** and **Seller bill** (Purchase, on the deal card at s3–s6): how the seller sent the goods to
  Indore (transport + LR, bus + driver's mobile, or a depot note), the freight (paid by the seller, or to pay at Indore
  with the amount), the dispatch date, and per PO line the batch and expiry he packed (and "short expiry agreed"). The
  seller's bill: number, amount, date (a different amount than the PO is saved with a warning; entering it again
  replaces it).
- **Dock** (`/dock`, `pages/dock/DockPage.tsx`; Logistics, Controller, Founder, Admin): three lanes. **Coming**:
  dispatched, not here yet (red after 4 days on the road) → **Goods arrived** (when, boxes counted, bill with the
  goods). **Arrived: to check** (check within a day) → **Check the goods** (`features/dock/InspectionForm.tsx`): per
  line the batch and expiry found and the damaged, leaking and extra boxes; short boxes are worked out (ordered −
  counted) and the form previews short and accepted as you type. **Checked**: the result and any return notes. The
  dock never shows firm names or money. The Controller only looks. Founder and Admin also get both forms on the deal
  card (the same components).
- **Return notes** (`/return-notes`; Purchase, Logistics, Controller, Founder, Admin): open notes, due soonest first,
  closed as picked up, shipped back or disposed (with the return freight, if any). Purchase gets a link to the PO.
- After the check the deal card shows the PO's progress (dispatched, bill, arrived, checked, owed to the seller) on the
  seller side and **Refund to the buyer** on the buyer side (also on the order page; Due until a payout pays it, then Paid with its UTR).
- Data: `features/dock/api.ts` and `hooks.ts` (query keys under `['trades']`); form rules in `schemas/dockForms.ts`;
  labels in `types/dock.ts`.

## Billing, trips and delivery (features/billing, features/trips, trades/billingActionForms.tsx)

To the buyer (Build 4). Every button presses an engine action; the server checks everything again.

- **To be billed** (`/to-be-billed`, `pages/books/ToBeBilledPage.tsx`; Accounts, Controller, Founder, Admin): orders
  the dock has checked, oldest first, each with what was accepted at the buyer's rate ("At most ₹X to bill") and any
  refund due. **Enter Marg bill** (`features/billing/MargBillForm.tsx`, also on the deal card for Founder and Admin):
  the Marg invoice number, e-way bill, date, boxes billed per line and the total. Q-ACC-02: the bill may be lower than
  the accepted value (the form shows by how much) but never higher (the form warns; the server refuses with "Check 3").
  The **Billed** filter lists the ones done. The Controller only looks.
- **Trips** (`/trips`, `pages/trips/TripsPage.tsx`; Logistics, Controller, Founder, Admin): **Billed: to load** (Marg
  bills on no trip, with boxes, destination, batch and expiry) → **Add to trip** (a planned trip and how it goes on:
  transport company, bus parcel or deliver direct). **New trip**: date, vehicle, driver and mobile. **Planned**: remove
  a bill, **Check out**. **Out**: the WhatsApp text for the driver (with "Open in WhatsApp") and **Proof of dispatch**
  per bill (LR or receipt number and date): the buyer moves to b9 Dispatched. The last POD closes the trip
  (**Closed**). Trips never show firm names or money. The Controller only looks.
- **Delivered** (Sales, on the deal card at b9): b9 → b10, the order is Delivered. The card and the order page show a
  "Billing and delivery" block (accepted, Marg bill, trip, POD, delivered) via `features/billing/billingRows.ts`.
- Data: `features/billing/api.ts` + `hooks.ts`, `features/trips/api.ts` + `hooks.ts` (query keys under `['trades']`);
  form rules in `schemas/billingForms.ts`; trip and "book with" labels in `types/dock.ts`.

## Payouts (features/payouts)

Seller payments and buyer refunds (Build 5). Menu: **Payouts** (`/payouts`, `pages/books/PayoutsPage.tsx`; Accounts,
Controller, Founder, Admin). Two views, **To pay** and **Batches**. Nothing counts as paid until the bank's UTR is typed.

- **To pay** (`ToPayTab.tsx`): checked purchase orders (the seller's bill on file; "Waiting for the seller's bill" and a
  disabled tick until then) with the accepted value, any freight paid at Indore taken off, and the net amount; and refunds
  due to buyers. Tick what to pay, choose the bank account ("Pay from") and **Build batch**: a draft. The Controller only
  looks (no ticks, no button).
- **Batches** (`BatchesTab.tsx`, `BatchCard.tsx`): filter Draft / Released / Cancelled, search by batch number or payee.
  A **Draft** has **Release** (Founder and Admin only, never a batch you built: the card says "someone else releases it";
  `ReleaseForm.tsx` asks for the password, `useReleaseBatch` calls `confirmPassword` first like the margin form) and
  **Cancel batch** (Accounts, Founder, Admin; asks "Yes, cancel it"). A **Released** batch has **Add bank proof** on each
  line (`ProofForm.tsx`: the UTR and the date paid). A seller's proof closes the deal on the seller side; a refund's proof
  marks the refund Paid. A line shows its UTR, date and voucher number once paid.
- On the **PO page** and the **seller side of the deal card**: "Payment to the seller" (not in a batch yet, waiting for
  release, waiting for the bank proof, or Paid with the UTR), a **Seller paid** badge, and the same badge on the PO list
  (`features/payouts/payoutText.ts`). **Refunds** on the deal card and the order page show Due or Paid with the UTR
  (`RefundLine.tsx`). Sales never sees the seller's payment.
- Data: `features/payouts/api.ts` + `hooks.ts` (query keys under `['trades', 'payouts']`, so every payout also refreshes
  cards, orders and ledgers); form rules in `schemas/payoutForms.ts`; labels in `types/payouts.ts`. The server's
  `recordSellerPayment` action has no card button (the Payouts screen presses it).

## Complaints (features/complaints, trades/complaintActionForms.tsx)

A buyer may complain for 7 days after the proof of dispatch (Build 6). Menu: **Complaints** (`/complaints`,
`pages/complaints/ComplaintsPage.tsx`; Sales, Controller, Founder, Admin). Purchase, Accounts and Logistics have no menu
entry and the server answers them 403: complaints are buyer side only.

- **Raise** (`RaiseComplaintForm`, the deal card button **Buyer complains**, Sales; at b9 Dispatched or b10 Delivered).
  Fields: what is wrong (damaged on arrival, boxes short, wrong item, quality, other), a **reason** from the reason codes
  (context "Complaint", turned on, nothing chosen by default), the boxes affected (optional) and what the buyer says.
  The card goes to **b11 Complaint**. The card also says "the buyer may complain until <date>" (`complaintByAt`); after it
  the server refuses (409) and the form shows its message.
- **Resolve** (`DecideForm`, the card button **Resolve the complaint**, or **Resolve** on a row of the Complaints page;
  Controller, Founder, Admin). One decision: no action, a credit note (rupees, with GST), a replacement, a return or a
  refund (the last three take boxes). The note is required and **Sales reads it**, so the form says "Do not name the seller".
  The server caps a credit or refund by the Marg bill and earlier complaints and says so under the field. A refund then
  waits in Payouts; a credit note is posted to the buyer's account (`JV-` number shown).
- **The Complaints page**: tabs **Open (n)** and **Decided (n)**, search by complaint number or buyer, one card per
  complaint (`ComplaintCard.tsx`) with links to its order and deal card. (The clocks' "Run now" button moved to the
  **Today** page in Build 7.)
- Complaints show on the deal card (`TradeFacts`, buyer side only) and the sales order page, through `ComplaintLines.tsx`.
  The Purchase view of a card carries none.
- Data: `features/complaints/api.ts` (the complaint schema and list) and `hooks.ts` (query keys under
  `['trades', 'complaints']`, so any card button refreshes the list); form rules in `schemas/complaintForms.ts`; labels in
  `types/complaint.ts`. `useTradeAction` takes just a trade's id and version, so the list can resolve without opening the card.

## Today, lost in transit and the payout hold (features/today, trades/controllerActionForms.tsx)

The Controller's desk (Build 7). Menu: **Today** (`/today`, `pages/today/TodayPage.tsx`; Controller, Founder, Admin only:
the server answers everyone else 403). It lists what has run past its time. Nothing here acts by itself except the two
clocks the server runs (delivery, and archiving a b1 viewing nobody touched for 7 days).

- **Goods that should have arrived**: shipments still on the road after the arrival time, with the buyer, seller, PO and
  boxes. **Close as lost** opens the same form as the deal card (`LostInTransitForm`; only the trade's id and version are
  needed): a note is required (250 characters). The buyer is then refunded in full (Accounts pays it from Payouts), the
  seller gets a strike, and the deal shows under the funnel tab **Lost in transit**; Sales may reopen it.
- **Complaints**: how many are open and how many are past the 48-hour limit, with a link to the Complaints page.
- **Other clocks that ran out**: a table of deals whose clock ran out, with what they wait for and the desk that should
  act (Purchase, Sales, Logistics). They only show: the desk does its job, or the Controller steps in.
- **Payouts on hold**: seller payouts the Controller stopped, with the reason and a link to the deal card to release.
- **Run the clocks now** (top right) runs the two clocks and says what they did ("0 trades marked delivered, 1 viewing
  archived"). The server also runs them every 15 minutes.
- **The hold** is on the deal card, seller side: **Hold the payout** (a reason is required) and **Release the hold**
  (`HoldPayoutForm`, `ReleaseHoldForm`); only the one that applies shows. The PO page shows "Payout on hold" with the
  reason, the PO list has a badge, and To pay shows "On hold: <reason>" with the tick disabled. **Sales never sees any of
  it**: the server leaves the buttons and the history lines out of the buyer side.
- New funnel tabs **Lost in transit** and **Archived** come from the stage list in `types/trade.ts` (an archived viewing
  has no buttons; Sales opens a fresh one from the Rate board). The PO status **Lost in transit** is in `types/dock.ts`.
- Data: `features/today/api.ts` and `hooks.ts` (query key `['trades', 'today']`, so any card button refreshes it);
  form rules in `schemas/controllerForms.ts`.

## Registers, dashboards and the integrity check (features/reports, features/system)

Build 8. Everything here only reads; the server works the numbers out (`trifidserverapp` README, "Registers, reports,
dashboards and the integrity check") and these screens only draw them.

- **Sales register** (`/reports/sales-register`; Accounts, Controller, Founder, Admin) and **Purchase register**
  (`/reports/purchase-register`; those and Purchase). Pick **From** and **To** (the default is the first of this month to
  today), search (debounced), page through the rows, read the **totals of the whole range** in the footer, and press
  **Download CSV** for the same range and search. The sales register shows the buyer and his GSTIN; the purchase register
  shows the seller and his GSTIN, with "Bill awaited" until Purchase has entered the seller's bill. They are two pages on
  purpose: no screen shows a buyer and a seller on the same row, and Accounts never sees a rate or the word "margin".
  A tax column that does not apply shows a dash (CGST + SGST inside Madhya Pradesh, IGST outside). Both tables sit in a
  scrolling box so a phone does not scroll sideways.
- **Trial balance** (`/reports/trial-balance`): pick **As on**; every ledger with its Debit or Credit balance, a Total
  line and a **Balanced** badge. "Does not balance: tell the Controller" means the books are wrong. It has a CSV too.
- **Integrity check** (`/integrity`; Controller, Founder, Admin): the last run (when, who or "nightly", what it looked at,
  and each finding with the record to look at), **Run the check now**, and the earlier runs. The check only reads and
  runs by itself every night; a finding is for a person to correct. The goal is zero.
- **Dashboard** (`/`, `pages/dashboard/DashboardPage.tsx`, `features/reports/DashboardView.tsx`): one view per role. The
  server decides what each role gets, so this page only draws what came back: number tiles (amber when something is
  waiting, red when it is late; most are links to the queue behind them), the funnel counts (a title opens the funnel
  page) and, for Controller, Founder and Admin, the lost deals of the month. Founder and Admin also keep the **API status**
  card. Margin shows only for Controller, Founder and Admin because the server sends it only to them.
- **Proforma (PDF)** on a sales order and **Purchase order (PDF)** on a PO (not for a cancelled order). If the company
  details have not been saved yet, the page says "Add the company details first" (Masters, Company).
- Downloads: `features/reports/download.ts` (`downloadFile`) fetches with the signed-in session as a file and saves it
  with the name the server gave; `useDownload()` gives a button its busy state and error. The API client turns an error
  that arrives as a file into the same plain message as any other (`services/api/client.ts`, `readErrorBody`).
- Data: `features/reports/api.ts` (Zod schemas) and `hooks.ts`, `features/system/api.ts` and `hooks.ts`. The query keys
  sit under `['trades']`, so any deal card button also refreshes the registers, the dashboard and the integrity tile.

## Payments, the PO and the books (features/payments, purchaseOrders, ledgers, bankAccounts)

The rule (Q-ACC-01): the PO goes to the seller only when the order is **paid in full**; a smaller payment is kept as
an advance. Sales enters a payment on the deal card; Accounts confirms it. Nobody confirms a payment they entered
(maker ≠ checker, Founder and Admin included).

- **Payments to confirm** (`/payments`, `pages/books/PaymentsPage.tsx`; Accounts, Controller, Founder, Admin): the
  Accounts desk queue, oldest first, with a status filter and search. **Confirm** and **Not received** (with a note)
  press the same engine actions as the deal card (`POST /payments/:id/confirm|reject`, with the trade's `version`). A
  row you entered says "You entered it: someone else confirms" instead of buttons. The Controller only looks.
- **Purchase orders** (`/purchase-orders`, `/purchase-orders/:id`; Purchase, Accounts, Controller, Founder, Admin):
  read only. A PO is raised by the server when a payment makes the order paid in full; it shows the seller, the line at
  the seller's rate and "Dispatch by". It never shows the buyer or our selling rate.
- **Ledgers** (`/ledgers`, `/ledgers/:id`; Accounts, Controller, Founder, Admin): every ledger with its Dr, Cr and
  balance, and one ledger's statement (its voucher lines with the running balance). A bank account's statement is the
  bank book (Q-ACC-09: the vouchers are the only books). `BalanceText` shows "₹X Dr" / "₹X Cr".
- **Bank accounts** (`/bank-accounts`; Accounts, Controller, Founder, Admin see; Founder and Admin add or change): our
  bank and cash accounts. Only the last 4 digits of the number ever come back. Turn one off instead of deleting it.
- Data: `api.ts` (Zod schemas) and `hooks.ts` in each folder; the payment and PO query keys sit under `['trades']`, so a
  confirm also refreshes the deal card, the order and the lists. Money is typed in rupees and sent as paise.

## The rest of the books (features/journals, vouchers, reconciliation, payments, ledgers, dock)

Build 9. The server keeps every rule (`trifidserverapp` README, "The rest of the books"); these screens type, show and
press. The Controller only looks everywhere here, except that he may reverse a voucher.

- **Ledgers** (`/ledgers`): Accounts, Founder and Admin see **Add a ledger** (a name and one of seven groups: expenses,
  income, duties and taxes, capital, loans, cash) and, on a ledger made by hand, **Rename** and **Turn off** (only when
  its balance is zero; it can be turned on again). Buyer, seller, bank and system ledgers say "Kept by the system".
- **Journals** (`/journals`, `pages/books/JournalsPage.tsx`; Accounts, Controller, Founder, Admin): **New entry** types a
  journal or the opening balances (Kind), with a date, what it is for, and two or more lines. Each line's ledger is
  picked with `LedgerPicker` (type a few letters; a buyer or seller with no ledger yet is offered too). The live totals
  say when debits and credits differ. The entry then waits: **someone other than the person who typed it** presses
  **Approve** (it is posted) or **Reject** (with a note); the person who typed it sees "You typed it: someone else
  approves" and may **Cancel entry**. Click an entry's number to see its lines.
- **Vouchers** (`/vouchers`): every voucher, with type, date range and search; click a number to see its lines.
  Controller, Founder and Admin see **Reverse** on the vouchers that can be undone here (a posted journal, an unused
  hand-added payment): a reason and the password again (`confirmPassword()` first, then the call). Every other voucher
  says in plain words where it is corrected; a reversed one says "Reversed by RX-…".
- **Payments** (`/payments`): **Add a payment** is money that came with no order (bank, buyer picked with a search, UTR,
  amount, date, note). A different person confirms it. **Advances to use** lists each buyer's unused money and his
  orders waiting for payment, with **Use the advance** (oldest money first, never more than the order needs). The deal
  card shows the advance too, and Founder and Admin may press "Use the buyer's advance" there; Sales sees it greyed.
  A payment that came from an advance says "From advance" on the card and the order.
- **Bank reconciliation** (`/bank-reconciliation`): each bank account with the day it is reconciled up to, the entries
  since and what the books say. **Check against statement** takes the statement's closing balance for a day; the
  history shows the difference, and only a difference of zero gets **Mark reconciled**. After that the day is locked
  for that bank account: an entry dated on or before it is refused with a plain message.
- **Dock** (`/dock`, Checked lane): **Correct the check** opens the check form filled with what was typed the first
  time; saving replaces the check (the card then says "Corrected"). When it is too late (the Marg bill is saved, the
  payout started, a return note is closed or its refund is in a payout) the card says why instead. A refund the
  correction replaced shows "Cancelled: the check was corrected".
- Dashboard (Accounts): **Journals waiting for approval**, **Advances not yet used** and **Banks to reconcile** open
  their pages.
- Data: `features/journals`, `features/vouchers`, `features/reconciliation` (and `payments`, `ledgers`, `dock`):
  `api.ts` with Zod schemas and `hooks.ts`. `refreshBooks()` (`features/journals/hooks.ts`) refreshes every list that
  reads the books after a journal or a reversal. Form rules are in `schemas/booksForms.ts`.

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

MFA, the SKU ₹/unit matrix (P2), stock for replacements and returns, payout run times, a seller hold and the return-freight debit, photos
at dispatch, the dock and the POD (Q-ARC-02), a vehicle register, refunding an unused advance, un-reconciling a day,
and insurance on an order (Q-SAL-04).
