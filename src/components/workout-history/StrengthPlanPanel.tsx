'use client';

import { PLAN_START, PLAN_WEEK_COUNT, WEEKDAY_NAMES } from '@/lib/workout-history/plan';
import {
  DOUBLE_DAY_GAP_HOURS,
  REST_DAY,
  STRENGTH_PHASE_TABLE,
  STRENGTH_PRINCIPLES,
  STRENGTH_PROGRESSION,
  STRENGTH_SESSIONS,
  WEEKLY_STRENGTH_SETS,
  plannedWeeklyVolume,
  sessionLowerBodySets,
  sessionSets,
  strengthPhaseOf,
  type StrengthSession,
} from '@/lib/workout-history/strengthPlan';
import { Badge, ICONS, Icon, cardClass } from './ui';
import type { PlanTracker } from './usePlanTracker';

const RUN_BY_WEEKDAY: Record<number, string> = { 1: 'Rodaje', 3: 'Rodaje', 6: 'Tirada larga' };

function SessionCard({ session }: { session: StrengthSession }) {
  const total = sessionSets(session);
  const lower = sessionLowerBodySets(session);
  const headingId = `strength-session-${session.id}`;
  return (
    <section className={`${cardClass} p-4 space-y-3 min-w-0`} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span
            aria-hidden="true"
            className="w-9 h-9 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-sm text-emerald-300"
          >
            {session.code}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">
              {session.day} · Fuerza {session.code}
            </p>
            <h3 id={headingId} className="text-base text-zinc-100">
              {session.name}
            </h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone="strength">{session.duration}</Badge>
          <Badge tone="neutral">{total} series</Badge>
          {session.runDay && <Badge tone="cardio">Día de carrera</Badge>}
          {lower > 0 && !session.runDay && <Badge tone="amber">Pierna: {lower} series</Badge>}
        </div>
      </div>
      <p className="text-sm text-zinc-300">{session.focus}</p>
      <p className={`flex gap-2 text-xs ${session.runDay ? 'text-blue-200/90' : 'text-zinc-400'}`}>
        <Icon path={ICONS.info} className="w-4 h-4 shrink-0" />
        <span>{session.placement}</span>
      </p>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">
            Ejercicios de la sesión {session.code}, {session.name}
          </caption>
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase tracking-wider text-left">
              <th scope="col" className="font-medium pb-1.5 pr-2">
                Ejercicio
              </th>
              <th scope="col" className="font-medium pb-1.5 px-2 whitespace-nowrap">
                Series × reps
              </th>
              <th scope="col" className="font-medium pb-1.5 px-2">
                Descanso
              </th>
              <th scope="col" className="font-medium pb-1.5 pl-2 text-right">
                RIR
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {session.exercises.map((e) => (
              <tr key={e.name} className="align-top">
                <th scope="row" className="py-2 pr-2 text-left font-normal min-w-[9.5rem]">
                  <span className="text-zinc-100">{e.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {e.target}
                    {e.alternative && <> · alternativa: {e.alternative}</>}
                  </span>
                  {e.note && <span className="block text-xs text-zinc-400">{e.note}</span>}
                </th>
                <td className="py-2 px-2 font-mono text-zinc-200 whitespace-nowrap">
                  {e.sets} × {e.reps}
                </td>
                <td className="py-2 px-2 text-xs text-zinc-400 whitespace-nowrap">{e.rest}</td>
                <td className="py-2 pl-2 text-right font-mono text-zinc-200 whitespace-nowrap">{e.rir}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function StrengthPlanPanel({ tracker }: { tracker: PlanTracker }) {
  const currentWeek = tracker.progress.currentWeek;
  const phase = currentWeek !== null ? strengthPhaseOf(currentWeek) : null;
  const volume = plannedWeeklyVolume();
  const maxVolume = Math.max(...volume.map((v) => v.sets));

  return (
    <div className="space-y-5">
      <section className={`${cardClass} p-4 sm:p-5 space-y-4`} aria-labelledby="strength-plan-title">
        <div className="space-y-1 max-w-3xl">
          <p className="text-[11px] text-emerald-400 uppercase tracking-wider">Fuerza · 5 sesiones por semana</p>
          <h2 id="strength-plan-title" className="text-lg text-zinc-100">
            Plan de fuerza para la media maratón
          </h2>
          <p className="text-sm text-zinc-400">
            Cinco sesiones distintas de lunes a viernes alrededor de las tres carreras, que no cambian. Sesiones cortas, en
            máquinas siempre que se pueda, con recorrido controlado, sin dolor y sin llegar nunca al fallo.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Semana tipo</p>
            <p className="mt-1 text-base text-zinc-100">5 de fuerza + 3 carreras</p>
            <p className="text-xs text-zinc-400">8 entrenamientos en 6 días; sábado, descanso completo.</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Volumen previsto</p>
            <p className="mt-1 text-base text-zinc-100 font-mono">{WEEKLY_STRENGTH_SETS} series/semana</p>
            <p className="text-xs text-zinc-400">Dosis moderada de partida, con RIR 3. Es lo previsto, no lo registrado.</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Fase actual</p>
            <p className="mt-1 text-base text-zinc-100">
              {phase && currentWeek !== null
                ? `${phase.label} · semana ${currentWeek} de ${PLAN_WEEK_COUNT}`
                : tracker.today < PLAN_START
                  ? 'Empieza el lunes 16 nov 2026'
                  : 'Plan terminado'}
            </p>
            <p className="text-xs text-zinc-400">
              {phase
                ? phase.dose
                : tracker.today < PLAN_START
                  ? 'Las cuatro primeras semanas son de fase Base: series tal como figuran y RIR 3.'
                  : 'El bloque de 14 semanas terminó con la media maratón del 21 feb 2027.'}
            </p>
          </div>
        </div>
      </section>

      <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="strength-week-title">
        <h3 id="strength-week-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
          Reparto semanal
        </h3>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {WEEKDAY_NAMES.map((day, i) => {
            const session = STRENGTH_SESSIONS.find((s) => s.weekday === i);
            const run = RUN_BY_WEEKDAY[i];
            const rest = i === 5;
            return (
              <li
                key={day}
                className={`rounded-lg border p-2.5 space-y-1.5 ${rest ? 'border-dashed border-zinc-700 bg-transparent' : 'border-zinc-800 bg-zinc-950/40'}`}
              >
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider">{day}</p>
                {run && (
                  <p className="flex items-center gap-1.5 text-sm text-zinc-100">
                    <Badge tone="cardio">Carrera</Badge> {run}
                  </p>
                )}
                {session && (
                  <p className="text-sm text-zinc-100">
                    <Badge tone="strength">Fuerza {session.code}</Badge>
                    <span className="block mt-1 text-xs text-zinc-300">{session.name}</span>
                    <span className="block text-xs text-zinc-500">{session.duration}</span>
                  </p>
                )}
                {session?.runDay && <p className="text-[11px] text-blue-200/90">Separadas ≥ {DOUBLE_DAY_GAP_HOURS} h</p>}
                {rest && (
                  <p className="text-sm text-zinc-200">
                    {REST_DAY.title}
                    <span className="block text-xs text-zinc-500">Sin fuerza ni carrera</span>
                  </p>
                )}
                {i === 6 && <p className="text-xs text-zinc-500">Sin fuerza</p>}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-zinc-500">
          Las carreras de martes, jueves y domingo mantienen sus kilómetros y su esfuerzo: el plan de fuerza no añade carrera ni
          intensidad. Las cinco sesiones aparecen cada semana en las pestañas Plan y Calendario, donde se marcan como hechas.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {STRENGTH_SESSIONS.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
        <section className={`${cardClass} border-dashed p-4 space-y-2`} aria-labelledby="strength-rest-title">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider">{REST_DAY.day}</p>
          <h3 id="strength-rest-title" className="text-base text-zinc-100">
            {REST_DAY.title}
          </h3>
          <p className="text-sm text-zinc-300">{REST_DAY.detail}</p>
          <p className="text-xs text-zinc-500">No es una sesión del plan: no se marca ni cuenta en el cumplimiento.</p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="strength-progression-title">
          <h3 id="strength-progression-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Cómo progresar
          </h3>
          <ul className="space-y-2.5 text-sm">
            {STRENGTH_PROGRESSION.map((p) => (
              <li key={p.title}>
                <p className="text-zinc-100">{p.title}</p>
                <p className="text-xs text-zinc-400">{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="strength-phases-title">
          <h3 id="strength-phases-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Dosis por fase del plan
          </h3>
          <ul className="divide-y divide-zinc-800/70">
            {STRENGTH_PHASE_TABLE.map(({ weeks, phase: p }) => (
              <li key={weeks} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-100">
                  {weeks}
                  <Badge tone={p.kind === 'deload' || p.kind === 'race' ? 'sky' : phase?.kind === p.kind ? 'amber' : 'neutral'}>
                    {p.label}
                  </Badge>
                  {phase?.kind === p.kind && <span className="text-[11px] text-amber-300">Fase actual</span>}
                </p>
                <p className="text-xs text-zinc-400">{p.dose}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="strength-rules-title">
          <h3 id="strength-rules-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Reglas de seguridad
          </h3>
          <ul className="space-y-2.5 text-sm">
            {STRENGTH_PRINCIPLES.map((p) => (
              <li key={p.title}>
                <p className="text-zinc-100">{p.title}</p>
                <p className="text-xs text-zinc-400">{p.text}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            Son pautas de entrenamiento, no una valoración médica. Ante dolor que persiste, consulta con un profesional sanitario.
          </p>
        </section>

        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="strength-volume-title">
          <h3 id="strength-volume-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Series previstas por grupo principal
          </h3>
          <ul className="space-y-1.5">
            {volume.map((v) => (
              <li key={v.target} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
                <span className="text-zinc-300">{v.target}</span>
                <span className="h-1.5 rounded-full bg-zinc-800 overflow-hidden" aria-hidden="true">
                  <span className="block h-full rounded-full bg-emerald-500/80" style={{ width: `${(v.sets / maxVolume) * 100}%` }} />
                </span>
                <span className="font-mono text-zinc-200 text-right">{v.sets}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            Series semanales del plan en una semana normal, contando solo el grupo principal de cada ejercicio. Es lo previsto: lo
            que de verdad consta como hecho se ve en la pestaña Músculos. La pierna lleva pocas series a propósito, porque ya
            recibe la carga de las tres carreras.
          </p>
        </section>
      </div>
    </div>
  );
}
