# features/

One folder per business module (for example `orders/`, `accounts/`). Each module owns its own
components, API calls (`api.ts`), TanStack Query hooks and Zod schemas for the data it reads.

Today: `auth/` (sign-in, route guard, user menu, change password), `staff/` (staff accounts), and the masters:
`company/`, `manufacturers/`, `technicals/`, `hsnCodes/`, `products/` (products with their packs), `tehsils/` and `reasonCodes/`;
the parties: `sellers/` (Purchase side) and `buyers/` (Sales side); `listings/` (Purchase side); `margins/` (the margin matrix: Controller, Founder, Admin); `board/` (the Sales rate board); `trades/` (the deal card and the buyer and seller funnels); `salesOrders/`
(orders raised when a buyer says yes; read only); `payments/` (the Accounts queue); `purchaseOrders/` (read only);
`ledgers/` and `bankAccounts/` (the books); `dock/` (the Logistics dock and return notes); `billing/` (To be billed:
the Marg bill, Accounts); `trips/` (trips and the proof of dispatch, Logistics); `payouts/` (seller payments and refunds: build, release, bank proof); `complaints/` (a buyer's complaint after dispatch and the Controller's decision); `today/` (the Controller's Today page: overdue shipments, other clocks, held payouts, "Run the clocks now"). `reports/` (the registers, the trial balance, the role dashboard and file downloads) and `system/` (the integrity check). Build 9: `journals/` (journals and opening balances, typed then approved by a second person), `vouchers/` (every voucher and the reversal) and `reconciliation/` (bank reconciliation).
