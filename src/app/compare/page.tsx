'use client';

import { useState, useEffect } from 'react';

interface Workout {
  id: string;
  date: string;
  type: string;
  title: string | null;
  distance: number | null;
  duration: number | null;
  avgHr: number | null;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  easy: 'Rodaje',
  tempo: 'Tempo',
  intervals: 'Series',
  long: 'Tirada larga',
  recovery: 'Recuperacion',
  race: 'Competicion',
};

export default function ComparePage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workout1, setWorkout1] = useState<Workout | null>(null);
  const [workout2, setWorkout2] = useState<Workout | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, [filterType]);

  const loadWorkouts = async () => {
    try {
      const url = filterType ? `/api/workouts?type=${filterType}` : '/api/workouts';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWorkouts(data);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPace = (distance: number, duration: number) => {
    const pace = duration / distance;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getComparison = (val1: number | null, val2: number | null, inverse = false) => {
    if (val1 === null || val2 === null) return null;
    const diff = val1 - val2;
    const percentage = val2 !== 0 ? ((diff / val2) * 100).toFixed(1) : '0';
    const isPositive = inverse ? diff < 0 : diff > 0;
    return {
      diff: Math.abs(diff).toFixed(1),
      percentage,
      isPositive,
      sign: diff > 0 ? '+' : diff < 0 ? '-' : '',
    };
  };

  const WorkoutSelector = ({
    selected,
    onSelect,
    label,
  }: {
    selected: Workout | null;
    onSelect: (w: Workout | null) => void;
    label: string;
  }) => (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-3">{label}</label>
      <select
        value={selected?.id || ''}
        onChange={(e) => {
          const workout = workouts.find((w) => w.id === e.target.value) || null;
          onSelect(workout);
        }}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <option value="">Seleccionar entreno...</option>
        {workouts.map((w) => (
          <option key={w.id} value={w.id}>
            {formatDate(w.date)} - {TYPE_LABELS[w.type] || w.type} - {w.distance}km
          </option>
        ))}
      </select>

      {selected && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                selected.type === 'easy'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : selected.type === 'tempo'
                    ? 'bg-amber-500/20 text-amber-400'
                    : selected.type === 'intervals'
                      ? 'bg-red-500/20 text-red-400'
                      : selected.type === 'long'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-zinc-500/20 text-zinc-400'
              }`}
            >
              {TYPE_LABELS[selected.type] || selected.type}
            </span>
            <span className="text-sm text-zinc-400">{formatDate(selected.date)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Distancia</p>
              <p className="text-xl font-mono text-zinc-100">
                {selected.distance?.toFixed(1) || '-'} <span className="text-sm text-zinc-500">km</span>
              </p>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Duracion</p>
              <p className="text-xl font-mono text-zinc-100">
                {selected.duration ? formatDuration(selected.duration) : '-'}
              </p>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Ritmo</p>
              <p className="text-xl font-mono text-zinc-100">
                {selected.distance && selected.duration
                  ? formatPace(selected.distance, selected.duration)
                  : '-'}{' '}
                <span className="text-sm text-zinc-500">/km</span>
              </p>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">FC media</p>
              <p className="text-xl font-mono text-zinc-100">
                {selected.avgHr || '-'} <span className="text-sm text-zinc-500">bpm</span>
              </p>
            </div>
          </div>

          {selected.notes && (
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Notas</p>
              <p className="text-sm text-zinc-300">{selected.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const ComparisonRow = ({
    label,
    val1,
    val2,
    format,
    inverse,
  }: {
    label: string;
    val1: number | null;
    val2: number | null;
    format?: (v: number) => string;
    inverse?: boolean;
  }) => {
    const comparison = getComparison(val1, val2, inverse);
    const formatter = format || ((v: number) => v.toFixed(1));

    return (
      <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
        <span className="text-sm text-zinc-400">{label}</span>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-zinc-300 w-20 text-right">
            {val1 !== null ? formatter(val1) : '-'}
          </span>
          {comparison && (
            <span
              className={`text-xs font-mono w-16 text-center ${
                comparison.isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {comparison.sign}
              {comparison.diff}
            </span>
          )}
          <span className="text-sm font-mono text-zinc-300 w-20 text-right">
            {val2 !== null ? formatter(val2) : '-'}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-4">
          Comparador de Entrenamientos
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              filterType === ''
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Todos
          </button>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                filterType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <WorkoutSelector selected={workout1} onSelect={setWorkout1} label="Entreno 1" />
        <WorkoutSelector selected={workout2} onSelect={setWorkout2} label="Entreno 2" />
      </div>

      {workout1 && workout2 && (
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Comparativa
          </h2>

          <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
            <span className="text-sm text-zinc-500">{formatDate(workout1.date)}</span>
            <span className="text-xs text-zinc-600">vs</span>
            <span className="text-sm text-zinc-500">{formatDate(workout2.date)}</span>
          </div>

          <ComparisonRow
            label="Distancia (km)"
            val1={workout1.distance}
            val2={workout2.distance}
            format={(v) => v.toFixed(1)}
          />

          <ComparisonRow
            label="Duracion (min)"
            val1={workout1.duration}
            val2={workout2.duration}
            format={(v) => formatDuration(v)}
          />

          <ComparisonRow
            label="Ritmo (min/km)"
            val1={
              workout1.distance && workout1.duration ? workout1.duration / workout1.distance : null
            }
            val2={
              workout2.distance && workout2.duration ? workout2.duration / workout2.distance : null
            }
            format={(v) => formatPace(1, v)}
            inverse
          />

          <ComparisonRow
            label="FC media (bpm)"
            val1={workout1.avgHr}
            val2={workout2.avgHr}
            format={(v) => v.toString()}
            inverse
          />

          {workout1.distance &&
            workout1.duration &&
            workout2.distance &&
            workout2.duration &&
            Math.abs(workout1.distance - workout2.distance) < 1 && (
              <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-sm text-emerald-400 font-medium mb-2">Progreso detectado</p>
                <p className="text-xs text-zinc-400">
                  En distancias similares (~{((workout1.distance + workout2.distance) / 2).toFixed(1)}{' '}
                  km), el ritmo{' '}
                  {workout1.duration / workout1.distance < workout2.duration / workout2.distance
                    ? 'mejoro'
                    : 'empeoro'}{' '}
                  en{' '}
                  {Math.abs(
                    (workout1.duration / workout1.distance - workout2.duration / workout2.distance) *
                      60
                  ).toFixed(0)}{' '}
                  segundos por km.
                </p>
              </div>
            )}
        </div>
      )}

      {workouts.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="w-12 h-12 text-zinc-700 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          <p className="text-zinc-500">No hay entrenamientos para comparar</p>
          <p className="text-xs text-zinc-600 mt-1">
            Completa algunos entrenamientos de running para poder compararlos
          </p>
        </div>
      )}
    </div>
  );
}
