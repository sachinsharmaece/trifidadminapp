import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { lookupLead, type LeadLookupBy, type LeadLookupMatch } from '../../api/leads';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { normalizeMobile } from '../../lib/validators';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';

/**
 * Phase 5 (DEC-060) — "is this party already ours?" An exact GSTIN, PAN or
 * mobile answers with the firm and its leader only; the file opens only
 * when he is in the caller's own scope. Typed in full — never a search.
 */
export function LeadLookup({
  side,
  fileHref,
}: {
  side: 'buyer' | 'seller';
  /** Where a match the caller may open links to. */
  fileHref: (profileId: string) => string;
}) {
  const { callApi } = useAuth();
  const [by, setBy] = useState<LeadLookupBy>('gstin');
  const [value, setValue] = useState('');
  const [matches, setMatches] = useState<LeadLookupMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMatches(null);
    try {
      const typed = by === 'mobile' ? normalizeMobile(value) : value.trim().toUpperCase();
      setMatches(await callApi((token) => lookupLead(token, by, typed)));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not look that up.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Look up by"
          value={by}
          onChange={(ev) => setBy(ev.target.value as LeadLookupBy)}
        >
          <option value="gstin">GSTIN</option>
          <option value="pan">PAN</option>
          <option value="mobile">Mobile</option>
        </Select>
        <Input
          label={`Exact ${by === 'mobile' ? 'mobile' : by.toUpperCase()}`}
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          icon={<FiSearch />}
          loading={busy}
          disabled={!value.trim()}
        >
          Look up
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      {matches && matches.length === 0 && (
        <p className="text-sm text-slate-500">
          Nobody on TriFid has that {by === 'mobile' ? 'mobile' : by.toUpperCase()}.
        </p>
      )}
      {matches && matches.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {matches.map((m, i) => (
            <li key={`${m.side}-${m.profileId ?? i}`} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{m.firm || 'Unnamed firm'}</span>
              <Badge variant="chip">{m.side === 'buyer' ? 'Buyer' : 'Seller'}</Badge>
              {m.inQueue ? (
                <Badge tone="warn">Queue</Badge>
              ) : (
                <span className="text-slate-500">leader {m.leader ?? '—'}</span>
              )}
              {m.profileId && m.side === side ? (
                <Link className="text-brand-600 underline" to={fileHref(m.profileId)}>
                  Open
                </Link>
              ) : (
                !m.profileId && (
                  <span className="text-xs text-slate-500">
                    {m.inQueue
                      ? 'Ask your leader to assign him.'
                      : `Ask ${m.leader ?? 'his leader'} if you need him.`}
                  </span>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
