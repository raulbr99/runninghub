'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

export const inputClass =
  'w-full px-3 py-2 border border-zinc-700/60 rounded-lg bg-zinc-800/50 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60';

export const labelClass = 'block text-[11px] text-zinc-400 mb-1 uppercase tracking-wider';

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400';

export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 px-3 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400';

export const buttonDanger =
  'inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400';

export const cardClass = 'bg-zinc-900/50 rounded-xl border border-zinc-800/50';

export function Icon({ path, className = 'w-4 h-4' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export const ICONS = {
  plus: 'M12 4.5v15m7.5-7.5h-15',
  upload: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
  download: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3',
  close: 'M6 18 18 6M6 6l12 12',
  trash:
    'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
  pencil:
    'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125',
  chevron: 'm19.5 8.25-7.5 7.5-7.5-7.5',
  lock: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
  search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
  history:
    'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  warning:
    'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  check: 'm4.5 12.75 6 6 9-13.5',
  calendar:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  flag: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5',
  info: 'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
} as const;

type BadgeTone = 'neutral' | 'strength' | 'cardio' | 'amber' | 'orange' | 'sky';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  strength: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  cardio: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  orange: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

export function Badge({ tone = 'neutral', children, title }: { tone?: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadges({ partial, incomplete }: { partial: boolean; incomplete: boolean }) {
  return (
    <>
      {partial && (
        <Badge tone="amber" title="La sesión no se completó entera">
          Parcial
        </Badge>
      )}
      {incomplete && (
        <Badge tone="orange" title="Faltan datos en este registro">
          Datos incompletos
        </Badge>
      )}
    </>
  );
}

/** Texto para valores desconocidos: nunca se muestra un cero inventado. */
export function Unknown({ children = 'No registrado' }: { children?: ReactNode }) {
  return <span className="text-zinc-500 italic">{children}</span>;
}

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Si devuelve false, se cancela el cierre con Escape. */
  onRequestClose?: () => boolean;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

/** Diálogo modal nativo (<dialog>): foco atrapado, Escape y capa superior gratis. */
export function Dialog({ open, title, onClose, onRequestClose, children, size = 'md', footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (onRequestClose && !onRequestClose()) e.preventDefault();
      }}
      onClose={onClose}
      className={`fixed inset-0 m-auto w-[calc(100%-1rem)] ${widths[size]} max-h-[92dvh] p-0 bg-zinc-900 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className="flex flex-col max-h-[92dvh]">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800">
            <h2 id={titleId} className="text-sm font-medium text-zinc-100 uppercase tracking-wider">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => {
                if (!onRequestClose || onRequestClose()) onClose();
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400"
              aria-label="Cerrar"
            >
              <Icon path={ICONS.close} className="w-5 h-5" />
            </button>
          </div>
          <div className="px-5 py-4 overflow-y-auto">{children}</div>
          {footer && <div className="px-5 py-3 border-t border-zinc-800 flex flex-wrap justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function StatCard({
  label,
  value,
  unit,
  detail,
  badge,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className={`${cardClass} p-4 flex flex-col gap-1`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-400 uppercase tracking-wider">{label}</p>
        {badge}
      </div>
      <p className="text-2xl font-mono text-zinc-100 tabular-nums leading-tight">
        {value}
        {unit && <span className="text-sm text-zinc-500 ml-1">{unit}</span>}
      </p>
      {detail && <div className="text-xs text-zinc-400 space-y-0.5">{detail}</div>}
    </div>
  );
}
