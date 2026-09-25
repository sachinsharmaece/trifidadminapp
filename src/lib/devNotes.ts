/**
 * Client-walkthrough scaffolding, not app content. Every string here is
 * read only by <DevNote>, which itself renders nothing unless
 * VITE_SHOW_DEV_NOTES is set — see components/dev/DevNote.tsx.
 * Removing the feature later is: delete this file, delete
 * components/dev/, delete the env flag from .env.example and lib/env.ts,
 * then delete the <DevNote> import/line the compiler points at on each page.
 */

export interface DevNoteContent {
  purpose: string;
  tradeContext?: string;
  notBuiltYet?: string;
  question?: string;
}

export const devNotes = {
  admin_login: {
    purpose:
      'Where staff sign in — email and password, plus a phone-based second code for senior roles. This is separate from the buyer/seller sign-in, which only uses a mobile number and an SMS code.',
  },
  admin_registrations: {
    purpose:
      'Every buyer and seller who signs up on the phone app lands here first. Staff check their details — GST number, area, references — and approve or reject before the firm can trade.',
    tradeContext:
      'This happens right after someone submits the registration form on the buyer or seller app, and before that firm can see any rates or listings.',
  },
  admin_products: {
    purpose:
      'Every product in the catalogue, in one list — brand, technical, manufacturer, HSN, class and whether it is active — with a button to open any one for its full detail and pack sizes, and a button to add a new one.',
    tradeContext:
      'Background setup work — it happens before any listing or order exists, and buyers and sellers never see this screen. They only ever see one product at a time, picked by its technical first.',
    notBuiltYet:
      "the actual margin numbers — how much TriFid adds on top of a seller's rate for each class of buyer — are not final and have no screen to enter them yet. Twelve numbers are still needed from you before real pricing can go live; until they're supplied, the system will not price a real order.",
  },
  admin_products_create: {
    purpose: 'Add a new product to the catalogue — brand, technical, manufacturer, HSN and class.',
  },
  admin_product_detail: {
    purpose:
      "One product's full detail, with an edit option, and its pack sizes (SKUs) below — including the box to add more packs by pasting a short list.",
  },
  admin_manufacturers: {
    purpose:
      'The list of manufacturers products can be filed under, with a button to add a new one.',
  },
  admin_tehsils: {
    purpose:
      "The tehsil map that decides which buyers can see which sellers' stock, with a button to add a new one.",
  },
  admin_team: {
    purpose:
      "Where staff accounts are created and given roles, and where the sales/purchase 'lanes' (who is responsible for which slice of the trade) are assigned and covered when someone is away.",
    tradeContext:
      "Internal staffing setup — has nothing directly to do with a buyer or seller's order.",
  },
  admin_chain: {
    purpose:
      'The screen for manually stepping a single order through its stages — raising it, raising the purchase order against the seller, editing it, or reducing its quantity after a part rejection — plus a full history view of any order by its ID.',
    tradeContext:
      'Raising an order here by hand was the only way to test the trade flow before the buyer app existed. Now that buyers place real orders themselves, this screen is mainly a staff tool for exceptions and lookups, not the everyday way orders get created.',
    notBuiltYet:
      "there's no automatic rule yet for routing a very large order (above ₹2,00,000) to a senior person for sign-off before release — every release currently goes through the same one-person-builds/another-releases check regardless of size.",
  },
  admin_accounts: {
    purpose:
      "The full money desk — matching buyer payments to orders, checking whether a seller can be paid, building and releasing payment and refund batches, correcting a wrong bank entry, closing the day's books, and looking up any buyer's or seller's running balance.",
    tradeContext:
      "This is where money actually moves — a payment isn't real until it's matched and posted here, and a seller isn't paid until this desk releases it.",
    notBuiltYet:
      'the three payment runs a day (around 1pm, 4pm and 7pm) are not automatic yet — someone has to come here and trigger each batch by hand. There is also no size-based rule yet sending a very large release to a more senior person before it goes out.',
  },
  admin_marg: {
    purpose:
      "Where staff key in the numbers from the tax invoice raised in the separate Marg billing software, so TriFid's own records match it.",
    tradeContext:
      "This is the paperwork step every order passes through at Indore, in the middle of its journey. If the number keyed here is off by more than ₹5 from what's expected, it is queried and the order stops here — there is no way, for anyone, to force it through from this screen.",
  },
  admin_dock: {
    purpose:
      'Where incoming goods are inspected and recorded (case count, damage, batch match), and where a dispatch — either leg of the journey — is logged with its transport details.',
    tradeContext:
      'Recording an inspection and acting on it are two separate steps here on purpose — one person checks and records what arrived, someone else decides what that means for payment.',
  },
  admin_registers: {
    purpose:
      "A running list of every sale and every purchase, for bookkeeping — which orders have been billed and which haven't.",
    tradeContext:
      'A read-only summary drawn from the accounts and chain desks; nothing is entered here directly.',
  },
  enquiries: {
    purpose:
      'Every enquiry in one list, each with its own number (ENQ-26-00012) to quote on the phone — where it stands, who it is waiting on, which Sales and Purchase person owns it, and when it is next due a follow-up. Sales can log a new one when a buyer phones in, even if he is not registered yet or wants a product that is not in the catalogue.',
    tradeContext:
      'This is the very start of a trade, before any order exists, and it follows the enquiry all the way through its orders. Each department sees its own side: Sales sees the buyer, Purchase sees the seller, Logistics sees neither, Accounts and management see both. An enquiry from someone not yet registered stays "pre-trade" until Sales converts it into a proper ask or drops it with a reason.',
    notBuiltYet:
      "Purchase cannot yet enter a seller's quote on an ask from a phone call — the seller has to quote from his own app. When a seller revises a listed rate, the step where each buyer accepts or cancels is not built yet either.",
  },
  enquiry_detail: {
    purpose:
      "One enquiry from start to finish — what was asked, every seller's response, the order or orders it became with their six-stage progress, and one timeline of everything that happened, including staff call notes.",
    tradeContext:
      'The buttons shown depend on your department and on where the enquiry stands: Sales can accept quotes, walk away, or convert/drop a pre-trade enquiry on the buyer’s behalf; Purchase can confirm, requote or decline for the seller. Each department sets its own owner and follow-up date and keeps its own notes — a Purchase note is never shown to Sales, and the other way round.',
  },
  purchase_desk: {
    purpose:
      'Where Purchase staff work the seller side of the business — which asks have no seller lined up yet, replacement sellers found after one fails to supply, and ageing on stock the dock has rejected.',
    tradeContext:
      "This is a staff-only working screen — buyers and sellers never see it, and by design it never shows a buyer's name or a rupee figure, only counts and codes.",
    notBuiltYet:
      'the coverage map (which companies are covered in which areas) and a full product-by-product breakdown are built as raw data only so far — there is no visual map or chart yet, just tables of numbers.',
  },
  purchase_today: {
    purpose:
      "Everything waiting on this desk, pulled together from every other Purchase screen: overdue dispatches, sellers who haven't confirmed a pile, demand nobody can supply, dock findings still waiting to be applied, and return notes running out of their 30 days.",
    tradeContext:
      "Composed on this screen from each screen's own read — there is deliberately no single combined server endpoint for this (an earlier attempt at one was dropped; each desk keeps its own working list instead).",
  },
  purchase_demand: {
    purpose:
      'Every open ask, with how many sellers have quoted it, are listed but silent, or carry it in their catalogue with no live rate yet — and a way to code why an ask never became an order.',
    tradeContext:
      "No buyer identity and no rupee figure anywhere on this screen, by design — only counts, codes and a seller's own quoted rate.",
  },
  purchase_confirmations: {
    purpose:
      "Buyer demand piling on one seller's listing, waiting for him to confirm, requote or decline. He answers once and it covers every buyer on that pile.",
  },
  purchase_dispatch: {
    purpose:
      "Purchase orders due or overdue for dispatch against the seller's own cut-off, plus what is already on the way to Indore.",
    tradeContext:
      'A logged chase does not itself change anything — extending the clock is a Controller action (the bulk lifeline), kept separate from this queue on purpose.',
  },
  purchase_sellers: {
    purpose:
      'The seller panel — who carries what, who has it on the board, and sellers who registered but are still waiting on Purchase to set their area.',
  },
  purchase_seller_file: {
    purpose:
      "One seller's whole file: contact and area, references, his conduct record (grace and strikes), what he sells, what is priced on the board, and anything owed back to or from him.",
  },
  purchase_add_seller: {
    purpose:
      'Registers a seller Purchase found by phone, the same way the seller himself would from his own app, plus the two named references BR-250 requires.',
    notBuiltYet:
      'a single OTP confirmation to the real phone number is still required before this registration can be approved.',
  },
  purchase_catalogue_entry: {
    purpose:
      'Records what a seller says he can supply on a call — no rate, no territory. This is capability only; it never reaches a buyer on its own.',
  },
  purchase_enter_listing: {
    purpose:
      "Puts a priced offer on the board on a seller's behalf, from a phone call — the same fields and validation as the seller's own listing screen, plus a mandatory note of who said what.",
    notBuiltYet:
      "a product or pack Purchase raises mid-call stays usable in a seller's catalogue immediately but cannot be listed until Admin confirms the underlying master data.",
  },
  purchase_matrix: {
    purpose:
      'Who sells what, read either by product (the call list for a gap) or by seller (his whole business) — built from the seller catalogue plus every live listing.',
  },
  purchase_recovery: {
    purpose:
      'Three things that leak money quietly: dock findings still waiting for Purchase to apply, return notes running out of their 30-day window, and open debits against a seller.',
  },
  purchase_products: {
    purpose:
      "What came in, what was answered and what converted, product by product — plus the product/company/pack master data Purchase may raise mid-call as a draft, pending Admin's confirmation.",
  },
  sales_desk: {
    purpose:
      'Where Sales staff work the buyer side — who is waiting on a payment, who was promised a call-back, who is waiting on a rate, and where demand is picking up.',
    tradeContext:
      'A new buyer is automatically assigned to a staff member here the moment his first order is placed — before that, he sits in a general queue nobody owns yet.',
    notBuiltYet:
      "the 'market is picking up' signal only looks at the last two weeks of activity and does not yet suggest what to do about it — a staff member still has to decide who to call.",
  },
} satisfies Record<string, DevNoteContent>;

export type DevNoteKey = keyof typeof devNotes;
