'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Workout {
  id: string;
  date: string;
  type: string;
  title: string | null;
  distance: number | null;
  duration: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
}

interface ElevationStats {
  totalGain: number;
  totalLoss: number;
  avgGainPerKm: number;
  steepestWorkout: Workout | null;
  monthlyData: { month: string; gain: number }[];
}

export default function ElevationPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<ElevationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/workouts?limit=100');
      if (res.ok) {
        const data = await res.json();
        setWorkouts(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (workouts: Workout[]) => {
    const withElevation = workouts.filter((w) => w.elevationGain && w.elevationGain > 0);

    if (withElevation.length === 0) {
      setStats(null);
      return;
    }

    const totalGain = withElevation.reduce((sum, w) => sum + (w.elevationGain || 0), 0);
    const totalLoss = withElevation.reduce((sum, w) => sum + (w.elevationLoss || 0), 0);
    const totalKm = withElevation.reduce((sum, w) => sum + (w.distance || 0), 0);

    const steepestWorkout =
      withElevation.length > 0
        ? withElevation.reduce((steepest, w) => {
            const gain = (w.elevationGain || 0) / (w.distance || 1);
            const steepestGain = (steepest.elevationGain || 0) / (steepest.distance || 1);
            return gain > steepestGain ? w : steepest;
          })
        : null;

    // Agrupar por mes
    const monthlyMap = new Map<string, number>();
    withElevation.forEach((w) => {
      const date = new Date(w.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (w.elevationGain || 0));
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, gain]) => ({
        month: new Date(month + '-01').toLocaleDateString('es-ES', { month: 'short' }),
        gain: Math.round(gain),
      }));

    setStats({
      totalGain: Math.round(totalGain),
      totalLoss: Math.round(totalLoss),
      avgGainPerKm: totalKm > 0 ? Math.round(totalGain / totalKm) : 0,
      steepestWorkout,
      monthlyData,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
          Analisis de Desnivel
        </h1>
        <p className="text-sm text-zinc-500">Estadisticas de elevacion de tus entrenamientos</p>
      </div>

      {!stats ? (
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
              d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941"
            />
          </svg>
          <p className="text-zinc-400 mb-2">No hay datos de elevacion disponibles</p>
          <p className="text-sm text-zinc-600">
            Los datos de elevacion se obtienen automaticamente de Strava cuando sincronizas tus
            actividades
          </p>
        </div>
      ) : (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Desnivel total +</p>
              <p className="text-2xl font-mono text-emerald-400">{stats.totalGain.toLocaleString()}</p>
              <p className="text-xs text-zinc-600">metros</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Desnivel total -</p>
              <p className="text-2xl font-mono text-red-400">{stats.totalLoss.toLocaleString()}</p>
              <p className="text-xs text-zinc-600">metros</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Media por km</p>
              <p className="text-2xl font-mono text-zinc-100">{stats.avgGainPerKm}</p>
              <p className="text-xs text-zinc-600">m/km</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Everesting</p>
              <p className="text-2xl font-mono text-amber-400">
                {((stats.totalGain / 8849) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-zinc-600">del Everest (8,849m)</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfica mensual */}
            {stats.monthlyData.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                  Desnivel mensual
                </h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.monthlyData}>
                      <defs>
                        <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${value} m`, 'Desnivel']}
                      />
                      <Area
                        type="monotone"
                        dataKey="gain"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#elevGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Entreno más empinado */}
            {stats.steepestWorkout && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                  Entreno mas empinado
                </h2>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-zinc-200 font-medium">
                        {stats.steepestWorkout.title || 'Entrenamiento'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(stats.steepestWorkout.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono text-emerald-400">
                        +{stats.steepestWorkout.elevationGain}m
                      </p>
                      <p className="text-xs text-zinc-500">
                        {stats.steepestWorkout.distance?.toFixed(1)} km
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Pendiente media:</span>
                    <span className="text-sm font-mono text-amber-400">
                      {Math.round(
                        ((stats.steepestWorkout.elevationGain || 0) /
                          ((stats.steepestWorkout.distance || 1) * 1000)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lista de entrenos con desnivel */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
              Entrenos con desnivel
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {workouts
                .filter((w) => w.elevationGain && w.elevationGain > 0)
                .slice(0, 20)
                .map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">{w.title || 'Entrenamiento'}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(w.date)} - {w.distance?.toFixed(1)} km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-emerald-400">+{w.elevationGain}m</p>
                      {w.elevationLoss && (
                        <p className="text-xs font-mono text-red-400">-{w.elevationLoss}m</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Info sobre Strava */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              <strong>Nota:</strong> Los datos de elevacion se obtienen de Strava. Si no ves datos,
              asegurate de tener Strava conectado y sincronizado.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
