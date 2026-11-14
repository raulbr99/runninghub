'use client';

import { useMemo, useState } from 'react';
import { sessionTonnage } from '@/lib/workout-history/analytics';
import { EQUIPMENT_LABELS, SIDE_LABELS, TYPE_LABELS, isMachineLoad, type ExerciseSet, type WorkoutSession } from '@/lib/workout-history/types';
import { formatDate, formatDateShort, formatDuration, formatMonthKey, formatNumber, formatPace } from '@/lib/workout-history/format';
import { Badge, ICONS, Icon, StatusBadges, Unknown, cardClass } from './ui';

const PAGE_SIZE = 40;

interface HistoryListProps {
  sessions: WorkoutSession[];
  order: 'desc' | 'asc';
  onEdit: (session: WorkoutSession) => void;
  onDelete: (session: WorkoutSession) => void;
}

function setText(set: ExerciseSet): string {
  const reps = set.reps === null ? '?' : String(set.reps);
  const weight =
    set.weightKg === null ? '? kg' : set.weightKg === 0 ? 'sin carga' : `${formatNumber(set.weightKg, 2)} kg`;
  const side = set.side ? ` ${SIDE_LABELS[set.side]}` : '';
  return `${reps} × ${weight}${side}`;
}

/** Agrupa series consecutivas idénticas: "3 × (10 × 60 kg)". */
function compactSets(sets: ExerciseSet[]): string[] {
  const out: Array<{ text: string; count: number }> = [];
  for (const s of sets) {
    const text = setText(s);
    const last = out[out.length - 1];
    if (last && last.text === text) last.count += 1;
    else out.push({ text, count: 1 });
  }
  return out.map((o) => (o.count > 1 ? `${o.count} × (${o.text})` : o.text));
}

function SessionSummary({ s }: { s: WorkoutSession }) {
  const sets = s.exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const items: string[] = [];
  if (s.type === 'cardio') {
    if (s.distanceKm !== null) items.push(`${formatNumber(s.distanceKm, 2)} km`);
  }
  if (s.durationMin !== null) items.push(formatDuration(s.durationMin));
  if (s.exercises.length > 0) items.push(`${s.exercises.length} ejerc. · ${sets} series`);
  const missing: string[] = [];
  if (s.durationMin === null) missing.push('duración');
  if (s.type === 'cardio' && s.distanceKm === null) missing.push('distancia');
  if (s.type === 'strength' && s.exercises.length === 0) missing.push('ejercicios');
  return (
    <span className="text-xs text-zinc-400">
      {items.join(' · ')}
      {missing.length > 0 && (
        <span className="text-zinc-500 italic">
          {items.length > 0 ? ' · ' : ''}sin {missing.join(', ')}
        </span>
      )}
    </span>
  );
}

function SessionDetails({ s, onEdit, onDelete }: { s: WorkoutSession; onEdit: () => void; onDelete: () => void }) {
  const t = sessionTonnage(s);
  const pace = s.type === 'cardio' && s.durationMin !== null && s.distanceKm !== null ? formatPace(s.durationMin, s.distanceKm) : null;
  const sets = s.exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <div className="px-3 sm:px-4 pb-4 pt-1 space-y-4 text-sm">
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Duración</dt>
          <dd className="font-mono text-zinc-200">{s.durationMin !== null ? formatDuration(s.durationMin) : <Unknown />}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Distancia</dt>
          <dd className="font-mono text-zinc-200">
            {s.distanceKm !== null ? `${formatNumber(s.distanceKm, 2)} km` : s.type === 'cardio' ? <Unknown /> : '—'}
          </dd>
        </div>
        {s.type === 'cardio' ? (
          <div>
            <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Ritmo medio</dt>
            <dd className="font-mono text-zinc-200">{pace ?? <Unknown>No calculable</Unknown>}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Series</dt>
            <dd className="font-mono text-zinc-200">{s.exercises.length > 0 ? sets : <Unknown />}</dd>
          </div>
        )}
        <div>
          <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Tonelaje (estimado)</dt>
          <dd className="font-mono text-zinc-200">
            {t.freeSets > 0 ? `${formatNumber(Math.round(t.freeKg))} kg` : s.exercises.length > 0 ? <Unknown>No calculable</Unknown> : '—'}
            {t.machineSets > 0 && (
              <span className="block text-[11px] text-zinc-500 font-sans">
                + {formatNumber(Math.round(t.machineKg))} kg de máquina (aparte)
              </span>
            )}
          </dd>
        </div>
      </dl>

      {s.notes && <p className="text-zinc-300 whitespace-pre-line bg-zinc-950/40 rounded-lg border border-zinc-800 p-3">{s.notes}</p>}

      {s.exercises.length > 0 && (
        <ul className="divide-y divide-zinc-800/60 rounded-lg border border-zinc-800 bg-zinc-950/30">
          {s.exercises.map((e, i) => (
            <li key={`${e.name}-${i}`} className="p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-100">{e.name}</span>
                {e.muscleGroup && <span className="text-xs text-zinc-400">· {e.muscleGroup}</span>}
                {e.equipment && (
                  <Badge tone={isMachineLoad(e.equipment) ? 'sky' : 'neutral'}>{EQUIPMENT_LABELS[e.equipment]}</Badge>
                )}
              </div>
              {e.sets.length > 0 ? (
                <p className="mt-1 text-xs font-mono text-zinc-300 leading-relaxed">{compactSets(e.sets).join(' · ')}</p>
              ) : (
                <p className="mt-1 text-xs">
                  <Unknown>Series no registradas</Unknown>
                </p>
              )}
              {e.notes && <p className="mt-1 text-xs text-zinc-400">{e.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-300 border border-zinc-700 hover:bg-zinc-800"
        >
          <Icon path={ICONS.pencil} className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-300 border border-red-500/30 hover:bg-red-500/10"
        >
          <Icon path={ICONS.trash} className="w-3.5 h-3.5" /> Eliminar
        </button>
      </div>
    </div>
  );
}

export default function HistoryList({ sessions, order, onEdit, onDelete }: HistoryListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [limit, setLimit] = useState(PAGE_SIZE);

  const ordered = useMemo(() => (order === 'desc' ? sessions : [...sessions].reverse()), [sessions, order]);
  const visible = useMemo(() => ordered.slice(0, limit), [ordered, limit]);

  const groups = useMemo(() => {
    const result: Array<{ month: string; items: WorkoutSession[]; total: number }> = [];
    const totals = new Map<string, number>();
    for (const s of ordered) totals.set(s.date.slice(0, 7), (totals.get(s.date.slice(0, 7)) ?? 0) + 1);
    for (const s of visible) {
      const month = s.date.slice(0, 7);
      const last = result[result.length - 1];
      if (last && last.month === month) last.items.push(s);
      else result.push({ month, items: [s], total: totals.get(month) ?? 0 });
    }
    return result;
  }, [ordered, visible]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-400 text-center">
        Ninguna sesión coincide con los filtros.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.month} aria-labelledby={`month-${g.month}`}>
          <h3 id={`month-${g.month}`} className="text-xs text-zinc-400 uppercase tracking-wider mb-2 px-1">
            {formatMonthKey(g.month)} <span className="text-zinc-500">· {g.total} {g.total === 1 ? 'sesión' : 'sesiones'}</span>
          </h3>
          <ul className={`${cardClass} divide-y divide-zinc-800/50 overflow-hidden`}>
            {g.items.map((s) => {
              const isOpen = expanded.has(s.id);
              const panelId = `session-${s.id}`;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? panelId : undefined}
                    className="w-full text-left px-3 sm:px-4 py-3 flex items-start gap-3 hover:bg-zinc-800/30 transition-colors"
                  >
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.type === 'strength' ? '#199e70' : '#3987e5' }}
                      aria-hidden="true"
                    />
                    <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-xs text-zinc-400 pt-0.5">{formatDateShort(s.date)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm text-zinc-100 break-words">{s.title}</span>
                        <Badge tone={s.type === 'strength' ? 'strength' : 'cardio'}>{TYPE_LABELS[s.type]}</Badge>
                        {s.category && <span className="text-xs text-zinc-400">{s.category}</span>}
                        <StatusBadges partial={s.partial} incomplete={s.incomplete} />
                      </span>
                      <span className="block mt-0.5">
                        <SessionSummary s={s} />
                      </span>
                    </span>
                    <Icon
                      path={ICONS.chevron}
                      className={`w-4 h-4 mt-1 text-zinc-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div id={panelId} role="region" aria-label={`Detalles de ${s.title}, ${formatDate(s.date)}`}>
                      <SessionDetails s={s} onEdit={() => onEdit(s)} onDelete={() => onDelete(s)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {ordered.length > limit && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="px-4 py-2 text-sm text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800"
          >
            Mostrar más ({ordered.length - limit} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
