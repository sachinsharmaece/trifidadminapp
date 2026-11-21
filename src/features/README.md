# features/

One folder per business module (for example `orders/`, `accounts/`). Each module owns its own
components, API calls (`api.ts`), TanStack Query hooks and Zod schemas for the data it reads.

Today: `auth/` (sign-in, route guard, user menu, change password), `staff/` (staff accounts), and the masters:
`company/`, `manufacturers/`, `technicals/`, `hsnCodes/`, `products/` (products with their packs), `tehsils/` and `reasonCodes/`;
the parties: `sellers/` (Purchase side) and `buyers/` (Sales side); and `listings/` (Purchase side).
