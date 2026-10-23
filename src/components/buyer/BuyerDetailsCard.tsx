import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import {
  getBuyerProfile,
  updateBuyerProfile,
  type BuyerCategory,
  type BuyerConfirmations,
} from '../../api/onboarding';
import type { BuyerProfileDto } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { useAsyncData } from '../../lib/useAsyncData';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { normalizeMobile } from '../../lib/validators';
import { AsyncBoundary } from '../AsyncBoundary';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { LocationBlock, type LocationValue } from '../location/LocationBlock';
import { CompanyPicker } from '../../desks/purchase/CompanyPicker';
import { ChangeOwnerButton } from '../lead/ChangeOwner';
import {
  CategorySelect,
  ConfirmWarnings,
  GstinPanFields,
  warningsFrom,
  type ConfirmWarning,
} from './BuyerFields';

/**
 * Phase 3 — the buyer profile's details card: proprietor, mobile, GSTIN (or
 * "Unregistered" and his PAN), category, address and place, licence, Marg
 * party code, companies, and who he is assigned to with that person's
 * leader. Edit follows the server's rules (shown as `canEdit*`): his
 * executive, that executive's leader, or Admin edits; only a leader or Admin
 * changes the category; only Admin changes GSTIN or PAN.
 */
export function BuyerDetailsCard({ buyerId, onSaved }: { buyerId: string; onSaved?: () => void }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getBuyerProfile(token, buyerId)),
    [callApi, buyerId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);
  const [editing, setEditing] = useState(false);

  return (
    <Card title="Details">
      <AsyncBoundary state={state} onRetry={retry}>
        {(profile: BuyerProfileDto) => (
          <div className="flex flex-col gap-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-slate-500">Proprietor</dt>
              <dd>{profile.ownerName ?? '—'}</dd>
              <dt className="text-slate-500">Mobile</dt>
              <dd>
                {profile.contactMobile ?? '—'}
                {!profile.loginMobile && profile.contactMobile && (
                  <span className="text-xs text-slate-500"> (shared — no app login)</span>
                )}
              </dd>
              <dt className="text-slate-500">GSTIN</dt>
              <dd className="font-mono">
                {profile.gstin ?? (
                  <>
                    <Badge tone="warn" variant="chip">
                      Unregistered
                    </Badge>{' '}
                    PAN {profile.pan ?? '—'}
                  </>
                )}
              </dd>
              <dt className="text-slate-500">Category</dt>
              <dd>{profile.category ?? '—'}</dd>
              <dt className="text-slate-500">Address</dt>
              <dd>{profile.location.address ?? '—'}</dd>
              <dt className="text-slate-500">Place</dt>
              <dd>
                {[profile.location.tehsil, profile.location.district].filter(Boolean).join(', ') ||
                  '—'}
                {profile.location.pincode ? ` · ${profile.location.pincode}` : ''}
              </dd>
              <dt className="text-slate-500">Licence no.</dt>
              <dd>{profile.licenceNo ?? '—'}</dd>
              <dt className="text-slate-500">Marg party code</dt>
              <dd>{profile.margPartyCode ?? '—'}</dd>
              <dt className="text-slate-500">Companies</dt>
              <dd>{profile.companies.map((c) => c.name).join(', ') || '—'}</dd>
              <dt className="text-slate-500">Assigned to</dt>
              <dd>
                {profile.assignedTo ? (
                  <>
                    {profile.assignedTo.person}
                    {profile.assignedLeader &&
                      profile.assignedLeader.employeeId !== profile.assignedTo.employeeId &&
                      ` · leader ${profile.assignedLeader.person}`}
                  </>
                ) : (
                  <Badge tone="warn">Queue</Badge>
                )}
              </dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              {profile.canEdit && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<FiEdit2 />}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              )}
              {profile.canChangeOwner && (
                <ChangeOwnerButton
                  side="buyer"
                  profileId={profile.buyerId}
                  firm={profile.firm}
                  current={profile.assignedTo}
                  onChanged={() => {
                    retry();
                    onSaved?.();
                  }}
                />
              )}
            </div>
            {editing && (
              <EditBuyerModal
                profile={profile}
                onClose={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  retry();
                  onSaved?.();
                }}
              />
            )}
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}

const FIELDS = [
  'firm',
  'ownerName',
  'contactMobile',
  'gstin',
  'pan',
  'category',
  'location.address',
  'location.pincode',
  'location.stateId',
  'location.districtId',
  'location.tehsilId',
  'licenceNo',
  'margPartyCode',
  'dealerships',
] as const;

function EditBuyerModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: BuyerProfileDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { callApi } = useAuth();
  const [firm, setFirm] = useState(profile.firm);
  const [ownerName, setOwnerName] = useState(profile.ownerName ?? '');
  const [contactMobile, setContactMobile] = useState(profile.contactMobile ?? '');
  const [identity, setIdentity] = useState({ gstin: profile.gstin ?? '', pan: profile.pan ?? '' });
  const [category, setCategory] = useState<BuyerCategory | ''>(profile.category ?? '');
  const [location, setLocation] = useState<LocationValue>({
    address: profile.location.address ?? '',
    pincode: profile.location.pincode ?? '',
    stateId: profile.location.stateId ?? '',
    districtId: profile.location.districtId ?? '',
    tehsilId: profile.location.tehsilId ?? '',
  });
  const [licenceNo, setLicenceNo] = useState(profile.licenceNo ?? '');
  const [margPartyCode, setMargPartyCode] = useState(profile.margPartyCode ?? '');
  const [companyIds, setCompanyIds] = useState(profile.companies.map((c) => c.manufacturerId));
  const [warnings, setWarnings] = useState<ConfirmWarning[]>([]);
  const [confirmations, setConfirmations] = useState<BuyerConfirmations>({});
  const save = useFormSubmit<BuyerProfileDto>({
    fields: FIELDS,
    success: 'Saved.',
    onSuccess: onSaved,
  });
  const e = save.fieldErrors;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    let refusal: unknown = null;
    await save.submit((key) =>
      callApi((token) =>
        updateBuyerProfile(
          token,
          profile.buyerId,
          {
            firm,
            ownerName: ownerName || undefined,
            contactMobile: normalizeMobile(contactMobile),
            gstin: identity.gstin || undefined,
            pan: identity.gstin ? undefined : identity.pan || undefined,
            category: category as BuyerCategory,
            location: {
              address: location.address,
              pincode: location.pincode || undefined,
              stateId: location.stateId,
              districtId: location.districtId,
              tehsilId: location.tehsilId,
            },
            licenceNo: licenceNo || undefined,
            margPartyCode: margPartyCode || undefined,
            dealerships: companyIds.map((manufacturerId) => ({ manufacturerId })),
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

  return (
    <Modal open title={`Edit ${profile.firm}`} onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid max-h-[75vh] grid-cols-2 gap-4 overflow-y-auto pr-1"
      >
        <Input
          label="Firm name"
          required
          value={firm}
          onChange={(ev) => setFirm(ev.target.value)}
          error={e.firm}
        />
        <Input
          label="Proprietor name"
          value={ownerName}
          onChange={(ev) => setOwnerName(ev.target.value)}
          error={e.ownerName}
        />
        <Input
          label="Mobile"
          required
          value={contactMobile}
          onChange={(ev) => setContactMobile(ev.target.value)}
          error={e.contactMobile}
          hint={
            profile.loginMobile ? 'His app login stays on the number he signed up with.' : undefined
          }
        />
        <div />
        <GstinPanFields
          gstin={identity.gstin}
          pan={identity.pan}
          disabled={!profile.canEditIdentity}
          onChange={setIdentity}
          errors={{ gstin: e.gstin, pan: e.pan }}
        />
        <CategorySelect
          value={category}
          disabled={!profile.canEditCategory}
          hint={
            profile.canEditCategory
              ? undefined
              : 'Only a Sales Leader or Admin changes the category.'
          }
          onChange={setCategory}
          error={e.category}
        />
        <div />
        <div className="col-span-2">
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
        <div className="col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Companies he deals in</p>
          <CompanyPicker value={companyIds} onChange={setCompanyIds} />
        </div>
        <Input
          label="Insecticide licence no."
          value={licenceNo}
          onChange={(ev) => setLicenceNo(ev.target.value)}
          error={e.licenceNo}
        />
        <Input
          label="Marg party code"
          value={margPartyCode}
          onChange={(ev) => setMargPartyCode(ev.target.value.toUpperCase())}
          error={e.margPartyCode}
        />
        <ConfirmWarnings warnings={warnings} value={confirmations} onChange={setConfirmations} />
        {save.formError && warnings.length === 0 && (
          <p role="alert" className="col-span-2 text-sm text-danger-500">
            {save.formError}
          </p>
        )}
        <div className="col-span-2 flex gap-2">
          <Button
            type="submit"
            loading={save.submitting}
            disabled={!category || !location.tehsilId}
          >
            {warnings.length > 0 ? 'Confirm and save' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
