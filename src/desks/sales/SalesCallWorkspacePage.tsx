import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiPhoneCall } from 'react-icons/fi';
import {
  proxyRaiseAsk,
  proxyAcceptAskFill,
  proxyDeclineAsk,
  proxyAcceptPromotion,
  proxyRejectPromotion,
} from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * The call workspace for one specific buyer — reached from his buyer file
 * (`/sales/call/:buyerId`). For now this is just `LogBuyerCallSection` and
 * `AdvanceAskSection` relocated as-is from the old flat `SalesDeskPage`,
 * with the buyer counterparty ID pre-filled from the route instead of typed
 * free-text, since we now arrive here already in a specific buyer's
 * context. A richer workspace (board-for-him, buyer history, etc.) is a
 * later pass.
 */
export function SalesCallWorkspacePage() {
  const { buyerId = '' } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        icon={<FiArrowLeft />}
        onClick={() => navigate(`/sales/buyers/${buyerId}`)}
      >
        Buyer file
      </Button>
      <LogBuyerCallSection buyerId={buyerId} />
      <AdvanceAskSection buyerId={buyerId} />
    </div>
  );
}

/**
 * Staff-assisted enquiries — "log a buyer call" (API-040, raise-an-ask).
 * Same validation as the buyer's own POST /asks: no price field exists on
 * this form at all (BR-121), exactly as the real endpoint refuses one sent.
 */
function LogBuyerCallSection({ buyerId }: { buyerId: string }) {
  const { callApi } = useAuth();
  const [skuId, setSkuId] = useState('');
  const [qty, setQty] = useState(1);
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [callNote, setCallNote] = useState('');
  const [result, setResult] = useState<{ askId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          proxyRaiseAsk(token, {
            buyerCounterpartyId: buyerId,
            skuId,
            qty,
            conditionRequirement: { expiryBand },
            callNote,
          }),
        ),
      );
      setSkuId('');
      setQty(1);
      setCallNote('');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not log this call.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Log a buyer call">
      <p className="mb-4 text-sm text-slate-500">
        Raises an ask on the buyer&apos;s behalf — same as the buyer&apos;s own screen. He states no
        price; TriFid never names one before a seller has (BR-121).
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input id="lbc-buyer" label="Buyer counterparty ID" value={buyerId} disabled />
        <Input
          id="lbc-sku"
          label="SKU ID"
          value={skuId}
          onChange={(e) => setSkuId(e.target.value)}
          required
        />
        <Input
          id="lbc-qty"
          label="Quantity (boxes)"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          required
        />
        <Select
          id="lbc-expiry"
          label="Expiry requirement"
          value={expiryBand}
          onChange={(e) => setExpiryBand(e.target.value as typeof expiryBand)}
        >
          <option value="over12">Over 12 months</option>
          <option value="under12">Under 12 months</option>
        </Select>
        <Textarea
          id="lbc-note"
          label="Call note"
          hint="Who called, what was agreed — mandatory on every staff-assisted action."
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Logged as ask {result.askId}.</p>}
        <Button type="submit" loading={submitting} icon={<FiPhoneCall />}>
          Log call
        </Button>
      </form>
    </Card>
  );
}

/**
 * Staff-assisted enquiries — advancing an ask on a call (API-042 accept-fill
 * / API-043 walk-away), and the WF-11 promoted-fallback decision (API-071)
 * a buyer might also decide over the phone.
 */
function AdvanceAskSection({ buyerId }: { buyerId: string }) {
  const { callApi } = useAuth();
  const [askId, setAskId] = useState('');
  const [option, setOption] = useState<'partial' | 'full'>('full');
  const [quoteIdsText, setQuoteIdsText] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [soId, setSoId] = useState('');
  const [promotionNote, setPromotionNote] = useState('');
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  async function handleAccept(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const quoteIds = quoteIdsText
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const result = await callApi((token) =>
        proxyAcceptAskFill(token, askId, {
          buyerCounterpartyId: buyerId,
          option,
          quoteIds,
          callNote,
        }),
      );
      setMessage(`Accepted — order(s): ${result.soIds.join(', ')}.`);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not accept this fill.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        proxyDeclineAsk(token, askId, { buyerCounterpartyId: buyerId, callNote }),
      );
      setMessage('Walked away — free, no strike.');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not decline.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromotionAccept(): Promise<void> {
    setPromotionError(null);
    try {
      await callApi((token) =>
        proxyAcceptPromotion(token, soId, {
          buyerCounterpartyId: buyerId,
          callNote: promotionNote,
        }),
      );
      setPromotionMessage('Accepted the replacement seller.');
    } catch (submitError) {
      setPromotionError(
        submitError instanceof ApiError ? submitError.message : 'Could not accept.',
      );
    }
  }

  async function handlePromotionReject(): Promise<void> {
    setPromotionError(null);
    try {
      await callApi((token) =>
        proxyRejectPromotion(token, soId, {
          buyerCounterpartyId: buyerId,
          callNote: promotionNote,
        }),
      );
      setPromotionMessage('Declined — refunded on the next run.');
    } catch (submitError) {
      setPromotionError(
        submitError instanceof ApiError ? submitError.message : 'Could not decline.',
      );
    }
  }

  return (
    <Card title="Advance an ask on a call">
      <p className="mb-4 text-sm text-slate-500">
        Confirming a rate over the phone and accepting a fill are the same action in this system
        (API-042) — enter the quote(s) the buyer accepted below. Walking away is free and never a
        strike (API-043).
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input
          id="aa-ask"
          label="Ask ID"
          value={askId}
          onChange={(e) => setAskId(e.target.value)}
          required
        />
        <Input id="aa-buyer" label="Buyer counterparty ID" value={buyerId} disabled />
        <Select
          id="aa-option"
          label="Option"
          value={option}
          onChange={(e) => setOption(e.target.value as typeof option)}
        >
          <option value="full">Full — the partial plus the balance</option>
          <option value="partial">Partial — the cheap portion alone</option>
        </Select>
        <Input
          id="aa-quotes"
          label="Quote ID(s), comma-separated"
          value={quoteIdsText}
          onChange={(e) => setQuoteIdsText(e.target.value)}
        />
        <Textarea
          id="aa-note"
          label="Call note"
          value={callNote}
          onChange={(e) => setCallNote(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-success-600">{message}</p>}
        <div className="flex gap-2">
          <Button
            loading={submitting}
            disabled={!askId || !buyerId || !callNote}
            onClick={() => void handleAccept()}
            icon={<FiCheck />}
          >
            Accept fill
          </Button>
          <Button
            variant="secondary"
            loading={submitting}
            disabled={!askId || !buyerId || !callNote}
            onClick={() => void handleDecline()}
            icon={<FiX />}
          >
            Walk away
          </Button>
        </div>
      </div>

      <div className="mt-6 flex max-w-md flex-col gap-4 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Promoted-fallback decision (WF-11)</h3>
        <Input
          id="aa-so"
          label="Order (SO) ID"
          value={soId}
          onChange={(e) => setSoId(e.target.value)}
        />
        <Textarea
          id="aa-promo-note"
          label="Call note"
          value={promotionNote}
          onChange={(e) => setPromotionNote(e.target.value)}
        />
        {promotionError && (
          <p role="alert" className="text-sm text-danger-500">
            {promotionError}
          </p>
        )}
        {promotionMessage && <p className="text-sm text-success-600">{promotionMessage}</p>}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!soId || !buyerId || !promotionNote}
            onClick={() => void handlePromotionAccept()}
            icon={<FiCheck />}
          >
            Accept replacement
          </Button>
          <Button
            variant="secondary"
            disabled={!soId || !buyerId || !promotionNote}
            onClick={() => void handlePromotionReject()}
            icon={<FiX />}
          >
            Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}
