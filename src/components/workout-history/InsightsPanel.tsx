'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CARDIO_COLOR, STRENGTH_COLOR, type Period } from '@/lib/workout-history/analytics';
import { formatDate, formatDateShort, formatDuration, formatNumber, todayLocal } from '@/lib/workout-history/format';
import {
  WINDOW_OPTIONS,
  exerciseProgressRows,
  inRange,
  previousRange,
  runBuckets,
  runSummary,
  strengthBuckets,
  strengthSummary,
  windowRange,
  type ExerciseProgressRow,
  type InsightWindow,
  type RunBucket,
  type StrengthBucket,
} from '@/lib/workout-history/insights';
import type { WorkoutSession } from '@/lib/workout-history/types';
import ChartFigure, { AXIS_TICK, CHART_SURFACE, GRID_STROKE, TOOLTIP_STYLE } from './ChartFigure';
import { PeriodToggle } from './OverviewPanel';
import { Badge, StatCard, Unknown, cardClass } from './ui';

const EXERCISE_LIMIT = 10;

function fullLabel(payload: ReadonlyArray<{ payload?: unknown }>, fallback: unknown): string {
  return (payload[0]?.payload as { fullLabel?: string } | undefined)?.fullLabel ?? String(fallback);
}

function km(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 1);
}

function kg(value: number): string {
  return `${formatNumber(value, 2)} kg`;
}

function LoadChange({ row }: { row: ExerciseProgressRow }) {
  if (row.comparability === 'no-load') return <Unknown>Sin kg anotados</Unknown>;
  if (row.comparability === 'mixed-equipment') return <Unknown>No comparable: cambia el equipo</Unknown>;
  if (row.comparability === 'mixed-sides') return <Unknown>No comparable: mezcla series por lado</Unknown>;
  if (row.comparability === 'mixed-basis') return <Unknown>No comparable: cambia la forma de anotar la carga</Unknown>;
  if (!row.firstLoad || !row.lastLoad) return <Unknown>—</Unknown>;
  if (row.comparability === 'single') {
    return (
      <span className="text-zinc-300">
        <span className="font-mono">{kg(row.lastLoad.kg)}</span> <span className="text-zinc-500">· una sola sesión con kg</span>
      </span>
    );
  }
  const delta = row.deltaKg ?? 0;
  return (
    <span className="text-zinc-300">
      <span className="font-mono">
        {formatNumber(row.firstLoad.kg, 2)} → {kg(row.lastLoad.kg)}
      </span>{' '}
      <span className={delta > 0 ? 'text-emerald-300' : 'text-zinc-400'}>
        ({delta > 0 ? '+' : delta < 0 ? '−' : '±'}
        {formatNumber(Math.abs(delta), 2)} kg)
      </span>
    </span>
  );
}

export default function InsightsPanel({ sessions, period, onPeriodChange }: { sessions: WorkoutSession[]; period: Period; onPeriodChange: (p: Period) => void }) {
  const [today] = useState(todayLocal);
  const [windowId, setWindowId] = useState<InsightWindow>('12w');
  const [showAllExercises, setShowAllExercises] = useState(false);

  const data = useMemo(() => {
    const range = windowRange(windowId, today, sessions);
    if (!range) return null;
    const current = inRange(sessions, range);
    const prevRange = previousRange(windowId, range);
    return {
      range,
      run: runSummary(current),
      runPrev: prevRange ? runSummary(inRange(sessions, prevRange)) : null,
      strength: strengthSummary(current),
      strengthPrev: prevRange ? strengthSummary(inRange(sessions, prevRange)) : null,
      runSeries: runBuckets(current, range, period),
      strengthSeries: strengthBuckets(current, range, period),
      exercises: exerciseProgressRows(current, sessions, range.from),
    };
  }, [sessions, windowId, today, period]);

  const windowLong = WINDOW_OPTIONS.find((o) => o.id === windowId)?.long ?? '';
  const periodNoun = period === 'week' ? 'semana' : 'mes';
  const periodHeader = period === 'week' ? 'Semana' : 'Mes';

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div role="radiogroup" aria-label="Ventana de tiempo" className="inline-flex flex-wrap p-0.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
        {WINDOW_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={windowId === o.id}
            onClick={() => setWindowId(o.id)}
            className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              windowId === o.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <PeriodToggle period={period} onChange={onPeriodChange} />
    </div>
  );

  if (!data) return <div className="space-y-4">{controls}</div>;

  const { run, runPrev, strength, strengthPrev, runSeries, strengthSeries, exercises, range } = data;
  const truncated = runSeries.truncated
    ? `Se muestran ${period === 'week' ? 'las últimas 52 semanas' : 'los últimos 36 meses'} del periodo; las cifras de arriba cubren el periodo completo.`
    : null;
  const shownExercises = showAllExercises ? exercises : exercises.slice(0, EXERCISE_LIMIT);
  const runRows = runSeries.buckets.filter((b: RunBucket) => b.runs > 0);
  const strengthRows = strengthSeries.buckets.filter((b: StrengthBucket) => b.sessions > 0);

  return (
    <div className="space-y-6">
      {controls}
      <p className="text-xs text-zinc-400">
        Periodo analizado: {formatDate(range.from)} – {formatDate(range.to)} ({windowLong}, en semanas completas de lunes a
        domingo). Se aplican también los filtros de arriba.
      </p>

      <section className="space-y-3" aria-labelledby="insights-run-title">
        <h2 id="insights-run-title" className="text-sm text-zinc-300 uppercase tracking-wider">
          Carrera
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Km de carrera"
            value={run.km !== null ? formatNumber(run.km, 1) : <Unknown>—</Unknown>}
            unit={run.km !== null ? 'km' : undefined}
            detail={
              <>
                <p>
                  {run.runs === 0
                    ? 'Sin carreras registradas'
                    : run.runsWithDistance === run.runs
                      ? `En ${run.runs} ${run.runs === 1 ? 'carrera' : 'carreras'}`
                      : `Distancia en ${run.runsWithDistance} de ${run.runs} carreras`}
                </p>
                {runPrev && (
                  <p className="text-zinc-500">
                    Periodo anterior: {runPrev.km !== null ? `${formatNumber(runPrev.km, 1)} km en ${runPrev.runs}` : 'sin km registrados'}
                  </p>
                )}
              </>
            }
          />
          <StatCard
            label="Km por semana activa"
            value={run.kmPerActiveWeek !== null ? formatNumber(run.kmPerActiveWeek, 1) : <Unknown>—</Unknown>}
            unit={run.kmPerActiveWeek !== null ? 'km' : undefined}
            detail={
              <p>
                {run.activeWeeks > 0
                  ? `Media de las ${run.activeWeeks} ${run.activeWeeks === 1 ? 'semana' : 'semanas'} con alguna carrera`
                  : 'Ninguna semana con carreras'}
              </p>
            }
          />
          <StatCard
            label="Tirada más larga"
            value={run.longest ? formatNumber(run.longest.km, 1) : <Unknown>—</Unknown>}
            unit={run.longest ? 'km' : undefined}
            detail={
              <>
                {run.longest ? <p>{formatDateShort(run.longest.date)} · «{run.longest.title}»</p> : <p>Sin distancias registradas</p>}
                {runPrev?.longest && <p className="text-zinc-500">Periodo anterior: {formatNumber(runPrev.longest.km, 1)} km</p>}
              </>
            }
          />
          <StatCard
            label="Última carrera"
            value={run.last ? <span className="text-base">{formatDateShort(run.last.date)}</span> : <Unknown>—</Unknown>}
            detail={
              <>
                {run.last && <p>{run.last.km !== null ? `${formatNumber(run.last.km, 1)} km` : 'Distancia no registrada'}</p>}
                {run.durationMin !== null && (
                  <p className="text-zinc-500">
                    Tiempo corriendo: {formatDuration(run.durationMin)}
                    {run.runsWithDuration < run.runs && ` (en ${run.runsWithDuration} de ${run.runs})`}
                  </p>
                )}
              </>
            }
          />
        </div>

        {run.runs === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
            No hay carreras registradas en este periodo. Prueba una ventana más larga o revisa los filtros.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartFigure
              title={`Km de carrera por ${periodNoun}`}
              description="Suma de las carreras con distancia anotada."
              summary={`Gráfico de barras con los kilómetros de carrera registrados por ${periodNoun}. Total del periodo: ${km(run.km)} km en ${run.runs} carreras.`}
              footnote={
                <>
                  <p>Los periodos sin carreras, o sin distancia anotada, quedan vacíos: no se dibujan como 0 km.</p>
                  {truncated && <p>{truncated}</p>}
                </>
              }
              table={{
                headers: [periodHeader, 'Km', 'Carreras', 'Con distancia'],
                rows: runRows.map((b) => [b.fullLabel, b.km === null ? 'sin dato' : formatNumber(b.km, 1), b.runs, b.runsWithDistance]),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={runSeries.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    labelFormatter={(label, payload) => fullLabel(payload, label)}
                    formatter={(value, _name, item) => {
                      const row = item.payload as RunBucket | undefined;
                      const text = typeof value === 'number' ? `${formatNumber(value, 1)} km` : 'sin dato';
                      return [row ? `${text} · ${row.runs} ${row.runs === 1 ? 'carrera' : 'carreras'}` : text, 'Distancia'];
                    }}
                  />
                  <Bar dataKey="km" name="Distancia" fill={CARDIO_COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFigure>

            <ChartFigure
              title={`Tirada más larga por ${periodNoun}`}
              description="La carrera de mayor distancia registrada en cada periodo."
              summary={`Gráfico de líneas con la carrera más larga de cada ${periodNoun}. Máximo del periodo: ${run.longest ? formatNumber(run.longest.km, 1) : 'sin dato'} km.`}
              footnote="La línea se interrumpe en los periodos sin carreras con distancia."
              table={{
                headers: [periodHeader, 'Más larga (km)', 'Fecha'],
                rows: runRows
                  .filter((b) => b.longestKm !== null)
                  .map((b) => [b.fullLabel, km(b.longestKm), b.longestDate ? formatDateShort(b.longestDate) : '—']),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={runSeries.buckets} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} domain={[0, 'auto']} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    cursor={{ stroke: '#52525b', strokeWidth: 1 }}
                    labelFormatter={(label, payload) => fullLabel(payload, label)}
                    formatter={(value) => [typeof value === 'number' ? `${formatNumber(value, 1)} km` : 'sin dato', 'Más larga']}
                  />
                  <Line
                    type="linear"
                    dataKey="longestKm"
                    name="Más larga"
                    stroke={CARDIO_COLOR}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CARDIO_COLOR, stroke: CHART_SURFACE, strokeWidth: 2 }}
                    activeDot={{ r: 5, stroke: CHART_SURFACE, strokeWidth: 2 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFigure>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="insights-strength-title">
        <h2 id="insights-strength-title" className="text-sm text-zinc-300 uppercase tracking-wider">
          Fuerza
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Sesiones de fuerza"
            value={formatNumber(strength.sessions)}
            detail={
              <>
                <p>
                  {strength.activeWeeks > 0
                    ? `En ${strength.activeWeeks} ${strength.activeWeeks === 1 ? 'semana' : 'semanas'} distintas`
                    : 'Sin sesiones en el periodo'}
                </p>
                {strength.partialSessions > 0 && <p className="text-amber-300/90">{strength.partialSessions} parciales</p>}
                {strengthPrev && <p className="text-zinc-500">Periodo anterior: {strengthPrev.sessions}</p>}
              </>
            }
          />
          <StatCard
            label="Series efectivas"
            value={strength.effectiveSets !== null ? formatNumber(strength.effectiveSets) : <Unknown>—</Unknown>}
            detail={
              <>
                <p>
                  {strength.effectiveSets !== null
                    ? `Anotadas en ${strength.sessionsWithSets} de ${strength.sessions} sesiones`
                    : 'Ninguna sesión tiene series con repeticiones'}
                </p>
                {strength.setsWithoutReps > 0 && <p className="text-zinc-500">{strength.setsWithoutReps} series sin repeticiones, aparte</p>}
                {strengthPrev && strengthPrev.effectiveSets !== null && (
                  <p className="text-zinc-500">Periodo anterior: {formatNumber(strengthPrev.effectiveSets)}</p>
                )}
              </>
            }
          />
          <StatCard
            label="Series por sesión"
            value={strength.setsPerSession !== null ? formatNumber(strength.setsPerSession, 1) : <Unknown>—</Unknown>}
            detail={<p>Media de las sesiones que tienen series anotadas</p>}
          />
          <StatCard
            label="Última sesión"
            value={strength.last ? <span className="text-base">{formatDateShort(strength.last)}</span> : <Unknown>—</Unknown>}
            detail={<p>{exercises.length > 0 ? `${exercises.length} ejercicios distintos en el periodo` : 'Sin ejercicios anotados'}</p>}
          />
        </div>

        {strength.sessions === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
            No hay sesiones de fuerza registradas en este periodo.
          </div>
        ) : (
          <ChartFigure
            title={`Series efectivas por ${periodNoun}`}
            description="Series con repeticiones anotadas. Cuenta trabajo registrado, no carga."
            summary={`Gráfico de barras con las series efectivas de fuerza por ${periodNoun}. Total del periodo: ${
              strength.effectiveSets ?? 'sin dato'
            } series en ${strength.sessions} sesiones.`}
            footnote={
              <>
                <p>
                  Si un periodo tiene sesiones pero ninguna serie con repeticiones, queda vacío (sin dato) en lugar de 0. El detalle
                  de sesiones está en la tabla.
                </p>
                {strengthSeries.truncated && truncated && <p>{truncated}</p>}
              </>
            }
            table={{
              headers: [periodHeader, 'Sesiones', 'Parciales', 'Series efectivas', 'Series sin reps', 'Sesiones sin series'],
              rows: strengthRows.map((b) => [
                b.fullLabel,
                b.sessions,
                b.partialSessions,
                b.effectiveSets === null ? 'sin dato' : b.effectiveSets,
                b.setsWithoutReps,
                b.sessionsWithoutSets,
              ]),
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strengthSeries.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  labelFormatter={(label, payload) => fullLabel(payload, label)}
                  formatter={(value, _name, item) => {
                    const row = item.payload as StrengthBucket | undefined;
                    const text = typeof value === 'number' ? `${value} series` : 'sin dato';
                    return [row ? `${text} · ${row.sessions} ${row.sessions === 1 ? 'sesión' : 'sesiones'}` : text, 'Series efectivas'];
                  }}
                />
                <Bar dataKey="effectiveSets" name="Series efectivas" fill={STRENGTH_COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFigure>
        )}
      </section>

      {exercises.length > 0 && (
        <section className={`${cardClass} p-4 space-y-3`} aria-labelledby="insights-exercises-title">
          <div>
            <h2 id="insights-exercises-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
              Progresión y récords por ejercicio
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Carga máxima de la primera y de la última sesión del periodo, y mejor carga de todo el historial filtrado.
            </p>
          </div>
          <ul className="divide-y divide-zinc-800/70">
            {shownExercises.map((row) => (
              <li key={row.key} className="py-2.5 first:pt-0 last:pb-0 grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)] text-sm">
                <div className="min-w-0">
                  <p className="text-zinc-100 break-words">{row.name}</p>
                  <p className="text-xs text-zinc-500">
                    {row.sessions} {row.sessions === 1 ? 'sesión' : 'sesiones'} · {row.sets} series · última {formatDateShort(row.lastDate)}
                  </p>
                </div>
                <div className="text-xs sm:text-sm">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider sm:hidden">En el periodo</p>
                  <LoadChange row={row} />
                  {row.perSide && <span className="text-xs text-zinc-500"> · por lado</span>}
                </div>
                <div className="text-xs">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider sm:hidden">Récord</p>
                  {row.best ? (
                    <p className="text-zinc-300">
                      <span className="font-mono text-zinc-100">{kg(row.best.kg)}</span> × {row.best.reps ?? '?'} ·{' '}
                      {formatDate(row.best.date)}{' '}
                      {row.best.inWindow && <Badge tone="strength">Récord en el periodo</Badge>}{' '}
                      {row.machine && <Badge tone="sky">Máquina</Badge>}
                    </p>
                  ) : row.bestReps ? (
                    <p className="text-zinc-300">
                      <span className="font-mono text-zinc-100">{row.bestReps.reps} reps</span> · {formatDate(row.bestReps.date)}
                    </p>
                  ) : (
                    <Unknown>Sin récord calculable</Unknown>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {exercises.length > EXERCISE_LIMIT && (
            <button type="button" className="text-xs text-emerald-400 hover:text-emerald-300" onClick={() => setShowAllExercises((v) => !v)}>
              {showAllExercises ? 'Ver menos' : `Ver los ${exercises.length} ejercicios`}
            </button>
          )}
          <div className="text-xs text-zinc-500 space-y-1">
            <p>
              Los kg son los anotados en cada serie y solo se comparan dentro del mismo ejercicio. En máquinas y poleas son los kg
              que marca el aparato: sirven para seguirte en ese aparato, no para comparar con otros ni con peso libre.
            </p>
            {exercises.some((r) => !r.equipmentKnown) && (
              <p>
                Hay ejercicios sin equipo indicado: su carga se muestra tal cual se anotó (en mancuernas suele ser por mancuerna) y
                no se compara con ningún otro ejercicio.
              </p>
            )}
            <p>
              Si el equipo o el tipo de serie cambia dentro del periodo, no se calcula la diferencia. Un salto muy grande suele
              indicar que la carga se anotó de otra forma (por lado, por placa…), no un cambio real de fuerza.
            </p>
          </div>
        </section>
      )}

      <details className={`${cardClass} p-4 text-xs text-zinc-400`}>
        <summary className="cursor-pointer text-zinc-300 hover:text-zinc-100">Definiciones</summary>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="text-zinc-200">Carrera</dt>
            <dd>Sesiones de cardio con categoría «Carrera». Bici, caminatas y otros deportes no se suman.</dd>
          </div>
          <div>
            <dt className="text-zinc-200">Semana activa</dt>
            <dd>Semana (lunes–domingo) con al menos una carrera con distancia. Las semanas sin registros no cuentan como 0 km.</dd>
          </div>
          <div>
            <dt className="text-zinc-200">Serie efectiva</dt>
            <dd>
              Serie anotada con repeticiones. Las series de aproximación solo se distinguen si se registraron aparte; las series sin
              repeticiones se cuentan por separado.
            </dd>
          </div>
          <div>
            <dt className="text-zinc-200">Periodo anterior</dt>
            <dd>El mismo número de semanas inmediatamente antes de la ventana elegida.</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
