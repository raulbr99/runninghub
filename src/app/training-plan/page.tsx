'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PlanEvent {
  date: string;
  type: string;
  title: string;
  distance?: number | null;
  duration?: number | null;
  notes?: string | null;
}

interface Phase {
  name: string;
  weeks: string;
  focus: string;
}

interface GeneratedPlan {
  planName: string;
  totalWeeks: number;
  weeklyVolume: number[];
  phases: Phase[];
  events: PlanEvent[];
}

interface FormData {
  raceType: string;
  raceName: string;
  raceDate: string;
  targetTime: string;
  currentLevel: string;
  currentWeeklyKm: string;
  recentRaceTime: string;
  availableDays: number[];
  maxHoursPerSession: number;
  longRunDay: number;
  includeStrength: boolean;
  includeIntervals: boolean;
  includeTempo: boolean;
}

const raceTypes = [
  { value: '5k', label: '5K', distance: '5 km' },
  { value: '10k', label: '10K', distance: '10 km' },
  { value: 'half_marathon', label: 'Media Maraton', distance: '21.1 km' },
  { value: 'marathon', label: 'Maraton', distance: '42.2 km' },
  { value: 'trail', label: 'Trail', distance: '~25 km' },
  { value: 'ultra', label: 'Ultra', distance: '50+ km' },
];

const levels = [
  { value: 'beginner', label: 'Principiante', desc: 'Menos de 1 ano corriendo' },
  { value: 'intermediate', label: 'Intermedio', desc: '1-3 anos de experiencia' },
  { value: 'advanced', label: 'Avanzado', desc: 'Mas de 3 anos, busco marcas' },
];

const days = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
];

const typeIcons: Record<string, { icon: JSX.Element; color: string }> = {
  easy: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />, color: 'text-emerald-500' },
  tempo: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />, color: 'text-orange-500' },
  intervals: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />, color: 'text-red-500' },
  fartlek: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />, color: 'text-purple-500' },
  long: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />, color: 'text-blue-500' },
  recovery: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />, color: 'text-pink-500' },
  race: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.927 0" />, color: 'text-amber-500' },
  strength: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />, color: 'text-zinc-400' },
  rest: { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />, color: 'text-zinc-600' },
};

export default function TrainingPlanPage() {
  const [step, setStep] = useState<'form' | 'generating' | 'preview' | 'saving'>('form');
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>({
    raceType: 'half_marathon',
    raceName: '',
    raceDate: '',
    targetTime: '',
    currentLevel: 'intermediate',
    currentWeeklyKm: '',
    recentRaceTime: '',
    availableDays: [1, 3, 5, 6],
    maxHoursPerSession: 1.5,
    longRunDay: 0,
    includeStrength: true,
    includeIntervals: true,
    includeTempo: true,
  });

  useEffect(() => {
    // Set default race date to 12 weeks from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 84);
    setFormData(prev => ({ ...prev, raceDate: defaultDate.toISOString().split('T')[0] }));
  }, []);

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day].sort((a, b) => a - b)
    }));
  };

  const generatePlan = async () => {
    if (!formData.raceDate || formData.availableDays.length < 2) {
      setError('Selecciona fecha de carrera y al menos 2 dias de entrenamiento');
      return;
    }

    setStep('generating');
    setError(null);

    try {
      const response = await fetch('/api/training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          currentWeeklyKm: formData.currentWeeklyKm ? Number(formData.currentWeeklyKm) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar el plan');
      }

      const data = await response.json();
      setPlan(data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStep('form');
    }
  };

  const savePlan = async () => {
    if (!plan) return;

    setStep('saving');
    setError(null);

    try {
      const response = await fetch('/api/running-events/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: plan.events,
          planName: plan.planName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar el plan');
      }

      // Redirect to calendar
      window.location.href = '/calendar';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStep('preview');
    }
  };

  const getWeekEvents = (weekNumber: number) => {
    if (!plan) return [];
    const startDate = new Date(plan.events[0]?.date);
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return plan.events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= weekStart && eventDate < weekEnd;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/calendar" className="text-xs text-zinc-500 hover:text-zinc-300 mb-3 inline-flex items-center gap-1 uppercase tracking-wider">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Calendario
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Plan de Entrenamiento</h1>
            <p className="text-sm text-zinc-500">Genera un plan personalizado para tu carrera</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Form Step */}
      {step === 'form' && (
        <div className="space-y-6">
          {/* Carrera */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
              Carrera Objetivo
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Tipo de carrera</label>
                <div className="grid grid-cols-3 gap-2">
                  {raceTypes.map(race => (
                    <button
                      key={race.value}
                      onClick={() => setFormData(prev => ({ ...prev, raceType: race.value }))}
                      className={`p-3 rounded-lg text-center transition-all ${
                        formData.raceType === race.value
                          ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <p className="font-medium text-sm">{race.label}</p>
                      <p className="text-xs text-zinc-600">{race.distance}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Nombre de la carrera</label>
                  <input
                    type="text"
                    value={formData.raceName}
                    onChange={(e) => setFormData(prev => ({ ...prev, raceName: e.target.value }))}
                    placeholder="Ej: Maraton de Valencia"
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Fecha de la carrera *</label>
                  <input
                    type="date"
                    value={formData.raceDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, raceDate: e.target.value }))}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Tiempo objetivo</label>
                  <input
                    type="text"
                    value={formData.targetTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetTime: e.target.value }))}
                    placeholder="Ej: 1:45:00"
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 font-mono focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Nivel */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              Tu Nivel
            </h2>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {levels.map(level => (
                <button
                  key={level.value}
                  onClick={() => setFormData(prev => ({ ...prev, currentLevel: level.value }))}
                  className={`p-4 rounded-lg text-left transition-all ${
                    formData.currentLevel === level.value
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  <p className={`font-medium text-sm ${formData.currentLevel === level.value ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {level.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{level.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Km semanales actuales</label>
                <input
                  type="number"
                  value={formData.currentWeeklyKm}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentWeeklyKm: e.target.value }))}
                  placeholder="Ej: 30"
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 font-mono focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Ultima marca (distancia similar)</label>
                <input
                  type="text"
                  value={formData.recentRaceTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, recentRaceTime: e.target.value }))}
                  placeholder="Ej: 1:50:00"
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 font-mono focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Disponibilidad */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              Disponibilidad
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">Dias disponibles para entrenar *</label>
                <div className="flex gap-2">
                  {days.map(day => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                        formData.availableDays.includes(day.value)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:border-zinc-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">Dia para tirada larga</label>
                <div className="flex gap-2">
                  {days.map(day => (
                    <button
                      key={day.value}
                      onClick={() => setFormData(prev => ({ ...prev, longRunDay: day.value }))}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                        formData.longRunDay === day.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:border-zinc-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                  Tiempo maximo por sesion: <span className="text-zinc-300 font-mono">{formData.maxHoursPerSession}h</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={formData.maxHoursPerSession}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxHoursPerSession: Number(e.target.value) }))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>30 min</span>
                  <span>3 horas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preferencias */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              Preferencias de Entrenamiento
            </h2>

            <div className="space-y-3">
              {[
                { key: 'includeStrength', label: 'Incluir sesiones de fuerza', desc: 'Ejercicios complementarios para prevenir lesiones' },
                { key: 'includeIntervals', label: 'Incluir series/intervalos', desc: 'Entrenamientos de velocidad para mejorar ritmo' },
                { key: 'includeTempo', label: 'Incluir tempo/ritmo controlado', desc: 'Rodajes a ritmo de carrera' },
              ].map(pref => (
                <label
                  key={pref.key}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                >
                  <div>
                    <p className="text-sm text-zinc-200">{pref.label}</p>
                    <p className="text-xs text-zinc-500">{pref.desc}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData[pref.key as keyof FormData] as boolean}
                      onChange={(e) => setFormData(prev => ({ ...prev, [pref.key]: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-emerald-500 transition-colors"></div>
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={generatePlan}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            Generar Plan con IA
          </button>
        </div>
      )}

      {/* Generating Step */}
      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-lg text-zinc-300 mb-2">Generando tu plan personalizado</p>
          <p className="text-sm text-zinc-500">Esto puede tardar unos segundos...</p>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && plan && (
        <div className="space-y-6">
          {/* Plan Summary */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 rounded-xl border border-emerald-500/30 p-6">
            <h2 className="text-xl font-light text-zinc-100 mb-4">{plan.planName}</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-3xl font-mono text-emerald-400">{plan.totalWeeks}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">semanas</p>
              </div>
              <div>
                <p className="text-3xl font-mono text-zinc-100">{plan.events.length}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">sesiones</p>
              </div>
              <div>
                <p className="text-3xl font-mono text-zinc-100">{plan.weeklyVolume.reduce((a, b) => a + b, 0)}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">km total</p>
              </div>
            </div>

            {/* Phases */}
            <div className="flex flex-wrap gap-2">
              {plan.phases.map((phase, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-zinc-800/50 text-xs text-zinc-400">
                  <span className="text-zinc-200">{phase.name}</span> (S{phase.weeks}): {phase.focus}
                </span>
              ))}
            </div>
          </div>

          {/* Weeks */}
          <div className="space-y-3">
            {Array.from({ length: plan.totalWeeks }, (_, i) => i + 1).map(week => {
              const weekEvents = getWeekEvents(week);
              const weekKm = weekEvents.reduce((sum, e) => sum + (e.distance || 0), 0);
              const isExpanded = expandedWeeks.includes(week);

              return (
                <div key={week} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
                  <button
                    onClick={() => toggleWeek(week)}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-mono text-zinc-400">
                        {week}
                      </span>
                      <div className="text-left">
                        <p className="text-sm text-zinc-200">Semana {week}</p>
                        <p className="text-xs text-zinc-500">{weekEvents.length} sesiones</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-emerald-400">{weekKm.toFixed(0)} km</span>
                      <svg
                        className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {weekEvents.map((event, i) => {
                        const typeInfo = typeIcons[event.type] || typeIcons.easy;
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
                            <svg className={`w-5 h-5 ${typeInfo.color}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              {typeInfo.icon}
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-zinc-200">{event.title}</p>
                                <span className="text-xs text-zinc-600">{formatDate(event.date)}</span>
                              </div>
                              {event.notes && (
                                <p className="text-xs text-zinc-500 truncate">{event.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              {event.distance && (
                                <p className="text-sm font-mono text-zinc-300">{event.distance} km</p>
                              )}
                              {event.duration && (
                                <p className="text-xs text-zinc-500 font-mono">{event.duration} min</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setStep('form'); setPlan(null); }}
              className="flex-1 py-3 border border-zinc-700 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Volver a configurar
            </button>
            <button
              onClick={savePlan}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              Agregar al Calendario ({plan.events.length} sesiones)
            </button>
          </div>
        </div>
      )}

      {/* Saving Step */}
      {step === 'saving' && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-lg text-zinc-300 mb-2">Guardando en el calendario</p>
          <p className="text-sm text-zinc-500">Creando {plan?.events.length} sesiones...</p>
        </div>
      )}
    </div>
  );
}
