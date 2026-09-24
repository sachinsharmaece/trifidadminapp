import { useEffect, useState } from 'react';
import { listRegistrations } from '../../api/onboarding';
import { getProductsByTechnical, getSkusForProduct, getTechnicals } from '../../api/catalog';
import type { RegistrationListItem, SkuDto } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { Input, Select } from '../../components/ui';

const PASTE = '__paste';

/**
 * An active registered buyer. API-013 pages oldest-first, 100 at most, so the
 * list shows the first hundred and a paste-the-id fallback covers the rest.
 * Reports the chosen counterparty id through `onChange` — pass a state setter
 * (or another stable function), since it runs whenever the choice changes.
 */
export function BuyerPicker({ onChange }: { onChange: (buyerCounterpartyId: string) => void }) {
  const { callApi } = useAuth();
  const [buyers, setBuyers] = useState<RegistrationListItem[]>([]);
  const [choice, setChoice] = useState('');
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    void callApi((token) => listRegistrations(token, 'active', 100))
      .then((items) => setBuyers(items.filter((r) => r.kind === 'buyer' || r.kind === 'both')))
      .catch(() => setBuyers([]));
  }, [callApi]);

  useEffect(() => {
    onChange(choice === PASTE ? pasted.trim() : choice);
  }, [choice, pasted, onChange]);

  return (
    <>
      <Select
        label="Registered buyer"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        required
      >
        <option value="">Choose an active buyer…</option>
        {buyers.map((b) => (
          <option key={b.registrationId} value={b.registrationId}>
            {b.firm ?? b.registrationId}
            {b.gstin ? ` · ${b.gstin}` : ''}
          </option>
        ))}
        <option value={PASTE}>Not listed — paste the counterparty ID</option>
      </Select>
      {choice === PASTE && (
        <Input
          label="Buyer counterparty ID"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          required
        />
      )}
    </>
  );
}

/** An active registered seller — same shape and 100-row limit as `BuyerPicker`. */
export function SellerPicker({ onChange }: { onChange: (sellerCounterpartyId: string) => void }) {
  const { callApi } = useAuth();
  const [sellers, setSellers] = useState<RegistrationListItem[]>([]);
  const [choice, setChoice] = useState('');
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    void callApi((token) => listRegistrations(token, 'active', 100))
      .then((items) => setSellers(items.filter((r) => r.kind === 'seller' || r.kind === 'both')))
      .catch(() => setSellers([]));
  }, [callApi]);

  useEffect(() => {
    onChange(choice === PASTE ? pasted.trim() : choice);
  }, [choice, pasted, onChange]);

  return (
    <>
      <Select
        label="Registered seller"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        required
      >
        <option value="">Choose an active seller…</option>
        {sellers.map((s) => (
          <option key={s.registrationId} value={s.registrationId}>
            {s.firm ?? s.registrationId}
            {s.gstin ? ` · ${s.gstin}` : ''}
          </option>
        ))}
        <option value={PASTE}>Not listed — paste the counterparty ID</option>
      </Select>
      {choice === PASTE && (
        <Input
          label="Seller counterparty ID"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          required
        />
      )}
    </>
  );
}

/** Technical → product → pack, the catalogue's own order (BR-111). `onChange` as for BuyerPicker. */
export function PackPicker({ onChange }: { onChange: (skuId: string) => void }) {
  const { callApi } = useAuth();
  const [technicals, setTechnicals] = useState<string[]>([]);
  const [products, setProducts] = useState<Array<{ productId: string; brand: string }>>([]);
  const [skus, setSkus] = useState<SkuDto[]>([]);
  const [technical, setTechnical] = useState('');
  const [productId, setProductId] = useState('');
  const [skuId, setSkuId] = useState('');

  useEffect(() => {
    void callApi((token) => getTechnicals(token))
      .then(setTechnicals)
      .catch(() => setTechnicals([]));
  }, [callApi]);

  useEffect(() => {
    setProductId('');
    setProducts([]);
    if (!technical) return;
    void callApi((token) => getProductsByTechnical(token, technical))
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [technical, callApi]);

  useEffect(() => {
    setSkuId('');
    setSkus([]);
    if (!productId) return;
    void callApi((token) => getSkusForProduct(token, productId))
      .then(setSkus)
      .catch(() => setSkus([]));
  }, [productId, callApi]);

  useEffect(() => onChange(skuId), [skuId, onChange]);

  return (
    <>
      <Select
        label="Technical"
        value={technical}
        onChange={(e) => setTechnical(e.target.value)}
        required
      >
        <option value="">Choose…</option>
        {technicals.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
      <Select
        label="Product"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        disabled={!technical}
        required
      >
        <option value="">Choose…</option>
        {products.map((p) => (
          <option key={p.productId} value={p.productId}>
            {p.brand}
          </option>
        ))}
      </Select>
      <Select
        label="Pack"
        value={skuId}
        onChange={(e) => setSkuId(e.target.value)}
        disabled={!productId}
        required
      >
        <option value="">Choose…</option>
        {skus.map((s) => (
          <option key={s.skuId} value={s.skuId}>
            {s.packLabel} · {s.unitsPerBox} per box
          </option>
        ))}
      </Select>
    </>
  );
}

export function RequirementFields({
  expiryBand,
  deliveryBand,
  onExpiryBand,
  onDeliveryBand,
}: {
  expiryBand: 'over12' | 'under12';
  deliveryBand: '' | '48h' | '2-5d';
  onExpiryBand: (value: 'over12' | 'under12') => void;
  onDeliveryBand: (value: '' | '48h' | '2-5d') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Select
        label="Expiry requirement"
        value={expiryBand}
        onChange={(e) => onExpiryBand(e.target.value as 'over12' | 'under12')}
      >
        <option value="over12">Over 12 months</option>
        <option value="under12">Under 12 months</option>
      </Select>
      <Select
        label="Delivery"
        value={deliveryBand}
        onChange={(e) => onDeliveryBand(e.target.value as '' | '48h' | '2-5d')}
      >
        <option value="">Any</option>
        <option value="48h">Within 48 hours</option>
        <option value="2-5d">2–5 days</option>
      </Select>
    </div>
  );
}
