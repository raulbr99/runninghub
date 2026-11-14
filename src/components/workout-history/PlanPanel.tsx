'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateShort, formatNumber } from '@/lib/workout-history/format';
import {
  GUARDRAILS,
  PLAN_NAME,
  PLAN_START,
  PLAN_WEEKS,
  PLAN_WEEK_COUNT,
  RACE_DATE,
  RACE_TIME,
  STRENGTH_SCHEDULE,
  diffDays,
} from '@/lib/workout-history/plan';
import type { ItemProgress, WeekProgress } from '@/lib/workout-history/planProgress';
import ChartFigure, { AXIS_TICK, CHART_SURFACE, GRID_STROKE, TOOLTIP_STYLE } from './ChartFigure';
import { PlanItemCard, RescheduleDialog, formatKm } from './PlanItemCard';
import { Badge, ICONS, Icon, cardClass } from './ui';
import type { PlanTracker } from './usePlanTracker';

const MIDWEEK_COLOR = '#3987e5';
const SUNDAY_COLOR = '#9085e9';

function WeekPhaseBadge({ week }: { week: WeekProgress }) {
  if (week.phase === 'current') return <Badge tone="amber">En curso</Badge>;
  if (week.phase === 'upcoming') return <Badge tone="neutral">Próxima</Badge>;
  return week.missed === 0 ? (
    <Badge tone="strength" title="Todas las sesiones obligatorias constan como hechas">
      Completada
    </Badge>
  ) : (
    <Badge tone="orange" title="La semana terminó con sesiones obligatorias sin constar como hechas">
      Terminada · incompleta
    </Badge>
  );
}

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PlanPanel({ tracker }: { tracker: PlanTracker }) {
  const { progress, today } = tracker;
  const initialWeek = progress.currentWeek ?? (today < PLAN_START ? 1 : PLAN_WEEK_COUNT);
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([initialWeek]));
  const [target, setTarget] = useState<ItemProgress | null>(null);

  const daysToStart = diffDays(today, PLAN_START);
  const daysToRace = diffDays(today, RACE_DATE);
  const allOpen = open.size === PLAN_WEEK_COUNT;
  const totalPlannedKm = PLAN_WEEKS.reduce((acc, w) => acc + w.plannedRunKm, 0);
  const requiredTotal = progress.weeks.reduce((acc, w) => acc + w.requiredTotal, 0);
  const requiredDone = progress.weeks.reduce((acc, w) => acc + w.requiredDone, 0);

  const toggle = (number: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });

  const chartData = PLAN_WEEKS.map((w) => ({
    label: `S${w.number}`,
    fullLabel: `Semana ${w.number} · ${w.rangeLabel}${w.deload ? ' · descarga' : w.race ? ' · carrera' : ''}`,
    midweek: w.plannedMidweekKm,
    sunday: w.plannedSundayKm,
    total: w.plannedRunKm,
  }));

  return (
    <div className="space-y-5">
      <section className={`${cardClass} p-4 sm:p-5 space-y-4`} aria-labelledby="plan-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] text-emerald-400 uppercase tracking-wider">Bloque activo · 14 semanas</p>
            <h2 id="plan-title" className="text-lg text-zinc-100">
              {PLAN_NAME}
            </h2>
            <p className="text-sm text-zinc-400">
              Del lunes 16 nov 2026 al domingo 21 feb 2027. Tres carreras por semana (martes, jueves y domingo, con la tirada
              larga el domingo) y fuerza ajustada alrededor.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <p className="flex items-center gap-1.5 text-zinc-100">
              <Icon path={ICONS.flag} className="w-4 h-4 text-emerald-400" /> Dom 21 feb 2027 · {RACE_TIME}
            </p>
            <p className="text-xs text-zinc-400">
              {daysToRace > 0
                ? `Faltan ${daysToRace} días para la carrera`
                : daysToRace === 0
                  ? 'La carrera es hoy'
                  : 'La carrera ya se ha celebrado'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Momento del plan</p>
            <p className="mt-1 text-base text-zinc-100">
              {progress.currentWeek !== null
                ? `Semana ${progress.currentWeek} de ${PLAN_WEEK_COUNT}`
                : daysToStart > 0
                  ? `Empieza en ${daysToStart} ${daysToStart === 1 ? 'día' : 'días'}`
                  : 'Plan terminado'}
            </p>
            <p className="text-xs text-zinc-400">
              {daysToStart > 0 ? `Primera sesión: ${formatDateShort(PLAN_START)}` : `Hoy: ${formatDateShort(today)}`}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 space-y-1.5">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Sesiones obligatorias hechas</p>
            <p className="text-base text-zinc-100 font-mono">
              {requiredDone} <span className="text-zinc-500">/ {requiredTotal}</span>
            </p>
            <ProgressBar done={requiredDone} total={requiredTotal} label="Sesiones obligatorias hechas en todo el plan" />
            <p className="text-xs text-zinc-500">Según el historial y tus marcas; nada se da por hecho.</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Volumen previsto</p>
            <p className="mt-1 text-base text-zinc-100 font-mono">{formatKm(totalPlannedKm)}</p>
            <p className="text-xs text-zinc-400">42 salidas, incluida la media maratón (21,1 km). Tirada más larga: 15 km.</p>
          </div>
        </div>
      </section>

      {tracker.error && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <span>{tracker.error}</span>
          <button type="button" onClick={tracker.clearError} className="p-1 text-red-200/80 hover:text-red-100" aria-label="Cerrar aviso">
            <Icon path={ICONS.close} className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="plan-goal-title">
          <h3 id="plan-goal-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Objetivo y decisión de marca
          </h3>
          <p className="text-sm text-zinc-300">
            La prioridad es <span className="text-zinc-100">llegar sano y acabar cómodo</span>. El tiempo es secundario y depende
            de cómo responda la base.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <Badge tone="sky">Provisional</Badge>
              <span className="text-zinc-300">
                <span className="font-mono text-zinc-100">2:15 h</span> como referencia orientativa.
              </span>
            </li>
            <li className="flex gap-2">
              <Badge tone="amber">Aspiracional</Badge>
              <span className="text-zinc-300">
                <span className="font-mono text-zinc-100">2:00 h</span>; no se promete con la base actual.
              </span>
            </li>
          </ul>
          <p className="text-xs text-zinc-400">
            La decisión se revisa en enero, tras una evaluación controlada. Hasta entonces no se persigue ningún ritmo: este plan
            no fija ritmos objetivo y todo se corre por esfuerzo.
          </p>
        </section>

        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="plan-effort-title">
          <h3 id="plan-effort-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Cómo se mide el esfuerzo
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-zinc-100">Fácil · RPE 3–4/10</dt>
              <dd className="text-zinc-400">
                Rodajes y tiradas a esfuerzo conversacional. Caminar en cuestas o hacer pausas breves está permitido.
              </dd>
            </div>
            <div>
              <dt className="text-zinc-100">Controlado · RPE 6/10</dt>
              <dd className="text-zinc-400">
                Solo en los tramos indicados (el primero aparece en la semana 6). Nunca sprint. Las cuatro primeras semanas son
                todas fáciles, sin intervalos rápidos.
              </dd>
            </div>
          </dl>
          <p className="text-xs text-zinc-500">RPE: esfuerzo percibido de 1 (muy suave) a 10 (máximo).</p>
        </section>
      </div>

      <ChartFigure
        title="Progresión de kilómetros previstos"
        description="Km de carrera previstos por semana: entre semana (martes + jueves) y domingo."
        summary={`Gráfico de barras apiladas con los kilómetros previstos en cada una de las 14 semanas, de ${formatNumber(
          PLAN_WEEKS[0].plannedRunKm,
          1
        )} km en la semana 1 a un máximo de entrenamiento de 24,5 km en las semanas 11 y 12, con descargas en las semanas 5, 9 y 13.`}
        legend={[
          { label: 'Martes + jueves', color: MIDWEEK_COLOR },
          { label: 'Domingo (tirada larga o carrera)', color: SUNDAY_COLOR },
        ]}
        height="h-52"
        footnote="Semanas 5, 9 y 13: descarga. Semana 14: la barra del domingo es la carrera (21,1 km)."
        table={{
          headers: ['Semana', 'Martes + jueves', 'Domingo', 'Total'],
          rows: chartData.map((d) => [d.fullLabel, formatNumber(d.midweek, 1), formatNumber(d.sunday, 1), formatNumber(d.total, 1)]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(label, payload) => (payload[0]?.payload as { fullLabel?: string } | undefined)?.fullLabel ?? String(label)}
              formatter={(value, name) => [typeof value === 'number' ? `${formatNumber(value, 1)} km` : '—', name]}
            />
            <Bar dataKey="midweek" name="Martes + jueves" stackId="km" fill={MIDWEEK_COLOR} stroke={CHART_SURFACE} strokeWidth={1} maxBarSize={28} />
            <Bar dataKey="sunday" name="Domingo" stackId="km" fill={SUNDAY_COLOR} stroke={CHART_SURFACE} strokeWidth={1} maxBarSize={28} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFigure>

      <section className="space-y-3" aria-labelledby="plan-weeks-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="plan-weeks-title" className="text-sm text-zinc-300 uppercase tracking-wider">
            Semana a semana
          </h3>
          <button
            type="button"
            className="text-xs text-emerald-400 hover:text-emerald-300"
            onClick={() => setOpen(allOpen ? new Set() : new Set(PLAN_WEEKS.map((w) => w.number)))}
          >
            {allOpen ? 'Contraer todas' : 'Desplegar todas'}
          </button>
        </div>

        <ol className="space-y-2">
          {progress.weeks.map((wp) => {
            const { week } = wp;
            const expanded = open.has(week.number);
            return (
              <li key={week.number} className={`${cardClass} ${wp.phase === 'current' ? 'border-amber-500/30' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggle(week.number)}
                  aria-expanded={expanded}
                  aria-controls={`plan-week-${week.number}`}
                  className="w-full text-left px-3 py-3 sm:px-4 flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-center font-mono text-sm text-zinc-200">
                    {week.number}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm text-zinc-100">{week.rangeLabel}</span>
                      <WeekPhaseBadge week={wp} />
                      {week.deload && <Badge tone="sky">Descarga</Badge>}
                      {week.race && <Badge tone="cardio">Carrera</Badge>}
                    </span>
                    <span className="block text-xs text-zinc-400">
                      <span className="font-mono text-zinc-300">{formatKm(week.plannedRunKm)}</span> ·{' '}
                      {week.items
                        .filter((i) => i.kind === 'run')
                        .map((i) => formatNumber(i.distanceKm ?? 0, 1))
                        .join(' + ')}{' '}
                      km
                      {wp.phase !== 'upcoming' && ` · ${wp.requiredDone} de ${wp.requiredTotal} obligatorias hechas`}
                    </span>
                  </span>
                  <Icon path={ICONS.chevron} className={`w-4 h-4 shrink-0 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div id={`plan-week-${week.number}`} className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2">
                    {wp.items.map((p) => (
                      <PlanItemCard key={p.item.id} progress={p} tracker={tracker} onReschedule={setTarget} />
                    ))}
                    <p className="text-xs text-zinc-500 px-1">Sábado: descanso o movilidad, sin carga antes del domingo.</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="plan-strength-title">
          <h3 id="plan-strength-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Fuerza semanal acordada
          </h3>
          <ul className="divide-y divide-zinc-800/70">
            {STRENGTH_SCHEDULE.map((slot) => (
              <li key={slot.day} className="py-2 first:pt-0 last:pb-0 flex gap-3 text-sm">
                <span className="w-20 shrink-0 text-zinc-400">{slot.day}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 text-zinc-100">
                    {slot.title}
                    {slot.optional && <Badge tone="neutral">Opcional</Badge>}
                  </span>
                  <span className="block text-xs text-zinc-400">{slot.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">Martes, jueves y domingo se reservan para correr. Ninguna sesión de fuerza pasa de una hora.</p>
        </section>

        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="plan-guardrails-title">
          <h3 id="plan-guardrails-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Reglas de ajuste: rodilla y carga
          </h3>
          <ul className="space-y-2.5 text-sm">
            {GUARDRAILS.map((g) => (
              <li key={g.title}>
                <p className="text-zinc-100">{g.title}</p>
                <p className="text-xs text-zinc-400">{g.text}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            Son pautas de entrenamiento, no una valoración médica. Ante dolor que persiste, consulta con un profesional sanitario.
          </p>
        </section>
      </div>

      <p className="flex gap-2 text-xs text-zinc-500">
        <Icon path={ICONS.lock} className="w-4 h-4 shrink-0 text-zinc-500" />
        <span>
          Las sesiones marcadas a mano y las reprogramaciones se guardan solo en este navegador y no modifican el historial. La
          copia y la restauración de esas marcas están en la pestaña Calendario.
        </span>
      </p>

      <RescheduleDialog target={target} tracker={tracker} onClose={() => setTarget(null)} />
    </div>
  );
}
