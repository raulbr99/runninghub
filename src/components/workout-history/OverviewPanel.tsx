'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CARDIO_COLOR,
  STRENGTH_COLOR,
  activityBuckets,
  computeOverview,
  muscleTrends,
  type ActivityBucket,
  type Period,
} from '@/lib/workout-history/analytics';
import type { WorkoutSession } from '@/lib/workout-history/types';
import { formatDate, formatDuration, formatNumber } from '@/lib/workout-history/format';
import ChartFigure, { AXIS_TICK, CHART_SURFACE, GRID_STROKE, TOOLTIP_STYLE } from './ChartFigure';
import { Badge, StatCard, Unknown } from './ui';

const MAX_BUCKETS: Record<Period, number> = { week: 26, month: 24 };

interface OverviewPanelProps {
  sessions: WorkoutSession[];
  allSessions: WorkoutSession[];
  focusKey: string | null;
  focusName: string | null;
  period: Period;
  onPeriodChange: (period: Period) => void;
}

function coverage(known: number, total: number, noun: string): string {
  if (total === 0) return '';
  if (known === total) return `en las ${total} ${noun}`;
  return `en ${known} de ${total} ${noun}`;
}

function bucketLabel(payload: ReadonlyArray<{ payload?: unknown }>, fallback: unknown): string {
  const row = payload[0]?.payload as { fullLabel?: string } | undefined;
  return row?.fullLabel ?? String(fallback);
}

export function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div role="radiogroup" aria-label="Agrupar por" className="inline-flex p-0.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
      {(
        [
          ['week', 'Semanas'],
          ['month', 'Meses'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={period === value}
          onClick={() => onChange(value)}
          className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
            period === value ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function OverviewPanel({
  sessions,
  allSessions,
  focusKey,
  focusName,
  period,
  onPeriodChange,
}: OverviewPanelProps) {
  const overview = useMemo(() => computeOverview(sessions, focusKey), [sessions, focusKey]);
  const activity = useMemo(() => activityBuckets(sessions, period, MAX_BUCKETS[period]), [sessions, period]);
  const trends = useMemo(
    () => muscleTrends(sessions, allSessions, period, focusKey, MAX_BUCKETS[period]),
    [sessions, allSessions, period, focusKey]
  );

  const t = overview.tonnage;
  const hasDistance = activity.buckets.some((b) => b.cardioWithDistance > 0);
  const periodNoun = period === 'week' ? 'semana' : 'mes';
  const truncatedNote =
    activity.truncated &&
    `Se muestran ${period === 'week' ? 'las últimas 26 semanas' : 'los últimos 24 meses'} del rango filtrado.`;

  return (
    <div className="space-y-6">
      {focusName && (
        <p className="text-xs text-zinc-400">
          Series, tonelaje y grupos musculares calculados solo para <span className="text-zinc-200">{focusName}</span>.
        </p>
      )}

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Sesiones"
          value={formatNumber(overview.sessions)}
          detail={
            <>
              <p>
                {formatNumber(overview.strength)} de fuerza · {formatNumber(overview.cardio)} de cardio
              </p>
              {(overview.partial > 0 || overview.incomplete > 0) && (
                <p className="text-amber-300/90">
                  {overview.partial > 0 && `${overview.partial} parciales`}
                  {overview.partial > 0 && overview.incomplete > 0 && ' · '}
                  {overview.incomplete > 0 && `${overview.incomplete} con datos incompletos`}
                </p>
              )}
            </>
          }
        />
        <StatCard
          label="Series de fuerza"
          value={overview.sets > 0 ? formatNumber(overview.sets) : <Unknown>—</Unknown>}
          detail={
            <>
              <p>
                {overview.sets > 0
                  ? `${formatNumber(overview.exercisesDistinct)} ejercicios distintos`
                  : 'No hay series registradas'}
              </p>
              {overview.strengthWithoutSets > 0 && (
                <p className="text-zinc-500">{overview.strengthWithoutSets} sesiones de fuerza sin series anotadas</p>
              )}
            </>
          }
        />
        <StatCard
          label="Distancia cardio"
          value={overview.cardioDistanceKnown > 0 ? formatNumber(overview.cardioDistance, 1) : <Unknown>—</Unknown>}
          unit={overview.cardioDistanceKnown > 0 ? 'km' : undefined}
          detail={
            overview.cardio === 0 ? (
              <p>Sin sesiones de cardio</p>
            ) : overview.cardioDistanceKnown === 0 ? (
              <p>Ninguna sesión de cardio tiene distancia anotada</p>
            ) : (
              <p>Distancia registrada {coverage(overview.cardioDistanceKnown, overview.cardio, 'sesiones de cardio')}</p>
            )
          }
        />
        <StatCard
          label="Tiempo registrado"
          value={overview.durationKnown > 0 ? formatDuration(overview.durationTotal) : <Unknown>—</Unknown>}
          detail={
            overview.sessions === 0 ? null : overview.durationKnown === 0 ? (
              <p>Ninguna sesión tiene duración anotada</p>
            ) : (
              <>
                <p>Suma {coverage(overview.durationKnown, overview.sessions, 'sesiones')}</p>
                {overview.cardioDurationKnown > 0 && <p className="text-zinc-500">Cardio: {formatDuration(overview.cardioDuration)}</p>}
              </>
            )
          }
        />
        <StatCard
          label="Tonelaje estimado"
          badge={<Badge tone="amber">Estimación</Badge>}
          value={t.freeSets > 0 ? formatNumber(Math.round(t.freeKg)) : <Unknown>—</Unknown>}
          unit={t.freeSets > 0 ? 'kg' : undefined}
          detail={
            <>
              <p>
                {t.freeSets > 0
                  ? `reps × kg de ${formatNumber(t.freeSets)} series de peso libre`
                  : 'No hay series de peso libre con reps y kg'}
              </p>
              {t.machineSets > 0 && (
                <p className="text-zinc-500">
                  Máquina/polea aparte: {formatNumber(Math.round(t.machineKg))} kg indicados en {t.machineSets} series (no
                  comparables)
                </p>
              )}
              {(t.missingSets > 0 || t.bodyweightSets > 0) && (
                <p className="text-zinc-500">
                  Excluidas: {t.missingSets > 0 && `${t.missingSets} sin reps o kg`}
                  {t.missingSets > 0 && t.bodyweightSets > 0 && ', '}
                  {t.bodyweightSets > 0 && `${t.bodyweightSets} de peso corporal/banda`}
                </p>
              )}
              {t.unknownEquipmentSets > 0 && (
                <p className="text-zinc-500">{t.unknownEquipmentSets} series sin equipo indicado se cuentan como peso libre</p>
              )}
            </>
          }
        />
        <StatCard
          label="Periodo"
          value={
            overview.firstDate && overview.lastDate ? (
              <span className="text-base">
                {formatDate(overview.firstDate)} – {formatDate(overview.lastDate)}
              </span>
            ) : (
              <Unknown>—</Unknown>
            )
          }
          detail={overview.activeWeeks > 0 && <p>{formatNumber(overview.activeWeeks)} semanas con al menos una sesión</p>}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm text-zinc-300 uppercase tracking-wider">Evolución</h2>
        <PeriodToggle period={period} onChange={onPeriodChange} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFigure
          title={`Sesiones por ${periodNoun}`}
          description="Número de sesiones registradas, por tipo."
          summary={`Gráfico de barras apiladas con sesiones de fuerza y cardio por ${periodNoun}. Total: ${overview.strength} de fuerza y ${overview.cardio} de cardio.`}
          legend={[
            { label: 'Fuerza', color: STRENGTH_COLOR },
            { label: 'Cardio', color: CARDIO_COLOR },
          ]}
          footnote={truncatedNote}
          table={{
            headers: [period === 'week' ? 'Semana' : 'Mes', 'Fuerza', 'Cardio'],
            rows: activity.buckets.map((b) => [b.fullLabel, b.strength, b.cardio]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(label, payload) => bucketLabel(payload, label)} />
              <Bar dataKey="strength" name="Fuerza" stackId="s" fill={STRENGTH_COLOR} stroke={CHART_SURFACE} strokeWidth={1} maxBarSize={24} />
              <Bar dataKey="cardio" name="Cardio" stackId="s" fill={CARDIO_COLOR} stroke={CHART_SURFACE} strokeWidth={1} maxBarSize={24} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFigure>

        {hasDistance ? (
          <ChartFigure
            title={`Distancia de cardio por ${periodNoun} (km)`}
            description="Solo suma las sesiones con distancia anotada."
            summary={`Gráfico de barras con los kilómetros de cardio registrados por ${periodNoun}. Total registrado: ${formatNumber(overview.cardioDistance, 1)} km.`}
            footnote={
              <>
                {activity.buckets.some((b) => b.distanceKm === null) && (
                  <p>Los periodos con cardio pero sin ninguna distancia anotada quedan vacíos (sin dato, no 0 km).</p>
                )}
                {truncatedNote && <p>{truncatedNote}</p>}
              </>
            }
            table={{
              headers: [period === 'week' ? 'Semana' : 'Mes', 'Km registrados', 'Sesiones con distancia'],
              rows: activity.buckets
                .filter((b) => b.cardioSessions > 0)
                .map((b) => [
                  b.fullLabel,
                  b.distanceKm === null ? 'sin dato' : formatNumber(b.distanceKm, 1),
                  `${b.cardioWithDistance} de ${b.cardioSessions}`,
                ]),
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  labelFormatter={(label, payload) => bucketLabel(payload, label)}
                  formatter={(value, _name, item) => {
                    const row = item.payload as ActivityBucket | undefined;
                    const km = typeof value === 'number' ? `${formatNumber(value, 1)} km` : 'sin dato';
                    const cov = row && row.cardioSessions > 0 ? ` (${row.cardioWithDistance} de ${row.cardioSessions} sesiones con distancia)` : '';
                    return [`${km}${cov}`, 'Distancia'];
                  }}
                />
                <Bar dataKey="distanceKm" name="Distancia" fill={CARDIO_COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFigure>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400 flex items-center">
            {overview.cardio === 0
              ? 'No hay sesiones de cardio en esta vista. Cuando las haya, aquí verás la distancia registrada por periodo.'
              : 'Las sesiones de cardio de esta vista no tienen distancia anotada, así que no se dibuja ningún total.'}
          </div>
        )}
      </div>

      <section className="space-y-3" aria-labelledby="muscle-trends-title">
        {trends.series.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ChartFigure
              title={`Series por grupo muscular y ${periodNoun}`}
              description="Cuenta series registradas (no carga), según el grupo indicado en cada ejercicio."
              summary={`Gráfico de barras apiladas de series por grupo muscular y ${periodNoun}. Grupos: ${trends.totals
                .map((g) => `${g.name} ${g.sets} series`)
                .join(', ')}.`}
              legend={trends.series.map((s) => ({ label: s.name, color: s.color }))}
              height="h-64"
              footnote={
                <>
                  {trends.unassignedSets > 0 && (
                    <p>{trends.unassignedSets} series sin grupo muscular asignado no aparecen en el gráfico.</p>
                  )}
                  {trends.truncated && truncatedNote && <p>{truncatedNote}</p>}
                </>
              }
              table={{
                headers: [period === 'week' ? 'Semana' : 'Mes', ...trends.series.map((s) => s.name)],
                rows: trends.buckets.map((b) => [String(b.fullLabel), ...trends.series.map((s) => Number(b[s.id]) || 0)]),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    labelFormatter={(label, payload) => bucketLabel(payload, label)}
                    formatter={(value, name) => [`${typeof value === 'number' ? value : 0} series`, name]}
                  />
                  {trends.series.map((s, i) => (
                    <Bar
                      key={s.id}
                      dataKey={s.id}
                      name={s.name}
                      stackId="g"
                      fill={s.color}
                      stroke={CHART_SURFACE}
                      strokeWidth={1}
                      maxBarSize={24}
                      radius={i === trends.series.length - 1 ? [4, 4, 0, 0] : undefined}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartFigure>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h3 id="muscle-trends-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider mb-3">
                Grupos musculares
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-zinc-400 uppercase tracking-wider text-left">
                    <th scope="col" className="pb-2 font-medium">
                      Grupo
                    </th>
                    <th scope="col" className="pb-2 font-medium text-right">
                      Series
                    </th>
                    <th scope="col" className="pb-2 font-medium text-right">
                      Sesiones
                    </th>
                    <th scope="col" className="pb-2 font-medium text-right">
                      Última
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trends.totals.map((g) => (
                    <tr key={g.name} className="border-t border-zinc-800/60">
                      <td className="py-1.5 pr-2">
                        <span className="inline-flex items-center gap-1.5 text-zinc-200">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
                          {g.name}
                        </span>
                      </td>
                      <td className="py-1.5 text-right font-mono text-zinc-200">{formatNumber(g.sets)}</td>
                      <td className="py-1.5 text-right font-mono text-zinc-400">{formatNumber(g.sessions)}</td>
                      <td className="py-1.5 text-right text-xs text-zinc-400 whitespace-nowrap">{formatDate(g.lastDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
            <h3 id="muscle-trends-title" className="text-zinc-300 mb-1">
              Grupos musculares
            </h3>
            {trends.unassignedSets > 0
              ? `Hay ${trends.unassignedSets} series, pero ningún ejercicio tiene grupo muscular asignado. Añade "muscleGroup" en el JSON o edita las sesiones para ver tendencias.`
              : 'No hay series de fuerza en esta vista.'}
          </div>
        )}
      </section>
    </div>
  );
}
