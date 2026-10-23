import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { FiEye, FiSave, FiUserPlus } from 'react-icons/fi';
import {
  createEmployee,
  revealEmployeePii,
  updateEmployee,
  type EmployeeInput,
} from '../../../api/admin';
import type {
  EducationLevel,
  EmployeeDetail,
  EmployeeListItem,
  LaneBoardItem,
  Position,
} from '../../../api/dto';
import { useAuth } from '../../../auth/AuthContext';
import { PERMISSIONS, ROLE_KEYS } from '../../../lib/permissions';
import { useFormSubmit } from '../../../lib/useFormSubmit';
import {
  isValidAadhaar,
  isValidMobile,
  isValidPan,
  normalizeMobile,
} from '../../../lib/validators';
import { Input, Select, Textarea } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const POSITION_OPTIONS: Array<{ key: Position; label: string }> = [
  { key: 'SALES_LEADER', label: 'Sales Leader' },
  { key: 'PURCHASE_LEADER', label: 'Purchase Leader' },
  { key: 'SALES_EXEC', label: 'Sales Executive' },
  { key: 'PURCHASE_EXEC', label: 'Purchase Executive' },
];

const ROLE_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  sales: 'Sales',
  transport_logistics: 'Transport & Logistics',
  accounts: 'Accounts',
  controller: 'Controller',
  admin: 'Admin',
  founder: 'Founder',
};

const EDUCATION_OPTIONS: Array<{ value: EducationLevel; label: string }> = [
  { value: '10th', label: '10th' },
  { value: '12th', label: '12th' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'post_graduate', label: 'Post-graduate' },
  { value: 'other', label: 'Other' },
];

const POSITION_ROLE: Record<Position, string> = {
  SALES_LEADER: 'sales',
  SALES_EXEC: 'sales',
  PURCHASE_LEADER: 'purchase',
  PURCHASE_EXEC: 'purchase',
};

interface FormState {
  person: string;
  email: string;
  mobile: string;
  password: string;
  roleKeys: string[];
  positions: Position[];
  reportsToSalesLeaderId: string;
  reportsToPurchaseLeaderId: string;
  worksForTeamLeaderIds: string[];
  worksForAllTeams: boolean;
  laneKeys: string[];
  dob: string;
  pan: string;
  aadhaar: string;
  fatherName: string;
  fatherMobile: string;
  husbandName: string;
  husbandMobile: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyMobile: string;
  permanentAddress: string;
  currentSameAsPermanent: boolean;
  currentAddress: string;
  educationLevel: EducationLevel | '';
  educationOther: string;
}

const EMPTY: FormState = {
  person: '',
  email: '',
  mobile: '',
  password: '',
  roleKeys: [],
  positions: [],
  reportsToSalesLeaderId: '',
  reportsToPurchaseLeaderId: '',
  worksForTeamLeaderIds: [],
  worksForAllTeams: false,
  laneKeys: [],
  dob: '',
  pan: '',
  aadhaar: '',
  fatherName: '',
  fatherMobile: '',
  husbandName: '',
  husbandMobile: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyMobile: '',
  permanentAddress: '',
  currentSameAsPermanent: false,
  currentAddress: '',
  educationLevel: '',
  educationOther: '',
};

function fromDetail(detail: EmployeeDetail): FormState {
  const self = (ref: { employeeId: string } | null) =>
    ref ? (ref.employeeId === detail.employeeId ? 'self' : ref.employeeId) : '';
  return {
    ...EMPTY,
    person: detail.person,
    email: detail.email,
    mobile: detail.mobile ?? '',
    roleKeys: detail.roleKeys,
    positions: detail.positions,
    reportsToSalesLeaderId: self(detail.reportsToSalesLeader),
    reportsToPurchaseLeaderId: self(detail.reportsToPurchaseLeader),
    worksForTeamLeaderIds: detail.worksForTeams.map((t) => t.employeeId),
    worksForAllTeams: detail.worksForAllTeams,
    dob: detail.hr?.dob ?? '',
    fatherName: detail.hr?.fatherName ?? '',
    fatherMobile: detail.hr?.fatherMobile ?? '',
    husbandName: detail.hr?.husbandName ?? '',
    husbandMobile: detail.hr?.husbandMobile ?? '',
    emergencyName: detail.hr?.emergencyContact.name ?? '',
    emergencyRelation: detail.hr?.emergencyContact.relation ?? '',
    emergencyMobile: detail.hr?.emergencyContact.mobile ?? '',
    permanentAddress: detail.hr?.permanentAddress ?? '',
    currentSameAsPermanent: detail.hr?.currentSameAsPermanent ?? false,
    currentAddress: detail.hr?.currentSameAsPermanent ? '' : (detail.hr?.currentAddress ?? ''),
    educationLevel: detail.hr?.education.level ?? '',
    educationOther: detail.hr?.education.other ?? '',
  };
}

/** Sales Leader always brings Purchase Executive with it (DEC-059). */
function withImplied(positions: Position[]): Position[] {
  const held = new Set(positions);
  if (held.has('SALES_LEADER')) held.add('PURCHASE_EXEC');
  return POSITION_OPTIONS.map((p) => p.key).filter((k) => held.has(k));
}

function ageOnDate(dob: string, today = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

/** The checks the server makes too — run first so the person sees every problem at once. */
function checkLocally(form: FormState, mode: 'create' | 'edit', hasStoredPii: boolean) {
  const errors: Record<string, string> = {};
  if (form.person.trim().length < 2) errors.person = 'Enter the name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!isValidMobile(form.mobile))
    errors.mobile = 'Enter the mobile as a 10-digit number starting 6–9.';
  if (mode === 'create' && form.password.length < 8)
    errors.password = 'Enter a password of at least 8 characters.';
  const positions = withImplied(form.positions);
  if (positions.includes('SALES_EXEC') && !form.reportsToSalesLeaderId) {
    errors.reportsToSalesLeaderId = 'Pick the Sales Leader this person reports to.';
  }
  if (positions.includes('PURCHASE_EXEC') && !form.reportsToPurchaseLeaderId) {
    errors.reportsToPurchaseLeaderId = 'Pick the Purchase Leader this person reports to.';
  }
  if (form.roleKeys.length === 0 && positions.length === 0)
    errors.roleKeys = 'Tick at least one role or position.';
  if (!form.dob) errors['hr.dob'] = 'Enter the date of birth.';
  else if (ageOnDate(form.dob) < 18)
    errors['hr.dob'] = 'An employee must be at least 18 years old.';
  const pan = form.pan.trim().toUpperCase();
  if (pan ? !isValidPan(pan, { personOnly: true }) : !hasStoredPii) {
    errors['hr.pan'] = pan
      ? "Enter the PAN as 5 letters, 4 digits, 1 letter — an employee's PAN has P as its 4th letter."
      : 'Enter the PAN.';
  }
  const aadhaar = form.aadhaar.replace(/\s/g, '');
  if (aadhaar ? !isValidAadhaar(aadhaar) : !hasStoredPii) {
    errors['hr.aadhaar'] = aadhaar
      ? 'That Aadhaar number does not check out — 12 digits, not starting with 0 or 1.'
      : 'Enter the Aadhaar number.';
  }
  if (form.fatherName.trim().length < 2) errors['hr.fatherName'] = "Enter the father's name.";
  if (form.fatherMobile && !isValidMobile(form.fatherMobile)) {
    errors['hr.fatherMobile'] = "Enter the father's mobile as 10 digits, or leave it blank.";
  }
  if (form.husbandMobile && !isValidMobile(form.husbandMobile)) {
    errors['hr.husbandMobile'] = "Enter the husband's mobile as 10 digits, or leave it blank.";
  }
  if (form.emergencyName.trim().length < 2)
    errors['hr.emergencyContact.name'] = 'Enter the emergency contact name.';
  if (form.emergencyRelation.trim().length < 2) {
    errors['hr.emergencyContact.relation'] = 'Enter how they are related.';
  }
  if (!isValidMobile(form.emergencyMobile)) {
    errors['hr.emergencyContact.mobile'] = 'Enter the emergency contact mobile as 10 digits.';
  }
  if (form.permanentAddress.trim().length < 5)
    errors['hr.permanentAddress'] = 'Enter the permanent address.';
  if (!form.currentSameAsPermanent && form.currentAddress.trim().length < 5) {
    errors['hr.currentAddress'] = 'Enter the current local address, or tick "Same as permanent".';
  }
  if (form.educationLevel === 'other' && !form.educationOther.trim()) {
    errors['hr.education.other'] = 'Say what the education is.';
  }
  return errors;
}

function toInput(form: FormState): EmployeeInput {
  const positions = withImplied(form.positions);
  return {
    person: form.person.trim(),
    email: form.email.trim(),
    mobile: normalizeMobile(form.mobile),
    roleKeys: form.roleKeys,
    positions,
    reportsToSalesLeaderId: positions.includes('SALES_EXEC')
      ? form.reportsToSalesLeaderId || null
      : null,
    reportsToPurchaseLeaderId: positions.includes('PURCHASE_EXEC')
      ? form.reportsToPurchaseLeaderId || null
      : null,
    worksForTeamLeaderIds: form.worksForAllTeams ? [] : form.worksForTeamLeaderIds,
    worksForAllTeams: form.worksForAllTeams,
    hr: {
      dob: form.dob,
      ...(form.pan.trim() ? { pan: form.pan.trim().toUpperCase() } : {}),
      ...(form.aadhaar.trim() ? { aadhaar: form.aadhaar.replace(/\s/g, '') } : {}),
      fatherName: form.fatherName,
      fatherMobile: form.fatherMobile,
      husbandName: form.husbandName,
      husbandMobile: form.husbandMobile,
      emergencyContact: {
        name: form.emergencyName,
        relation: form.emergencyRelation,
        mobile: form.emergencyMobile,
      },
      permanentAddress: form.permanentAddress,
      currentSameAsPermanent: form.currentSameAsPermanent,
      currentAddress: form.currentSameAsPermanent ? '' : form.currentAddress,
      education: {
        level: form.educationLevel || null,
        other: form.educationLevel === 'other' ? form.educationOther : '',
      },
    },
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="col-span-2 rounded-md border border-slate-300 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">{title}</legend>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </fieldset>
  );
}

function Check({
  label,
  checked,
  disabled,
  hint,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm ${disabled ? 'text-slate-400' : 'text-slate-700'}`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {label}
      {hint && <span className="text-xs text-slate-500">({hint})</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="mt-1 text-sm text-danger-500">
      {message}
    </p>
  ) : null;
}

/**
 * Phase 2 — create and edit an employee in one form. Positions tick their
 * role; Sales Leader ticks and locks Purchase Executive; each executive
 * position asks for its leader. PAN and Aadhaar on edit are only ever shown
 * masked — leave them blank to keep them; an Admin can "Show" the full value
 * (audited). Every save goes through the form kit (Idempotency-Key, errors
 * next to the field, success message, reset after a create).
 */
export function EmployeeForm({
  mode,
  detail,
  employees,
  laneOptions,
  onSaved,
  onCancel,
}: {
  mode: 'create' | 'edit';
  detail?: EmployeeDetail;
  /** Active employees, for the leader and team pickers. */
  employees: EmployeeListItem[];
  laneOptions: LaneBoardItem[];
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { callApi, hasPermission } = useAuth();
  const canReveal = hasPermission(PERMISSIONS.EMPLOYEE_PII_REVEAL);
  const [form, setForm] = useState<FormState>(() => (detail ? fromDetail(detail) : EMPTY));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<{ pan?: string; aadhaar?: string }>({});
  const [revealError, setRevealError] = useState<string | null>(null);
  const hasStoredPii = mode === 'edit' && Boolean(detail?.hr);
  const selfId = detail?.employeeId;

  const save = useFormSubmit<{ mfaSecret?: string }>({
    fields: [
      'person',
      'email',
      'mobile',
      'password',
      'roleKeys',
      'positions',
      'laneKeys',
      'reportsToSalesLeaderId',
      'reportsToPurchaseLeaderId',
      'worksForTeamLeaderIds',
      'hr.dob',
      'hr.pan',
      'hr.aadhaar',
      'hr.fatherName',
      'hr.fatherMobile',
      'hr.husbandMobile',
      'hr.emergencyContact.name',
      'hr.emergencyContact.relation',
      'hr.emergencyContact.mobile',
      'hr.permanentAddress',
      'hr.currentAddress',
      'hr.education.other',
    ],
    success: (result) =>
      result.mfaSecret
        ? `Saved. Authenticator secret — hand it to the employee once, in person: ${result.mfaSecret}`
        : mode === 'create'
          ? 'Employee created.'
          : 'Changes saved.',
    onSuccess: () => {
      if (mode === 'create') setForm(EMPTY);
      else setForm((f) => ({ ...f, password: '', pan: '', aadhaar: '' }));
      onSaved();
    },
  });

  const errors = { ...localErrors, ...save.fieldErrors };
  const positions = withImplied(form.positions);
  const impliedRoles = new Set(positions.map((p) => POSITION_ROLE[p]));
  const salesLeaders = useMemo(
    () =>
      employees.filter(
        (e) => e.active && e.positions.includes('SALES_LEADER') && e.employeeId !== selfId,
      ),
    [employees, selfId],
  );
  const purchaseLeaders = useMemo(
    () =>
      employees.filter(
        (e) => e.active && e.positions.includes('PURCHASE_LEADER') && e.employeeId !== selfId,
      ),
    [employees, selfId],
  );
  const accountsLike = form.roleKeys.some((k) => k === 'accounts' || k === 'transport_logistics');

  function set<K extends keyof FormState>(key: K, value: FormState[K], errorKey?: string): void {
    setForm((f) => ({ ...f, [key]: value }));
    const field = errorKey ?? key;
    setLocalErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
    save.clearFieldError(field);
  }

  function togglePosition(key: Position): void {
    const next = form.positions.includes(key)
      ? form.positions.filter((p) => p !== key)
      : [...form.positions, key];
    set('positions', withImplied(next));
  }

  function toggleRole(key: string): void {
    set(
      'roleKeys',
      form.roleKeys.includes(key)
        ? form.roleKeys.filter((k) => k !== key)
        : [...form.roleKeys, key],
    );
  }

  async function reveal(field: 'pan' | 'aadhaar'): Promise<void> {
    if (!selfId) return;
    setRevealError(null);
    try {
      const res = await callApi((token) => revealEmployeePii(token, selfId, field));
      setRevealed((r) => ({ ...r, [field]: res.value }));
    } catch {
      setRevealError('Could not show it — try again.');
    }
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const found = checkLocally(form, mode, hasStoredPii);
    setLocalErrors(found);
    if (Object.keys(found).length > 0) return;
    const input = toInput({
      ...form,
      // Positions tick their department's role.
      roleKeys: [...new Set([...form.roleKeys, ...impliedRoles])],
    });
    void save.submit((key) =>
      callApi((token) =>
        mode === 'create'
          ? createEmployee(
              token,
              { ...input, password: form.password, laneKeys: form.laneKeys },
              key,
            )
          : updateEmployee(token, selfId!, { ...input, password: form.password }, key),
      ),
    );
  }

  const leaderSelect = (
    side: 'sales' | 'purchase',
    leaders: EmployeeListItem[],
    leaderPosition: Position,
  ) => {
    const key = side === 'sales' ? 'reportsToSalesLeaderId' : 'reportsToPurchaseLeaderId';
    return (
      <Select
        label={side === 'sales' ? 'Reports to (Sales Leader)' : 'Reports to (Purchase Leader)'}
        required
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        error={errors[key]}
      >
        <option value="">Select…</option>
        {positions.includes(leaderPosition) && <option value="self">Himself</option>}
        {leaders.map((l) => (
          <option key={l.employeeId} value={l.employeeId}>
            {l.person}
          </option>
        ))}
      </Select>
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid max-w-3xl grid-cols-2 gap-4">
      <Section title="Account">
        <Input
          label="Name"
          required
          value={form.person}
          onChange={(e) => set('person', e.target.value)}
          error={errors.person}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <Input
          label="Mobile"
          required
          inputMode="tel"
          placeholder="10 digits"
          value={form.mobile}
          onChange={(e) => set('mobile', e.target.value)}
          error={errors.mobile}
        />
        <Input
          label="Password"
          type="password"
          required={mode === 'create'}
          hint={mode === 'edit' ? 'Leave blank to keep the current password.' : undefined}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
        />
      </Section>

      <Section title="Positions">
        <div className="col-span-2 grid grid-cols-2 gap-2">
          {POSITION_OPTIONS.map((p) => {
            const locked = p.key === 'PURCHASE_EXEC' && positions.includes('SALES_LEADER');
            return (
              <Check
                key={p.key}
                label={p.label}
                checked={positions.includes(p.key)}
                disabled={locked}
                hint={locked ? 'every Sales Leader is his team’s Purchase Executive' : undefined}
                onChange={() => togglePosition(p.key)}
              />
            );
          })}
          <FieldError message={errors.positions} />
        </div>
        {positions.includes('SALES_EXEC') && leaderSelect('sales', salesLeaders, 'SALES_LEADER')}
        {positions.includes('PURCHASE_EXEC') &&
          leaderSelect('purchase', purchaseLeaders, 'PURCHASE_LEADER')}
      </Section>

      <Section title="Roles">
        <div className="col-span-2 grid grid-cols-2 gap-2">
          {ROLE_KEYS.map((key) => (
            <Check
              key={key}
              label={ROLE_LABEL[key] ?? key}
              checked={form.roleKeys.includes(key) || impliedRoles.has(key)}
              disabled={impliedRoles.has(key)}
              hint={impliedRoles.has(key) ? 'from the position' : undefined}
              onChange={() => toggleRole(key)}
            />
          ))}
          <FieldError message={errors.roleKeys} />
        </div>
        {accountsLike && (
          <div className="col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">Works for team(s)</p>
            <Check
              label="All teams (Accounts head)"
              checked={form.worksForAllTeams}
              onChange={() => set('worksForAllTeams', !form.worksForAllTeams)}
            />
            {!form.worksForAllTeams && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {salesLeaders.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No Sales Leaders yet — teams are named by their leader.
                  </p>
                )}
                {salesLeaders.map((l) => (
                  <Check
                    key={l.employeeId}
                    label={`${l.person}'s team`}
                    checked={form.worksForTeamLeaderIds.includes(l.employeeId)}
                    onChange={() =>
                      set(
                        'worksForTeamLeaderIds',
                        form.worksForTeamLeaderIds.includes(l.employeeId)
                          ? form.worksForTeamLeaderIds.filter((x) => x !== l.employeeId)
                          : [...form.worksForTeamLeaderIds, l.employeeId],
                      )
                    }
                  />
                ))}
              </div>
            )}
            <FieldError message={errors.worksForTeamLeaderIds} />
          </div>
        )}
      </Section>

      {mode === 'create' && laneOptions.length > 0 && (
        <Section title="Lanes (optional)">
          <div className="col-span-2 grid grid-cols-2 gap-2">
            {laneOptions.map((lane) => (
              <Check
                key={lane.laneKey}
                label={`${lane.laneKey} — ${lane.label}`}
                checked={form.laneKeys.includes(lane.laneKey)}
                disabled={lane.isCovered}
                hint={lane.isCovered ? 'held' : undefined}
                onChange={() =>
                  set(
                    'laneKeys',
                    form.laneKeys.includes(lane.laneKey)
                      ? form.laneKeys.filter((k) => k !== lane.laneKey)
                      : [...form.laneKeys, lane.laneKey],
                  )
                }
              />
            ))}
            <FieldError message={errors.laneKeys} />
          </div>
        </Section>
      )}

      <Section title="HR details">
        <Input
          label="Date of birth"
          type="date"
          required
          value={form.dob}
          onChange={(e) => set('dob', e.target.value, 'hr.dob')}
          error={errors['hr.dob']}
        />
        <div />
        <div>
          <Input
            label="PAN"
            required={!hasStoredPii}
            placeholder={hasStoredPii ? (revealed.pan ?? detail?.hr?.panMasked) : 'ABCPE1234F'}
            hint={hasStoredPii ? 'Leave blank to keep the PAN on record.' : undefined}
            value={form.pan}
            onChange={(e) => set('pan', e.target.value.toUpperCase(), 'hr.pan')}
            error={errors['hr.pan']}
          />
          {hasStoredPii && canReveal && !revealed.pan && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={<FiEye />}
              onClick={() => void reveal('pan')}
            >
              Show
            </Button>
          )}
        </div>
        <div>
          <Input
            label="Aadhaar"
            required={!hasStoredPii}
            inputMode="numeric"
            placeholder={
              hasStoredPii ? (revealed.aadhaar ?? detail?.hr?.aadhaarMasked) : '12 digits'
            }
            hint={hasStoredPii ? 'Leave blank to keep the Aadhaar on record.' : undefined}
            value={form.aadhaar}
            onChange={(e) => set('aadhaar', e.target.value, 'hr.aadhaar')}
            error={errors['hr.aadhaar']}
          />
          {hasStoredPii && canReveal && !revealed.aadhaar && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={<FiEye />}
              onClick={() => void reveal('aadhaar')}
            >
              Show
            </Button>
          )}
        </div>
        {revealError && <p className="col-span-2 text-sm text-danger-500">{revealError}</p>}
        <Input
          label="Father's name"
          required
          value={form.fatherName}
          onChange={(e) => set('fatherName', e.target.value, 'hr.fatherName')}
          error={errors['hr.fatherName']}
        />
        <Input
          label="Father's mobile"
          hint="Optional"
          value={form.fatherMobile}
          onChange={(e) => set('fatherMobile', e.target.value, 'hr.fatherMobile')}
          error={errors['hr.fatherMobile']}
        />
        <Input
          label="Husband's name"
          hint="Optional"
          value={form.husbandName}
          onChange={(e) => set('husbandName', e.target.value)}
        />
        <Input
          label="Husband's mobile"
          hint="Optional"
          value={form.husbandMobile}
          onChange={(e) => set('husbandMobile', e.target.value, 'hr.husbandMobile')}
          error={errors['hr.husbandMobile']}
        />
        <Input
          label="Emergency contact name"
          required
          value={form.emergencyName}
          onChange={(e) => set('emergencyName', e.target.value, 'hr.emergencyContact.name')}
          error={errors['hr.emergencyContact.name']}
        />
        <Input
          label="Relation"
          required
          value={form.emergencyRelation}
          onChange={(e) => set('emergencyRelation', e.target.value, 'hr.emergencyContact.relation')}
          error={errors['hr.emergencyContact.relation']}
        />
        <Input
          label="Emergency contact mobile"
          required
          value={form.emergencyMobile}
          onChange={(e) => set('emergencyMobile', e.target.value, 'hr.emergencyContact.mobile')}
          error={errors['hr.emergencyContact.mobile']}
        />
        <div />
        <div className="col-span-2">
          <Textarea
            label="Permanent address"
            required
            value={form.permanentAddress}
            onChange={(e) => set('permanentAddress', e.target.value, 'hr.permanentAddress')}
            error={errors['hr.permanentAddress']}
          />
        </div>
        <div className="col-span-2">
          <Check
            label="Current local address is the same as permanent"
            checked={form.currentSameAsPermanent}
            onChange={() =>
              set('currentSameAsPermanent', !form.currentSameAsPermanent, 'hr.currentAddress')
            }
          />
        </div>
        {!form.currentSameAsPermanent && (
          <div className="col-span-2">
            <Textarea
              label="Current local address"
              required
              value={form.currentAddress}
              onChange={(e) => set('currentAddress', e.target.value, 'hr.currentAddress')}
              error={errors['hr.currentAddress']}
            />
          </div>
        )}
        <Select
          label="Education"
          hint="Optional"
          value={form.educationLevel}
          onChange={(e) => set('educationLevel', e.target.value as EducationLevel | '')}
        >
          <option value="">Not given</option>
          {EDUCATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {form.educationLevel === 'other' ? (
          <Input
            label="Which education"
            required
            value={form.educationOther}
            onChange={(e) => set('educationOther', e.target.value, 'hr.education.other')}
            error={errors['hr.education.other']}
          />
        ) : (
          <div />
        )}
      </Section>

      {Object.keys(localErrors).length > 0 && (
        <p role="alert" className="col-span-2 text-sm text-danger-500">
          Some fields need attention — see the messages next to them.
        </p>
      )}
      {save.formError && (
        <p role="alert" className="col-span-2 text-sm text-danger-500">
          {save.formError}
        </p>
      )}
      {save.successMessage && (
        <p className="col-span-2 text-sm text-success-600">{save.successMessage}</p>
      )}

      <div className="col-span-2 flex gap-2">
        <Button
          type="submit"
          loading={save.submitting}
          icon={mode === 'create' ? <FiUserPlus /> : <FiSave />}
        >
          {mode === 'create' ? 'Create employee' : 'Save changes'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
