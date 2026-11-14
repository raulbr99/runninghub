'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { exerciseStats, type ExerciseStats } from '@/lib/workout-history/analytics';
import { normalizeText } from '@/lib/workout-history/merge';
import { EQUIPMENT_LABELS, SIDE_LABELS, type WorkoutSession } from '@/lib/workout-history/types';
import { formatDate, formatNumber } from '@/lib/workout-history/format';
import ChartFigure, { AXIS_TICK, CHART_SURFACE, GRID_STROKE, TOOLTIP_STYLE } from './ChartFigure';
import { Badge, ICONS, Icon, Unknown, cardClass, inputClass } from './ui';

const LINE_COLORS = { top: '#3987e5', left: '#d95926', right: '#199e70', reps: '#3987e5' };
const LIST_LIMIT = 40;

type Metric = 'load' | 'reps';

interface ExercisesPanelProps {
  sessions: WorkoutSession[];
  focusKey: string | null;
}

function ExerciseFlags({ ex }: { ex: ExerciseStats }) {
  return (
    <>
      {ex.machine && (
        <Badge tone="sky" title="Kg indicados por la máquina o polea: no comparables con otras máquinas ni con peso libre">
          {ex.freeWeight ? 'Máquina + libre' : 'Máquina'}
        </Badge>
      )}
      {ex.unilateral && (
        <Badge tone="neutral" title="Tiene series por lado (izquierdo/derecho)">
          Unilateral
        </Badge>
      )}
    </>
  );
}

function bestSummary(ex: ExerciseStats): string | null {
  if (ex.bestLoad) {
    const side = ex.bestLoad.side ? ` ${SIDE_LABELS[ex.bestLoad.side]}` : '';
    return `${formatNumber(ex.bestLoad.weightKg, 2)} kg${side}`;
  }
  if (ex.bestMachineLoad) return `${formatNumber(ex.bestMachineLoad.weightKg, 2)} kg (máq.)`;
  if (ex.bestReps) return `${ex.bestReps.reps} reps`;
  return null;
}

export default function ExercisesPanel({ sessions, focusKey }: ExercisesPanelProps) {
  const stats = useMemo(() => exerciseStats(sessions), [sessions]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [metricChoice, setMetricChoice] = useState<Metric | null>(null);

  const current =
    stats.find((s) => s.key === selected) ?? (focusKey ? stats.find((s) => s.key === focusKey) : undefined) ?? stats[0];

  const visible = useMemo(() => {
    const q = normalizeText(query);
    const list = q ? stats.filter((s) => normalizeText(`${s.name} ${s.muscleGroups.join(' ')}`).includes(q)) : stats;
    return list;
  }, [stats, query]);

  if (stats.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
        No hay ejercicios en esta vista. Los récords y la progresión aparecen cuando las sesiones incluyen ejercicios con
        series.
      </div>
    );
  }

  const hasLoad = current ? current.progression.some((p) => p.top !== null || p.left !== null || p.right !== null) : false;
  const metric: Metric = metricChoice ?? (hasLoad ? 'load' : 'reps');
  const hasLeft = current?.progression.some((p) => p.left !== null) ?? false;
  const hasRight = current?.progression.some((p) => p.right !== null) ?? false;
  const hasTop = current?.progression.some((p) => p.top !== null) ?? false;
  const chartData = (current?.progression ?? []).map((p) => ({ ...p, label: formatDate(p.date) }));
  const shown = showAll ? visible : visible.slice(0, LIST_LIMIT);

  const lineSeries: Array<{ key: 'top' | 'left' | 'right' | 'maxReps'; name: string; color: string }> =
    metric === 'load'
      ? [
          ...(hasTop ? [{ key: 'top' as const, name: hasLeft || hasRight ? 'Ambos lados' : 'Carga máxima', color: LINE_COLORS.top }] : []),
          ...(hasLeft ? [{ key: 'left' as const, name: 'Izquierdo', color: LINE_COLORS.left }] : []),
          ...(hasRight ? [{ key: 'right' as const, name: 'Derecho', color: LINE_COLORS.right }] : []),
        ]
      : [{ key: 'maxReps', name: 'Reps máx.', color: LINE_COLORS.reps }];
  const legend = lineSeries.map((l) => ({ label: l.name, color: l.color }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className={`${cardClass} p-3 space-y-2 min-w-0`} aria-labelledby="exercise-list-title">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 id="exercise-list-title" className="text-sm font-medium text-zinc-200 uppercase tracking-wider">
            Ejercicios ({stats.length})
          </h2>
        </div>
        <div className="relative">
          <Icon path={ICONS.search} className="w-4 h-4 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <label htmlFor="exercise-search" className="sr-only">
            Buscar ejercicio
          </label>
          <input
            id="exercise-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass} pl-8 py-1.5`}
            placeholder="Buscar ejercicio o grupo"
          />
        </div>
        <ul className="max-h-[28rem] overflow-y-auto space-y-1 pr-1">
          {shown.map((ex) => {
            const active = current?.key === ex.key;
            const best = bestSummary(ex);
            return (
              <li key={ex.key}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(ex.key);
                    setMetricChoice(null);
                  }}
                  aria-pressed={active}
                  className={`w-full text-left rounded-lg px-2.5 py-2 border transition-colors ${
                    active ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-transparent hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-zinc-100 break-words">{ex.name}</span>
                    <span className="text-xs font-mono text-zinc-300 whitespace-nowrap">{best ?? '—'}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                    <span>
                      {ex.sessions} ses. · {ex.sets} series · {formatDate(ex.lastDate)}
                    </span>
                    <ExerciseFlags ex={ex} />
                  </div>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="text-sm text-zinc-500 px-2 py-3">Sin coincidencias.</li>}
        </ul>
        {!showAll && visible.length > LIST_LIMIT && (
          <button type="button" className="w-full text-xs text-emerald-400 hover:text-emerald-300 py-1" onClick={() => setShowAll(true)}>
            Ver los {visible.length} ejercicios
          </button>
        )}
      </section>

      {current && (
        <div className="space-y-4 min-w-0">
          <section className={`${cardClass} p-4`} aria-labelledby="exercise-records-title">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 id="exercise-records-title" className="text-base text-zinc-100">
                {current.name}
              </h2>
              <ExerciseFlags ex={current} />
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              {current.muscleGroups.length > 0 ? current.muscleGroups.join(', ') : 'Sin grupo muscular'} ·{' '}
              {current.equipment.length > 0
                ? current.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')
                : 'Equipo no indicado'}{' '}
              · {current.sessions} sesiones · {current.sets} series · {formatDate(current.firstDate)} –{' '}
              {formatDate(current.lastDate)}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-zinc-950/40 border border-zinc-800 p-3">
                <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Mejor carga (peso libre)</dt>
                <dd className="mt-1">
                  {current.bestLoad ? (
                    <>
                      <span className="font-mono text-lg text-zinc-100">{formatNumber(current.bestLoad.weightKg, 2)} kg</span>
                      <span className="text-zinc-400 text-xs">
                        {' '}
                        × {current.bestLoad.reps ?? '?'} reps
                        {current.bestLoad.side && ` · ${SIDE_LABELS[current.bestLoad.side]} (por lado)`} ·{' '}
                        {formatDate(current.bestLoad.date)}
                      </span>
                    </>
                  ) : (
                    <Unknown>{current.machine ? 'Solo hay cargas de máquina/polea' : 'Sin kg registrados'}</Unknown>
                  )}
                </dd>
              </div>
              <div className="rounded-lg bg-zinc-950/40 border border-zinc-800 p-3">
                <dt className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  1RM estimado <Badge tone="amber">Estimación</Badge>
                </dt>
                <dd className="mt-1">
                  {current.bestE1rm ? (
                    <>
                      <span className="font-mono text-lg text-zinc-100">≈ {formatNumber(current.bestE1rm.value, 1)} kg</span>
                      <span className="text-zinc-400 text-xs">
                        {' '}
                        Epley, de {formatNumber(current.bestE1rm.weightKg, 2)} kg × {current.bestE1rm.reps} ·{' '}
                        {formatDate(current.bestE1rm.date)}
                      </span>
                    </>
                  ) : (
                    <Unknown>No calculable (requiere peso libre bilateral, 1–12 reps)</Unknown>
                  )}
                </dd>
              </div>
              {current.bestMachineLoad && (
                <div className="rounded-lg bg-zinc-950/40 border border-zinc-800 p-3">
                  <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Máquina / polea (kg indicados)</dt>
                  <dd className="mt-1">
                    <span className="font-mono text-lg text-zinc-100">{formatNumber(current.bestMachineLoad.weightKg, 2)} kg</span>
                    <span className="text-zinc-400 text-xs">
                      {' '}
                      × {current.bestMachineLoad.reps ?? '?'} reps
                      {current.bestMachineLoad.side && ` · ${SIDE_LABELS[current.bestMachineLoad.side]}`} ·{' '}
                      {formatDate(current.bestMachineLoad.date)}
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">Útil para comparar contigo mismo en esa máquina; no es carga real comparable.</p>
                  </dd>
                </div>
              )}
              <div className="rounded-lg bg-zinc-950/40 border border-zinc-800 p-3">
                <dt className="text-[11px] text-zinc-400 uppercase tracking-wider">Máx. repeticiones en una serie</dt>
                <dd className="mt-1">
                  {current.bestReps ? (
                    <>
                      <span className="font-mono text-lg text-zinc-100">{current.bestReps.reps} reps</span>
                      <span className="text-zinc-400 text-xs">
                        {' '}
                        {current.bestReps.weightKg !== null && current.bestReps.weightKg > 0
                          ? `con ${formatNumber(current.bestReps.weightKg, 2)} kg`
                          : current.bestReps.weightKg === 0
                            ? 'sin carga externa'
                            : 'kg no registrados'}{' '}
                        · {formatDate(current.bestReps.date)}
                      </span>
                    </>
                  ) : (
                    <Unknown>Sin repeticiones registradas</Unknown>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <ChartFigure
            title="Progresión"
            description={
              metric === 'load'
                ? 'Carga máxima por sesión (kg anotados).'
                : 'Repeticiones máximas en una serie, por sesión.'
            }
            summary={`Gráfico de líneas de la progresión de ${current.name}: ${
              metric === 'load' ? 'carga máxima' : 'repeticiones máximas'
            } en ${chartData.length} sesiones.`}
            legend={legend}
            actions={
              hasLoad && (
                <div role="radiogroup" aria-label="Métrica" className="inline-flex p-0.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
                  {(
                    [
                      ['load', 'Carga'],
                      ['reps', 'Reps'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={metric === value}
                      onClick={() => setMetricChoice(value)}
                      className={`px-2.5 py-1 rounded-md text-xs ${
                        metric === value ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )
            }
            footnote={
              <>
                {metric === 'load' && current.machine && (
                  <p>
                    Incluye kg de máquina/polea: sirven para seguir tu progreso en el mismo aparato, no para comparar con otros
                    aparatos ni con peso libre.
                  </p>
                )}
                {metric === 'load' && (hasLeft || hasRight) && (
                  <p>Las series por lado se dibujan por separado; los lados no se suman ni se comparan como carga total.</p>
                )}
                {chartData.length === 1 && <p>Solo hay una sesión: hace falta al menos otra para ver una tendencia.</p>}
              </>
            }
            table={{
              headers:
                metric === 'load'
                  ? ['Fecha', ...(hasTop ? ['Carga máx.'] : []), ...(hasLeft ? ['Izq.'] : []), ...(hasRight ? ['Der.'] : []), 'Series', 'Máquina']
                  : ['Fecha', 'Reps máx.', 'Series'],
              rows: chartData.map((p) =>
                metric === 'load'
                  ? [
                      p.label,
                      ...(hasTop ? [p.top === null ? '—' : formatNumber(p.top, 2)] : []),
                      ...(hasLeft ? [p.left === null ? '—' : formatNumber(p.left, 2)] : []),
                      ...(hasRight ? [p.right === null ? '—' : formatNumber(p.right, 2)] : []),
                      p.sets,
                      p.machine ? 'sí' : 'no',
                    ]
                  : [p.label, p.maxReps === null ? '—' : p.maxReps, p.sets]
              ),
            }}
          >
            {(metric === 'load' ? hasLoad : chartData.some((p) => p.maxReps !== null)) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 14, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    domain={['auto', 'auto']}
                    allowDecimals={metric === 'load'}
                    unit={metric === 'load' ? ' kg' : ''}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    cursor={{ stroke: '#52525b', strokeWidth: 1 }}
                    formatter={(value, name) => [
                      typeof value === 'number'
                        ? metric === 'load'
                          ? `${formatNumber(value, 2)} kg`
                          : `${value} reps`
                        : 'sin dato',
                      name,
                    ]}
                  />
                  {lineSeries.map((line) => (
                    <Line
                      key={line.key}
                      type="linear"
                      dataKey={line.key}
                      name={line.name}
                      stroke={line.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: line.color, stroke: CHART_SURFACE, strokeWidth: 2 }}
                      activeDot={{ r: 6, stroke: CHART_SURFACE, strokeWidth: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500 text-center px-4">
                No hay {metric === 'load' ? 'kg' : 'repeticiones'} registrados para este ejercicio.
              </div>
            )}
          </ChartFigure>
        </div>
      )}
    </div>
  );
}
