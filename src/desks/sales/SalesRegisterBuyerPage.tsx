import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPhoneCall } from 'react-icons/fi';
import { staffRegisterBuyer } from '../../api/onboarding';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * Staff-assisted enquiries — the OTP-confirmation step itself is shown
 * honestly as pending on the Registrations desk once submitted here.
 * Relocated from the old flat `SalesDeskPage`.
 */
export function SalesRegisterBuyerPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [firm, setFirm] = useState('');
  const [gstin, setGstin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [gstPpobAddress, setGstPpobAddress] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountName, setAccountName] = useState('');
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
          staffRegisterBuyer(token, {
            mobile,
            firm,
            gstin,
            ownerName,
            licenceNo,
            gstPpobAddress,
            bankDetail: { accountNumber, ifsc, accountName },
            consent: { noticeVersion: 'v1', marketingOptIn: false },
            callNote,
          }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not register this buyer.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/sales/buyers')}>
        Buyers
      </Button>
      <Card title="Staff-assisted buyer registration">
        <p className="mb-4 text-sm text-slate-500">
          GSTIN stays mandatory, exactly as self-service registration. A single OTP goes to the real
          mobile number to confirm this is genuine before it can be approved — check the
          Registrations desk for that status once submitted.
        </p>
        <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-2 gap-4">
          <Input
            id="sr-mobile"
            label="Mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
          <Input
            id="sr-firm"
            label="Firm"
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            required
          />
          <Input
            id="sr-gstin"
            label="GSTIN"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            required
          />
          <Input
            id="sr-owner"
            label="Owner name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
          />
          <Input
            id="sr-licence"
            label="Insecticide licence no."
            value={licenceNo}
            onChange={(e) => setLicenceNo(e.target.value)}
            required
          />
          <Input
            id="sr-address"
            label="GST principal place of business"
            value={gstPpobAddress}
            onChange={(e) => setGstPpobAddress(e.target.value)}
            required
          />
          <Input
            id="sr-account"
            label="Bank account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
          <Input
            id="sr-ifsc"
            label="IFSC"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value)}
            required
          />
          <Input
            id="sr-account-name"
            label="Account name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
          />
          <div className="col-span-2">
            <Textarea
              id="sr-note"
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
              Registered as {result.registrationId} — pending OTP confirmation.
            </p>
          )}
          <div className="col-span-2">
            <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
              Register buyer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
