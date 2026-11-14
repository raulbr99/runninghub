'use client';

import { useState } from 'react';
import type { ConflictStrategy, MergeAction, MergePlan } from '@/lib/workout-history/merge';
import type { ParseResult, SessionDraft } from '@/lib/workout-history/validate';
import type { WorkoutSession } from '@/lib/workout-history/types';
import { formatDate, formatDuration, formatNumber } from '@/lib/workout-history/format';
import { Dialog, buttonPrimary, buttonSecondary } from './ui';
import FormatHelp from './FormatHelp';

export interface ImportPreview {
  /** Cambia en cada selección de archivo para reiniciar el estado del diálogo. */
  nonce: number;
  fileName: string;
  result: ParseResult;
  plan: MergePlan | null;
}

interface ImportDialogProps {
  preview: ImportPreview | null;
  onCancel: () => void;
  onConfirm: (strategy: ConflictStrategy) => void;
}

function summary(s: SessionDraft | WorkoutSession): string {
  const sets = s.exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const parts = [
    s.exercises.length > 0 ? `${s.exercises.length} ejercicios, ${sets} series` : null,
    s.durationMin !== null ? formatDuration(s.durationMin) : null,
    s.distanceKm !== null ? `${formatNumber(s.distanceKm, 2)} km` : null,
    s.partial ? 'parcial' : null,
    s.incomplete ? 'datos incompletos' : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'sin detalles';
}

const STRATEGIES: Array<{ value: ConflictStrategy; label: string; help: string }> = [
  {
    value: 'keep-existing',
    label: 'Mantener lo que ya tengo',
    help: 'Recomendado. Las sesiones en conflicto del archivo no se importan.',
  },
  {
    value: 'replace',
    label: 'Reemplazar con el archivo',
    help: 'Las sesiones guardadas en conflicto se sustituyen por las del archivo.',
  },
  {
    value: 'keep-both',
    label: 'Conservar ambas',
    help: 'Se añaden las del archivo como registros nuevos, sin tocar las guardadas.',
  },
];

export default function ImportDialog({ preview, onCancel, onConfirm }: ImportDialogProps) {
  return (
    <ImportDialogInner
      key={preview ? preview.nonce : 'closed'}
      preview={preview}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function ImportDialogInner({ preview, onCancel, onConfirm }: ImportDialogProps) {
  const [strategy, setStrategy] = useState<ConflictStrategy>('keep-existing');
  const open = preview !== null;
  const result = preview?.result;
  const plan = preview?.plan ?? null;

  const conflicts = plan
    ? plan.actions.filter((a): a is Extract<MergeAction, { kind: 'conflict' }> => a.kind === 'conflict')
    : [];
  const willChange = plan ? plan.newCount > 0 || (plan.conflictCount > 0 && strategy !== 'keep-existing') : false;

  return (
    <Dialog
      open={open}
      size="lg"
      title="Importar copia JSON"
      onClose={onCancel}
      footer={
        result?.ok ? (
          <>
            <button type="button" className={buttonSecondary} onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className={buttonPrimary} disabled={!willChange} onClick={() => onConfirm(strategy)}>
              {willChange ? 'Importar a este navegador' : 'Nada que importar'}
            </button>
          </>
        ) : (
          <button type="button" className={buttonSecondary} onClick={onCancel}>
            Cerrar
          </button>
        )
      }
    >
      {preview && result && (
        <div className="space-y-4 text-sm">
          <p className="text-zinc-400">
            Archivo: <span className="text-zinc-200 font-mono break-all">{preview.fileName}</span>
          </p>

          {!result.ok && (
            <>
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                <p className="font-medium">No se ha importado nada.</p>
                <p className="mt-1">{result.error}</p>
              </div>
              <FormatHelp defaultOpen />
            </>
          )}

          {result.ok && plan && (
            <>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="Resumen de la importación">
                <SummaryItem label="En el archivo" value={result.data.totalInFile} />
                <SummaryItem label="Nuevas" value={plan.newCount} highlight={plan.newCount > 0} />
                <SummaryItem label="Ya guardadas (idénticas)" value={plan.identicalCount} />
                <SummaryItem label="Repetidas en el archivo" value={plan.duplicateCount} />
                <SummaryItem label="En conflicto" value={plan.conflictCount} warn={plan.conflictCount > 0} />
                <SummaryItem label="Con errores (se omiten)" value={result.data.invalid.length} warn={result.data.invalid.length > 0} />
              </ul>

              {plan.identicalCount > 0 && plan.newCount === 0 && plan.conflictCount === 0 && (
                <p className="text-zinc-400">Todo el contenido válido del archivo ya está guardado. Importarlo de nuevo no cambia nada.</p>
              )}

              {conflicts.length > 0 && (
                <section className="space-y-2" aria-labelledby="import-conflicts">
                  <h3 id="import-conflicts" className="text-xs uppercase tracking-wider text-amber-300">
                    {conflicts.length} sesión(es) coinciden con otras guardadas pero tienen datos distintos
                  </h3>
                  <ul className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {conflicts.slice(0, 50).map((c, i) => (
                      <li key={`${c.existing.id}-${i}`} className="rounded-lg bg-zinc-950/50 border border-zinc-800 p-2 text-xs">
                        <p className="text-zinc-200">
                          {formatDate(c.incoming.date)} · {c.incoming.title}{' '}
                          <span className="text-zinc-500">(coincide por {c.matchedBy === 'id' ? 'id' : 'fecha y título'})</span>
                        </p>
                        <p className="text-zinc-400">Guardada: {summary(c.existing)}</p>
                        <p className="text-zinc-400">Archivo: {summary(c.incoming)}</p>
                      </li>
                    ))}
                  </ul>
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs text-zinc-400 mb-1">¿Qué hacer con los conflictos?</legend>
                    {STRATEGIES.map((s) => (
                      <label
                        key={s.value}
                        className={`flex items-start gap-2 rounded-lg border p-2 cursor-pointer ${
                          strategy === s.value ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="conflict-strategy"
                          value={s.value}
                          checked={strategy === s.value}
                          onChange={() => setStrategy(s.value)}
                          className="mt-0.5 accent-emerald-500"
                        />
                        <span>
                          <span className="text-zinc-200">{s.label}</span>
                          <span className="block text-xs text-zinc-500">{s.help}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {strategy === 'replace' && (
                    <p className="text-xs text-amber-300">
                      Consejo: exporta antes una copia JSON si quieres poder volver atrás.
                    </p>
                  )}
                </section>
              )}

              {result.data.invalid.length > 0 && (
                <details className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <summary className="cursor-pointer text-red-200">
                    {result.data.invalid.length} sesión(es) con errores no se importarán — ver detalles
                  </summary>
                  <ul className="mt-2 max-h-56 overflow-y-auto space-y-2 text-xs">
                    {result.data.invalid.slice(0, 100).map((inv) => (
                      <li key={inv.index}>
                        <p className="text-zinc-200">{inv.label}</p>
                        <ul className="list-disc pl-5 text-red-200/90">
                          {inv.errors.slice(0, 8).map((e) => (
                            <li key={e} className="break-words">
                              {e}
                            </li>
                          ))}
                          {inv.errors.length > 8 && <li>… y {inv.errors.length - 8} más</li>}
                        </ul>
                      </li>
                    ))}
                    {result.data.invalid.length > 100 && <li>… y {result.data.invalid.length - 100} sesiones más</li>}
                  </ul>
                </details>
              )}

              {result.data.warnings.length > 0 && (
                <details className="rounded-lg border border-zinc-800 p-3">
                  <summary className="cursor-pointer text-zinc-300">Avisos ({result.data.warnings.length})</summary>
                  <ul className="mt-2 list-disc pl-5 text-xs text-zinc-400 space-y-0.5">
                    {result.data.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}

              <p className="text-xs text-zinc-500">
                Se guarda solo en el almacenamiento local de este navegador. Importar dos veces el mismo archivo no duplica
                sesiones.
              </p>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}

function SummaryItem({
  label,
  value,
  highlight = false,
  warn = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <li
      className={`rounded-lg border p-2.5 ${
        warn ? 'border-amber-500/30 bg-amber-500/5' : highlight ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800'
      }`}
    >
      <p className="text-[11px] text-zinc-400">{label}</p>
      <p className="text-lg font-mono text-zinc-100">{formatNumber(value)}</p>
    </li>
  );
}
