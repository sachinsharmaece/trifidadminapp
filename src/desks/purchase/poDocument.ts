import type { PoPrintDto } from '../../api/purchase';
import { formatDate, formatDateTime } from '../../lib/dates';
import { formatRupees } from '../../lib/labels';

/**
 * 3 Nov (My view sheet) — the purchase order as a printable page. It is plain HTML with its own
 * print styles: shown in a preview frame, and saved as a PDF from the browser's print dialog.
 * Nothing leaves the browser, and no PDF library is needed.
 *
 * Every value that came from the server is escaped before it goes into the markup, and the
 * preview frame is sandboxed with no scripts, so a firm name can never run anything.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const UNIT_LABEL: Record<string, string> = { LTR: 'L', KG: 'kg', PC: 'pc' };

/** 10.5 → "10.5", 12 → "12" (no stray zeros), with Indian grouping. */
function plainNumber(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

const STYLES = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; font-family: 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif;
    font-size: 12px; line-height: 1.45; color: #0f172a; background: #fff; }
  .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a;
    padding-bottom: 12px; }
  .title { text-align: right; }
  .title h1 { margin: 0 0 4px; font-size: 20px; letter-spacing: 0.06em; }
  .company h2 { margin: 0 0 2px; font-size: 16px; }
  .muted { color: #475569; }
  .parties { display: flex; gap: 24px; margin: 14px 0; }
  .box { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; }
  .box h3 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: #475569; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .num { text-align: right; white-space: nowrap; }
  .totals { width: 55%; margin: 12px 0 0 auto; }
  .totals td { border: none; border-bottom: 1px solid #e2e8f0; }
  .totals .grand td { border-top: 2px solid #0f172a; border-bottom: none; font-weight: 700;
    font-size: 14px; }
  .dispatch { margin-top: 14px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; }
  .terms { margin-top: 14px; }
  .terms h3 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: #475569; }
  .terms ol { margin: 0; padding-left: 18px; }
  .foot { margin-top: 18px; font-size: 10px; color: #64748b; }
  tr, .box, .totals { break-inside: avoid; }
`;

function lines(values: string[]): string {
  return values.map((v) => `<div>${escapeHtml(v)}</div>`).join('');
}

/** The whole purchase order as one HTML document. */
export function buildPoHtml(po: PoPrintDto): string {
  const rows = po.lines
    .map((line, index) => {
      const unit = UNIT_LABEL[line.baseUnit] ?? line.baseUnit;
      const quantity = line.boxes * line.baseUnitsPerBox;
      return `<tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(line.brand)}</td>
        <td>${escapeHtml(line.packLabel)}</td>
        <td class="num">${plainNumber(line.boxes)}</td>
        <td class="num">${plainNumber(quantity)} ${escapeHtml(unit)}</td>
        <td class="num">${escapeHtml(formatRupees(line.ratePaise))} / ${escapeHtml(unit)}</td>
        <td class="num">${escapeHtml(formatRupees(line.totalPaise))}</td>
      </tr>`;
    })
    .join('');

  const half = po.gst.ratePercent / 2;
  const taxRows =
    po.gst.kind === 'intra_state'
      ? `<tr><td>CGST @ ${half}%</td><td class="num">${escapeHtml(formatRupees(po.gst.cgstPaise))}</td></tr>
         <tr><td>SGST @ ${half}%</td><td class="num">${escapeHtml(formatRupees(po.gst.sgstPaise))}</td></tr>`
      : `<tr><td>IGST @ ${po.gst.ratePercent}%</td><td class="num">${escapeHtml(formatRupees(po.gst.igstPaise))}</td></tr>`;

  const terms = po.terms.length
    ? `<div class="terms"><h3>Terms</h3><ol>${po.terms
        .map((term) => `<li>${escapeHtml(term)}</li>`)
        .join('')}</ol></div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(po.poNo)}</title>
<style>${STYLES}</style>
</head>
<body>
  <div class="head">
    <div class="company">
      <h2>${escapeHtml(po.company.name)}</h2>
      ${lines(po.company.addressLines)}
      <div class="muted">GSTIN: ${escapeHtml(po.company.gstin)}</div>
    </div>
    <div class="title">
      <h1>PURCHASE ORDER</h1>
      <div><strong>PO No.</strong> ${escapeHtml(po.poNo)}</div>
      <div><strong>Date</strong> ${escapeHtml(formatDate(po.releasedAt))}</div>
    </div>
  </div>

  <div class="parties">
    <div class="box">
      <h3>To (seller)</h3>
      <div><strong>${escapeHtml(po.seller.firm)}</strong></div>
      ${lines(po.seller.addressLines)}
      <div class="muted">GSTIN: ${escapeHtml(po.seller.gstin ?? '—')}</div>
    </div>
    <div class="box">
      <h3>Dispatch</h3>
      <div>Due by <strong>${escapeHtml(formatDateTime(po.dispatchBy))}</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th><th>Product</th><th>Pack</th><th class="num">Boxes</th>
        <th class="num">Quantity</th><th class="num">Rate (incl. GST)</th><th class="num">Amount (incl. GST)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    <tbody>
      <tr><td>Taxable value</td><td class="num">${escapeHtml(formatRupees(po.taxablePaise))}</td></tr>
      ${taxRows}
      <tr class="grand"><td>Total</td><td class="num">${escapeHtml(formatRupees(po.totalPaise))}</td></tr>
    </tbody>
  </table>

  ${terms}
  <div class="foot">Purchase order ${escapeHtml(po.poNo)} · ${escapeHtml(po.company.name)}</div>
</body>
</html>`;
}
