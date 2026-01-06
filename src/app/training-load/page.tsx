'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

interface TrainingLoadData {
  current: {
    ctl: number;
    atl: number;
    tsb: number;
    todayTss: number;
  };
  form: {
    status: string;
    label: string;
    description: string;
  };
  risk: {
    monotony: number;
    strain: number;
    warning: boolean;
  };
  history: { date: string; ctl: number; atl: number; tsb: number; tss: number }[];
  weeklyLoad: { week: string; tss: number; km: number; hours: number }[];
}

export default function TrainingLoadPage() {
  const [data, setData] = useState<TrainingLoadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/training-load');
      if (res.ok) {
        const loadData = await res.json();
        setData(loadData);
      }
    } catch (error) {
      console.error('Error loading training load:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFormColor = (status: string) => {
    switch (status) {
      case 'fresh':
        return 'text-blue-400';
      case 'good':
        return 'text-emerald-400';
      case 'neutral':
        return 'text-zinc-400';
      case 'tired':
        return 'text-amber-400';
      case 'overreached':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getFormBg = (status: string) => {
    switch (status) {
      case 'fresh':
        return 'bg-blue-500/20 border-blue-500/30';
      case 'good':
        return 'bg-emerald-500/20 border-emerald-500/30';
      case 'neutral':
        return 'bg-zinc-500/20 border-zinc-500/30';
      case 'tired':
        return 'bg-amber-500/20 border-amber-500/30';
      case 'overreached':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-zinc-500/20 border-zinc-500/30';
    }
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
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">Training Load</h1>
        <p className="text-sm text-zinc-500">
          Analisis de carga de entrenamiento (Fitness, Fatiga y Forma)
        </p>
      </div>

      {data && (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">CTL (Fitness)</p>
              <p className="text-3xl font-mono text-emerald-400">{data.current.ctl}</p>
              <p className="text-xs text-zinc-600 mt-1">Media 42 dias</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">ATL (Fatiga)</p>
              <p className="text-3xl font-mono text-amber-400">{data.current.atl}</p>
              <p className="text-xs text-zinc-600 mt-1">Media 7 dias</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">TSB (Forma)</p>
              <p className={`text-3xl font-mono ${data.current.tsb >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {data.current.tsb > 0 ? '+' : ''}{data.current.tsb}
              </p>
              <p className="text-xs text-zinc-600 mt-1">CTL - ATL</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">TSS Hoy</p>
              <p className="text-3xl font-mono text-zinc-100">{data.current.todayTss}</p>
              <p className="text-xs text-zinc-600 mt-1">Carga del dia</p>
            </div>
            <div className={`rounded-xl p-4 border ${getFormBg(data.form.status)}`}>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Estado</p>
              <p className={`text-2xl font-medium ${getFormColor(data.form.status)}`}>
                {data.form.label}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{data.form.description}</p>
            </div>
          </div>

          {/* Alerta de riesgo */}
          {data.risk.warning && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-red-400 font-medium">Riesgo de sobreentrenamiento</p>
                  <p className="text-sm text-zinc-400">
                    Monotonia: {data.risk.monotony} | Strain: {data.risk.strain}. Considera reducir la carga.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Gráfica principal CTL/ATL/TSB */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4 mb-6">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
              Evolucion Fitness / Fatiga / Forma
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.history}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        ctl: 'Fitness (CTL)',
                        atl: 'Fatiga (ATL)',
                        tsb: 'Forma (TSB)',
                      };
                      return labels[value] || value;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="ctl"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="atl"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="tsb"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* TSS diario */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                TSS Diario
              </h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.history.slice(-30)}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: '#71717a' }}
                      interval={4}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [`${value} TSS`, 'Carga']}
                    />
                    <Bar dataKey="tss" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Carga semanal */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Carga Semanal
              </h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.weeklyLoad}>
                    <defs>
                      <linearGradient id="tssGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="week"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value, name) => {
                        if (name === 'tss') return [`${value}`, 'TSS'];
                        if (name === 'km') return [`${value} km`, 'Distancia'];
                        if (name === 'hours') return [`${value}h`, 'Tiempo'];
                        return [value, name];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tss"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#tssGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Info educativa */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
              Como interpretar los datos
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-emerald-400 font-medium mb-1">CTL (Chronic Training Load)</p>
                <p className="text-zinc-500 text-xs">
                  Tu nivel de fitness acumulado. Sube con entrenamiento consistente. Objetivo: aumentar gradualmente.
                </p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-amber-400 font-medium mb-1">ATL (Acute Training Load)</p>
                <p className="text-zinc-500 text-xs">
                  Tu fatiga reciente. Sube rapido con entrenos duros. Baja con descanso.
                </p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-blue-400 font-medium mb-1">TSB (Training Stress Balance)</p>
                <p className="text-zinc-500 text-xs">
                  Tu forma actual. Positivo = fresco. Negativo = fatigado. Ideal para competir: +10 a +25.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
