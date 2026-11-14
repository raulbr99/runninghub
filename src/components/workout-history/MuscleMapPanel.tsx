'use client';

import { useMemo, useState } from 'react';
import { formatDateShort, formatNumber, todayLocal } from '@/lib/workout-history/format';
import {
  COVERAGE_STATUS_LABELS,
  MIN_SESSIONS_FOR_RANKING,
  MIN_SETS_FOR_RANKING,
  MUSCLE_SHORT_LABELS,
  PERIOD_WEEKS,
  SECONDARY_WEIGHT,
  computeMuscleCoverage,
  rankedMuscles,
  type CoverageStatus,
  type MuscleCoverage,
  type MuscleId,
  type PeriodWeeks,
} from '@/lib/workout-history/muscleMap';
import { formatRange } from '@/lib/workout-history/plan';
import type { WorkoutSession } from '@/lib/workout-history/types';
import BodyFigure, { LEVEL_COLORS } from './BodyFigure';
import { Badge, ICONS, Icon, StatCard, Unknown, cardClass } from './ui';

const STATUS_TONE: Record<CoverageStatus, 'strength' | 'neutral' | 'amber' | 'sky'> = {
  most: 'strength',
  recorded: 'neutral',
  least: 'amber',
  none: 'neutral',
  insufficient: 'sky',
};

function sets(value: number): string {
  return `${formatNumber(value, 1)} ${value === 1 ? 'serie' : 'series'}`;
}

function StatusBadge({ status }: { status: CoverageStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{COVERAGE_STATUS_LABELS[status]}</Badge>;
}

export default function MuscleMapPanel({ sessions }: { sessions: WorkoutSession[] }) {
  const [today] = useState(todayLocal);
  const [weeks, setWeeks] = useState<PeriodWeeks>(4);
  const [picked, setPicked] = useState<MuscleId | null>(null);

  const report = useMemo(() => computeMuscleCoverage(sessions, today, weeks), [sessions, today, weeks]);
  const ranked = useMemo(() => rankedMuscles(report), [report]);
  const levels = useMemo(
    () => Object.fromEntries(report.muscles.map((m) => [m.id, m.level])) as Record<MuscleId, number>,
    [report]
  );
  // Sin elección propia se muestra el grupo con más series, si lo hay.
  const selectedId = picked ?? (ranked[0] && ranked[0].weighted > 0 ? ranked[0].id : null);
  const selected = selectedId ? report.byId[selectedId] : null;
  const hasData = report.attributedSets > 0;
  const withRecords = ranked.filter((m) => m.weighted > 0).length;

  return (
    <div className="space-y-5">
      <section className={`${cardClass} p-4 sm:p-5 space-y-4`} aria-labelledby="muscles-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <p className="text-[11px] text-emerald-400 uppercase tracking-wider">Cobertura de entrenamiento</p>
            <h2 id="muscles-title" className="text-lg text-zinc-100">
              Mapa de músculos
            </h2>
            <p className="text-sm text-zinc-400">
              Qué grupos musculares acumulan más y menos series de fuerza en tu registro. Refleja lo que consta como entrenado,
              no el desarrollo ni el estado real de ningún músculo.
            </p>
          </div>
          <div>
            <span id="muscles-period-label" className="block text-[11px] text-zinc-400 mb-1 uppercase tracking-wider">
              Periodo
            </span>
            <div
              role="radiogroup"
              aria-labelledby="muscles-period-label"
              className="grid grid-cols-3 gap-0.5 p-0.5 rounded-lg bg-zinc-800/50 border border-zinc-700/60"
            >
              {PERIOD_WEEKS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={weeks === value}
                  onClick={() => setWeeks(value)}
                  className={`min-h-9 px-3 rounded-md text-xs whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    weeks === value ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {value} sem
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Últimas {weeks} semanas: {formatDateShort(report.from)} – {formatDateShort(report.to)}. Solo cuentan las series anotadas
          en sesiones de fuerza; ni las carreras, ni el plan, ni las series previstas suman aquí.
          {report.firstRecordDate !== null && report.firstRecordDate > report.from && (
            <>
              {' '}
              Tu registro de fuerza con series empieza el {formatDateShort(report.firstRecordDate)}: las semanas anteriores
              cuentan como cero y bajan la media semanal.
            </>
          )}
        </p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Sesiones de fuerza"
          value={formatNumber(report.sessions)}
          detail={<p>con series anotadas en el periodo</p>}
        />
        <StatCard
          label="Series registradas"
          value={formatNumber(report.totalSets)}
          detail={
            <p>
              {report.unattributedSets > 0
                ? `${formatNumber(report.attributedSets)} asignadas a un grupo`
                : 'todas asignadas a un grupo'}
            </p>
          }
        />
        <StatCard
          label="Semanas con registro"
          value={`${report.weeksWithRecords}/${report.weeks}`}
          detail={<p>las medias semanales se calculan sobre las {report.weeks}</p>}
        />
        <StatCard
          label="Grupos con series"
          value={`${withRecords}/${report.muscles.length}`}
          detail={<p>grupos del mapa con alguna serie</p>}
        />
      </div>

      {!report.rankable && (
        <div className="flex gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-zinc-300" role="status">
          <Icon path={ICONS.info} className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
          <p>
            <span className="text-zinc-100">Datos insuficientes para comparar grupos.</span>{' '}
            {hasData
              ? `En este periodo constan ${formatNumber(report.sessions)} ${
                  report.sessions === 1 ? 'sesión' : 'sesiones'
                } de fuerza y ${formatNumber(report.attributedSets)} series asignadas. El mapa muestra lo registrado, pero no señala grupos con más o menos volumen hasta que haya al menos ${MIN_SESSIONS_FOR_RANKING} sesiones y ${MIN_SETS_FOR_RANKING} series.`
              : 'No hay series de fuerza registradas en este periodo. Prueba con un periodo más largo o registra tus próximas sesiones con sus series; el mapa se rellena solo.'}
            {report.firstRecordDate && !hasData && <> Tu primer registro de fuerza con series es del {formatDateShort(report.firstRecordDate)}.</>}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className={`${cardClass} p-4 space-y-4 min-w-0 self-start lg:sticky lg:top-4`} aria-labelledby="muscles-figure-title">
          <h3 id="muscles-figure-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Series registradas por grupo
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 justify-items-center">
            <BodyFigure view="front" levels={levels} selected={selectedId} onSelect={setPicked} />
            <BodyFigure view="back" levels={levels} selected={selectedId} onSelect={setPicked} />
          </div>
          <p className="sr-only">
            Figura del cuerpo coloreada según las series registradas. La lista de grupos musculares ofrece los mismos datos y
            permite seleccionar cada grupo.
          </p>
          <div className="space-y-1.5" aria-hidden="true">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>Menos series</span>
              <span className="flex flex-1 max-w-[180px] h-2.5 rounded-sm overflow-hidden">
                {LEVEL_COLORS.slice(1).map((color) => (
                  <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span>Más series</span>
            </div>
            <p className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="inline-block w-4 h-2.5 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[0] }} />
              Sin series registradas en el periodo
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            El color es relativo al grupo con más series del periodo, no a un valor ideal. Toca un grupo en la figura o en la
            lista para ver el detalle. La parte delantera de la pierna por debajo de la rodilla no tiene grupo asociado.
          </p>
        </section>

        <div className="space-y-4 min-w-0">
          <MuscleDetail muscle={selected} weeks={report.weeks} weekRanges={report.weekRanges} />

          <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="muscles-list-title">
            <h3 id="muscles-list-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
              Grupos musculares
            </h3>
            <ul className="space-y-1">
              {ranked.map((m) => {
                const active = m.id === selectedId;
                const pct = report.maxWeighted > 0 ? (m.weighted / report.maxWeighted) * 100 : 0;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPicked(m.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 min-h-11 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                        active ? 'border-emerald-500/40 bg-emerald-500/[0.06]' : 'border-transparent hover:bg-zinc-800/50'
                      }`}
                    >
                      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="flex items-center gap-2 text-sm text-zinc-100">
                          <span
                            aria-hidden="true"
                            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: LEVEL_COLORS[m.level] }}
                          />
                          {MUSCLE_SHORT_LABELS[m.id]}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {m.weighted > 0 ? (
                            <>
                              <span className="font-mono text-zinc-200">{formatNumber(m.weeklyWeighted, 1)}</span> series/sem
                            </>
                          ) : (
                            <span className="italic text-zinc-500">
                              {m.status === 'insufficient' ? 'Datos insuficientes' : 'Sin series registradas'}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden" aria-hidden="true">
                          <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: LEVEL_COLORS[m.level] }} />
                        </span>
                        {(m.status === 'most' || m.status === 'least') && (
                          <span className={`text-[10px] uppercase tracking-wide ${m.status === 'most' ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {COVERAGE_STATUS_LABELS[m.status]}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="muscles-method-title">
        <h3 id="muscles-method-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
          Cómo se calcula y qué no dice
        </h3>
        <ul className="space-y-1.5 text-sm text-zinc-300 list-disc pl-5">
          <li>
            Cada serie anotada cuenta una vez para el <span className="text-zinc-100">grupo principal</span> del ejercicio (el
            primero de su etiqueta de grupo muscular) y {formatNumber(SECONDARY_WEIGHT, 1)} para cada grupo secundario. Así un
            press de banca no cuenta como serie completa de pecho, de tríceps y de hombro a la vez.
          </li>
          <li>
            Las series por semana son el total del periodo dividido entre sus {report.weeks} semanas, incluidas las semanas sin
            ningún registro.
          </li>
          <li>
            «Más trabajado en el registro» y «Menor volumen registrado» comparan tus grupos entre sí dentro del periodo. No son
            una valoración de tus músculos, de tu físico ni de si el volumen es suficiente.
          </li>
          <li>
            Una serie cuenta igual sea cual sea su carga, sus repeticiones o su esfuerzo: aquí no se usan pesos ni se estima
            intensidad.
          </li>
          <li>
            Correr también trabaja las piernas, pero las carreras no se convierten en series: los grupos de la pierna pueden
            aparecer con poco volumen aunque estén recibiendo carga corriendo.
          </li>
          <li>Las etiquetas genéricas («pierna», «torso», «brazo»…) no señalan un músculo concreto y se dejan sin asignar.</li>
        </ul>

        {(report.unattributedSets > 0 || report.inferredSets > 0 || report.partiallyAmbiguousSets > 0) && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2 text-xs text-zinc-300">
            <p className="flex items-center gap-1.5 text-amber-200">
              <Icon path={ICONS.info} className="w-4 h-4" /> Asignación incompleta en este periodo
            </p>
            {report.unattributedSets > 0 && (
              <div className="space-y-1">
                <p>
                  {sets(report.unattributedSets)} sin grupo principal reconocible: no colorean el mapa. Edita el grupo muscular
                  del ejercicio en el historial para que cuenten.
                </p>
                <ul className="list-disc pl-4 text-zinc-400">
                  {report.unattributed.slice(0, 6).map((u) => (
                    <li key={`${u.name}|${u.label ?? ''}`}>
                      {u.name} · {u.label ? `etiqueta «${u.label}»` : 'sin grupo muscular'} · {sets(u.sets)}
                    </li>
                  ))}
                  {report.unattributed.length > 6 && <li>y {report.unattributed.length - 6} ejercicios más</li>}
                </ul>
              </div>
            )}
            {report.inferredSets > 0 && (
              <p>
                {sets(report.inferredSets)} no tenían grupo muscular y se han asignado por el nombre del ejercicio, solo cuando
                es inequívoco. En el detalle de cada grupo aparecen marcadas como «por nombre».
              </p>
            )}
            {report.partiallyAmbiguousSets > 0 && (
              <p>
                {sets(report.partiallyAmbiguousSets)} tienen en su etiqueta algún término genérico que se ha ignorado; cuentan
                solo para los grupos reconocidos.
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-zinc-500">
          Es una lectura del registro para decidir qué entrenar, no una medición corporal ni un consejo médico.
        </p>
      </section>
    </div>
  );
}

interface MuscleDetailProps {
  muscle: MuscleCoverage | null;
  weeks: number;
  weekRanges: Array<{ start: string; end: string }>;
}

function MuscleDetail({ muscle, weeks, weekRanges }: MuscleDetailProps) {
  if (!muscle) {
    return (
      <section className={`${cardClass} p-4 space-y-2`} aria-labelledby="muscles-detail-title">
        <h3 id="muscles-detail-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
          Detalle del grupo
        </h3>
        <p className="text-sm text-zinc-400">Selecciona un grupo en la figura o en la lista para ver sus series registradas.</p>
      </section>
    );
  }

  const weeklyMax = Math.max(1, ...muscle.weekly);
  const empty = muscle.weighted === 0;

  return (
    <section className={`${cardClass} p-4 space-y-4`} aria-labelledby="muscles-detail-title" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Detalle del grupo</p>
          <h3 id="muscles-detail-title" className="text-base text-zinc-100">
            {muscle.label}
          </h3>
        </div>
        <StatusBadge status={muscle.status} />
      </div>

      {empty ? (
        <p className="text-sm text-zinc-400">
          {muscle.status === 'insufficient'
            ? 'No consta ninguna serie de este grupo en el periodo y el registro es demasiado corto para sacar conclusiones.'
            : 'No consta ninguna serie de este grupo en el periodo. Puede que no se haya entrenado o que no se haya anotado.'}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Series/semana</dt>
              <dd className="font-mono text-lg text-zinc-100">{formatNumber(muscle.weeklyWeighted, 1)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Como principal</dt>
              <dd className="font-mono text-lg text-zinc-100">{formatNumber(muscle.direct)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Como secundario</dt>
              <dd className="font-mono text-lg text-zinc-100">{formatNumber(muscle.indirect)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Sesiones</dt>
              <dd className="font-mono text-lg text-zinc-100">{formatNumber(muscle.sessions)}</dd>
            </div>
          </dl>
          <p className="text-xs text-zinc-400">
            {formatNumber(muscle.weighted, 1)} series ponderadas en {weeks} semanas ({formatNumber(muscle.direct)} como grupo
            principal + {formatNumber(muscle.indirect)} como secundario × {formatNumber(SECONDARY_WEIGHT, 1)}).{' '}
            {muscle.lastDate ? <>Última serie registrada: {formatDateShort(muscle.lastDate)}.</> : <Unknown />}
          </p>

          <div className="space-y-1.5">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Series ponderadas por semana</p>
            <ol className="flex items-end gap-1 h-16" aria-label="Series ponderadas por semana, de la más antigua a la más reciente">
              {muscle.weekly.map((value, i) => {
                const range = formatRange(weekRanges[i].start, weekRanges[i].end);
                return (
                  <li key={weekRanges[i].start} className="flex-1 h-full flex flex-col justify-end" title={`${range}: ${sets(value)}`}>
                    <span
                      aria-hidden="true"
                      className={`block w-full rounded-t-sm ${value > 0 ? 'bg-emerald-500/80' : 'bg-zinc-800'}`}
                      style={{ height: value > 0 ? `${Math.max(8, (value / weeklyMax) * 100)}%` : '2px' }}
                    />
                    <span className="sr-only">
                      {range}: {sets(value)}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="flex justify-between text-[10px] text-zinc-500">
              <span>{formatRange(weekRanges[0].start, weekRanges[0].end)}</span>
              <span>{formatRange(weekRanges[weekRanges.length - 1].start, weekRanges[weekRanges.length - 1].end)}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Ejercicios que suman a este grupo</p>
            <ul className="divide-y divide-zinc-800/70 text-sm">
              {muscle.exercises.map((e) => (
                <li key={e.name} className="py-1.5 first:pt-0 last:pb-0 flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-zinc-200">
                    {e.name}
                    {e.inferredFromName && <span className="text-xs text-amber-300/90"> · por nombre</span>}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {e.direct > 0 && <>{sets(e.direct)} como principal</>}
                    {e.direct > 0 && e.indirect > 0 && ' · '}
                    {e.indirect > 0 && <>{sets(e.indirect)} como secundario</>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
