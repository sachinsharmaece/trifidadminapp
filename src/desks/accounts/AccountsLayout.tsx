import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getAccountsSnapshot } from '../../api/accounts';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { AccountsProvider, useAccounts } from './AccountsContext';
import type { Model } from './model';
import type { AccountsSnapshot } from './types';
import './accounts.css';
import './accounts-extras.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AccountsSnapshot };

/** The template's left rail — groups, labels and the hot count beside each. */
const NAV: Array<[string, Array<[string, string, (m: Model) => number | null]>]> = [
  [
    '',
    [
      ['', 'Today', () => null],
      ['process', 'The process', (m) => m.allChains().filter((c) => c.stage !== 'done').length],
    ],
  ],
  [
    'Documents',
    [
      ['sos', 'Sales orders', (m) => m.d.sos.filter((s) => s.state !== 'closed').length],
      ['pos', 'Purchase orders', (m) => m.d.pos.filter((p) => !p.paid && !p.failed).length],
      [
        'billing',
        'Billing in Marg',
        (m) => m.allChains().filter((c) => c.leg1 && !c.billed && !c.failed).length,
      ],
    ],
  ],
  [
    'Money',
    [
      ['upcoming', 'Upcoming receipts', (m) => m.d.upcoming.length],
      ['bank', 'Bank book', (m) => m.d.bankbook.filter((b) => b.queried).length],
      [
        'payments',
        'Payments & refunds',
        (m) =>
          m.d.pos.filter((p) => m.isPayable(p) && !m.inBatch(p.key)).length +
          m.d.refunds.filter((r) => r.state === 'ready').length,
      ],
    ],
  ],
  [
    'Parties',
    [
      ['buyers', 'Buyers', (m) => m.buyers().filter((b) => m.balanceOf(b.id) !== 0).length],
      ['sellers', 'Sellers', (m) => m.sellers().filter((s) => m.balanceOf(s.id) > 0).length],
    ],
  ],
  [
    'Books',
    [
      ['register', 'Sales register', () => null],
      [
        'purchases',
        'Purchase register',
        (m) => m.d.pos.filter((p) => p.received && !p.billed).length,
      ],
      [
        'movements',
        'Goods movement',
        (m) => m.d.movements.filter((x) => x.state === 'in_transit').length,
      ],
      ['gst', 'GST credit', (m) => m.d.bills.filter((b) => !b.filed).length],
      ['close', 'Day close', () => null],
    ],
  ],
];

function Rail() {
  const { m, go } = useAccounts();
  const { pathname } = useLocation();
  // /accounts → '' ; /accounts/bank → 'bank' ; /accounts/so/SO-1 → 'so' (no rail item, as in the template)
  const here = pathname.replace(/^\/accounts\/?/, '').split('/')[0] ?? '';
  return (
    <nav className="rail">
      <div className="railhead">
        <b>TriFid</b>
        <span>Accounts</span>
      </div>
      {NAV.map(([group, items]) => (
        <div key={group || 'top'}>
          {group ? <div className="railgroup">{group}</div> : null}
          {items.map(([path, label, count]) => {
            const c = count(m) ?? 0;
            return (
              <button
                key={path || 'today'}
                type="button"
                aria-current={here === path ? 'page' : undefined}
                onClick={() => go(path)}
              >
                <span>{label}</span>
                {c ? <span className="cnt hot">{c}</span> : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Topbar() {
  const { me } = useAuth();
  const { can } = useAccounts();
  const abilities = can(PERMISSIONS.BANK_REPOST)
    ? ' · can repost a bank line'
    : can(PERMISSIONS.PAYOUT_RELEASE)
      ? ' · can release a batch'
      : ' · cannot release a batch';
  return (
    <header className="topbar">
      <div className="who">
        <strong style={{ color: 'var(--ink)' }}>{me?.person}</strong>
        {me?.roles.length ? ` · ${me.roles.join(', ')}` : ''}
        {abilities}
      </div>
    </header>
  );
}

function Frame() {
  const { toast } = useAccounts();
  return (
    <div className="app">
      <Rail />
      <div className="main">
        <Topbar />
        <main className="content">
          <Outlet />
        </main>
      </div>
      {toast ? (
        <div className="toast" role="status">
          <span>{toast.message}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The Accounts desk — its own rail and views inside the app shell. Loads one
 * snapshot from the server and every view reads from it; after any action the
 * snapshot is refetched, so what is on screen is what is in the books.
 */
export function AccountsLayout() {
  const { callApi } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // `callApi` changes identity whenever the access token refreshes. Reading it through a ref
  // keeps `load` stable, so a token refresh never blanks the desk and refetches mid-work.
  const callApiRef = useRef(callApi);
  callApiRef.current = callApi;

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setState({ status: 'loading' });
    try {
      const data = await callApiRef.current((token) => getAccountsSnapshot(token));
      setState({ status: 'ready', data });
    } catch (error) {
      // A failed silent refresh keeps the last good screen rather than blanking it.
      setState((current) =>
        silent && current.status === 'ready'
          ? current
          : {
              status: 'error',
              message:
                error instanceof ApiError ? error.message : 'Could not load the Accounts desk.',
            },
      );
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  if (state.status !== 'ready') {
    return (
      <div className="acx">
        <div className="content">
          <div className="empty">
            <h3>{state.status === 'loading' ? 'Loading the Accounts desk…' : 'Could not load'}</h3>
            {state.status === 'error' ? (
              <>
                <p>{state.message}</p>
                <div className="btnrow" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button type="button" className="btn btn-p" onClick={() => void load(false)}>
                    Try again
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="acx">
      <AccountsProvider snapshot={state.data} reload={reload}>
        <Frame />
      </AccountsProvider>
    </div>
  );
}
