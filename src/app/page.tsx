'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { xpForNextLevel } from '@/lib/gamification';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RunnerProfile {
  name: string | null;
  weight: number | null;
  currentGoal: string | null;
  pb5k: string | null;
  pb10k: string | null;
}

interface RunningEvent {
  id: string;
  date: string;
  type: string;
  distance: number | null;
  duration: number | null;
  completed: number;
}

interface WeightEntry {
  date: string;
  weight: number;
}

interface UserStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
}

interface Challenge {
  id: string;
  title: string;
  target: number;
  current: number;
  xpReward: number;
  endDate: string;
}

interface WeeklyStats {
  week: string;
  km: number;
  sessions: number;
  minutes: number;
}

interface DashboardStats {
  weeklyStats: WeeklyStats[];
  nextRace: {
    id: string;
    date: string;
    title: string;
    distance: number;
  } | null;
  targetDate: string | null;
  targetRace: string | null;
  prs: {
    longestRun: number | null;
    fastestPace: number | null;
  };
  quote: {
    quote: string;
    author: string;
  };
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [events, setEvents] = useState<RunningEvent[]>([]);
  const [weight, setWeight] = useState<WeightEntry | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, eventsRes, weightRes, statsRes, challengesRes, dashboardRes] = await Promise.all([
        fetch('/api/runner-profile'),
        fetch(`/api/running-events?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`),
        fetch('/api/weight?limit=1'),
        fetch('/api/stats'),
        fetch('/api/challenges'),
        fetch('/api/dashboard-stats'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        if (Array.isArray(data)) setEvents(data);
      }
      if (weightRes.ok) {
        const data = await weightRes.json();
        if (Array.isArray(data) && data.length > 0) setWeight(data[0]);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (challengesRes.ok) {
        const data = await challengesRes.json();
        setChallenges(data.active || []);
      }
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === today);
  const upcomingEvents = events
    .filter(e => e.date > today && e.completed === 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const monthStats = events.reduce((acc, e) => {
    if (e.completed) {
      acc.totalDistance += e.distance || 0;
      acc.totalDuration += e.duration || 0;
      acc.completedRuns++;
    }
    return acc;
  }, { totalDistance: 0, totalDuration: 0, completedRuns: 0 });

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      easy: 'Rodaje',
      tempo: 'Tempo',
      intervals: 'Series',
      long: 'Tirada larga',
      rest: 'Descanso',
      race: 'Competicion',
      strength: 'Fuerza',
      recovery: 'Recuperacion',
      cycling: 'Ciclismo',
      walk: 'Caminata',
      swim: 'Natacion',
      other: 'Otro',
    };
    return types[type] || type;
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatPace = (minPerKm: number) => {
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight">
          {profile?.name || 'Corredor'}
        </h1>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Nivel {stats?.level || 1}</span>
          </div>
          <p className="text-2xl font-mono text-zinc-100">{stats?.totalXp || 0}</p>
          <p className="text-xs text-zinc-500 mt-1">XP total</p>
          <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${stats ? Math.min(100, (stats.totalXp / xpForNextLevel(stats.level)) * 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
            </svg>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Record {stats?.longestStreak || 0}d</span>
          </div>
          <p className="text-2xl font-mono text-zinc-100">{stats?.currentStreak || 0}</p>
          <p className="text-xs text-zinc-500 mt-1">dias de racha</p>
        </div>

        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Este mes</span>
          </div>
          <p className="text-2xl font-mono text-zinc-100">{monthStats.totalDistance.toFixed(1)}</p>
          <p className="text-xs text-zinc-500 mt-1">kilometros</p>
        </div>

        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{monthStats.completedRuns} sesiones</span>
          </div>
          <p className="text-2xl font-mono text-zinc-100">{Math.floor(monthStats.totalDuration / 60)}:{(monthStats.totalDuration % 60).toString().padStart(2, '0')}</p>
          <p className="text-xs text-zinc-500 mt-1">horas activo</p>
        </div>
      </div>

      {/* Gráfica de evolución + Cuenta atrás + PRs */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Gráfica de volumen semanal */}
        <div className="lg:col-span-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Volumen semanal
          </h2>
          {dashboardStats?.weeklyStats && dashboardStats.weeklyStats.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardStats.weeklyStats}>
                  <defs>
                    <linearGradient id="kmGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(value) => [`${value} km`, 'Distancia']}
                  />
                  <Area
                    type="monotone"
                    dataKey="km"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#kmGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
              Sin datos de las ultimas semanas
            </div>
          )}
        </div>

        {/* Cuenta atrás y PRs */}
        <div className="space-y-4">
          {/* Cuenta atrás */}
          {(dashboardStats?.nextRace || dashboardStats?.targetDate) && (
            <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 rounded-xl border border-emerald-800/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Proxima carrera</span>
              </div>
              {dashboardStats.nextRace ? (
                <>
                  <p className="text-3xl font-mono text-zinc-100 mb-1">
                    {getDaysUntil(dashboardStats.nextRace.date)}
                    <span className="text-base text-zinc-400 ml-1">dias</span>
                  </p>
                  <p className="text-sm text-zinc-400">
                    {dashboardStats.nextRace.title || dashboardStats.targetRace || 'Carrera'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(dashboardStats.nextRace.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                    })}
                    {dashboardStats.nextRace.distance && ` - ${dashboardStats.nextRace.distance} km`}
                  </p>
                </>
              ) : dashboardStats.targetDate ? (
                <>
                  <p className="text-3xl font-mono text-zinc-100 mb-1">
                    {getDaysUntil(dashboardStats.targetDate)}
                    <span className="text-base text-zinc-400 ml-1">dias</span>
                  </p>
                  <p className="text-sm text-zinc-400">{dashboardStats.targetRace || 'Objetivo'}</p>
                </>
              ) : null}
            </div>
          )}

          {/* PRs del mes */}
          {(dashboardStats?.prs?.longestRun || dashboardStats?.prs?.fastestPace) && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">PRs este mes</h3>
              <div className="space-y-3">
                {dashboardStats.prs.longestRun && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Tirada mas larga</span>
                    <span className="text-sm font-mono text-emerald-400">
                      {dashboardStats.prs.longestRun.toFixed(1)} km
                    </span>
                  </div>
                )}
                {dashboardStats.prs.fastestPace && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Ritmo mas rapido</span>
                    <span className="text-sm font-mono text-emerald-400">
                      {formatPace(dashboardStats.prs.fastestPace)} /km
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Frase motivacional */}
          {dashboardStats?.quote && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
              <svg className="w-5 h-5 text-amber-500 mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-sm text-zinc-300 italic mb-2">&quot;{dashboardStats.quote.quote}&quot;</p>
              <p className="text-xs text-zinc-500">— {dashboardStats.quote.author}</p>
            </div>
          )}
        </div>
      </div>

      {/* Retos activos */}
      {challenges.length > 0 && (
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Retos activos</h2>
            <Link href="/achievements" className="text-xs text-emerald-500 hover:text-emerald-400">
              Ver todos
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {challenges.slice(0, 3).map((challenge) => {
              const progress = Math.min(100, (challenge.current / challenge.target) * 100);
              return (
                <div key={challenge.id} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-zinc-200">{challenge.title}</p>
                    <span className="text-[10px] text-emerald-400 font-mono">+{challenge.xpReward}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{challenge.current}/{challenge.target}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Mini calendario */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
              {new Date().toLocaleDateString('es-ES', { month: 'long' })}
            </h2>
            <Link href="/calendar" className="text-xs text-emerald-500 hover:text-emerald-400">
              Abrir
            </Link>
          </div>
          <div className="p-4">
            {(() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const startDay = (firstDay.getDay() + 6) % 7;
              const daysInMonth = lastDay.getDate();
              const todayDate = now.getDate();

              const eventDates = new Set(events.map(e => {
                const d = new Date(e.date);
                if (d.getMonth() === month && d.getFullYear() === year) {
                  return d.getDate();
                }
                return null;
              }).filter(Boolean));

              const weeks = [];
              let days = [];

              for (let i = 0; i < startDay; i++) {
                days.push(<div key={`empty-${i}`} className="h-7" />);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const hasEvent = eventDates.has(day);
                const isToday = day === todayDate;
                days.push(
                  <div
                    key={day}
                    className={`h-7 w-7 flex items-center justify-center text-xs rounded relative ${
                      isToday
                        ? 'bg-emerald-500 text-white font-medium'
                        : 'text-zinc-400'
                    }`}
                  >
                    {day}
                    {hasEvent && !isToday && (
                      <span className="absolute bottom-0.5 w-1 h-1 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                );

                if ((startDay + day) % 7 === 0 || day === daysInMonth) {
                  weeks.push(
                    <div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-0.5">
                      {days}
                    </div>
                  );
                  days = [];
                }
              }

              return (
                <div className="space-y-0.5">
                  <div className="grid grid-cols-7 gap-0.5 mb-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                      <div key={d} className="h-6 flex items-center justify-center text-[10px] font-medium text-zinc-600">
                        {d}
                      </div>
                    ))}
                  </div>
                  {weeks}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Sesion de hoy */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Hoy</h2>
          </div>
          <div className="p-4">
            {todayEvents.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-8 h-8 text-zinc-700 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <p className="text-sm text-zinc-500">Dia de descanso</p>
                <Link href="/calendar" className="inline-block mt-2 text-xs text-emerald-500 hover:text-emerald-400">
                  Programar sesion
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <div className={`w-2 h-2 rounded-full ${event.completed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-200">{getEventTypeLabel(event.type)}</p>
                      <p className="text-xs text-zinc-500">
                        {event.distance && `${event.distance} km`}
                        {event.distance && event.duration && ' · '}
                        {event.duration && `${event.duration} min`}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider ${event.completed ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {event.completed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Proximas sesiones */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Proximas</h2>
            <Link href="/calendar" className="text-xs text-emerald-500 hover:text-emerald-400">
              Ver todas
            </Link>
          </div>
          <div className="p-4">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-8 h-8 text-zinc-700 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <p className="text-sm text-zinc-500">Sin sesiones programadas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => {
                  const eventDate = new Date(event.date);
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2 hover:bg-zinc-800/30 rounded-lg transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/50 flex flex-col items-center justify-center">
                        <span className="text-[9px] text-zinc-500 uppercase">
                          {eventDate.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </span>
                        <span className="text-sm font-mono text-zinc-300">{eventDate.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{getEventTypeLabel(event.type)}</p>
                        <p className="text-xs text-zinc-500">
                          {event.distance && `${event.distance} km`}
                          {event.distance && event.duration && ' · '}
                          {event.duration && `${event.duration} min`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accesos rapidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/coach" className="group bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl p-4 border border-zinc-800/50 hover:border-emerald-500/30 transition-all">
          <svg className="w-6 h-6 text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-sm font-medium text-zinc-200">Coach</p>
          <p className="text-xs text-zinc-500 mt-0.5">Consulta al entrenador</p>
        </Link>

        <Link href="/calendar" className="group bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl p-4 border border-zinc-800/50 hover:border-blue-500/30 transition-all">
          <svg className="w-6 h-6 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-sm font-medium text-zinc-200">Sesiones</p>
          <p className="text-xs text-zinc-500 mt-0.5">Planifica entrenos</p>
        </Link>

        <Link href="/weight" className="group bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl p-4 border border-zinc-800/50 hover:border-amber-500/30 transition-all">
          <svg className="w-6 h-6 text-amber-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
          </svg>
          <p className="text-sm font-medium text-zinc-200">Peso</p>
          <p className="text-xs text-zinc-500 mt-0.5">{weight?.weight ? `${weight.weight} kg` : 'Registrar'}</p>
        </Link>

        <Link href="/profile" className="group bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl p-4 border border-zinc-800/50 hover:border-purple-500/30 transition-all">
          <svg className="w-6 h-6 text-purple-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <p className="text-sm font-medium text-zinc-200">Perfil</p>
          <p className="text-xs text-zinc-500 mt-0.5">Datos y marcas</p>
        </Link>
      </div>
    </div>
  );
}
