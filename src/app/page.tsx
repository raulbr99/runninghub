'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function DashboardPage() {
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [events, setEvents] = useState<RunningEvent[]>([]);
  const [weight, setWeight] = useState<WeightEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, eventsRes, weightRes] = await Promise.all([
        fetch('/api/runner-profile'),
        fetch(`/api/running-events?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`),
        fetch('/api/weight?limit=1'),
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
    const types: Record<string, { label: string; icon: string }> = {
      easy: { label: 'Rodaje', icon: '🏃' },
      tempo: { label: 'Tempo', icon: '⚡' },
      intervals: { label: 'Series', icon: '🔥' },
      long: { label: 'Tirada larga', icon: '🛤️' },
      rest: { label: 'Descanso', icon: '😴' },
      race: { label: 'Carrera', icon: '🏆' },
      strength: { label: 'Fuerza', icon: '💪' },
      recovery: { label: 'Recuperacion', icon: '🧘' },
      cycling: { label: 'Ciclismo', icon: '🚴' },
      walk: { label: 'Caminata', icon: '🚶' },
      swim: { label: 'Natacion', icon: '🏊' },
      other: { label: 'Otro', icon: '🏅' },
    };
    return types[type] || { label: type, icon: '🏅' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hola, {profile?.name || 'Corredor'} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-xl">🏃</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Este mes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{monthStats.totalDistance.toFixed(1)} km</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-xl">⏱️</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tiempo total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{Math.floor(monthStats.totalDuration / 60)}h {monthStats.totalDuration % 60}m</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Entrenos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{monthStats.completedRuns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-xl">⚖️</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Peso actual</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{weight?.weight || '-'} kg</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Widget Calendario del Mes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <Link href="/calendar" className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline">
              Ver todo
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
                days.push(<div key={`empty-${i}`} className="h-8" />);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const hasEvent = eventDates.has(day);
                const isToday = day === todayDate;
                days.push(
                  <div
                    key={day}
                    className={`h-8 w-8 flex items-center justify-center text-sm rounded-full relative ${
                      isToday
                        ? 'bg-green-600 text-white font-bold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                    {hasEvent && !isToday && (
                      <span className="absolute bottom-0.5 w-1 h-1 bg-green-500 rounded-full" />
                    )}
                    {hasEvent && isToday && (
                      <span className="absolute bottom-0.5 w-1 h-1 bg-white rounded-full" />
                    )}
                  </div>
                );

                if ((startDay + day) % 7 === 0 || day === daysInMonth) {
                  weeks.push(
                    <div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-1">
                      {days}
                    </div>
                  );
                  days = [];
                }
              }

              return (
                <div className="space-y-1">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                      <div key={d} className="h-6 flex items-center justify-center text-xs font-medium text-gray-400">
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

        {/* Entrenamiento de hoy */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Entrenamiento de hoy</h2>
          </div>
          <div className="p-4">
            {todayEvents.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">😴</span>
                <p className="text-gray-500 dark:text-gray-400">No hay entrenamientos programados</p>
                <Link href="/calendar" className="inline-block mt-3 text-green-600 dark:text-green-400 text-sm font-medium hover:underline">
                  Ir al calendario
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((event) => {
                  const eventType = getEventTypeLabel(event.type);
                  return (
                    <div key={event.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <span className="text-2xl">{eventType.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{eventType.label}</p>
                        <p className="text-sm text-gray-500">
                          {event.distance && `${event.distance} km`}
                          {event.distance && event.duration && ' - '}
                          {event.duration && `${event.duration} min`}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-lg ${event.completed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {event.completed ? 'Completado' : 'Pendiente'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Proximos entrenos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Proximos entrenos</h2>
            <Link href="/calendar" className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="p-4">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">📅</span>
                <p className="text-gray-500 dark:text-gray-400">No hay entrenamientos proximos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const eventType = getEventTypeLabel(event.type);
                  const eventDate = new Date(event.date);
                  return (
                    <div key={event.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex flex-col items-center justify-center">
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium uppercase">
                          {eventDate.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">{eventDate.getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{eventType.icon}</span> {eventType.label}
                        </p>
                        <p className="text-sm text-gray-500">
                          {event.distance && `${event.distance} km`}
                          {event.distance && event.duration && ' - '}
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/coach" className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white hover:from-green-600 hover:to-emerald-700 transition-all">
          <span className="text-3xl mb-2 block">🏃</span>
          <p className="font-semibold">Coach</p>
          <p className="text-sm opacity-80">Habla con tu coach</p>
        </Link>

        <Link href="/calendar" className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white hover:from-blue-600 hover:to-indigo-700 transition-all">
          <span className="text-3xl mb-2 block">📅</span>
          <p className="font-semibold">Calendario</p>
          <p className="text-sm opacity-80">Ver entrenamientos</p>
        </Link>

        <Link href="/weight" className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-4 text-white hover:from-orange-600 hover:to-red-700 transition-all">
          <span className="text-3xl mb-2 block">⚖️</span>
          <p className="font-semibold">Peso</p>
          <p className="text-sm opacity-80">Registrar peso</p>
        </Link>

        <Link href="/nutrition" className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-4 text-white hover:from-yellow-600 hover:to-orange-700 transition-all">
          <span className="text-3xl mb-2 block">🍎</span>
          <p className="font-semibold">Nutricion</p>
          <p className="text-sm opacity-80">Registrar comidas</p>
        </Link>
      </div>
    </div>
  );
}
