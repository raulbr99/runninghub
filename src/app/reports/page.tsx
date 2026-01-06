'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ReportStats {
  totalKm: number;
  totalMinutes: number;
  sessions: number;
  avgPace: number | null;
  longestRun: number | null;
  fastestPace: number | null;
  bestWorkout: {
    date: string;
    type: string;
    distance: number;
    duration: number;
  } | null;
  byType: Record<string, { count: number; km: number; minutes: number }>;
  byDay: Record<string, { km: number; minutes: number }>;
}

interface Report {
  type: string;
  period: { start: string; end: string };
  current: ReportStats;
  previous: ReportStats;
  changes: {
    km: number | null;
    sessions: number | null;
    minutes: number | null;
  };
}

const TYPE_COLORS: Record<string, string> = {
  easy: '#10b981',
  tempo: '#f59e0b',
  intervals: '#ef4444',
  long: '#8b5cf6',
  recovery: '#06b6d4',
  race: '#ec4899',
};

const TYPE_LABELS: Record<string, string> = {
  easy: 'Rodaje',
  tempo: 'Tempo',
  intervals: 'Series',
  long: 'Tirada larga',
  recovery: 'Recuperacion',
  race: 'Competicion',
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadReport();
  }, [reportType, selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports?type=${reportType}&date=${selectedDate.toISOString().split('T')[0]}`
      );
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPace = (pace: number) => {
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

  const navigatePeriod = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (reportType === 'weekly') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
  };

  const getPeriodLabel = () => {
    if (!report) return '';
    const start = new Date(report.period.start);
    const end = new Date(report.period.end);

    if (reportType === 'weekly') {
      return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'long' })}`;
    }
    return start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const getByDayData = () => {
    if (!report?.current.byDay) return [];
    return Object.entries(report.current.byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        day: new Date(date).getDate().toString(),
        km: data.km,
      }));
  };

  const getByTypeData = () => {
    if (!report?.current.byType) return [];
    return Object.entries(report.current.byType).map(([type, data]) => ({
      name: TYPE_LABELS[type] || type,
      value: data.km,
      color: TYPE_COLORS[type] || '#71717a',
    }));
  };

  const ChangeIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return null;
    const isPositive = value >= 0;
    return (
      <span className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}
        {value}%
      </span>
    );
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-4">Informes</h1>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setReportType('weekly')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                reportType === 'weekly'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                reportType === 'monthly'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Mensual
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigatePeriod(-1)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-zinc-300 min-w-[150px] text-center">{getPeriodLabel()}</span>
            <button
              onClick={() => navigatePeriod(1)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Distancia</span>
                <ChangeIndicator value={report.changes.km} />
              </div>
              <p className="text-2xl font-mono text-zinc-100">{report.current.totalKm}</p>
              <p className="text-xs text-zinc-500">kilometros</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Sesiones</span>
                <ChangeIndicator value={report.changes.sessions} />
              </div>
              <p className="text-2xl font-mono text-zinc-100">{report.current.sessions}</p>
              <p className="text-xs text-zinc-500">entrenamientos</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Tiempo</span>
                <ChangeIndicator value={report.changes.minutes} />
              </div>
              <p className="text-2xl font-mono text-zinc-100">
                {formatDuration(report.current.totalMinutes)}
              </p>
              <p className="text-xs text-zinc-500">activo</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Ritmo medio</span>
              <p className="text-2xl font-mono text-zinc-100 mt-2">
                {report.current.avgPace ? formatPace(report.current.avgPace) : '-'}
              </p>
              <p className="text-xs text-zinc-500">min/km</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Kilometros por dia
              </h2>
              {getByDayData().length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getByDayData()}>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
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
                        formatter={(value) => [`${value} km`, 'Distancia']}
                      />
                      <Bar dataKey="km" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
                  Sin datos para este periodo
                </div>
              )}
            </div>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Por tipo
              </h2>
              {getByTypeData().length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getByTypeData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {getByTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${value} km`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
                  Sin datos
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {getByTypeData().map((item) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-zinc-500">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Records del periodo
              </h2>
              <div className="space-y-4">
                {report.current.longestRun && (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300">Tirada mas larga</p>
                        <p className="text-xs text-zinc-500">Mayor distancia</p>
                      </div>
                    </div>
                    <span className="text-lg font-mono text-purple-400">
                      {report.current.longestRun} km
                    </span>
                  </div>
                )}

                {report.current.fastestPace && (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300">Ritmo mas rapido</p>
                        <p className="text-xs text-zinc-500">En entreno +3km</p>
                      </div>
                    </div>
                    <span className="text-lg font-mono text-amber-400">
                      {formatPace(report.current.fastestPace)} /km
                    </span>
                  </div>
                )}

                {!report.current.longestRun && !report.current.fastestPace && (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    Sin records en este periodo
                  </p>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                Comparativa
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Distancia</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-500">{report.previous.totalKm} km</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-sm text-zinc-200">{report.current.totalKm} km</span>
                    <ChangeIndicator value={report.changes.km} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Sesiones</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-500">{report.previous.sessions}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-sm text-zinc-200">{report.current.sessions}</span>
                    <ChangeIndicator value={report.changes.sessions} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Tiempo</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-500">
                      {formatDuration(report.previous.totalMinutes)}
                    </span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-sm text-zinc-200">
                      {formatDuration(report.current.totalMinutes)}
                    </span>
                    <ChangeIndicator value={report.changes.minutes} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Ritmo medio</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-500">
                      {report.previous.avgPace ? formatPace(report.previous.avgPace) : '-'}
                    </span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-sm text-zinc-200">
                      {report.current.avgPace ? formatPace(report.current.avgPace) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
