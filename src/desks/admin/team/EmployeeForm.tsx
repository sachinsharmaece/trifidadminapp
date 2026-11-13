import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  FiBriefcase,
  FiCreditCard,
  FiEye,
  FiLayers,
  FiMapPin,
  FiPhoneCall,
  FiSave,
  FiShield,
  FiUser,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
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
import { FormActions } from '../../../components/ui/FormActions';

const POSITION_OPTIONS: Array<{ key: Position; label: string }> = [
  { key: 'SALES_LEADER', label: 'Sales Leader' },
  { key: 'PURCHASE_LEADER', label: 'Purchase Leader' },
  { key: 'SALES_EXEC', label: 'Sales Executive' },
  { key: 'SR_SALES_EXEC', label: 'Sr. Sales Executive' },
  { key: 'PURCHASE_EXEC', label: 'Purchase Executive' },
];

/** A Sales Executive or Sr. Sales Executive: sits in a Sales team and makes the calls. */
const isSalesCaller = (positions: Position[]): boolean =>
  positions.includes('SALES_EXEC') || positions.includes('SR_SALES_EXEC');

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
  SR_SALES_EXEC: 'sales',
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
  receivingLeads: boolean;
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
  receivingLeads: true,
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
    receivingLeads: detail.receivingLeads ?? true,
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

/**
 * DEC-066 — a Sales Leader is his team's Purchase Executive but reports to
 * Admin, not to a Purchase Leader (unless he is a Purchase Leader too).
 */
function purchaseReportsToAdmin(positions: Position[]): boolean {
  return positions.includes('SALES_LEADER') && !positions.includes('PURCHASE_LEADER');
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
function checkLocally(
  form: FormState,
  mode: 'create' | 'edit',
  hasStoredPii: boolean,
  withHr: boolean,
) {
  const errors: Record<string, string> = {};
  if (form.person.trim().length < 2) errors.person = 'Enter the name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!isValidMobile(form.mobile))
    errors.mobile = 'Enter the mobile as a 10-digit number starting 6–9.';
  if (mode === 'create' && form.password.length < 8)
    errors.password = 'Enter a password of at least 8 characters.';
  const positions = withImplied(form.positions);
  if (isSalesCaller(positions) && !form.reportsToSalesLeaderId) {
    errors.reportsToSalesLeaderId = 'Pick the Sales Leader this person reports to.';
  }
  if (
    positions.includes('PURCHASE_EXEC') &&
    !purchaseReportsToAdmin(positions) &&
    !form.reportsToPurchaseLeaderId
  ) {
    errors.reportsToPurchaseLeaderId = 'Pick the Purchase Leader this person reports to.';
  }
  if (form.roleKeys.length === 0 && positions.length === 0)
    errors.roleKeys = 'Tick at least one role or position.';
  if (!withHr) return errors;
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

function toInput(form: FormState, withHr: boolean): EmployeeInput {
  const positions = withImplied(form.positions);
  return {
    person: form.person.trim(),
    email: form.email.trim(),
    mobile: normalizeMobile(form.mobile),
    roleKeys: form.roleKeys,
    positions,
    reportsToSalesLeaderId: isSalesCaller(positions) ? form.reportsToSalesLeaderId || null : null,
    reportsToPurchaseLeaderId:
      positions.includes('PURCHASE_EXEC') && !purchaseReportsToAdmin(positions)
        ? form.reportsToPurchaseLeaderId || null
        : null,
    worksForTeamLeaderIds: form.worksForAllTeams ? [] : form.worksForTeamLeaderIds,
    worksForAllTeams: form.worksForAllTeams,
    receivingLeads: form.receivingLeads,
    ...(withHr ? { hr: hrInput(form) } : {}),
  };
}

function hrInput(form: FormState): NonNullable<EmployeeInput['hr']> {
  return {
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
  };
}

/** One block of the form: an icon, a title and a line of guidance over a two-column field grid. */
function Section({
  icon,
  title,
  description,
  nested = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Sits under a group heading (the HR details), so its own heading is one level lower. */
  nested?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  const Heading = nested ? 'h4' : 'h3';
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <Heading id={headingId} className="text-sm font-semibold text-slate-900">
            {title}
          </Heading>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">{children}</div>
    </section>
  );
}

/** A tick-box as a whole-row tile, so the target is big and the ticked ones read at a glance. */
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
  const tone = disabled
    ? checked
      ? 'cursor-not-allowed border-brand-100 bg-brand-50/60 text-slate-500'
      : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
    : checked
      ? 'cursor-pointer border-brand-300 bg-brand-50 text-slate-900'
      : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';
  return (
    <label
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 ${tone}`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="min-w-0">
        {label}
        {hint && <span className="ml-1 text-xs text-slate-500">({hint})</span>}
      </span>
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" data-field-error className="mt-1 text-sm text-danger-500">
      {message}
    </p>
  ) : null;
}

/** A message about the whole form (not one field): what needs fixing, what failed, what saved. */
function Notice({ tone, children }: { tone: 'bad' | 'good'; children: ReactNode }) {
  return (
    <p
      role={tone === 'bad' ? 'alert' : 'status'}
      data-form-alert={tone === 'bad' ? '' : undefined}
      className={`rounded-md border px-3 py-2 text-sm ${
        tone === 'bad'
          ? 'border-danger-500/30 bg-danger-50 text-danger-600'
          : 'border-brand-200 bg-brand-50 text-brand-700'
      }`}
    >
      {children}
    </p>
  );
}

/** The success line, with a one-time authenticator secret set apart so it can be read and copied. */
function SuccessNote({ message, secret }: { message: string; secret: string | null }) {
  const at = secret ? message.indexOf(secret) : -1;
  if (!secret || at < 0) return <>{message}</>;
  return (
    <>
      {message.slice(0, at)}
      <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono text-sm font-semibold tracking-wider text-slate-900">
        {secret}
      </code>
      {message.slice(at + secret.length)}
    </>
  );
}

/**
 * Phase 2 — create and edit an employee in one form. Positions tick their
 * role; Sales Leader ticks and locks Purchase Executive; each executive
 * position asks for its leader. PAN and Aadhaar on edit are only ever shown
 * masked — leave them blank to keep them; an Admin can "Show" the full value
 * (audited). Every save goes through the form kit (Idempotency-Key, errors
 * next to the field, success message, reset after a create).
 *
 * 4 Nov — laid out in sections (account, positions, roles, lanes, then the HR
 * details split into identity, family, emergency contact and address). In a
 * dialog (`layout="dialog"`, inside a `bare` Modal) the fields scroll in their
 * own area and the buttons and messages sit in a footer outside it, so nothing
 * is ever covered. A problem is also shown when a field is left, and the first
 * one is scrolled to and focused after a failed save.
 */
export function EmployeeForm({
  mode,
  detail,
  employees,
  laneOptions,
  onSaved,
  onCancel,
  layout = 'inline',
}: {
  mode: 'create' | 'edit';
  detail?: EmployeeDetail;
  /** Active employees, for the leader and team pickers. */
  employees: EmployeeListItem[];
  laneOptions: LaneBoardItem[];
  /** Gets the save result, so a dialog can stay open when there is an authenticator secret to hand over. */
  onSaved: (result: { mfaSecret?: string }) => void;
  onCancel?: () => void;
  /** `dialog` — inside a `bare` Modal: own scroll area, buttons pinned in a footer. */
  layout?: 'inline' | 'dialog';
}) {
  const { callApi, hasPermission } = useAuth();
  const canReveal = hasPermission(PERMISSIONS.EMPLOYEE_PII_REVEAL);
  const [form, setForm] = useState<FormState>(() => (detail ? fromDetail(detail) : EMPTY));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<{ pan?: string; aadhaar?: string }>({});
  const [revealError, setRevealError] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  // The "N fields need attention" line only follows a Save press, not a field left half-way.
  const [attempted, setAttempted] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const hrHeadingId = useId();
  const isDialog = layout === 'dialog';
  const hasStoredPii = mode === 'edit' && Boolean(detail?.hr);
  // An employee created before the Team page has no HR details; Edit can
  // save without them (the Team page shows "HR details missing").
  const hrOptional = mode === 'edit' && !detail?.hr;
  const [addHr, setAddHr] = useState(!hrOptional);
  const withHr = !hrOptional || addHr;
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
    onSuccess: (result) => {
      if (mode === 'create') setForm(EMPTY);
      else setForm((f) => ({ ...f, password: '', pan: '', aadhaar: '' }));
      setMfaSecret(result.mfaSecret ?? null);
      setAttempted(false);
      onSaved(result);
    },
  });

  // After a failed save, take the person to the first thing that needs fixing — in a long form
  // it is usually off screen. Field problems come first in the page, the form-wide notice last.
  useEffect(() => {
    if (focusTick === 0) return;
    const target = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-field-error], [data-form-alert]',
    );
    if (!target) return;
    target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    if (target.matches('input, select, textarea')) target.focus({ preventScroll: true });
  }, [focusTick]);

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

  /** Leaving a field: show (or clear) that one field's problem, using the same rules as Save. */
  function checkField(errorKey: string): void {
    const found = checkLocally(form, mode, hasStoredPii, withHr);
    setLocalErrors((e) => {
      const next = { ...e };
      if (found[errorKey]) next[errorKey] = found[errorKey];
      else delete next[errorKey];
      return next;
    });
  }
  const onLeave = (errorKey: string) => () => checkField(errorKey);

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
    setAttempted(true);
    const found = checkLocally(form, mode, hasStoredPii, withHr);
    setLocalErrors(found);
    if (Object.keys(found).length > 0) {
      setFocusTick((t) => t + 1);
      return;
    }
    const input = toInput(
      {
        ...form,
        // Positions tick their department's role.
        roleKeys: [...new Set([...form.roleKeys, ...impliedRoles])],
      },
      withHr,
    );
    void save
      .submit((key) =>
        callApi((token) =>
          mode === 'create'
            ? createEmployee(
                token,
                { ...input, password: form.password, laneKeys: form.laneKeys },
                key,
              )
            : updateEmployee(token, selfId!, { ...input, password: form.password }, key),
        ),
      )
      .then((saved) => {
        if (saved === undefined) setFocusTick((t) => t + 1);
      });
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

  const problemCount = Object.keys(localErrors).length;
  const showCount = attempted && problemCount > 0;
  const hasNotices = showCount || Boolean(save.formError) || Boolean(save.successMessage);
  const notices = (
    <>
      {showCount && (
        <Notice tone="bad">
          {problemCount === 1 ? '1 field needs' : `${problemCount} fields need`} attention — see the
          messages next to {problemCount === 1 ? 'it' : 'them'}.
        </Notice>
      )}
      {save.formError && <Notice tone="bad">{save.formError}</Notice>}
      {save.successMessage && (
        <Notice tone="good">
          <SuccessNote message={save.successMessage} secret={mfaSecret} />
        </Notice>
      )}
    </>
  );
  const submitLabel = save.submitting
    ? mode === 'create'
      ? 'Creating…'
      : 'Saving…'
    : mode === 'create'
      ? 'Create employee'
      : 'Save changes';
  const submitButton = (
    <Button
      type="submit"
      loading={save.submitting}
      icon={mode === 'create' ? <FiUserPlus /> : <FiSave />}
    >
      {submitLabel}
    </Button>
  );

  // Everything the person types. A save in flight freezes it, so a second edit cannot slip
  // in between what was sent and what is on screen.
  const fields = (
    <fieldset disabled={save.submitting} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
      <p className="text-xs text-slate-500">
        <span className="text-danger-500">*</span> Required
      </p>

      <Section icon={<FiUser />} title="Account" description="Who this is, and how they sign in.">
        <Input
          label="Name"
          required
          autoComplete="off"
          value={form.person}
          onChange={(e) => set('person', e.target.value)}
          onBlur={onLeave('person')}
          error={errors.person}
        />
        <Input
          label="Email"
          type="email"
          required
          // Not the signed-in admin's own saved address.
          autoComplete="off"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          onBlur={onLeave('email')}
          error={errors.email}
        />
        <Input
          label="Mobile"
          required
          inputMode="tel"
          autoComplete="off"
          placeholder="10 digits"
          value={form.mobile}
          onChange={(e) => set('mobile', e.target.value)}
          onBlur={onLeave('mobile')}
          error={errors.mobile}
        />
        <Input
          label="Password"
          type="password"
          required={mode === 'create'}
          // A new password for this person — never the browser's saved one for the admin.
          autoComplete="new-password"
          hint={
            mode === 'edit' ? 'Leave blank to keep the current password.' : 'At least 8 characters.'
          }
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          onBlur={onLeave('password')}
          error={errors.password}
        />
      </Section>

      <Section
        icon={<FiBriefcase />}
        title="Positions"
        description="Where this person sits in the sales and purchase teams."
      >
        <div className="col-span-full grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        {isSalesCaller(positions) && leaderSelect('sales', salesLeaders, 'SALES_LEADER')}
        {isSalesCaller(positions) && (
          <div className="col-span-full">
            <Check
              label="Receiving leads"
              checked={form.receivingLeads}
              hint="Switch off while he is on leave: new leads skip him, what he holds stays with him."
              onChange={() => set('receivingLeads', !form.receivingLeads)}
            />
          </div>
        )}
        {positions.includes('PURCHASE_EXEC') &&
          (purchaseReportsToAdmin(positions) ? (
            <p className="self-end rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Reports to (Purchase):</span> Admin — a
              Sales Leader reports to Admin, not to a Purchase Leader.
            </p>
          ) : (
            leaderSelect('purchase', purchaseLeaders, 'PURCHASE_LEADER')
          ))}
      </Section>

      <Section
        icon={<FiShield />}
        title="Roles"
        description="What this person can open. A position ticks its department's role for you."
      >
        <div className="col-span-full grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          <div className="col-span-full">
            <p className="mb-2 text-sm font-medium text-slate-700">Works for team(s)</p>
            <Check
              label="All teams (Accounts head)"
              checked={form.worksForAllTeams}
              onChange={() => set('worksForAllTeams', !form.worksForAllTeams)}
            />
            {!form.worksForAllTeams && (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        <Section
          icon={<FiLayers />}
          title="Lanes (optional)"
          description="Lanes this person will hold. A lane someone already holds is greyed out."
        >
          <div className="col-span-full grid grid-cols-1 gap-2 sm:grid-cols-2">
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

      {hrOptional && (
        <div className="rounded-lg border border-warning-500/40 bg-warning-50 p-4 text-sm">
          <p className="text-warning-600">
            No HR details on record for this employee yet. You can save other changes now and add
            them later.
          </p>
          <div className="mt-3">
            <Check
              label="Add HR details now"
              checked={addHr}
              onChange={() => {
                setAddHr((v) => !v);
                setLocalErrors((e) =>
                  Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('hr.'))),
                );
              }}
            />
          </div>
        </div>
      )}

      {withHr && (
        <div role="group" aria-labelledby={hrHeadingId} className="flex flex-col gap-5">
          {/* The one heading over everything HR keeps — what the Team list means by "HR details missing". */}
          <div className="border-b-2 border-brand-500/70 pb-2 pt-3">
            <h3 id={hrHeadingId} className="text-base font-semibold text-slate-900">
              HR details
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Personal and statutory records kept by HR. The Team list shows “HR details missing”
              until these are filled in.
            </p>
          </div>
          <Section
            nested
            icon={<FiCreditCard />}
            title="Identity & Statutory Details"
            description={
              hasStoredPii
                ? 'PAN and Aadhaar are shown masked. Leave them blank to keep what is on record.'
                : 'For HR and statutory records. PAN and Aadhaar are shown masked once saved.'
            }
          >
            <div>
              <Input
                label="PAN"
                required={!hasStoredPii}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={hasStoredPii ? (revealed.pan ?? detail?.hr?.panMasked) : 'ABCPE1234F'}
                hint={hasStoredPii ? 'Leave blank to keep the PAN on record.' : undefined}
                value={form.pan}
                onChange={(e) => set('pan', e.target.value.toUpperCase(), 'hr.pan')}
                onBlur={onLeave('hr.pan')}
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
                autoComplete="off"
                placeholder={
                  hasStoredPii ? (revealed.aadhaar ?? detail?.hr?.aadhaarMasked) : '12 digits'
                }
                hint={hasStoredPii ? 'Leave blank to keep the Aadhaar on record.' : undefined}
                value={form.aadhaar}
                onChange={(e) => set('aadhaar', e.target.value, 'hr.aadhaar')}
                onBlur={onLeave('hr.aadhaar')}
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
            {revealError && <p className="col-span-full text-sm text-danger-500">{revealError}</p>}
            <Input
              label="Date of birth"
              type="date"
              required
              hint="An employee must be at least 18."
              value={form.dob}
              onChange={(e) => set('dob', e.target.value, 'hr.dob')}
              onBlur={onLeave('hr.dob')}
              error={errors['hr.dob']}
            />
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
            {form.educationLevel === 'other' && (
              <Input
                label="Which education"
                required
                value={form.educationOther}
                onChange={(e) => set('educationOther', e.target.value, 'hr.education.other')}
                onBlur={onLeave('hr.education.other')}
                error={errors['hr.education.other']}
              />
            )}
          </Section>

          <Section
            nested
            icon={<FiUsers />}
            title="Family Details"
            description="The father's name is required; the rest can be left blank."
          >
            <Input
              label="Father's name"
              required
              autoComplete="off"
              value={form.fatherName}
              onChange={(e) => set('fatherName', e.target.value, 'hr.fatherName')}
              onBlur={onLeave('hr.fatherName')}
              error={errors['hr.fatherName']}
            />
            <Input
              label="Father's mobile"
              hint="Optional"
              inputMode="tel"
              autoComplete="off"
              placeholder="10 digits"
              value={form.fatherMobile}
              onChange={(e) => set('fatherMobile', e.target.value, 'hr.fatherMobile')}
              onBlur={onLeave('hr.fatherMobile')}
              error={errors['hr.fatherMobile']}
            />
            <Input
              label="Husband's name"
              hint="Optional"
              autoComplete="off"
              value={form.husbandName}
              onChange={(e) => set('husbandName', e.target.value)}
            />
            <Input
              label="Husband's mobile"
              hint="Optional"
              inputMode="tel"
              autoComplete="off"
              placeholder="10 digits"
              value={form.husbandMobile}
              onChange={(e) => set('husbandMobile', e.target.value, 'hr.husbandMobile')}
              onBlur={onLeave('hr.husbandMobile')}
              error={errors['hr.husbandMobile']}
            />
          </Section>

          <Section
            nested
            icon={<FiPhoneCall />}
            title="Emergency Contact"
            description="Someone to call if something happens at work."
          >
            <Input
              label="Emergency contact name"
              required
              autoComplete="off"
              value={form.emergencyName}
              onChange={(e) => set('emergencyName', e.target.value, 'hr.emergencyContact.name')}
              onBlur={onLeave('hr.emergencyContact.name')}
              error={errors['hr.emergencyContact.name']}
            />
            <Input
              label="Relation"
              required
              autoComplete="off"
              placeholder="e.g. Mother, Spouse"
              value={form.emergencyRelation}
              onChange={(e) =>
                set('emergencyRelation', e.target.value, 'hr.emergencyContact.relation')
              }
              onBlur={onLeave('hr.emergencyContact.relation')}
              error={errors['hr.emergencyContact.relation']}
            />
            <Input
              label="Emergency contact mobile"
              required
              inputMode="tel"
              autoComplete="off"
              placeholder="10 digits"
              value={form.emergencyMobile}
              onChange={(e) => set('emergencyMobile', e.target.value, 'hr.emergencyContact.mobile')}
              onBlur={onLeave('hr.emergencyContact.mobile')}
              error={errors['hr.emergencyContact.mobile']}
            />
          </Section>

          <Section
            nested
            icon={<FiMapPin />}
            title="Address Details"
            description="Where this person lives, and where they are staying now."
          >
            <div className="col-span-full">
              <Textarea
                label="Permanent address"
                required
                autoComplete="off"
                value={form.permanentAddress}
                onChange={(e) => set('permanentAddress', e.target.value, 'hr.permanentAddress')}
                onBlur={onLeave('hr.permanentAddress')}
                error={errors['hr.permanentAddress']}
              />
            </div>
            <div className="col-span-full">
              <Check
                label="Same as permanent address"
                checked={form.currentSameAsPermanent}
                onChange={() =>
                  set('currentSameAsPermanent', !form.currentSameAsPermanent, 'hr.currentAddress')
                }
              />
            </div>
            <div className="col-span-full">
              {form.currentSameAsPermanent ? (
                // Shown, not hidden: the person sees exactly what will be recorded. Untick to
                // type a different one — whatever was typed before is still there.
                <Textarea
                  label="Current local address"
                  disabled
                  value={form.permanentAddress}
                  placeholder="Fill in the permanent address above"
                  hint="Copied from the permanent address. Untick the box above to enter a different one."
                  readOnly
                />
              ) : (
                <Textarea
                  label="Current local address"
                  required
                  autoComplete="off"
                  value={form.currentAddress}
                  onChange={(e) => set('currentAddress', e.target.value, 'hr.currentAddress')}
                  onBlur={onLeave('hr.currentAddress')}
                  error={errors['hr.currentAddress']}
                />
              )}
            </div>
          </Section>
        </div>
      )}
    </fieldset>
  );

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      className={isDialog ? 'flex min-h-0 flex-1 flex-col' : 'flex max-w-3xl flex-col gap-5'}
    >
      {isDialog ? (
        <>
          {/* The only part that scrolls — the footer below is outside it, so it covers nothing. */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5 sm:px-6">
            {fields}
          </div>
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-xl sm:px-6">
            {hasNotices && (
              <div className="mb-3 flex max-h-40 flex-col gap-2 overflow-y-auto">{notices}</div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="ghost" disabled={save.submitting} onClick={onCancel}>
                  Cancel
                </Button>
              )}
              {submitButton}
            </div>
          </div>
        </>
      ) : (
        <>
          {fields}
          {hasNotices && <div className="flex flex-col gap-2">{notices}</div>}
          <FormActions>
            {submitButton}
            {onCancel && (
              <Button type="button" variant="ghost" disabled={save.submitting} onClick={onCancel}>
                Cancel
              </Button>
            )}
          </FormActions>
        </>
      )}
    </form>
  );
}
