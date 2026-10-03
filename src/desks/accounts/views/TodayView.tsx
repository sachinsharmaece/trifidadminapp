import { useAccounts } from '../AccountsContext';
import { inr, toPaise } from '../format';
import { STAGES, URS } from '../model';
import { Kpi, Lede, Note, Pill, Sec, TapRow } from '../ui';

export function TodayView() {
  const { m, go, statement } = useAccounts();
  const d = m.d;
  const chains = m.allChains();
  const live = chains.filter((c) => c.so && c.stage !== 'done');
  const toBill = chains.filter((c) => c.so && c.leg1 && !c.billed && !c.failed);
  const queried = d.bankbook.filter((b) => b.queried);
  const runs = d.runs.filter((r) => r.state === 'awaiting_release');
  const payable = d.pos.filter((p) => m.isPayable(p) && !m.inBatch(p.key));
  const failing = chains.filter((c) => c.failed && c.po && c.so);
  const closing = d.sos.filter((s) => s.state === 'awaiting_payment' && s.leftH > 0);
  const haveStatement = statement.trim() !== '' && !Number.isNaN(toPaise(statement));
  const diff = haveStatement ? toPaise(statement) - m.bankClosing() : null;

  return (
    <>
      <h1 className="page">Today</h1>
      <Lede>
        {d.day} · books for {d.period}
      </Lede>

      <div className="kpis">
        <Kpi value={inr(m.bankClosing())} label="Bank" small="per the bank book" />
        <Kpi
          hot={d.upcoming.length > 0}
          value={inr(m.upcomingTotal())}
          label="Upcoming"
          small="said, not landed"
          onClick={() => go('upcoming')}
        />
        <Kpi value={inr(m.totalAdvances())} label="Advances held" small="paid, not yet billed" />
        <Kpi value={inr(m.totalPayable())} label="We owe sellers" small="bills booked, unpaid" />
        <Kpi
          hot={toBill.length > 0}
          value={toBill.length}
          label="To bill in Marg"
          small="nothing moves till then"
          onClick={() => go('billing')}
        />
        <Kpi
          hot={diff !== null && diff !== 0}
          value={diff === null ? '—' : diff === 0 ? 'nil' : inr(Math.abs(diff))}
          label="Bank difference"
          small={diff === null ? 'see Day close' : 'book against statement'}
          onClick={() => go('close')}
        />
      </div>

      <Note tone="ok">
        <strong>No debtors, and no cash of ours with a seller.</strong> Marg bills only after the
        buyer&apos;s money is in, so nobody owes us. And a PO is never issued until that money is
        confirmed, so we never carry a seller on our own funds.
      </Note>

      {failing.length > 0 && (
        <Note tone="urgent">
          <strong>A seller failed after his PO was issued.</strong>{' '}
          {failing
            .map(
              (c) =>
                `${c.po?.id} · ${m.partyName(c.po?.party ?? '')} — ${c.so?.id} to be refunded in full`,
            )
            .join('; ')}
          . The buyer&apos;s money was already ours, so the refund comes out of our account and the
          failure is on that seller&apos;s file.
        </Note>
      )}

      {queried.length > 0 && (
        <Note tone="urgent">
          <strong>
            {queried.length} bank line{queried.length === 1 ? ' is' : 's are'} not properly posted.
          </strong>{' '}
          {queried.map((q) => `${q.id} · ${inr(q.amountPaise)}`).join('; ')}. Only the Controller
          can repost.
          <div className="btnrow" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-s btn-p" onClick={() => go('bank')}>
              Bank book
            </button>
          </div>
        </Note>
      )}

      {closing.length > 0 && (
        <Note tone="wait">
          <strong>
            {closing.length} order{closing.length === 1 ? '' : 's'} inside their payment window.
          </strong>{' '}
          {closing.map((s) => `${s.id} · ${m.partyName(s.party)} · ${s.leftH}h left`).join('; ')}.
          If the clock runs out the SO cancels, the seller&apos;s lock releases and it is a strike
          on the buyer.
        </Note>
      )}

      <Sec>Every deal, and where it has stopped</Sec>
      <div className="card pad0">
        {live.length === 0 ? (
          <div className="row" style={{ gridTemplateColumns: '1fr' }}>
            <span className="muted">Nothing in flight.</span>
          </div>
        ) : (
          live.map((c) => {
            const st = STAGES.find((s) => s.k === c.stage);
            const so = c.so!;
            return (
              <TapRow key={so.id} to={(c.stage !== 'done' && m.stagePath(c, c.stage)) || 'process'}>
                <div className="rmain">
                  {so.id} · {m.partyName(so.party)}
                  <small>{so.lines[0] ? `${so.lines[0].qty} × ${so.lines[0].item}` : ''}</small>
                </div>
                <div className="rwho">
                  <Pill tone={c.failed || c.stage === 'payment' ? 'urgent' : 'wait'}>
                    waiting at {st ? st.label.toLowerCase() : c.stage}
                  </Pill>
                  <small>{c.stage !== 'done' ? m.stageNote(c, c.stage, inr) : ''}</small>
                </div>
                <span className="muted mono">{inr(c.owed)}</span>
              </TapRow>
            );
          })
        )}
      </div>

      <Sec>Waiting on this desk</Sec>
      <div className="card pad0">
        {d.upcoming.length + toBill.length + payable.length + runs.length === 0 && (
          <div className="row" style={{ gridTemplateColumns: '1fr' }}>
            <span className="muted">Nothing is waiting on this desk.</span>
          </div>
        )}
        {d.upcoming.map((u) => (
          <TapRow key={u.key} to="upcoming">
            <div className="rmain">
              {m.partyName(u.party)} says he has sent {inr(u.amountPaise)}
              <small>{u.note}</small>
            </div>
            <div className="rwho">
              <Pill tone={URS[u.state][1]}>{URS[u.state][0]}</Pill>
              <small>{u.sos.join(', ')}</small>
            </div>
            <span className="muted mono">{u.id}</span>
          </TapRow>
        ))}
        {toBill.map((c) => (
          <TapRow key={c.so!.id} to="billing">
            <div className="rmain">
              {c.so!.id} — {c.marg ? 'Marg value under query' : 'ready to bill in Marg'}
              <small>
                {c.marg
                  ? (c.marg.note ?? '')
                  : `Expected ${inr(c.owed)}. Invoice and e-way bill both.`}
              </small>
            </div>
            <div className="rwho">
              <Pill tone="urgent">{c.marg ? 'query' : 'to bill'}</Pill>
              <small>{m.partyName(c.so!.party)}</small>
            </div>
            <span className="muted mono">{inr(c.owed)}</span>
          </TapRow>
        ))}
        {payable.map((p) => (
          <TapRow key={p.key} to={`po/${p.id}`}>
            <div className="rmain">
              {p.id} payable
              <small>{m.partyName(p.party)} · inspected and billed</small>
            </div>
            <div className="rwho">
              <Pill tone="ok">all gates passed</Pill>
            </div>
            <span className="muted mono">{inr(m.poValue(p))}</span>
          </TapRow>
        ))}
        {runs.map((r) => (
          <TapRow key={r.key} to="payments">
            <div className="rmain">
              {r.id} built by {r.builtBy}
              <small>
                {r.items.length} payment{r.items.length === 1 ? '' : 's'} · {r.builtAt}
              </small>
            </div>
            <div className="rwho">
              <Pill tone="urgent">needs release</Pill>
              <small>anybody but {r.builtBy}</small>
            </div>
            <span className="muted mono">{inr(m.runTotal(r))}</span>
          </TapRow>
        ))}
      </div>
    </>
  );
}
