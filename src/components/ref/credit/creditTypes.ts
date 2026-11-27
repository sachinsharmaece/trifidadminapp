/** A credit request as the Today pages show it (GET /credit/requests). */
export interface CreditRequestRow {
  id: string;
  number: string;
  party: { id: string; name: string };
  fromLimitPaise: number;
  toLimitPaise: number;
  days: number;
  reference: { name: string; mobile: string };
  route: 'TM' | 'CONTROLLER';
  checks: { label: string; detail: string; result: 'ok' | 'ctl' | 'blk' }[];
  requestedBy: string;
  requestedPosition: string | null;
}
