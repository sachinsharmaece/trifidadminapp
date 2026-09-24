// Copied from trifid-serverapp/src/config/permissions.ts (TD-007) — only the
// keys this app's screens actually check against.
export const PERMISSIONS = {
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_WRITE: 'employee:write',
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',
  CATALOG_WRITE: 'catalog:write',
  TERRITORY_READ: 'territory:read',
  TERRITORY_WRITE: 'territory:write',
  ONBOARDING_READ: 'onboarding:read',
  ONBOARDING_APPROVE: 'onboarding:approve',
  // M4 additions.
  MARGIN_MATRIX_READ: 'margin_matrix:read',
  MARGIN_MATRIX_WRITE: 'margin_matrix:write',
  CHAIN_READ: 'chain:read',
  // M9 — the un-projected chain view; every other holder of `chain:read` gets only their own desk's side.
  CHAIN_READ_FULL: 'chain:read_full',
  SALES_WORKLIST_READ: 'sales_worklist:read',
  SO_CREATE: 'so:create',
  SO_REDUCE_QUANTITY: 'so:reduce_quantity',
  PO_CREATE: 'po:create',
  PO_EDIT: 'po:edit',
  RECEIPT_READ: 'receipt:read',
  RECEIPT_ALLOCATE: 'receipt:allocate',
  BANK_POST: 'bank:post',
  BANK_REPOST: 'bank:repost',
  PAYOUT_BUILD: 'payout:build',
  PAYOUT_RELEASE: 'payout:release',
  PAYOUT_READ: 'payout:read',
  MARG_KEY: 'marg:key',
  DAY_CLOSE_RUN: 'day_close:run',
  DOCK_INSPECT: 'dock:inspect',
  MOVEMENT_WRITE: 'movement:write',
  REGISTER_READ: 'register:read',
  // M9 — each desk sees only its own register (CH §17.3).
  REGISTER_SALES_READ: 'register_sales:read',
  REGISTER_PURCHASE_READ: 'register_purchase:read',
  // M6 additions.
  DEMAND_READ: 'demand:read',
  ABSORPTION_READ: 'absorption:read',
  NON_ORDER_REASON_RECORD: 'non_order_reason:record',
  PULSE_READ: 'pulse:read',
  RETENTION_READ: 'retention:read',
  COMPLAINT_READ: 'complaint:read',
  MSP_RESPOND: 'msp:respond',
  CONDUCT_RECORD: 'conduct:record',
  CONDUCT_ADVANCE: 'conduct:advance',
  CONDUCT_DISPUTES_READ: 'conduct:disputes_read',
  // M7 additions.
  LOGISTICS_READ: 'logistics:read',
  TRANSPORTER_READ: 'transporter:read',
  TRANSPORTER_WRITE: 'transporter:write',
  CONSOLIDATION_WRITE: 'consolidation:write',
  RETURN_NOTE_CLOSE: 'return_note:close',
  GST_UNFILED_READ: 'gst_unfiled:read',
  GST_MARK_FILED: 'gst_unfiled:mark_filed',
  DISPUTE_READ: 'dispute:read',
  DISPUTE_DECIDE: 'dispute:decide',
  DISPUTE_RECOVERY_READ: 'dispute:recovery_read',
  LIFELINE_GRANT: 'lifeline:grant',
  EXCEPTION_READ: 'exception:read',
  // M8 additions.
  NOTIFICATION_LOG_READ: 'notification:log_read',
  FUNNEL_READ: 'funnel:read',
  FOUNDER_OVERVIEW_READ: 'founder:overview_read',
  // Staff-assisted enquiries.
  ONBOARDING_STAFF_ASSIST_BUYER: 'onboarding:staff_assist_buyer',
  ONBOARDING_STAFF_ASSIST_SELLER: 'onboarding:staff_assist_seller',
  PROXY_BUYER_CALL: 'proxy:buyer_call',
  PROXY_SELLER_CALL: 'proxy:seller_call',
  ACCOUNTS_CONFIRM_RECEIPT: 'accounts:confirm_receipt',
  // Enquiry journey — owner, follow-up and notes on an enquiry (DEC-051).
  ENQUIRY_MANAGE: 'enquiry:manage',
} as const;

// Copied from trifid-serverapp/src/config/permissions.ts (BR-260). There is
// no GET /admin/roles endpoint — the seven roles are fixed by the Charter,
// not admin-editable, so listing them here is the same kind of copy as the
// DTOs above rather than a config the server should have to serve.
export const ROLE_KEYS = [
  'purchase',
  'sales',
  'transport_logistics',
  'accounts',
  'controller',
  'admin',
  'founder',
] as const;
