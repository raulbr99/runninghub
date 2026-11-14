'use client';

import type { ReactNode } from 'react';
import { cardClass } from './ui';

export const CHART_SURFACE = '#111113';
export const AXIS_TICK = { fontSize: 11, fill: '#a1a1aa' };
export const GRID_STROKE = '#27272a';
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#f4f4f5',
  },
  labelStyle: { color: '#f4f4f5', marginBottom: 4 },
  itemStyle: { color: '#d4d4d8', padding: 0 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

export interface LegendItem {
  label: string;
  color: string;
}

export function LegendList({ items }: { items: LegendItem[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300" aria-label="Leyenda">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface ChartFigureProps {
  title: string;
  description?: ReactNode;
  /** Resumen textual para lectores de pantalla. */
  summary: string;
  legend?: LegendItem[];
  actions?: ReactNode;
  table?: { headers: string[]; rows: Array<Array<string | number>> };
  footnote?: ReactNode;
  height?: string;
  children: ReactNode;
}

export default function ChartFigure({
  title,
  description,
  summary,
  legend,
  actions,
  table,
  footnote,
  height = 'h-56',
  children,
}: ChartFigureProps) {
  return (
    <figure className={`${cardClass} p-4 space-y-3 min-w-0`}>
      <figcaption className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 uppercase tracking-wider">{title}</h3>
          {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
        </div>
        {actions}
      </figcaption>
      {legend && <LegendList items={legend} />}
      <div className={`${height} w-full`} role="img" aria-label={summary}>
        {children}
      </div>
      {footnote && <div className="text-xs text-zinc-500 space-y-0.5">{footnote}</div>}
      {table && table.rows.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300">Ver datos en tabla</summary>
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="w-full text-left">
              <thead className="text-zinc-400 sticky top-0 bg-zinc-900">
                <tr>
                  {table.headers.map((h) => (
                    <th key={h} scope="col" className="py-1 pr-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-zinc-300 font-mono">
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-t border-zinc-800/60">
                    {row.map((cell, j) => (
                      <td key={j} className="py-1 pr-3 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}
