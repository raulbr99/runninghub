'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { downloadJsonFile, downloadTextFile, formatDateShort, formatNumber, todayLocal } from '@/lib/workout-history/format';
import {
  PLAN_START,
  PLAN_WEEK_COUNT,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  addDays,
} from '@/lib/workout-history/plan';
import {
  LOAD_THRESHOLDS,
  isRunSession,
  runLoadWeeks,
  type ItemProgress,
  type ItemStatus,
} from '@/lib/workout-history/planProgress';
import {
  buildPlanBackup,
  clearPlanState,
  countPlanMarks,
  mergePlanStates,
  parsePlanStateText,
  savePlanState,
  type PlanParseResult,
} from '@/lib/workout-history/planState';
import { TYPE_LABELS, type WorkoutSession } from '@/lib/workout-history/types';
import { PlanItemCard, RescheduleDialog, formatKm } from './PlanItemCard';
import { Badge, Dialog, ICONS, Icon, StatCard, Unknown, buttonDanger, buttonPrimary, buttonSecondary, cardClass } from './ui';
import type { PlanTracker } from './usePlanTracker';

const MAX_PLAN_IMPORT_BYTES = 1024 * 1024;

const MARKER_STYLE: Record<ItemStatus, string> = {
  done: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  today: 'bg-amber-500/15 text-amber-200 border-amber-500/50',
  upcoming: 'bg-transparent text-zinc-400 border-zinc-700',
  missed: 'bg-orange-500/10 text-orange-200 border-orange-500/50',
  'optional-unused': 'bg-transparent text-zinc-500 border-dashed border-zinc-700',
};
const MARKER_SYMBOL: Record<ItemStatus, string> = { done: '✓', today: '•', upcoming: '', missed: '✕', 'optional-unused': '' };
const STATUS_TEXT: Record<ItemStatus, string> = {
  done: 'hecha',
  today: 'prevista para hoy',
  upcoming: 'pendiente',
  missed: 'no realizada',
  'optional-unused': 'opcional no usada',
};

function Marker({ progress }: { progress: ItemProgress }) {
  const letter = progress.item.kind === 'run' ? 'C' : 'F';
  const label = `${progress.item.title}: ${STATUS_TEXT[progress.status]}${progress.rescheduled ? ', reprogramada' : ''}`;
  return (
    <span
      title={label}
      className={`inline-flex items-center justify-center h-[18px] min-w-[26px] px-1 rounded border text-[10px] leading-none font-medium ${MARKER_STYLE[progress.status]}`}
    >
      <span aria-hidden="true">
        {letter}
        {MARKER_SYMBOL[progress.status]}
        {progress.rescheduled && progress.status !== 'done' ? '→' : ''}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface CalendarPanelProps {
  tracker: PlanTracker;
  sessions: WorkoutSession[];
}

interface ImportPreview {
  fileName: string;
  result: PlanParseResult;
}

export default function CalendarPanel({ tracker, sessions }: CalendarPanelProps) {
  const { progress, today, state } = tracker;
  const [selected, setSelected] = useState<number>(progress.currentWeek ?? (today < PLAN_START ? 1 : PLAN_WEEK_COUNT));
  const [target, setTarget] = useState<ItemProgress | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ItemProgress[]>();
    for (const p of progress.byId.values()) {
      const list = map.get(p.effectiveDate);
      if (list) list.push(p);
      else map.set(p.effectiveDate, [p]);
    }
    return map;
  }, [progress]);

  const movedFrom = useMemo(() => {
    const map = new Map<string, ItemProgress[]>();
    for (const p of progress.byId.values()) {
      if (!p.rescheduled) continue;
      const list = map.get(p.item.date);
      if (list) list.push(p);
      else map.set(p.item.date, [p]);
    }
    return map;
  }, [progress]);

  const extrasByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of progress.extras) {
      const list = map.get(s.date);
      if (list) list.push(s);
      else map.set(s.date, [s]);
    }
    return map;
  }, [progress]);

  const loadWeeks = useMemo(() => runLoadWeeks(sessions, progress, today), [sessions, progress, today]);
  const marks = countPlanMarks(state);
  const totals = progress.totals;
  const week = progress.weeks[selected - 1];
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week.week.start, i));

  const weekRecorded = useMemo(() => {
    let km: number | null = null;
    let runs = 0;
    let unknown = 0;
    for (const s of sessions) {
      if (!isRunSession(s) || s.date < week.week.start || s.date > week.week.end) continue;
      runs += 1;
      if (s.distanceKm === null) unknown += 1;
      else km = (km ?? 0) + s.distanceKm;
    }
    return { km, runs, unknown };
  }, [sessions, week]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_PLAN_IMPORT_BYTES) {
      setPreview({ fileName: file.name, result: { ok: false, error: 'El archivo es demasiado grande para ser una copia del plan.' } });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setPreview({ fileName: file.name, result: { ok: false, error: 'No se pudo leer el archivo.' } });
      return;
    }
    setPreview({ fileName: file.name, result: parsePlanStateText(text) });
  };

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!preview || !preview.result.ok) return;
    const incoming = preview.result.state;
    const ok = tracker.run(() => savePlanState(mode === 'merge' ? mergePlanStates(state, incoming) : incoming));
    if (ok) {
      setMessage(mode === 'merge' ? 'Copia del plan combinada con las marcas actuales.' : 'Marcas del plan reemplazadas por las de la copia.');
      setPreview(null);
    }
  };

  const importCounts = preview?.result.ok ? countPlanMarks(preview.result.state) : null;

  return (
    <div className="space-y-5">
      {tracker.snapshot.status === 'error' && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3 text-sm">
          <p className="text-red-200">{tracker.snapshot.message}</p>
          <p className="text-zinc-300">
            No se ha modificado nada y el plan se muestra sin marcas manuales. Descarga el contenido tal cual y, si quieres
            empezar de cero, borra las marcas.
          </p>
          <div className="flex flex-wrap gap-2">
            {tracker.snapshot.raw && (
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => {
                  if (tracker.snapshot.status === 'error') {
                    downloadTextFile(tracker.snapshot.raw, `runninghub-plan-sin-procesar-${todayLocal()}.json`);
                  }
                }}
              >
                <Icon path={ICONS.download} /> Descargar marcas sin procesar
              </button>
            )}
            <button type="button" className="px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg" onClick={() => setConfirmClear(true)}>
              Borrar marcas guardadas…
            </button>
          </div>
        </div>
      )}

      {(tracker.error || message) && (
        <div
          role={tracker.error ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
            tracker.error ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-zinc-700 bg-zinc-900 text-zinc-200'
          }`}
        >
          <span>{tracker.error ?? message}</span>
          <button
            type="button"
            onClick={() => {
              tracker.clearError();
              setMessage(null);
            }}
            className="p-1 text-zinc-400 hover:text-zinc-200"
            aria-label="Cerrar aviso"
          >
            <Icon path={ICONS.close} className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Cumplimiento"
          value={totals.rate !== null ? `${Math.round(totals.rate * 100)}` : <Unknown>—</Unknown>}
          unit={totals.rate !== null ? '%' : undefined}
          detail={
            totals.rate !== null ? (
              <p>
                {totals.done} de {totals.due} sesiones obligatorias vencidas o hechas
              </p>
            ) : (
              <p>Aún no ha vencido ninguna sesión del plan</p>
            )
          }
        />
        <StatCard
          label="Carreras"
          value={totals.runDue > 0 ? `${totals.runDone}/${totals.runDue}` : <Unknown>—</Unknown>}
          detail={<p>{totals.runDue > 0 ? 'Hechas sobre vencidas' : 'Sin carreras vencidas todavía'}</p>}
        />
        <StatCard
          label="Fuerza"
          value={totals.strengthDue > 0 ? `${totals.strengthDone}/${totals.strengthDue}` : <Unknown>—</Unknown>}
          detail={
            <>
              <p>{totals.strengthDue > 0 ? 'Lunes y viernes, hechas sobre vencidas' : 'Sin sesiones vencidas todavía'}</p>
              {totals.optionalDone > 0 && <p className="text-zinc-500">+ {totals.optionalDone} opcionales de miércoles</p>}
            </>
          }
        />
        <StatCard
          label="No realizadas"
          value={formatNumber(totals.missed)}
          detail={
            <>
              <p>{totals.rescheduledPending} reprogramadas pendientes</p>
              <p className="text-zinc-500">{totals.manualDone} marcadas a mano</p>
            </>
          }
        />
      </div>

      <p className="text-xs text-zinc-500">
        Una sesión solo cuenta como no realizada cuando su fecha local ya ha pasado (la de hoy sigue pendiente). Las opcionales
        del miércoles no cuentan en el cumplimiento. Se considera hecha si hay un registro del mismo tipo ese día —o, si no,
        otro día de la misma semana— o si la marcas a mano.
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className={`${cardClass} p-3 sm:p-4 space-y-3 min-w-0 self-start`} aria-labelledby="calendar-grid-title">
          <h3 id="calendar-grid-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Calendario del plan
          </h3>
          <table className="w-full table-fixed border-separate border-spacing-y-0.5 text-center">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase">
                <th scope="col" className="w-8 font-medium">
                  <span className="sr-only">Semana</span>
                </th>
                {WEEKDAY_SHORT.map((d, i) => (
                  <th key={d} scope="col" className="font-medium pb-1">
                    <abbr title={WEEKDAY_NAMES[i]} className="no-underline">
                      {d}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {progress.weeks.map((wp) => {
                const active = wp.week.number === selected;
                return (
                  <tr
                    key={wp.week.number}
                    onClick={() => setSelected(wp.week.number)}
                    className={`cursor-pointer ${active ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/40'}`}
                  >
                    <th scope="row" className="rounded-l-md p-0">
                      <button
                        type="button"
                        onClick={() => setSelected(wp.week.number)}
                        aria-pressed={active}
                        aria-label={`Semana ${wp.week.number}, ${wp.week.rangeLabel}`}
                        className={`w-full min-h-11 text-[11px] font-mono rounded-l-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                          active ? 'text-emerald-300' : 'text-zinc-500'
                        }`}
                      >
                        {wp.week.number}
                      </button>
                    </th>
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = addDays(wp.week.start, i);
                      const items = itemsByDate.get(date) ?? [];
                      const extras = extrasByDate.get(date)?.length ?? 0;
                      const isToday = date === today;
                      return (
                        <td key={date} className={`align-top py-1 px-0.5 ${i === 6 ? 'rounded-r-md' : ''}`}>
                          <div
                            className={`mx-auto flex flex-col items-center gap-0.5 rounded-md py-0.5 ${
                              isToday ? 'ring-1 ring-amber-400/70' : ''
                            }`}
                          >
                            <span className={`text-[10px] leading-none ${isToday ? 'text-amber-300' : date < today ? 'text-zinc-600' : 'text-zinc-400'}`}>
                              {Number(date.slice(8))}
                            </span>
                            {items.map((p) => (
                              <Marker key={p.item.id} progress={p} />
                            ))}
                            {extras > 0 && (
                              <span className="text-[10px] leading-none text-zinc-500" title={`${extras} sesión(es) registrada(s) fuera del plan`}>
                                +{extras}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-zinc-400" aria-label="Leyenda">
            <li>
              <span className="text-zinc-200">C</span> carrera · <span className="text-zinc-200">F</span> fuerza
            </li>
            <li className="inline-flex items-center gap-1">
              <span className={`inline-flex h-[18px] px-1 items-center rounded border text-[10px] ${MARKER_STYLE.done}`}>✓</span> hecha
            </li>
            <li className="inline-flex items-center gap-1">
              <span className={`inline-flex h-[18px] px-1 items-center rounded border text-[10px] ${MARKER_STYLE.missed}`}>✕</span> no realizada
            </li>
            <li className="inline-flex items-center gap-1">
              <span className={`inline-flex h-[18px] px-1 items-center rounded border text-[10px] ${MARKER_STYLE.upcoming}`}>→</span> reprogramada
            </li>
            <li className="inline-flex items-center gap-1">
              <span className={`inline-flex h-[18px] w-4 rounded border ${MARKER_STYLE['optional-unused']}`} /> opcional
            </li>
            <li>+n registros fuera del plan</li>
          </ul>
        </section>

        <section className={`${cardClass} p-3 sm:p-4 space-y-3 min-w-0`} aria-labelledby="calendar-week-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 id="calendar-week-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
                Semana {week.week.number} · {week.week.rangeLabel}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {week.requiredDone} de {week.requiredTotal} obligatorias hechas · previsto{' '}
                <span className="font-mono">{formatKm(week.week.plannedRunKm)}</span> · registrado{' '}
                {weekRecorded.km !== null ? (
                  <span className="font-mono">
                    {formatKm(weekRecorded.km)}
                    {weekRecorded.unknown > 0 && ' (mínimo)'}
                  </span>
                ) : (
                  <span className="italic text-zinc-500">{weekRecorded.runs > 0 ? 'sin distancia anotada' : 'sin carreras registradas'}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {week.week.deload && <Badge tone="sky">Descarga</Badge>}
              {week.week.race && <Badge tone="cardio">Carrera</Badge>}
              <button
                type="button"
                className={`${buttonSecondary} px-2.5`}
                disabled={selected <= 1}
                onClick={() => setSelected((n) => Math.max(1, n - 1))}
                aria-label="Semana anterior"
              >
                <Icon path={ICONS.chevron} className="w-4 h-4 rotate-90" />
              </button>
              <button
                type="button"
                className={`${buttonSecondary} px-2.5`}
                disabled={selected >= PLAN_WEEK_COUNT}
                onClick={() => setSelected((n) => Math.min(PLAN_WEEK_COUNT, n + 1))}
                aria-label="Semana siguiente"
              >
                <Icon path={ICONS.chevron} className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>

          <ol className="space-y-2">
            {weekDays.map((date, i) => {
              const items = itemsByDate.get(date) ?? [];
              const moved = movedFrom.get(date) ?? [];
              const extras = extrasByDate.get(date) ?? [];
              const empty = items.length === 0 && extras.length === 0;
              return (
                <li key={date} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
                  <div className={`pt-2 text-xs ${date === today ? 'text-amber-300' : 'text-zinc-400'}`}>
                    <p className="uppercase tracking-wide">{WEEKDAY_NAMES[i].slice(0, 3)}</p>
                    <p className="text-zinc-500">{formatDateShort(date).split(' ').slice(1).join(' ')}</p>
                    {date === today && <p className="text-[10px] uppercase">Hoy</p>}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    {items.map((p) => (
                      <PlanItemCard key={p.item.id} progress={p} tracker={tracker} onReschedule={setTarget} showDate={false} />
                    ))}
                    {moved.map((p) => (
                      <p key={p.item.id} className="text-xs text-zinc-500 px-1 py-1">
                        «{p.item.title}» estaba prevista este día en el plan; movida al {formatDateShort(p.effectiveDate)}.
                      </p>
                    ))}
                    {extras.map((s) => (
                      <p key={s.id} className="text-xs text-zinc-400 rounded-lg border border-dashed border-zinc-800 px-3 py-2">
                        <span className="text-zinc-500">Fuera del plan: </span>«{s.title}» · {s.category ?? TYPE_LABELS[s.type]}
                        {s.distanceKm !== null && <span className="font-mono"> · {formatKm(s.distanceKm)}</span>}
                      </p>
                    ))}
                    {empty && moved.length === 0 && (
                      <p className="text-xs text-zinc-600 px-1 py-2">{i === 5 ? 'Descanso / movilidad' : 'Sin sesión prevista'}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="load-title">
        <div>
          <h3 id="load-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Carga de carrera reciente
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Km de carrera registrados en el historial por semana (lunes–domingo), frente a lo previsto y a las semanas previas.
          </p>
        </div>
        <ul className="divide-y divide-zinc-800/70">
          {loadWeeks.map((w) => (
            <li key={w.weekStart} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <span className="text-zinc-200">
                  {w.rangeLabel}
                  <span className="text-xs text-zinc-500">
                    {w.planWeek ? ` · semana ${w.planWeek.number}${w.planWeek.deload ? ' (descarga)' : ''}` : ' · antes del plan'}
                    {w.inProgress && ' · en curso'}
                  </span>
                </span>
                <span className="text-xs text-zinc-400">
                  {w.km !== null ? (
                    <>
                      <span className="font-mono text-sm text-zinc-100">{formatKm(w.km)}</span> en {w.runsWithDistance}{' '}
                      {w.runsWithDistance === 1 ? 'carrera' : 'carreras'}
                    </>
                  ) : (
                    <span className="italic text-zinc-500">{w.runs > 0 ? 'Distancia no registrada' : 'Sin carreras registradas'}</span>
                  )}
                  {w.plannedKm !== null && <> · previsto {formatKm(w.plannedKm)}</>}
                  {w.changePct !== null && w.reference && (
                    <>
                      {' · '}
                      {w.changePct >= 0 ? '+' : '−'}
                      {Math.abs(Math.round(w.changePct))} % vs {formatKm(w.reference.km)}
                      {w.reference.skippedDeload && ' (previa a la descarga)'}
                    </>
                  )}
                </span>
              </div>
              {w.partialData && (
                <p className="text-xs text-zinc-500">
                  Datos parciales
                  {w.runs > w.runsWithDistance && `: ${w.runs - w.runsWithDistance} carrera(s) sin distancia`}
                  {w.manualRuns > 0 && `${w.runs > w.runsWithDistance ? ' y' : ':'} ${w.manualRuns} marcada(s) a mano sin registro`}. El total
                  es un mínimo y esta semana no se usa como referencia.
                </p>
              )}
              {w.flags.map((flag) => (
                <p key={flag.kind} className="flex gap-2 text-xs text-amber-200/90 rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5">
                  <Icon path={ICONS.info} className="w-4 h-4 shrink-0 text-amber-300/80" />
                  <span>{flag.text}</span>
                </p>
              ))}
            </li>
          ))}
        </ul>
        <details className="text-xs text-zinc-400">
          <summary className="cursor-pointer hover:text-zinc-300">Cuándo aparece un aviso</summary>
          <ul className="mt-2 space-y-1 list-disc pl-4">
            <li>
              Subida semanal: más de un {LOAD_THRESHOLDS.weekRisePct} % y al menos {LOAD_THRESHOLDS.weekRiseMinKm} km por encima de
              la semana anterior. Si la anterior fue de descarga en el plan, se compara con la previa a la descarga.
            </li>
            <li>
              Frente a tu base reciente: más de un {LOAD_THRESHOLDS.baselineRisePct} % por encima de la media de las{' '}
              {LOAD_THRESHOLDS.baselineWeeks} semanas previas (hacen falta al menos {LOAD_THRESHOLDS.baselineMinWeeks} con registro).
            </li>
            <li>
              Frente al plan: más de un {LOAD_THRESHOLDS.planOverPct} % y al menos {LOAD_THRESHOLDS.planOverMinKm} km por encima de
              lo previsto esa semana.
            </li>
            <li>Las semanas sin registros o con datos parciales no se toman como 0 km ni sirven de referencia.</li>
          </ul>
        </details>
        <p className="text-xs text-zinc-500">
          Son avisos informativos calculados solo con kilómetros registrados. No valoran cómo te encuentras ni diagnostican nada:
          si coinciden con molestias o cansancio, aplica las reglas de ajuste del plan.
        </p>
      </section>

      <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="plan-backup-title">
        <div className="flex gap-3">
          <Icon path={ICONS.lock} className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 id="plan-backup-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
              Tus marcas del plan: solo en este navegador
            </h3>
            <p className="text-sm text-zinc-400">
              Las sesiones marcadas a mano y las reprogramaciones se guardan en el almacenamiento local de este navegador. No se
              envían a ningún servidor, no cambian el historial de entrenos y no van incluidas en su «Copia JSON»: tienen su
              propia copia aquí.
            </p>
            <p className="text-xs text-zinc-500">
              Ahora mismo: {marks.done} {marks.done === 1 ? 'sesión marcada' : 'sesiones marcadas'} a mano · {marks.rescheduled}{' '}
              {marks.rescheduled === 1 ? 'reprogramación' : 'reprogramaciones'}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonSecondary}
            disabled={tracker.snapshot.status !== 'ready'}
            onClick={() => downloadJsonFile(buildPlanBackup(state), `runninghub-plan-marcas-${todayLocal()}.json`)}
          >
            <Icon path={ICONS.download} /> Copia del plan (JSON)
          </button>
          <button type="button" className={buttonSecondary} disabled={!tracker.editable} onClick={() => fileInput.current?.click()}>
            <Icon path={ICONS.upload} /> Importar copia del plan
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={marks.done + marks.rescheduled === 0}
            onClick={() => setConfirmClear(true)}
          >
            Borrar marcas…
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFile}
          aria-hidden="true"
          tabIndex={-1}
        />
      </section>

      <RescheduleDialog target={target} tracker={tracker} onClose={() => setTarget(null)} />

      <Dialog
        open={preview !== null}
        size="sm"
        title="Importar copia del plan"
        onClose={() => setPreview(null)}
        footer={
          preview?.result.ok ? (
            <>
              <button type="button" className={buttonSecondary} onClick={() => setPreview(null)}>
                Cancelar
              </button>
              <button type="button" className={buttonSecondary} onClick={() => applyImport('replace')}>
                Reemplazar
              </button>
              <button type="button" className={buttonPrimary} onClick={() => applyImport('merge')} autoFocus>
                Combinar
              </button>
            </>
          ) : (
            <button type="button" className={buttonSecondary} onClick={() => setPreview(null)} autoFocus>
              Cerrar
            </button>
          )
        }
      >
        {preview && (
          <div className="space-y-3 text-sm">
            <p className="text-zinc-400 break-all">{preview.fileName}</p>
            {preview.result.ok && importCounts ? (
              <>
                <p className="text-zinc-200">
                  La copia contiene {importCounts.done} {importCounts.done === 1 ? 'sesión marcada' : 'sesiones marcadas'} a mano y{' '}
                  {importCounts.rescheduled} {importCounts.rescheduled === 1 ? 'reprogramación' : 'reprogramaciones'}.
                </p>
                {preview.result.ignored > 0 && (
                  <p className="text-amber-200/90">
                    Se ignoran {preview.result.ignored} entrada(s) que no corresponden a sesiones de este plan o tienen fechas no
                    válidas.
                  </p>
                )}
                <p className="text-zinc-400">
                  «Combinar» añade las marcas de la copia a las actuales (si una sesión está en ambas, gana la copia). «Reemplazar»
                  sustituye tus {marks.done + marks.rescheduled} marcas actuales por las de la copia. El historial de entrenos no
                  se toca.
                </p>
              </>
            ) : (
              !preview.result.ok && <p className="text-red-200">{preview.result.error}</p>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmClear}
        size="sm"
        title="Borrar marcas del plan"
        onClose={() => setConfirmClear(false)}
        footer={
          <>
            <button type="button" className={buttonSecondary} onClick={() => setConfirmClear(false)} autoFocus>
              Cancelar
            </button>
            <button
              type="button"
              className={buttonDanger}
              onClick={() => {
                clearPlanState();
                tracker.clearError();
                setConfirmClear(false);
                setMessage('Marcas del plan borradas de este navegador.');
              }}
            >
              Borrar marcas
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">
          Se eliminarán las sesiones marcadas a mano y las reprogramaciones guardadas en este navegador. El historial de entrenos
          no se modifica. Si no tienes una copia del plan, no se podrán recuperar.
        </p>
      </Dialog>
    </div>
  );
}
