import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPhoneCall } from 'react-icons/fi';
import { staffRegisterSeller } from '../../api/onboarding';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

/** For a dealer the desk found itself, rather than one who registered on his own. */
export function AddSellerPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [firm, setFirm] = useState('');
  const [gstin, setGstin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountName, setAccountName] = useState('');
  const [refFirm1, setRefFirm1] = useState('');
  const [refPhone1, setRefPhone1] = useState('');
  const [refFirm2, setRefFirm2] = useState('');
  const [refPhone2, setRefPhone2] = useState('');
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ registrationId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          staffRegisterSeller(token, {
            mobile,
            firm,
            gstin,
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
            bankDetail: { accountNumber, ifsc, accountName },
            consent: { noticeVersion: 'v1', marketingOptIn: false },
            callNote,
          }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not register this seller.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/purchase/sellers')}>
        Sellers
      </Button>
      <DevNote screen="purchase_add_seller" />
      <Card title="Add a seller">
        <p className="mb-4 text-sm text-slate-500">
          GSTIN stays mandatory, exactly as self-service registration, plus BR-250&apos;s two named
          referees. A single OTP goes to the real mobile number to confirm this is genuine before it
          can be approved.
        </p>
        <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-2 gap-4">
          <Input
            id="ss-mobile"
            label="Mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
          <Input
            id="ss-firm"
            label="Firm"
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            required
          />
          <Input
            id="ss-gstin"
            label="GSTIN"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            required
          />
          <Input
            id="ss-owner"
            label="Owner name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
          />
          <Input
            id="ss-licence"
            label="Insecticide licence no."
            value={licenceNo}
            onChange={(e) => setLicenceNo(e.target.value)}
            required
          />
          <Input
            id="ss-account"
            label="Bank account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
          <Input
            id="ss-ifsc"
            label="IFSC"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value)}
            required
          />
          <Input
            id="ss-account-name"
            label="Account name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
          />
          <Input
            id="ss-ref1-firm"
            label="Referee 1 — firm"
            value={refFirm1}
            onChange={(e) => setRefFirm1(e.target.value)}
            required
          />
          <Input
            id="ss-ref1-phone"
            label="Referee 1 — phone"
            value={refPhone1}
            onChange={(e) => setRefPhone1(e.target.value)}
            required
          />
          <Input
            id="ss-ref2-firm"
            label="Referee 2 — firm"
            value={refFirm2}
            onChange={(e) => setRefFirm2(e.target.value)}
            required
          />
          <Input
            id="ss-ref2-phone"
            label="Referee 2 — phone"
            value={refPhone2}
            onChange={(e) => setRefPhone2(e.target.value)}
            required
          />
          <div className="col-span-2">
            <Textarea
              id="ss-note"
              label="Call note"
              hint="Who called, what was agreed."
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              required
            />
          </div>
          {error && (
            <p role="alert" className="col-span-2 text-sm text-danger-500">
              {error}
            </p>
          )}
          {result && (
            <p className="col-span-2 text-sm text-success-600">
              Registered as {result.registrationId} — pending OTP confirmation, then set his area
              from Registrations.
            </p>
          )}
          <div className="col-span-2">
            <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
              Register seller
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
