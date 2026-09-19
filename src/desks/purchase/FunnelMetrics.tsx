import type { FunnelMetric, FunnelReport } from '../../api/purchase';

/**
 * BR-275 — the six funnel/leak metrics. Shared by the Purchase desk and the
 * Founder overview so both draw one metric identically, from one API shape.
 * MASTER_PLAN §M8 DoD: every calculated metric states its own formula, in
 * plain words, on screen — `metric.formula` is rendered under every figure.
 */
function formatValue(metric: FunnelMetric): string {
  if (metric.value === null) return '—';
  if (metric.unit === 'percent') return `${metric.value}%`;
  if (metric.unit === 'hours') return `${metric.value} h`;
  return String(metric.value);
}

function formatBasis(metric: FunnelMetric): string | null {
  if (metric.numerator !== null && metric.denominator !== null) {
    return `${metric.numerator} of ${metric.denominator}`;
  }
  if (metric.denominator !== null) return `across ${metric.denominator}`;
  return null;
}

export function FunnelMetricsGrid({ report }: { report: FunnelReport }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {report.metrics.map((metric) => (
        <div key={metric.key} className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {metric.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatValue(metric)}</p>
          {formatBasis(metric) && <p className="text-xs text-slate-500">{formatBasis(metric)}</p>}
          <p className="mt-2 text-sm text-slate-600">{metric.formula}</p>
          {metric.caveat && <p className="mt-2 text-xs text-warning-600">{metric.caveat}</p>}
        </div>
      ))}
    </div>
  );
}
