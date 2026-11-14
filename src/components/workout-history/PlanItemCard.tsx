'use client';

import { useState } from 'react';
import { formatDateShort, formatNumber } from '@/lib/workout-history/format';
import { PLAN_START, RACE_DATE, type PlanItem } from '@/lib/workout-history/plan';
import { STRENGTH_SESSION_BY_ID, reducedSets, strengthPhaseOf } from '@/lib/workout-history/strengthPlan';
import type { ItemProgress } from '@/lib/workout-history/planProgress';
import { Badge, Dialog, ICONS, Icon, buttonPrimary, buttonSecondary, inputClass, labelClass } from './ui';
import type { PlanTracker } from './usePlanTracker';

const smallButton =
  'inline-flex items-center justify-center gap-1.5 min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400';

export function formatKm(value: number): string {
  return `${formatNumber(value, 1)} km`;
}

export function PlanStatusBadges({ progress }: { progress: ItemProgress }) {
  const { status, source, rescheduled, item } = progress;
  return (
    <>
      {status === 'done' && source === 'history' && (
        <Badge tone="strength" title="Hay una sesión registrada en el historial que corresponde a esta sesión del plan">
          ✓ Registrada
        </Badge>
      )}
      {status === 'done' && source === 'manual' && (
        <Badge tone="sky" title="Marcada como hecha a mano; no hay registro en el historial">
          ✓ Marcada a mano
        </Badge>
      )}
      {status === 'today' && <Badge tone="amber">Hoy</Badge>}
      {status === 'upcoming' && <Badge tone="neutral">Pendiente</Badge>}
      {status === 'missed' && (
        <Badge tone="orange" title="Su fecha ya pasó y no consta como hecha">
          No realizada
        </Badge>
      )}
      {status === 'optional-unused' && <Badge tone="neutral">Opcional · no usada</Badge>}
      {rescheduled && (
        <Badge tone="sky" title={`Fecha prevista en el plan: ${formatDateShort(item.date)}`}>
          Reprogramada
        </Badge>
      )}
      {item.optional && status !== 'optional-unused' && <Badge tone="neutral">Opcional</Badge>}
    </>
  );
}

/** Ejercicios de la sesión de fuerza, con la dosis de la fase de esa semana. */
function StrengthExercises({ item }: { item: PlanItem }) {
  const session = item.strengthSession ? STRENGTH_SESSION_BY_ID.get(item.strengthSession) : undefined;
  if (!session) return null;
  const phase = strengthPhaseOf(item.week);
  const reduced = phase.kind === 'deload' || phase.kind === 'race';
  const noLegs = phase.kind === 'race' && session.id === 'pierna';
  const exercises = noLegs ? session.exercises.filter((e) => !e.lowerBody) : session.exercises;
  return (
    <details className="text-xs text-zinc-400">
      <summary className="cursor-pointer hover:text-zinc-200 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
        Ver ejercicios ({exercises.length})
      </summary>
      <ul className="mt-1 divide-y divide-zinc-800/70">
        {exercises.map((e) => (
          <li key={e.name} className="py-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-zinc-200">{e.name}</span>
            <span className="font-mono text-zinc-300">
              {reduced ? reducedSets(e) : e.sets} × {e.reps}
              <span className="font-sans text-zinc-500"> · {e.rest}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-zinc-500">
        Fase {phase.label.toLowerCase()}. Detalle, alternativas y progresión en la pestaña «Plan de fuerza».
      </p>
    </details>
  );
}

interface PlanItemCardProps {
  progress: ItemProgress;
  tracker: PlanTracker;
  onReschedule: (progress: ItemProgress) => void;
  /** Muestra la fecha vigente junto al título (vista de plan); en el calendario ya la da el día. */
  showDate?: boolean;
}

export function PlanItemCard({ progress, tracker, onReschedule, showDate = true }: PlanItemCardProps) {
  const { item, status, source, session, manual, effectiveDate, rescheduled, offDate } = progress;
  const done = status === 'done';
  const canMark = !done && effectiveDate <= tracker.today;
  const isRun = item.kind === 'run';

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        done
          ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
          : status === 'missed'
            ? 'border-orange-500/25 bg-orange-500/[0.03]'
            : status === 'today'
              ? 'border-amber-500/30 bg-amber-500/[0.04]'
              : 'border-zinc-800 bg-zinc-950/30'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={isRun ? 'cardio' : 'strength'}>{item.role === 'race' ? 'Carrera · objetivo' : isRun ? 'Carrera' : 'Fuerza'}</Badge>
            {item.sameDayAsRun && !rescheduled && (
              <Badge tone="neutral" title="Coincide con una carrera prevista el mismo día: sepáralas al menos 6 horas">
                Día doble
              </Badge>
            )}
            {showDate && (
              <span className="text-xs text-zinc-400">
                {formatDateShort(effectiveDate)}
                {rescheduled && <span className="text-zinc-500"> (prevista {formatDateShort(item.date)})</span>}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-100">{item.title}</p>
          <p className="text-sm text-zinc-300">{item.prescription}</p>
          <p className="text-xs text-zinc-400">{item.effort}</p>
          {item.note && <p className="text-xs text-zinc-500">{item.note}</p>}
          {!isRun && <StrengthExercises item={item} />}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <PlanStatusBadges progress={progress} />
        </div>
      </div>

      {session && (
        <p className="text-xs text-zinc-300 border-t border-zinc-800/70 pt-2">
          <span className="text-zinc-500">Registro del historial: </span>«{session.title}» · {formatDateShort(session.date)}
          {isRun && (
            <>
              {' · '}
              {session.distanceKm !== null ? (
                <span className="font-mono">{formatKm(session.distanceKm)}</span>
              ) : (
                <span className="italic text-zinc-500">distancia no registrada</span>
              )}
              {item.distanceKm !== null && session.distanceKm !== null && (
                <span className="text-zinc-500"> (previsto {formatKm(item.distanceKm)})</span>
              )}
            </>
          )}
          {session.partial && <span className="text-amber-300/90"> · sesión parcial</span>}
          {offDate && <span className="text-zinc-500"> · hecha otro día de la misma semana</span>}
        </p>
      )}
      {source === 'manual' && manual && (
        <p className="text-xs text-zinc-400 border-t border-zinc-800/70 pt-2">
          Marcada a mano como hecha el {formatDateShort(manual.date)}. Sin registro en el historial: no suma kilómetros ni series
          en los análisis.
        </p>
      )}

      {tracker.editable && (canMark || source === 'manual' || (source === 'history' && manual) || (!done && !item.fixedDate)) && (
        <div className="flex flex-wrap gap-1.5">
          {canMark && (
            <button type="button" className={smallButton} onClick={() => tracker.markDone(item.id, effectiveDate)}>
              <Icon path={ICONS.check} className="w-3.5 h-3.5 text-emerald-400" /> Marcar hecha
            </button>
          )}
          {source === 'manual' && (
            <button type="button" className={smallButton} onClick={() => tracker.unmarkDone(item.id)}>
              <Icon path={ICONS.close} className="w-3.5 h-3.5" /> Desmarcar
            </button>
          )}
          {source === 'history' && manual && (
            <button
              type="button"
              className={smallButton}
              onClick={() => tracker.unmarkDone(item.id)}
              title="El registro del historial ya la cubre; la marca manual es redundante"
            >
              <Icon path={ICONS.close} className="w-3.5 h-3.5" /> Quitar marca manual
            </button>
          )}
          {!done && !item.fixedDate && (
            <button type="button" className={smallButton} onClick={() => onReschedule(progress)}>
              <Icon path={ICONS.calendar} className="w-3.5 h-3.5" /> {rescheduled ? 'Cambiar fecha' : 'Reprogramar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface RescheduleDialogProps {
  target: ItemProgress | null;
  tracker: PlanTracker;
  onClose: () => void;
}

/** Diálogo para mover una sesión del plan a otra fecha (solo en este navegador). */
export function RescheduleDialog({ target, tracker, onClose }: RescheduleDialogProps) {
  return (
    <Dialog open={target !== null} size="sm" title="Reprogramar sesión" onClose={onClose}>
      {target && <RescheduleForm key={target.item.id} target={target} tracker={tracker} onClose={onClose} />}
    </Dialog>
  );
}

function RescheduleForm({ target, tracker, onClose }: { target: ItemProgress; tracker: PlanTracker; onClose: () => void }) {
  const [date, setDate] = useState(target.effectiveDate);
  const valid = date >= PLAN_START && date <= RACE_DATE;
  const unchanged = date === target.effectiveDate;

  const apply = (value: string | null) => {
    if (tracker.reschedule(target.item.id, value)) onClose();
  };

  return (
    <form
      className="space-y-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !unchanged) apply(date);
      }}
    >
      <div>
        <p className="text-zinc-100">{target.item.title}</p>
        <p className="text-zinc-400">
          {target.item.prescription} · prevista el {formatDateShort(target.item.date)}
        </p>
      </div>
      <div>
        <label htmlFor="reschedule-date" className={labelClass}>
          Nueva fecha
        </label>
        <input
          id="reschedule-date"
          type="date"
          required
          value={date}
          min={PLAN_START}
          max={RACE_DATE}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
        {!valid && <p className="mt-1 text-xs text-red-300">La fecha debe estar dentro del plan (16 nov 2026 – 21 feb 2027).</p>}
      </div>
      <p className="text-xs text-zinc-400">
        El cambio se guarda solo en este navegador. Si mueves una carrera, intenta no dejar dos días seguidos de impacto y no
        acumules kilómetros para compensar.
      </p>
      {tracker.error && (
        <p role="alert" className="text-xs text-red-300">
          {tracker.error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {target.rescheduled && (
          <button type="button" className={buttonSecondary} onClick={() => apply(null)}>
            Volver a la fecha prevista
          </button>
        )}
        <button type="button" className={buttonSecondary} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className={buttonPrimary} disabled={!valid || unchanged}>
          Guardar fecha
        </button>
      </div>
    </form>
  );
}
