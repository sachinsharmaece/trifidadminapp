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
  purchase_desk: {
    purpose:
      'Where Purchase staff work the seller side of the business — which asks have no seller lined up yet, replacement sellers found after one fails to supply, and ageing on stock the dock has rejected.',
    tradeContext:
      "This is a staff-only working screen — buyers and sellers never see it, and by design it never shows a buyer's name or a rupee figure, only counts and codes.",
    notBuiltYet:
      'the coverage map (which companies are covered in which areas) and a full product-by-product breakdown are built as raw data only so far — there is no visual map or chart yet, just tables of numbers.',
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
