import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX } from 'react-icons/fi';
import { approvePush, completePush, getPush, rejectPush, type PushDetailDto } from '../../api/push';
import { getTehsils } from '../../api/territory';
import type { TehsilDto } from '../../api/dto';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { AssigneeSelect } from '../../components/buyer/BuyerFields';
import { LocationBlock, type LocationValue } from '../../components/location/LocationBlock';
import { PushStatusBadge } from '../../components/push/PushStatusBadge';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { useAsyncData } from '../../lib/useAsyncData';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../lib/dates';
import { CompanyPicker } from './CompanyPicker';

/**
 * Phase 6 — one buyer pushed from Sales. The receiver does the first call
 * and completes the seller fields (Complete); a Purchase Leader then
 * approves him — a seller profile is added to his own firm record — or
 * rejects with a reason. A PAN-only firm cannot be approved without a GSTIN.
 */
export function FromSalesDetailPage() {
  const { pushId = '' } = useParams<{ pushId: string }>();
  const navigate = useNavigate();
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getPush(token, pushId)), [callApi, pushId]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        icon={<FiArrowLeft />}
        onClick={() => navigate('/purchase/from-sales')}
      >
        From Sales
      </Button>
      <AsyncBoundary state={state} onRetry={retry}>
        {(push: PushDetailDto) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={push.firm || 'From Sales'}>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="chip">From Sales</Badge>
                  <PushStatusBadge status={push.status} />
                </div>
                <p>
                  <span className="text-slate-500">Pushed by</span> {push.pushedBy ?? '—'} on{' '}
                  {formatDate(push.pushedAt)} · with {push.receiver.person ?? '—'}
                </p>
                <blockquote className="border-l-2 border-slate-300 pl-3 text-slate-700">
                  {push.note}
                </blockquote>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-slate-500">Proprietor</dt>
                  <dd>{push.ownerName ?? '—'}</dd>
                  <dt className="text-slate-500">Mobile</dt>
                  <dd>{push.contactMobile ?? '—'}</dd>
                  <dt className="text-slate-500">GSTIN</dt>
                  <dd className="font-mono">
                    {push.gstin ?? push.draft?.gstin ?? (
                      <>
                        <Badge tone="warn" variant="chip">
                          Unregistered
                        </Badge>{' '}
                        PAN {push.pan ?? '—'}
                      </>
                    )}
                  </dd>
                  <dt className="text-slate-500">Licence no.</dt>
                  <dd>{push.licenceNo ?? '—'}</dd>
                  <dt className="text-slate-500">Place</dt>
                  <dd>
                    {push.location.address ?? '—'}
                    {push.location.tehsil
                      ? ` · ${push.location.tehsil}, ${push.location.district}`
                      : ''}
                    {push.location.pincode ? ` · ${push.location.pincode}` : ''}
                  </dd>
                </dl>
                {push.needsGstin && push.status !== 'rejected' && (
                  <p className="rounded-md bg-warning-50 p-2 text-warning-600">
                    He has only a PAN. Add his GSTIN under Complete — he cannot be approved as a
                    seller without one.
                  </p>
                )}
                {push.status === 'rejected' && (
                  <p className="text-danger-500">Rejected: {push.rejectionReason}</p>
                )}
                {push.sellerId && (
                  <p>
                    Approved —{' '}
                    <Link
                      className="text-brand-600 underline"
                      to={`/purchase/sellers/${push.sellerId}`}
                    >
                      open his seller file
                    </Link>
                  </p>
                )}
              </div>
            </Card>
            <div className="flex flex-col gap-6">
              {push.canComplete && <CompleteForm push={push} onSaved={retry} />}
              {push.canDecide && <DecidePanel push={push} onDecided={retry} />}
              {push.status === 'submitted' && !push.canDecide && (
                <Card title="Waiting for approval">
                  <p className="text-sm text-slate-600">
                    The Purchase Leader of {push.receiver.person ?? 'the receiver'}&apos;s team, or
                    Admin, approves or rejects him.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

const COMPLETE_FIELDS = [
  'gstin',
  'licenceNo',
  'location.address',
  'location.pincode',
  'location.stateId',
  'location.districtId',
  'location.tehsilId',
  'references.0.firm',
  'references.0.phone',
  'references.0.relationship',
  'references.0.whatTheySaid',
  'references.1.firm',
  'references.1.phone',
  'references.1.relationship',
  'references.1.whatTheySaid',
  'references',
  'dealerships',
  'bankDetail.accountNumber',
  'bankDetail.ifsc',
  'bankDetail.accountName',
  'margPartyCode',
  'callNote',
] as const;

const blankReference = { firm: '', phone: '', relationship: 'Supplier', whatTheySaid: '' };

function CompleteForm({ push, onSaved }: { push: PushDetailDto; onSaved: () => void }) {
  const { callApi } = useAuth();
  const draft = push.draft;
  const [gstin, setGstin] = useState(draft?.gstin ?? '');
  const [licenceNo, setLicenceNo] = useState(draft?.licenceNo ?? push.licenceNo ?? '');
  const [location, setLocation] = useState<LocationValue>({
    address: draft?.location?.address ?? push.location.address ?? '',
    pincode: draft?.location?.pincode ?? push.location.pincode ?? '',
    stateId: draft?.location?.stateId ?? push.location.stateId ?? '',
    districtId: draft?.location?.districtId ?? push.location.districtId ?? '',
    tehsilId: draft?.location?.tehsilId ?? push.location.tehsilId ?? '',
  });
  const [references, setReferences] = useState(
    draft?.references.length ? draft.references : [blankReference, blankReference],
  );
  // 28 Oct — a first Complete starts with the companies ticked on his buyer
  // profile; once Purchase has saved its own choice, that choice is kept.
  const fromBuyer = !draft && push.buyerCompanies.length > 0;
  const [companyIds, setCompanyIds] = useState<string[]>(
    draft?.dealershipIds ?? push.buyerCompanies.map((c) => c.manufacturerId),
  );
  const [bank, setBank] = useState({ accountNumber: '', ifsc: '', accountName: '' });
  const [margPartyCode, setMargPartyCode] = useState(draft?.margPartyCode ?? '');
  const [callNote, setCallNote] = useState(draft?.callNote ?? '');
  const needsBank = !push.firmHasBankDetail && !draft?.bankDetailGiven;
  const save = useFormSubmit<PushDetailDto>({
    fields: COMPLETE_FIELDS,
    success: 'Saved — he is ready for a Purchase Leader to approve.',
    onSuccess: onSaved,
    toastOnSuccess: true,
  });
  const e = save.fieldErrors;
  const setRef = (i: number, key: keyof typeof blankReference, value: string) =>
    setReferences((current) => current.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const bankGiven = bank.accountNumber || bank.ifsc || bank.accountName;
    void save.submit((key) =>
      callApi((token) =>
        completePush(
          token,
          push.pushId,
          {
            ...(gstin ? { gstin: gstin.toUpperCase() } : {}),
            licenceNo,
            location: {
              address: location.address,
              pincode: location.pincode || undefined,
              stateId: location.stateId,
              districtId: location.districtId,
              tehsilId: location.tehsilId,
            },
            references,
            ...(companyIds.length
              ? { dealerships: companyIds.map((manufacturerId) => ({ manufacturerId })) }
              : {}),
            ...(bankGiven ? { bankDetail: bank } : {}),
            margPartyCode: margPartyCode || undefined,
            callNote,
          },
          key,
        ),
      ),
    );
  }

  return (
    <Card
      title={
        push.status === 'submitted' ? 'Seller details (sent for approval)' : 'Complete as a seller'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-2 gap-4">
        {!push.gstin && (
          <Input
            label="GSTIN"
            hint={`Must carry his PAN ${push.pan ?? ''}. Needed before approval.`}
            value={gstin}
            maxLength={15}
            onChange={(ev) => setGstin(ev.target.value.toUpperCase())}
            error={e.gstin}
          />
        )}
        <Input
          label="Insecticide licence no."
          required
          value={licenceNo}
          onChange={(ev) => setLicenceNo(ev.target.value)}
          error={e.licenceNo}
        />
        <Input
          label="Marg party code"
          hint="His seller ledger in Marg — not the buyer one."
          value={margPartyCode}
          onChange={(ev) => setMargPartyCode(ev.target.value.toUpperCase())}
          error={e.margPartyCode}
        />
        <div className="col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">His own place</p>
          <LocationBlock
            required
            value={location}
            onChange={setLocation}
            errors={{
              address: e['location.address'],
              pincode: e['location.pincode'],
              stateId: e['location.stateId'],
              districtId: e['location.districtId'],
              tehsilId: e['location.tehsilId'],
            }}
          />
        </div>
        {references.map((reference, i) => (
          <fieldset
            key={i}
            className="col-span-2 grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3"
          >
            <legend className="px-1 text-sm font-medium text-slate-700">Referee {i + 1}</legend>
            <Input
              label="Firm"
              required
              value={reference.firm}
              onChange={(ev) => setRef(i, 'firm', ev.target.value)}
              error={e[`references.${i}.firm`]}
            />
            <Input
              label="Phone"
              required
              maxLength={10}
              value={reference.phone}
              onChange={(ev) => setRef(i, 'phone', ev.target.value)}
              error={e[`references.${i}.phone`]}
            />
            <Input
              label="Relationship"
              required
              value={reference.relationship}
              onChange={(ev) => setRef(i, 'relationship', ev.target.value)}
              error={e[`references.${i}.relationship`]}
            />
            <Input
              label="What they said"
              required
              value={reference.whatTheySaid}
              onChange={(ev) => setRef(i, 'whatTheySaid', ev.target.value)}
              error={e[`references.${i}.whatTheySaid`]}
            />
          </fieldset>
        ))}
        {e.references && <p className="col-span-2 text-sm text-danger-500">{e.references}</p>}
        <div className="col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Bank account for payouts</p>
          <p className="mb-2 text-sm text-slate-500">
            {needsBank
              ? 'The firm has no bank account on file — a seller is paid, so add one.'
              : 'The firm already has a bank account on file. Add one only if he is paid elsewhere.'}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Account number"
              required={needsBank}
              value={bank.accountNumber}
              onChange={(ev) => setBank({ ...bank, accountNumber: ev.target.value })}
              error={e['bankDetail.accountNumber']}
            />
            <Input
              label="IFSC"
              required={needsBank}
              value={bank.ifsc}
              onChange={(ev) => setBank({ ...bank, ifsc: ev.target.value.toUpperCase() })}
              error={e['bankDetail.ifsc']}
            />
            <Input
              label="Account name"
              required={needsBank}
              value={bank.accountName}
              onChange={(ev) => setBank({ ...bank, accountName: ev.target.value })}
              error={e['bankDetail.accountName']}
            />
          </div>
        </div>
        <div className="col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Companies he deals in</p>
          {fromBuyer && (
            <p className="mb-2 text-sm text-slate-500">
              Ticked from his buyer profile ({push.buyerCompanies.map((c) => c.name).join(', ')}) —
              untick any he doesn&apos;t supply.
            </p>
          )}
          <CompanyPicker value={companyIds} onChange={setCompanyIds} />
        </div>
        <div className="col-span-2">
          <Textarea
            label="Call note"
            required
            hint="The first call — what he supplies, what was agreed."
            value={callNote}
            onChange={(ev) => setCallNote(ev.target.value)}
            error={e.callNote}
          />
        </div>
        {save.formError && (
          <p role="alert" className="col-span-2 text-sm text-danger-500">
            {save.formError}
          </p>
        )}
        <div className="col-span-2">
          <Button type="submit" loading={save.submitting} disabled={!location.tehsilId}>
            {push.status === 'submitted' ? 'Save changes' : 'Send for approval'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DecidePanel({ push, onDecided }: { push: PushDetailDto; onDecided: () => void }) {
  const { callApi } = useAuth();
  const tehsilsLoader = useCallback(() => callApi((token) => getTehsils(token)), [callApi]);
  const { state: tehsilsState, retry: retryTehsils } = useAsyncData(tehsilsLoader, () => false, [
    tehsilsLoader,
  ]);
  const [tehsilIds, setTehsilIds] = useState<string[]>([]);
  const [cutoff, setCutoff] = useState('16:00');
  const [assignedTo, setAssignedTo] = useState(push.receiver.employeeId);
  const [reason, setReason] = useState('');
  const approve = useFormSubmit<{ sellerId: string }>({
    fields: ['tehsilIds', 'dispatchCutoffTime', 'assignedToEmployeeId', 'gstin'],
    success: `${push.firm} is now a seller.`,
    onSuccess: onDecided,
    toastOnSuccess: true,
  });
  const reject = useFormSubmit<unknown>({
    fields: ['reason'],
    success: 'Rejected — Sales has been told.',
    onSuccess: onDecided,
    toastOnSuccess: true,
  });

  function toggle(id: string): void {
    setTehsilIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  function handleApprove(event: FormEvent): void {
    event.preventDefault();
    void approve.submit((key) =>
      callApi((token) =>
        approvePush(
          token,
          push.pushId,
          { tehsilIds, dispatchCutoffTime: cutoff, assignedToEmployeeId: assignedTo },
          key,
        ),
      ),
    );
  }

  function handleReject(event: FormEvent): void {
    event.preventDefault();
    void reject.submit((key) => callApi((token) => rejectPush(token, push.pushId, reason, key)));
  }

  return (
    <Card title="Decide">
      <form onSubmit={handleApprove} noValidate className="flex flex-col gap-4">
        <AssigneeSelect
          side="purchase"
          required
          allowQueue={false}
          current={{ employeeId: push.receiver.employeeId, person: push.receiver.person ?? '' }}
          value={assignedTo}
          onChange={setAssignedTo}
          error={approve.fieldErrors.assignedToEmployeeId}
        />
        <fieldset className="rounded-md border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Area he supplies (required; no area, no listing)
          </legend>
          <AsyncBoundary state={tehsilsState} onRetry={retryTehsils}>
            {(tehsils: TehsilDto[]) => (
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {tehsils.map((tehsil) => (
                  <label
                    key={tehsil.tehsilId}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={tehsilIds.includes(tehsil.tehsilId)}
                      onChange={() => toggle(tehsil.tehsilId)}
                    />
                    {tehsil.name} ({tehsil.district})
                  </label>
                ))}
              </div>
            )}
          </AsyncBoundary>
          {approve.fieldErrors.tehsilIds && (
            <p className="mt-1 text-sm text-danger-500">{approve.fieldErrors.tehsilIds}</p>
          )}
        </fieldset>
        <Input
          label="Dispatch cut-off time"
          type="time"
          required
          value={cutoff}
          onChange={(ev) => setCutoff(ev.target.value)}
          error={approve.fieldErrors.dispatchCutoffTime}
        />
        {(approve.formError || approve.fieldErrors.gstin) && (
          <p role="alert" className="text-sm text-danger-500">
            {approve.fieldErrors.gstin ?? approve.formError}
          </p>
        )}
        <Button
          type="submit"
          icon={<FiCheck />}
          loading={approve.submitting}
          disabled={push.needsGstin || tehsilIds.length === 0 || !assignedTo}
          title={push.needsGstin ? 'He needs a GSTIN first.' : undefined}
        >
          Approve as seller
        </Button>
      </form>
      <form
        onSubmit={handleReject}
        noValidate
        className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4"
      >
        <Textarea
          label="Reason to reject"
          required
          value={reason}
          onChange={(ev) => setReason(ev.target.value)}
          error={reject.fieldErrors.reason}
        />
        {reject.formError && (
          <p role="alert" className="text-sm text-danger-500">
            {reject.formError}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant="secondary"
            icon={<FiX />}
            loading={reject.submitting}
            disabled={!reason.trim()}
          >
            Reject
          </Button>
        </div>
      </form>
    </Card>
  );
}
