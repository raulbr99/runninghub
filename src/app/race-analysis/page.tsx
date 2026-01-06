'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Race {
  id: string;
  date: string;
  title: string | null;
  distance: number | null;
  duration: number | null;
  notes: string | null;
}

interface RaceAnalysis {
  race: Race;
  pace: number | null;
  splits: { km: number; time: number; cumulative: number }[];
  strategy: {
    type: string;
    label: string;
    description: string;
  };
  comparison: {
    previousRaces: Race[];
    bestTime: Race | null;
    improvement: number | null;
    percentile: number | null;
    totalRaces: number;
  };
  predictions: { distance: number; label: string; time: number }[];
}

export default function RaceAnalysisPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [analysis, setAnalysis] = useState<RaceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadRaces();
  }, []);

  useEffect(() => {
    if (selectedRace) {
      loadAnalysis(selectedRace);
    }
  }, [selectedRace]);

  const loadRaces = async () => {
    try {
      const res = await fetch('/api/race-analysis');
      if (res.ok) {
        const data = await res.json();
        setRaces(data);
        if (data.length > 0) {
          setSelectedRace(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading races:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (raceId: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/race-analysis?id=${raceId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (pace: number) => {
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDistanceLabel = (distance: number) => {
    if (Math.abs(distance - 5) < 0.2) return '5K';
    if (Math.abs(distance - 10) < 0.3) return '10K';
    if (Math.abs(distance - 15) < 0.5) return '15K';
    if (Math.abs(distance - 21.0975) < 0.5) return 'Media Maraton';
    if (Math.abs(distance - 42.195) < 1) return 'Maraton';
    return `${distance.toFixed(1)} km`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-8">
          Analisis de Carreras
        </h1>
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-zinc-700 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
            />
          </svg>
          <p className="text-zinc-400 mb-2">No hay carreras completadas</p>
          <p className="text-sm text-zinc-600">
            Marca un evento como &quot;Competicion&quot; y completalo para ver el analisis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-4">
          Analisis de Carreras
        </h1>

        <select
          value={selectedRace}
          onChange={(e) => setSelectedRace(e.target.value)}
          className="w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {races.map((race) => (
            <option key={race.id} value={race.id}>
              {formatDate(race.date)} - {race.title || getDistanceLabel(race.distance || 0)} (
              {race.distance?.toFixed(1)} km)
            </option>
          ))}
        </select>
      </div>

      {analyzing ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Resumen principal */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 rounded-xl border border-emerald-800/30 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl text-zinc-100">
                  {analysis.race.title || getDistanceLabel(analysis.race.distance || 0)}
                </h2>
                <p className="text-sm text-zinc-500">{formatDate(analysis.race.date)}</p>
              </div>
              {analysis.comparison.improvement && analysis.comparison.improvement > 0 && (
                <div className="px-4 py-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider">PR</p>
                  <p className="text-lg font-mono text-emerald-300">
                    -{formatTime(analysis.comparison.improvement)} vs anterior
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Distancia</p>
                <p className="text-2xl font-mono text-zinc-100">
                  {analysis.race.distance?.toFixed(2)}
                  <span className="text-sm text-zinc-500 ml-1">km</span>
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Tiempo</p>
                <p className="text-2xl font-mono text-zinc-100">
                  {analysis.race.duration ? formatTime(analysis.race.duration) : '-'}
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Ritmo medio</p>
                <p className="text-2xl font-mono text-zinc-100">
                  {analysis.pace ? formatPace(analysis.pace) : '-'}
                  <span className="text-sm text-zinc-500 ml-1">/km</span>
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Velocidad</p>
                <p className="text-2xl font-mono text-zinc-100">
                  {analysis.pace ? (60 / analysis.pace).toFixed(1) : '-'}
                  <span className="text-sm text-zinc-500 ml-1">km/h</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Splits */}
            {analysis.splits.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                  Splits estimados
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.splits}>
                      <XAxis
                        dataKey="km"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        width={35}
                        tickFormatter={(v) => formatPace(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [formatPace(value as number), 'Ritmo']}
                        labelFormatter={(label) => `Km ${label}`}
                      />
                      <Bar dataKey="time" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Estrategia */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Estrategia de carrera
              </h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-zinc-200 font-medium">{analysis.strategy.label}</p>
                    <p className="text-xs text-zinc-500">{analysis.strategy.description}</p>
                  </div>
                </div>
              </div>

              {analysis.comparison.percentile !== null && (
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Rendimiento vs carreras anteriores</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${analysis.comparison.percentile}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-emerald-400">
                      Top {100 - analysis.comparison.percentile}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Comparativa con carreras anteriores */}
            {analysis.comparison.previousRaces.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                  Carreras anteriores similares
                </h3>
                <div className="space-y-2">
                  {analysis.comparison.previousRaces.map((race) => (
                    <div
                      key={race.id}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm text-zinc-300">
                          {race.title || getDistanceLabel(race.distance || 0)}
                        </p>
                        <p className="text-xs text-zinc-500">{formatDate(race.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-zinc-200">
                          {race.duration ? formatTime(race.duration) : '-'}
                        </p>
                        {race.duration && analysis.race.duration && (
                          <p
                            className={`text-xs font-mono ${
                              race.duration > analysis.race.duration
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {race.duration > analysis.race.duration ? '-' : '+'}
                            {formatTime(Math.abs(race.duration - analysis.race.duration))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predicciones */}
            {analysis.predictions.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                  Predicciones basadas en esta carrera
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {analysis.predictions.map((pred) => (
                    <div key={pred.label} className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-1">{pred.label}</p>
                      <p className="text-lg font-mono text-zinc-200">{formatTime(pred.time)}</p>
                      <p className="text-xs text-zinc-600">
                        {formatPace(pred.time / pred.distance)} /km
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-3">
                  * Predicciones usando formula de Riegel
                </p>
              </div>
            )}
          </div>

          {/* Notas */}
          {analysis.race.notes && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-3">
                Notas
              </h3>
              <p className="text-sm text-zinc-400">{analysis.race.notes}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
