import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';

/**
 * A styled wrapper around plain `<table>` markup, not a compound-component
 * rewrite of every desk's table — pages keep their own `<thead>`/`<tbody>`
 * structure and just use `Th`/`Td` in place of the bare elements. The outer
 * `overflow-x-auto` div is what keeps a wide table from breaking the page
 * layout on a narrow screen, per the design guidelines' table rules.
 */
export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className={`w-full border-collapse text-sm ${className}`}>{children}</table>
    </div>
  );
}

interface NumericProp {
  /** Right-aligns the cell and gives its digits a fixed width, so a column
   * of numbers lines up edge-to-edge instead of ragged-left. */
  numeric?: boolean;
}

export function Th({
  className = '',
  numeric,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & NumericProp) {
  return (
    <th
      className={`border-b border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-600 ${
        numeric ? 'text-right' : 'text-left'
      } ${className}`}
      {...rest}
    />
  );
}

export function Td({
  className = '',
  numeric,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & NumericProp) {
  return (
    <td
      className={`border-b border-slate-100 px-3 py-2 align-top text-slate-800 ${
        numeric ? 'text-right tabular-nums' : ''
      } ${className}`}
      {...rest}
    />
  );
}
