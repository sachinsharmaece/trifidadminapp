import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiPhoneCall } from 'react-icons/fi';
import { staffRegisterSeller } from '../../api/onboarding';
import { useAuth } from '../../auth/AuthContext';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { isValidGstin, normalizeMobile } from '../../lib/validators';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';
import {
  EMPTY_LOCATION,
  LocationBlock,
  type LocationValue,
} from '../../components/location/LocationBlock';
import { AssigneeSelect } from '../../components/buyer/BuyerFields';
import { CompanyPicker } from './CompanyPicker';

const FIELDS = [
  'mobile',
  'firm',
  'gstin',
  'ownerName',
  'licenceNo',
  'bankDetail.accountNumber',
  'bankDetail.ifsc',
  'bankDetail.accountName',
  'references.0.firm',
  'references.0.phone',
  'references.1.firm',
  'references.1.phone',
  'callNote',
  'location',
  'location.address',
  'location.pincode',
  'location.stateId',
  'location.districtId',
  'location.tehsilId',
  'margPartyCode',
  'assignedToEmployeeId',
  'proprietorAgreed',
] as const;

/**
 * For a dealer the desk found itself, rather than one who registered on his
 * own. Phase 4 — his own location (mandatory), Assigned to (a Purchase
 * person; a Sales Leader is his own team's Purchase Executive), Marg party
 * code, and **no OTP** (DEC-056): the proprietor-agreed tick instead. GSTIN
 * stays mandatory for a seller. Bank, referees and companies are unchanged.
 */
export function AddSellerPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [firm, setFirm] = useState('');
  const [gstin, setGstin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [margPartyCode, setMargPartyCode] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountName, setAccountName] = useState('');
  const [refFirm1, setRefFirm1] = useState('');
  const [refPhone1, setRefPhone1] = useState('');
  const [refFirm2, setRefFirm2] = useState('');
  const [refPhone2, setRefPhone2] = useState('');
  const [callNote, setCallNote] = useState('');
  const [dealershipIds, setDealershipIds] = useState<string[]>([]);
  const [proprietorAgreed, setProprietorAgreed] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  function reset(): void {
    setMobile('');
    setFirm('');
    setGstin('');
    setOwnerName('');
    setLicenceNo('');
    setLocation(EMPTY_LOCATION);
    setMargPartyCode('');
    setAssignedTo(null);
    setAccountNumber('');
    setIfsc('');
    setAccountName('');
    setRefFirm1('');
    setRefPhone1('');
    setRefFirm2('');
    setRefPhone2('');
    setCallNote('');
    setDealershipIds([]);
    setProprietorAgreed(false);
  }

  const save = useFormSubmit<{ registrationId: string; accountNameWarning: string | null }>({
    fields: FIELDS,
    success: (r) =>
      `Seller registered — set his area and approve him from Registrations.${
        r.accountNameWarning
          ? ` ⚠️ ${r.accountNameWarning} Not blocked — logged for whoever approves him to check.`
          : ''
      }`,
    onSuccess: reset,
  });
  const errors: Record<string, string | undefined> = { ...localErrors, ...save.fieldErrors };
  const clear = (field: string) => {
    setLocalErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
    save.clearFieldError(field);
  };

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (gstin && gstin.length === 15 && !isValidGstin(gstin.toUpperCase())) {
      found.gstin = 'That GSTIN does not check out.';
    }
    if (location.address.trim().length < 5) found['location.address'] = 'Enter the address.';
    if (!location.tehsilId) found['location.tehsilId'] = 'Pick the tehsil from the list.';
    if (!proprietorAgreed) {
      found.proprietorAgreed = 'Tick that the proprietor agreed to register this number.';
    }
    setLocalErrors(found);
    if (Object.keys(found).length > 0) return;
    void save.submit((key) =>
      callApi((token) =>
        staffRegisterSeller(
          token,
          {
            mobile: normalizeMobile(mobile),
            firm,
            gstin: gstin.toUpperCase(),
            ownerName,
            licenceNo,
            references: [
              {
                firm: refFirm1,
                phone: refPhone1,
                relationship: 'Supplier',
                whatTheySaid: 'Reliable',
              },
              {
                firm: refFirm2,
                phone: refPhone2,
                relationship: 'Supplier',
                whatTheySaid: 'Reliable',
              },
            ],
            ...(dealershipIds.length > 0
              ? { dealerships: dealershipIds.map((manufacturerId) => ({ manufacturerId })) }
              : {}),
            bankDetail: { accountNumber, ifsc, accountName },
            consent: { noticeVersion: 'v1', marketingOptIn: false },
            callNote,
            location: {
              address: location.address,
              pincode: location.pincode || undefined,
              stateId: location.stateId,
              districtId: location.districtId,
              tehsilId: location.tehsilId,
            },
            margPartyCode: margPartyCode || undefined,
            ...(assignedTo === null ? {} : { assignedToEmployeeId: assignedTo || null }),
            proprietorAgreed: true,
          },
          key,
        ),
      ),
    );
  }

  const text = (
    label: string,
    value: string,
    set: (v: string) => void,
    field: string,
    extra: Partial<Parameters<typeof Input>[0]> = {},
  ) => (
    <Input
      label={label}
      value={value}
      onChange={(e) => {
        set(e.target.value);
        clear(field);
      }}
      error={errors[field]}
      required
      {...extra}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/purchase/sellers')}>
        Sellers
      </Button>
      <DevNote screen="purchase_add_seller" />
      <Card title="Add a seller">
        <p className="mb-4 text-sm text-slate-500">
          GSTIN stays mandatory for a seller — TriFid buys on a GST invoice — plus BR-250&apos;s two
          named referees.
        </p>
        <form onSubmit={handleSubmit} noValidate className="grid max-w-3xl grid-cols-2 gap-4">
          {text('Mobile', mobile, setMobile, 'mobile', { inputMode: 'tel', maxLength: 14 })}
          {text('Firm', firm, setFirm, 'firm')}
          {text('GSTIN', gstin, (v) => setGstin(v.toUpperCase()), 'gstin', { maxLength: 15 })}
          {text('Proprietor name', ownerName, setOwnerName, 'ownerName')}
          <div className="col-span-2">
            <LocationBlock
              required
              value={location}
              onChange={(next) => {
                setLocation(next);
                ['', '.address', '.pincode', '.stateId', '.districtId', '.tehsilId'].forEach((f) =>
                  clear(`location${f}`),
                );
              }}
              errors={{
                address: errors['location.address'],
                pincode: errors['location.pincode'],
                stateId: errors['location.stateId'],
                districtId: errors['location.districtId'],
                tehsilId: errors['location.tehsilId'] ?? errors.location,
              }}
            />
          </div>
          {text('Insecticide licence no.', licenceNo, setLicenceNo, 'licenceNo')}
          <Input
            label="Marg party code"
            hint="Optional — his party code in Marg (a separate ledger from any buyer one)."
            value={margPartyCode}
            onChange={(e) => {
              setMargPartyCode(e.target.value.toUpperCase());
              clear('margPartyCode');
            }}
            error={errors.margPartyCode}
          />
          <AssigneeSelect
            side="purchase"
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
            {assignedTo === '' ? 'He goes to the Queue for a Purchase Leader to assign.' : ''}
          </p>
          {text('Bank account number', accountNumber, setAccountNumber, 'bankDetail.accountNumber')}
          {text('IFSC', ifsc, (v) => setIfsc(v.toUpperCase()), 'bankDetail.ifsc')}
          {text('Account name', accountName, setAccountName, 'bankDetail.accountName')}
          <div />
          {text('Referee 1 — firm', refFirm1, setRefFirm1, 'references.0.firm')}
          {text('Referee 1 — phone', refPhone1, setRefPhone1, 'references.0.phone', {
            maxLength: 10,
          })}
          {text('Referee 2 — firm', refFirm2, setRefFirm2, 'references.1.firm')}
          {text('Referee 2 — phone', refPhone2, setRefPhone2, 'references.1.phone', {
            maxLength: 10,
          })}
          <div className="col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Companies he deals in
            </span>
            <p className="mb-2 text-sm text-slate-500">
              Optional — can be ticked later from his seller file.
            </p>
            <CompanyPicker value={dealershipIds} onChange={setDealershipIds} />
          </div>
          <div className="col-span-2">
            <Textarea
              label="Call note"
              hint="Who called, what was agreed."
              value={callNote}
              onChange={(e) => {
                setCallNote(e.target.value);
                clear('callNote');
              }}
              error={errors.callNote}
              required
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
          {save.duplicate && (
            <p role="alert" className="col-span-2 text-sm text-danger-500">
              That{' '}
              {save.duplicate.field === 'gstin'
                ? 'GSTIN'
                : save.duplicate.field === 'mobile'
                  ? 'mobile'
                  : 'code'}{' '}
              is already registered.{' '}
              <Link className="underline" to={`/registrations?open=${save.duplicate.existingId}`}>
                Open it
              </Link>
              .
            </p>
          )}
          {save.formError && !save.duplicate && (
            <p role="alert" className="col-span-2 text-sm text-danger-500">
              {save.formError}
            </p>
          )}
          {save.successMessage && (
            <p className="col-span-2 text-sm text-success-600">{save.successMessage}</p>
          )}
          <div className="col-span-2">
            <Button type="submit" loading={save.submitting} icon={<FiPhoneCall />}>
              Register seller
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
