# The `reference-copy` branch (admin app side)

This branch copies the reference admin's screens (`D:\trifid\trifid_reference\Admin`, read only) "as it is": the same
sidebar, the same pages at the same paths, the same words and Tailwind classes. The API side, the build list and the
full list of rule differences are in `trifidserverapp/docs/REFERENCE_COPY.md`.

## Where the copied screens live

- `src/app/navigation.ts`: the reference sidebar (`components/layout/RoleNav.tsx`), one section per desk. Admin,
  Controller and Founder see every section; "Vehicle owners" only for a Logistics Head.
- `src/pages/ref/<desk>/`: one file per reference page (`app/(desk)/…/page.tsx`), at the reference's path in
  `src/app/router/router.tsx`.
- `src/components/ref/`: the reference's shared components (`components/forms`, `credit`, `dormancy`, `sellLeads`,
  `portal`) and `PortalLoginPanel`.
- `src/pages/portal/` + `components/ref/portal/`: the buyer and seller portals, outside the staff sign-in.
- Our older (main-branch) screens are still routed under `/old/…`, for comparison.

## How the copied pages talk to the API

- `lib/refApi.ts`: `refGet` (throws on an error) and `refSend` (returns `{ ok, data }` or
  `{ ok: false, status, code, field, message, details }`, like the reference's `readApiError`).
- `lib/refMoney.ts` and `lib/refLabels.ts`: the reference's money, date and label helpers.
- `hooks/useOnMount.ts` instead of a `useEffect` that sets state (the lint rule forbids that).
- These pages call the API directly, as the reference pages do. That is the one place this branch does not follow the
  "components never call the API" rule of `CLAUDE.md`; keep it to `pages/ref`, `pages/portal` and `components/ref`.

## Screen differences from the reference

- Not copied: the reference pages its own sidebar no longer links (Receipts, Bank book, Day close, Seller bills, Marg,
  Payouts, Accounts trade queue, the two registers, `/ledgers/buyers|sellers/:id`).
- Statements and the credit log download as CSV, not PDF.
- Upcoming payments: no "Old balance" choice; Payment: a line is paid by its UTR.
- Buyers page: with the dormant policy on, "In the book" / "Pool" tabs (the server says whether it is on through
  `GET /dormancy/me`, instead of the page reading the settings list).
- Portal dashboards: confirmations show PENDING and CONFIRMED only; a seller's PO status reads Awaiting dispatch →
  Dispatched (his own) → Bill received → Goods received → Paid.
- The portal pages check sign-in with `GET /portal/me` (the reference does it in `proxy.ts`).
- `pages/ComingSoonPage.tsx` is no longer used (every reference page is built); it can be deleted.

## Checking a change

The page-by-page browser checks used while copying ran outside this repo; they are not part of it. Before saving a
change here run `npm run typecheck`, `npm run lint` and `npm run build`, then open the page next to its reference page.
