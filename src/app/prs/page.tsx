'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PR {
  distance: string;
  km: number;
  bestTime: number | null;
  bestPace: number | null;
  date: string | null;
  eventId: string | null;
  history: { date: string; time: number; pace: number }[];
}

interface PRData {
  prs: PR[];
  bestOverallPace: {
    pace: number;
    distance: number;
    duration: number;
    date: string;
  } | null;
  longestRun: {
    distance: number;
    duration: number;
    date: string;
  } | null;
  totalRaces: number;
  totalRuns: number;
}

export default function PRsPage() {
  const [data, setData] = useState<PRData | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPRs();
  }, []);

  const loadPRs = async () => {
    try {
      const res = await fetch('/api/prs');
      if (res.ok) {
        const prData = await res.json();
        setData(prData);
        const firstWithHistory = prData.prs.find((p: PR) => p.history.length > 0);
        if (firstWithHistory) {
          setSelectedDistance(firstWithHistory.distance);
        }
      }
    } catch (error) {
      console.error('Error loading PRs:', error);
    } finally {
      setLoading(false);
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
      month: 'short',
      year: 'numeric',
    });
  };

  const getSelectedPR = () => {
    return data?.prs.find((p) => p.distance === selectedDistance);
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
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">
          Mis Records Personales
        </h1>
        <p className="text-sm text-zinc-500">
          Historial de tus mejores marcas por distancia
        </p>
      </div>

      {data && (
        <>
          {/* Stats generales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total entrenos</p>
              <p className="text-2xl font-mono text-zinc-100">{data.totalRuns}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Carreras</p>
              <p className="text-2xl font-mono text-zinc-100">{data.totalRaces}</p>
            </div>
            {data.longestRun && (
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Tirada mas larga</p>
                <p className="text-2xl font-mono text-emerald-400">{data.longestRun.distance?.toFixed(1)} km</p>
                <p className="text-xs text-zinc-600">{formatDate(data.longestRun.date)}</p>
              </div>
            )}
            {data.bestOverallPace && (
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Mejor ritmo (+5km)</p>
                <p className="text-2xl font-mono text-amber-400">{formatPace(data.bestOverallPace.pace)}/km</p>
                <p className="text-xs text-zinc-600">{data.bestOverallPace.distance?.toFixed(1)} km - {formatDate(data.bestOverallPace.date)}</p>
              </div>
            )}
          </div>

          {/* PRs por distancia */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                  Mejores tiempos por distancia
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.prs.map((pr) => (
                    <button
                      key={pr.distance}
                      onClick={() => pr.history.length > 0 && setSelectedDistance(pr.distance)}
                      className={`p-4 rounded-lg text-left transition-colors ${
                        selectedDistance === pr.distance
                          ? 'bg-emerald-600/20 border border-emerald-500/30'
                          : pr.bestTime
                            ? 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                            : 'bg-zinc-800/30 border border-transparent opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-300">{pr.distance}</span>
                        {pr.history.length > 1 && (
                          <span className="text-[10px] text-zinc-500">{pr.history.length} registros</span>
                        )}
                      </div>
                      {pr.bestTime ? (
                        <>
                          <p className="text-xl font-mono text-emerald-400">{formatTime(pr.bestTime)}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {formatPace(pr.bestPace!)} /km - {formatDate(pr.date!)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-zinc-600">Sin registro</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfica de evolución */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Evolucion {selectedDistance}
              </h2>
              {getSelectedPR()?.history && getSelectedPR()!.history.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getSelectedPR()!.history.slice().reverse().map((h) => ({
                        date: new Date(h.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
                        time: h.time,
                        pace: h.pace,
                      }))}
                    >
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        width={40}
                        tickFormatter={(v) => formatTime(v)}
                        domain={['dataMin - 1', 'dataMax + 1']}
                        reversed
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [formatTime(value as number), 'Tiempo']}
                      />
                      <Line
                        type="monotone"
                        dataKey="time"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
                  {selectedDistance
                    ? 'Necesitas mas de un registro para ver la evolucion'
                    : 'Selecciona una distancia'}
                </div>
              )}
            </div>
          </div>

          {/* Historial detallado */}
          {getSelectedPR()?.history && getSelectedPR()!.history.length > 0 && (
            <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Historial {selectedDistance}
              </h2>
              <div className="space-y-2">
                {getSelectedPR()!.history.map((h, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      i === 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {i === 0 && (
                        <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded">PR</span>
                      )}
                      <span className="text-sm text-zinc-400">{formatDate(h.date)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-mono text-zinc-200">{formatTime(h.time)}</span>
                      <span className="text-sm text-zinc-500 ml-2">({formatPace(h.pace)} /km)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
