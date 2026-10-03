import { apiFetch } from './client';
import type { AccountsSnapshot } from '../desks/accounts/types';

// The Accounts desk's read model (trifidserverapp modules/accounts) — needs chain:read_full.
export function getAccountsSnapshot(accessToken: string): Promise<AccountsSnapshot> {
  return apiFetch('/staff/accounts/snapshot', { accessToken });
}
