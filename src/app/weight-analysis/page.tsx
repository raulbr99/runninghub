'use client';

import { useState, useEffect } from 'react';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface WeightPerformanceData {
  hasData: boolean;
  message?: string;
  correlation?: number;
  optimalWeight?: number;
  currentWeight?: number;
  weightRanges?: { range: string; avgPace: number; count: number; minWeight: number }[];
  scatterData?: { weight: number; pace: number }[];
  monthlyData?: { month: string; avgWeight: number; avgPace: number }[];
  dataPoints?: number;
}

export default function WeightAnalysisPage() {
  const [data, setData] = useState<WeightPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/weight-performance');
      if (res.ok) {
        const perfData = await res.json();
        setData(perfData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPace = (pace: number) => {
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCorrelationLabel = (corr: number) => {
    const abs = Math.abs(corr);
    if (abs < 0.2) return { label: 'Sin correlacion', color: 'text-zinc-400' };
    if (abs < 0.4) return { label: 'Correlacion debil', color: 'text-zinc-400' };
    if (abs < 0.6) return { label: 'Correlacion moderada', color: 'text-amber-400' };
    if (abs < 0.8) return { label: 'Correlacion fuerte', color: 'text-emerald-400' };
    return { label: 'Correlacion muy fuerte', color: 'text-emerald-400' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-8">
          Correlacion Peso-Rendimiento
        </h1>
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
          <p className="text-zinc-400 mb-2">{data?.message || 'No hay suficientes datos'}</p>
          <p className="text-sm text-zinc-600">
            Registra tu peso regularmente y completa entrenamientos para ver las correlaciones
          </p>
        </div>
      </div>
    );
  }

  const corrLabel = getCorrelationLabel(data.correlation || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">
          Correlacion Peso-Rendimiento
        </h1>
        <p className="text-sm text-zinc-500">
          Analisis de como tu peso afecta tu ritmo de carrera
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Correlacion</p>
          <p className={`text-2xl font-mono ${corrLabel.color}`}>
            {data.correlation! > 0 ? '+' : ''}{data.correlation}
          </p>
          <p className="text-xs text-zinc-600 mt-1">{corrLabel.label}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Peso optimo</p>
          <p className="text-2xl font-mono text-emerald-400">{data.optimalWeight} kg</p>
          <p className="text-xs text-zinc-600 mt-1">En tus mejores entrenos</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Peso actual</p>
          <p className="text-2xl font-mono text-zinc-100">{data.currentWeight || '-'} kg</p>
          <p className="text-xs text-zinc-600 mt-1">Ultimo registro</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Datos analizados</p>
          <p className="text-2xl font-mono text-zinc-100">{data.dataPoints}</p>
          <p className="text-xs text-zinc-600 mt-1">entrenamientos</p>
        </div>
      </div>

      {/* Interpretación */}
      {data.correlation !== undefined && Math.abs(data.correlation) > 0.3 && (
        <div className={`mb-6 p-4 rounded-xl border ${
          data.correlation > 0
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <p className={data.correlation > 0 ? 'text-amber-200' : 'text-emerald-200'}>
            {data.correlation > 0 ? (
              <>
                <strong>Mayor peso = ritmos mas lentos.</strong> Los datos sugieren que cuando pesas mas,
                tus ritmos tienden a ser mas lentos. Considera si perder peso podria mejorar tu rendimiento.
              </>
            ) : (
              <>
                <strong>Menor peso = ritmos mas rapidos.</strong> Los datos confirman que cuando pesas menos,
                tus ritmos son mejores. Tu peso optimo estimado es {data.optimalWeight} kg.
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Scatter plot */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Peso vs Ritmo
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="weight"
                  type="number"
                  name="Peso"
                  unit=" kg"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <YAxis
                  dataKey="pace"
                  type="number"
                  name="Ritmo"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(v) => formatPace(v)}
                  domain={['dataMin - 0.2', 'dataMax + 0.2']}
                  reversed
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'Ritmo') return [formatPace(value as number) + '/km', name];
                    return [value + ' kg', name];
                  }}
                />
                <Scatter data={data.scatterData} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ritmo por rango de peso */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Ritmo medio por rango de peso
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weightRanges}>
                <XAxis
                  dataKey="range"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(v) => formatPace(v)}
                  domain={['dataMin - 0.2', 'dataMax + 0.2']}
                  reversed
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatPace(value as number) + '/km', 'Ritmo medio']}
                  labelFormatter={(label) => `${label} kg`}
                />
                <Bar dataKey="avgPace" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tendencia temporal */}
      {data.monthlyData && data.monthlyData.length > 2 && (
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Evolucion mensual
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyData}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                />
                <YAxis
                  yAxisId="weight"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <YAxis
                  yAxisId="pace"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(v) => formatPace(v)}
                  domain={['dataMin - 0.2', 'dataMax + 0.2']}
                  reversed
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'avgPace') return [formatPace(value as number) + '/km', 'Ritmo'];
                    return [value + ' kg', 'Peso'];
                  }}
                />
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="avgWeight"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                />
                <Line
                  yAxisId="pace"
                  type="monotone"
                  dataKey="avgPace"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-zinc-500">Peso (kg)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500">Ritmo (min/km)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
