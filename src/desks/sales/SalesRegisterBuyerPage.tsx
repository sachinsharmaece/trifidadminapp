import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPhoneCall } from 'react-icons/fi';
import {
  staffRegisterBuyer,
  type BuyerCategory,
  type BuyerConfirmations,
} from '../../api/onboarding';
import { useAuth } from '../../auth/AuthContext';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { isValidMobile, normalizeMobile } from '../../lib/validators';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  EMPTY_LOCATION,
  LocationBlock,
  type LocationValue,
} from '../../components/location/LocationBlock';
import {
  AssigneeSelect,
  CategorySelect,
  ConfirmWarnings,
  GstinPanFields,
  warningsFrom,
  type ConfirmWarning,
} from '../../components/buyer/BuyerFields';
import { CompanyPicker } from '../purchase/CompanyPicker';

const FIELDS = [
  'mobile',
  'firm',
  'gstin',
  'pan',
  'ownerName',
  'category',
  'location.address',
  'location.pincode',
  'location.stateId',
  'location.districtId',
  'location.tehsilId',
  'dealerships',
  'licenceNo',
  'margPartyCode',
  'assignedToEmployeeId',
  'bankDetail.accountNumber',
  'bankDetail.ifsc',
  'bankDetail.accountName',
  'proprietorAgreed',
] as const;

/**
 * Phase 3 — Register a buyer, on a call. Every field is checked (it used to
 * be "only the mobile"), the PAN comes from the GSTIN, both may be left
 * blank (DEC-068), and there is **no OTP** (DEC-056): the staff member ticks
 * that the proprietor agreed. A mobile another firm uses, or a PAN inside
 * another buyer's GSTIN, comes back as a warning to tick and save again.
 */
export function SalesRegisterBuyerPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [firm, setFirm] = useState('');
  const [identity, setIdentity] = useState({ gstin: '', pan: '' });
  const [ownerName, setOwnerName] = useState('');
  const [category, setCategory] = useState<BuyerCategory | ''>('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [licenceNo, setLicenceNo] = useState('');
  const [margPartyCode, setMargPartyCode] = useState('');
  // null = untouched (the server assigns him to the person registering);
  // '' = the Queue; otherwise the picked Sales person.
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountName, setAccountName] = useState('');
  const [callNote, setCallNote] = useState('');
  const [proprietorAgreed, setProprietorAgreed] = useState(false);
  const [warnings, setWarnings] = useState<ConfirmWarning[]>([]);
  const [confirmations, setConfirmations] = useState<BuyerConfirmations>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  function reset(): void {
    setMobile('');
    setFirm('');
    setIdentity({ gstin: '', pan: '' });
    setOwnerName('');
    setCategory('');
    setLocation(EMPTY_LOCATION);
    setCompanyIds([]);
    setLicenceNo('');
    setMargPartyCode('');
    setAssignedTo(null);
    setAccountNumber('');
    setIfsc('');
    setAccountName('');
    setCallNote('');
    setProprietorAgreed(false);
    setWarnings([]);
    setConfirmations({});
  }

  const save = useFormSubmit<{ loginMobile: boolean; accountNameWarning: string | null }>({
    fields: FIELDS,
    success: (r) =>
      `Buyer registered — ready for approval on the Registrations desk.${
        r.loginMobile
          ? ''
          : ' This mobile already signs in another firm, so this firm has no app login of its own.'
      }${r.accountNameWarning ? ` Note: ${r.accountNameWarning}` : ''}`,
    onSuccess: reset,
  });
  const errors: Record<string, string | undefined> = { ...localErrors, ...save.fieldErrors };

  function checkLocally(): Record<string, string> {
    const found: Record<string, string> = {};
    if (!isValidMobile(mobile)) found.mobile = 'Enter a valid 10-digit mobile number.';
    if (!firm.trim()) found.firm = 'Enter the firm name.';
    if (!category) found.category = 'Pick the category.';
    if (location.address.trim().length < 5) found['location.address'] = 'Enter the address.';
    if (!location.tehsilId) found['location.tehsilId'] = 'Pick the tehsil from the list.';
    if (!proprietorAgreed) {
      found.proprietorAgreed = 'Tick that the proprietor agreed to register this number.';
    }
    return found;
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const found = checkLocally();
    setLocalErrors(found);
    if (Object.keys(found).length > 0) return;
    let refusal: unknown = null;
    await save.submit((key) =>
      callApi((token) =>
        staffRegisterBuyer(
          token,
          {
            mobile: normalizeMobile(mobile),
            firm,
            gstin: identity.gstin || undefined,
            pan: identity.gstin ? undefined : identity.pan || undefined,
            ownerName: ownerName || undefined,
            category: category as BuyerCategory,
            location: {
              address: location.address,
              pincode: location.pincode || undefined,
              stateId: location.stateId,
              districtId: location.districtId,
              tehsilId: location.tehsilId,
            },
            dealerships: companyIds.map((manufacturerId) => ({ manufacturerId })),
            licenceNo: licenceNo || undefined,
            margPartyCode: margPartyCode || undefined,
            ...(assignedTo === null ? {} : { assignedToEmployeeId: assignedTo || null }),
            bankDetail: accountNumber ? { accountNumber, ifsc, accountName } : undefined,
            consent: { noticeVersion: 'v1', marketingOptIn: false },
            callNote: callNote || undefined,
            proprietorAgreed: true,
            confirmations,
          },
          key,
        ),
      ).catch((caught: unknown) => {
        refusal = caught;
        throw caught;
      }),
    );
    setWarnings(warningsFrom(refusal));
  }

  const clear = (field: string) => {
    setLocalErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
    save.clearFieldError(field);
  };

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/sales/buyers')}>
        Buyers
      </Button>
      <Card title="Register a buyer">
        <form onSubmit={handleSubmit} noValidate className="grid max-w-3xl grid-cols-2 gap-4">
          <Input
            label="Mobile"
            required
            inputMode="tel"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              clear('mobile');
            }}
            error={errors.mobile}
          />
          <Input
            label="Firm name"
            required
            value={firm}
            onChange={(e) => {
              setFirm(e.target.value);
              clear('firm');
            }}
            error={errors.firm}
          />
          <GstinPanFields
            gstin={identity.gstin}
            pan={identity.pan}
            onChange={(next) => {
              setIdentity(next);
              clear('gstin');
              clear('pan');
            }}
            errors={{ gstin: errors.gstin, pan: errors.pan }}
          />
          <Input
            label="Proprietor name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            error={errors.ownerName}
          />
          <CategorySelect
            value={category}
            onChange={(v) => {
              setCategory(v);
              clear('category');
            }}
            error={errors.category}
          />
          <div className="col-span-2">
            <LocationBlock
              required
              value={location}
              onChange={(next) => {
                setLocation(next);
                ['address', 'pincode', 'stateId', 'districtId', 'tehsilId'].forEach((f) =>
                  clear(`location.${f}`),
                );
              }}
              errors={{
                address: errors['location.address'],
                pincode: errors['location.pincode'],
                stateId: errors['location.stateId'],
                districtId: errors['location.districtId'],
                tehsilId: errors['location.tehsilId'],
              }}
            />
          </div>
          <div className="col-span-2">
            <p className="mb-1 text-sm font-medium text-slate-700">Companies he deals in</p>
            <CompanyPicker value={companyIds} onChange={setCompanyIds} />
            {errors.dealerships && (
              <p className="mt-1 text-sm text-danger-500">{errors.dealerships}</p>
            )}
          </div>
          <Input
            label="Insecticide licence no."
            hint="Optional."
            value={licenceNo}
            onChange={(e) => {
              setLicenceNo(e.target.value);
              clear('licenceNo');
            }}
            error={errors.licenceNo}
          />
          <Input
            label="Marg party code"
            hint="Optional — his party code in Marg, for billing later."
            value={margPartyCode}
            onChange={(e) => {
              setMargPartyCode(e.target.value.toUpperCase());
              clear('margPartyCode');
            }}
            error={errors.margPartyCode}
          />
          <AssigneeSelect
            allowQueue
            onLoaded={(people) => {
              const me = people.find((p) => p.isSelf);
              if (me) setAssignedTo((current) => current ?? me.employeeId);
            }}
            value={assignedTo ?? ''}
            onChange={(v) => {
              setAssignedTo(v);
              clear('assignedToEmployeeId');
            }}
            error={errors.assignedToEmployeeId}
          />
          <p className="self-end pb-3 text-xs text-slate-500">
            {assignedTo === '' ? 'He goes to the Queue for a leader to assign.' : ''}
          </p>
          <Input
            label="Bank account number"
            hint="Optional for a buyer (BR-018) — he pays TriFid, he isn't paid."
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            error={errors['bankDetail.accountNumber']}
          />
          <Input
            label="IFSC"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
            error={errors['bankDetail.ifsc']}
          />
          <Input
            label="Account name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            error={errors['bankDetail.accountName']}
          />
          <div />
          <div className="col-span-2">
            <Textarea
              label="Call note"
              hint="Who called, what was agreed."
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={proprietorAgreed}
                onChange={(e) => {
                  setProprietorAgreed(e.target.checked);
                  clear('proprietorAgreed');
                }}
              />
              The proprietor agreed to register this number.
            </label>
            {errors.proprietorAgreed && (
              <p role="alert" className="mt-1 text-sm text-danger-500">
                {errors.proprietorAgreed}
              </p>
            )}
          </div>
          <ConfirmWarnings warnings={warnings} value={confirmations} onChange={setConfirmations} />
          {save.duplicate && (
            <p role="alert" className="col-span-2 text-sm text-danger-500">
              That{' '}
              {save.duplicate.field === 'gstin'
                ? 'GSTIN'
                : save.duplicate.field === 'pan'
                  ? 'PAN'
                  : 'code'}{' '}
              is already registered.{' '}
              <Link className="underline" to={`/registrations?open=${save.duplicate.existingId}`}>
                Open that registration
              </Link>
              .
            </p>
          )}
          {save.formError && warnings.length === 0 && !save.duplicate && (
            <p role="alert" className="col-span-2 text-sm text-danger-500">
              {save.formError}
            </p>
          )}
          {save.successMessage && (
            <p className="col-span-2 text-sm text-success-600">{save.successMessage}</p>
          )}
          <div className="col-span-2">
            <Button type="submit" loading={save.submitting} icon={<FiPhoneCall />}>
              {warnings.length > 0 ? 'Confirm and register' : 'Register buyer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
