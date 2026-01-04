'use client';

import { useState, useEffect } from 'react';

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Categorias de eventos
type EventCategory = 'running' | 'strength' | 'cycling' | 'swimming' | 'other_sport' | 'personal' | 'rest';

const CATEGORIES: { id: EventCategory; label: string; icon: string; color: string }[] = [
  { id: 'running', label: 'Running', icon: '', color: 'bg-emerald-500' },
  { id: 'strength', label: 'Fuerza', icon: '', color: 'bg-amber-500' },
  { id: 'cycling', label: 'Ciclismo', icon: '', color: 'bg-sky-500' },
  { id: 'swimming', label: 'Natacion', icon: '', color: 'bg-cyan-500' },
  { id: 'other_sport', label: 'Otro', icon: '', color: 'bg-orange-500' },
  { id: 'personal', label: 'Personal', icon: '', color: 'bg-indigo-500' },
  { id: 'rest', label: 'Descanso', icon: '', color: 'bg-zinc-500' },
];

// Tipos por categoria
const EVENT_TYPES: Record<EventCategory, { id: string; label: string; color: string; icon: string }[]> = {
  running: [
    { id: 'easy', label: 'Rodaje', color: 'bg-emerald-500', icon: '' },
    { id: 'tempo', label: 'Tempo', color: 'bg-orange-500', icon: '' },
    { id: 'intervals', label: 'Series', color: 'bg-red-500', icon: '' },
    { id: 'fartlek', label: 'Fartlek', color: 'bg-pink-500', icon: '' },
    { id: 'long', label: 'Tirada larga', color: 'bg-blue-500', icon: '' },
    { id: 'recovery', label: 'Recuperacion', color: 'bg-teal-500', icon: '' },
    { id: 'race', label: 'Competicion', color: 'bg-purple-500', icon: '' },
    { id: 'trail', label: 'Trail', color: 'bg-emerald-600', icon: '' },
  ],
  strength: [
    { id: 'upper', label: 'Tren superior', color: 'bg-amber-500', icon: '' },
    { id: 'lower', label: 'Tren inferior', color: 'bg-amber-600', icon: '' },
    { id: 'full_body', label: 'Full body', color: 'bg-amber-500', icon: '' },
    { id: 'core', label: 'Core', color: 'bg-amber-400', icon: '' },
    { id: 'functional', label: 'Funcional', color: 'bg-amber-500', icon: '' },
  ],
  cycling: [
    { id: 'road', label: 'Carretera', color: 'bg-sky-500', icon: '' },
    { id: 'mtb', label: 'MTB', color: 'bg-sky-600', icon: '' },
    { id: 'indoor', label: 'Indoor', color: 'bg-sky-400', icon: '' },
    { id: 'gravel', label: 'Gravel', color: 'bg-sky-700', icon: '' },
  ],
  swimming: [
    { id: 'pool', label: 'Piscina', color: 'bg-cyan-500', icon: '' },
    { id: 'open_water', label: 'Aguas abiertas', color: 'bg-cyan-600', icon: '' },
  ],
  other_sport: [
    { id: 'hiking', label: 'Senderismo', color: 'bg-orange-500', icon: '' },
    { id: 'yoga', label: 'Yoga', color: 'bg-purple-400', icon: '' },
    { id: 'stretching', label: 'Estiramientos', color: 'bg-pink-400', icon: '' },
    { id: 'crossfit', label: 'CrossFit', color: 'bg-red-500', icon: '' },
    { id: 'paddle', label: 'Padel', color: 'bg-green-400', icon: '' },
    { id: 'football', label: 'Futbol', color: 'bg-green-600', icon: '' },
    { id: 'basketball', label: 'Basket', color: 'bg-orange-600', icon: '' },
    { id: 'tennis', label: 'Tenis', color: 'bg-lime-500', icon: '' },
    { id: 'other', label: 'Otro', color: 'bg-zinc-500', icon: '' },
  ],
  personal: [
    { id: 'family', label: 'Familiar', color: 'bg-indigo-500', icon: '' },
    { id: 'social', label: 'Social', color: 'bg-pink-500', icon: '' },
    { id: 'work', label: 'Trabajo', color: 'bg-zinc-500', icon: '' },
    { id: 'medical', label: 'Medico', color: 'bg-red-400', icon: '' },
    { id: 'travel', label: 'Viaje', color: 'bg-blue-500', icon: '' },
    { id: 'birthday', label: 'Cumpleanos', color: 'bg-amber-400', icon: '' },
    { id: 'other', label: 'Otro', color: 'bg-zinc-500', icon: '' },
  ],
  rest: [
    { id: 'active_recovery', label: 'Recuperacion activa', color: 'bg-teal-400', icon: '' },
    { id: 'complete_rest', label: 'Descanso total', color: 'bg-zinc-400', icon: '' },
    { id: 'injury', label: 'Lesion', color: 'bg-red-400', icon: '' },
  ],
};

interface StrengthExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

interface EventData {
  pace?: string;
  cadence?: number;
  exercises?: StrengthExercise[];
  muscleGroups?: string[];
  avgSpeed?: number;
  power?: number;
  laps?: number;
  poolLength?: number;
  strokeType?: string;
  intensity?: 'low' | 'medium' | 'high';
  location?: string;
  allDay?: boolean;
  reason?: string;
}

interface CalendarEvent {
  id: string;
  date: string;
  category: EventCategory;
  type: string;
  title: string | null;
  time: string | null;
  distance: number | null;
  duration: number | null;
  notes: string | null;
  heartRate: number | null;
  elevationGain: number | null;
  calories: number | null;
  feeling: number | null;
  completed: number;
  eventData: EventData | null;
  // Campos de Strava
  stravaId: string | null;
  movingTime: number | null;
  elapsedTime: number | null;
  maxSpeed: number | null;
  averageSpeed: number | null;
  maxHeartRate: number | null;
  averageCadence: number | null;
  averageWatts: number | null;
  maxWatts: number | null;
  sufferScore: number | null;
  sportType: string | null;
}

export default function CalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    category: 'running' as EventCategory,
    type: 'easy',
    title: '',
    time: '',
    distance: '',
    duration: '',
    notes: '',
    heartRate: '',
    elevationGain: '',
    calories: '',
    feeling: 3,
    completed: 0,
    // Campos especificos
    pace: '',
    avgSpeed: '',
    power: '',
    laps: '',
    poolLength: '25',
    intensity: 'medium' as 'low' | 'medium' | 'high',
    location: '',
    reason: '',
    exercises: [] as StrengthExercise[],
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadEvents();
  }, [year, month]);

  const loadEvents = async () => {
    try {
      const res = await fetch(`/api/running-events?year=${year}&month=${month + 1}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setEvents(data);
      else setEvents([]);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = lastDayOfMonth.getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getEventsForDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const getEventType = (category: EventCategory, type: string) => {
    const types = EVENT_TYPES[category] || EVENT_TYPES.running;
    return types.find(t => t.id === type) || types[0];
  };

  const getCategoryInfo = (category: EventCategory) => {
    return CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  };

  const openModal = (dateStr: string, event?: CalendarEvent) => {
    setSelectedDate(dateStr);
    setSelectedEvent(event || null);
    if (event) {
      const eventData = event.eventData || {};
      setFormData({
        category: (event.category as EventCategory) || 'running',
        type: event.type,
        title: event.title || '',
        time: event.time || '',
        distance: event.distance?.toString() || '',
        duration: event.duration?.toString() || '',
        notes: event.notes || '',
        heartRate: event.heartRate?.toString() || '',
        elevationGain: event.elevationGain?.toString() || '',
        calories: event.calories?.toString() || '',
        feeling: event.feeling || 3,
        completed: event.completed,
        // Campos especificos de eventData
        pace: eventData.pace || '',
        avgSpeed: eventData.avgSpeed?.toString() || '',
        power: eventData.power?.toString() || '',
        laps: eventData.laps?.toString() || '',
        poolLength: eventData.poolLength?.toString() || '25',
        intensity: eventData.intensity || 'medium',
        location: eventData.location || '',
        reason: eventData.reason || '',
        exercises: eventData.exercises || [],
      });
    } else {
      setFormData({
        category: 'running', type: 'easy', title: '', time: '', distance: '', duration: '',
        notes: '', heartRate: '', elevationGain: '', calories: '', feeling: 3, completed: 0,
        pace: '', avgSpeed: '', power: '', laps: '', poolLength: '25', intensity: 'medium',
        location: '', reason: '', exercises: [],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Campos base
    const payload: Record<string, unknown> = {
      id: selectedEvent?.id,
      date: selectedDate,
      category: formData.category,
      type: formData.type,
      title: formData.title || null,
      time: formData.time || null,
      duration: formData.duration ? parseInt(formData.duration) : null,
      notes: formData.notes || null,
      feeling: ['running', 'strength', 'cycling', 'swimming', 'other_sport'].includes(formData.category) ? formData.feeling : null,
      completed: formData.completed,
    };

    // Campos por categoria
    if (['running', 'cycling', 'swimming', 'other_sport'].includes(formData.category)) {
      payload.distance = formData.distance ? parseFloat(formData.distance) : null;
      payload.heartRate = formData.heartRate ? parseInt(formData.heartRate) : null;
      payload.elevationGain = formData.elevationGain ? parseFloat(formData.elevationGain) : null;
      payload.calories = formData.calories ? parseInt(formData.calories) : null;
    }

    // Campos especificos por categoria (van en eventData via API)
    if (formData.category === 'running') {
      payload.pace = formData.pace || null;
    } else if (formData.category === 'cycling') {
      payload.avgSpeed = formData.avgSpeed ? parseFloat(formData.avgSpeed) : null;
      payload.power = formData.power ? parseInt(formData.power) : null;
    } else if (formData.category === 'swimming') {
      payload.laps = formData.laps ? parseInt(formData.laps) : null;
      payload.poolLength = formData.poolLength ? parseInt(formData.poolLength) : null;
    } else if (formData.category === 'other_sport') {
      payload.intensity = formData.intensity;
    } else if (formData.category === 'strength') {
      payload.exercises = formData.exercises.length > 0 ? formData.exercises : null;
    } else if (formData.category === 'personal') {
      payload.location = formData.location || null;
    } else if (formData.category === 'rest') {
      payload.reason = formData.reason || null;
    }

    try {
      const res = await fetch('/api/running-events', {
        method: selectedEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) { loadEvents(); closeModal(); }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || !confirm('Eliminar este evento?')) return;
    try {
      await fetch(`/api/running-events?id=${selectedEvent.id}`, { method: 'DELETE' });
      loadEvents();
      closeModal();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const calendarDays = [];
  for (let i = startDay - 1; i >= 0; i--) calendarDays.push({ day: daysInPrevMonth - i, currentMonth: false, isToday: false });
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ day: i, currentMonth: true, isToday: isToday(i) });
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) calendarDays.push({ day: i, currentMonth: false, isToday: false });

  // Stats del mes - actividades deportivas
  const sportEvents = events.filter(e => ['running', 'cycling', 'swimming', 'other_sport', 'strength'].includes(e.category) || !e.category);
  const monthStats = sportEvents.reduce((acc, e) => {
    if (e.completed) {
      acc.totalDistance += e.distance || 0;
      acc.totalDuration += e.duration || 0;
      acc.completedWorkouts++;
    }
    return acc;
  }, { totalDistance: 0, totalDuration: 0, completedWorkouts: 0 });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Planificacion</p>
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Sesiones</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Distancia</p>
          <p className="text-2xl font-mono text-zinc-100 mt-1">{monthStats.totalDistance.toFixed(1)}</p>
          <p className="text-xs text-zinc-600">km</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Tiempo</p>
          <p className="text-2xl font-mono text-zinc-100 mt-1">{Math.floor(monthStats.totalDuration / 60)}:{(monthStats.totalDuration % 60).toString().padStart(2, '0')}</p>
          <p className="text-xs text-zinc-600">horas</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Sesiones</p>
          <p className="text-2xl font-mono text-zinc-100 mt-1">{monthStats.completedWorkouts}</p>
          <p className="text-xs text-zinc-600">completadas</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-base font-medium text-zinc-200 min-w-[140px] sm:min-w-[180px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors uppercase tracking-wider">
            Hoy
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-zinc-800/50 bg-zinc-900/30">
          {DAYS.map((day) => (
            <div key={day} className="py-2.5 text-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((item, index) => {
            const dayEvents = getEventsForDay(item.day, item.currentMonth);
            const dateStr = item.currentMonth ? `${year}-${String(month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}` : '';

            return (
              <div
                key={index}
                onClick={() => item.currentMonth && openModal(dateStr)}
                className={`min-h-[80px] sm:min-h-[100px] lg:min-h-[110px] p-1.5 sm:p-2 border-b border-r border-zinc-800/30 cursor-pointer transition-colors hover:bg-zinc-800/30 ${
                  index % 7 === 6 ? 'border-r-0' : ''
                } ${index >= 35 ? 'border-b-0' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${
                    item.isToday
                      ? 'bg-emerald-500 text-white font-medium'
                      : item.currentMonth
                      ? 'text-zinc-300'
                      : 'text-zinc-700'
                  }`}>
                    {item.day}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.map((event) => {
                    const eventType = getEventType((event.category as EventCategory) || 'running', event.type);
                    let displayText = eventType.label;
                    if (event.category === 'personal' || event.category === 'rest') {
                      displayText = event.title || eventType.label;
                    } else if (event.distance) {
                      displayText = `${event.distance}km`;
                    } else if (event.duration) {
                      displayText = `${event.duration}'`;
                    }
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); openModal(dateStr, event); }}
                        className={`text-[10px] sm:text-xs p-1 rounded ${eventType.color} text-white truncate ${
                          event.completed ? 'opacity-100' : 'opacity-50 border border-dashed border-white/30'
                        }`}
                      >
                        <span className="hidden sm:inline">{displayText}</span>
                        <span className="sm:hidden">{event.distance ? `${event.distance}` : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-medium text-zinc-100">
                  {selectedEvent ? 'Editar' : 'Nueva'} sesion
                </h3>
                <button onClick={closeModal} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Selector de categoria */}
                <div className="flex flex-wrap gap-1 p-1 bg-zinc-800/50 rounded-lg">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id, type: EVENT_TYPES[cat.id][0].id })}
                      className={`flex-1 min-w-[50px] py-1.5 px-2 rounded text-[10px] font-medium transition-all ${
                        formData.category === cat.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Selector de tipo segun categoria */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Tipo</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EVENT_TYPES[formData.category].map((type) => (
                      <button key={type.id} type="button" onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`p-2 rounded-lg text-center text-[10px] transition-all ${
                          formData.type === type.id ? `${type.color} text-white` : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}>
                        <p className="truncate">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campos especificos por categoria */}
                {['running', 'cycling', 'swimming', 'other_sport'].includes(formData.category) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        {formData.category === 'swimming' ? 'Distancia (m)' : 'Distancia (km)'}
                      </label>
                      <input type="number" step="0.1" value={formData.distance} onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                        className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Duracion (min)</label>
                      <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                    </div>
                  </div>
                )}

                {formData.category === 'running' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Ritmo (min/km)</label>
                    <input type="text" value={formData.pace} onChange={(e) => setFormData({ ...formData, pace: e.target.value })}
                      className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" placeholder="5:30" />
                  </div>
                )}

                {formData.category === 'cycling' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Vel. media (km/h)</label>
                      <input type="number" step="0.1" value={formData.avgSpeed} onChange={(e) => setFormData({ ...formData, avgSpeed: e.target.value })}
                        className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Potencia (W)</label>
                      <input type="number" value={formData.power} onChange={(e) => setFormData({ ...formData, power: e.target.value })}
                        className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                    </div>
                  </div>
                )}

                {formData.category === 'swimming' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Largos</label>
                      <input type="number" value={formData.laps} onChange={(e) => setFormData({ ...formData, laps: e.target.value })}
                        className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Piscina (m)</label>
                      <select value={formData.poolLength} onChange={(e) => setFormData({ ...formData, poolLength: e.target.value })}
                        className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm">
                        <option value="25">25m</option>
                        <option value="50">50m</option>
                      </select>
                    </div>
                  </div>
                )}

                {formData.category === 'strength' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Duracion (min)</label>
                    <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                  </div>
                )}

                {formData.category === 'other_sport' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Intensidad</label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((int) => (
                        <button key={int} type="button" onClick={() => setFormData({ ...formData, intensity: int })}
                          className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                            formData.intensity === int ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}>
                          {int === 'low' ? 'Baja' : int === 'medium' ? 'Media' : 'Alta'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.category === 'personal' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Titulo</label>
                      <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" placeholder="Nombre del evento" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Hora</label>
                        <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Lugar</label>
                        <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" />
                      </div>
                    </div>
                  </>
                )}

                {formData.category === 'rest' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Motivo (opcional)</label>
                    <input type="text" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" placeholder="Ej: Recuperacion post-carrera" />
                  </div>
                )}

                {/* Datos de Strava si existen */}
                {selectedEvent && (selectedEvent.elevationGain || selectedEvent.calories || selectedEvent.maxHeartRate || selectedEvent.averageCadence || selectedEvent.maxSpeed || selectedEvent.averageWatts || selectedEvent.sufferScore) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedEvent.elevationGain && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                        <p className="text-zinc-500 text-[10px] uppercase">Desnivel</p>
                        <p className="font-mono text-zinc-200">{Math.round(selectedEvent.elevationGain)} m</p>
                      </div>
                    )}
                    {selectedEvent.calories && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                        <p className="text-zinc-500 text-[10px] uppercase">Calorias</p>
                        <p className="font-mono text-zinc-200">{selectedEvent.calories}</p>
                      </div>
                    )}
                    {selectedEvent.heartRate && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                        <p className="text-zinc-500 text-[10px] uppercase">FC Media</p>
                        <p className="font-mono text-zinc-200">{selectedEvent.heartRate}</p>
                      </div>
                    )}
                    {selectedEvent.maxHeartRate && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                        <p className="text-zinc-500 text-[10px] uppercase">FC Max</p>
                        <p className="font-mono text-zinc-200">{selectedEvent.maxHeartRate}</p>
                      </div>
                    )}
                    {selectedEvent.averageCadence && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                        <p className="text-zinc-500 text-[10px] uppercase">Cadencia</p>
                        <p className="font-mono text-zinc-200">{Math.round(selectedEvent.averageCadence * 2)}</p>
                      </div>
                    )}
                    {selectedEvent.averageWatts && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                        <p className="text-zinc-500 text-[10px] uppercase">Potencia</p>
                        <p className="font-mono text-zinc-200">{Math.round(selectedEvent.averageWatts)} W</p>
                      </div>
                    )}
                    {selectedEvent.sufferScore && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                        <p className="text-zinc-500 text-[10px] uppercase">Esfuerzo</p>
                        <p className="font-mono text-zinc-200">{selectedEvent.sufferScore}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Feeling solo para actividades deportivas */}
                {['running', 'strength', 'cycling', 'swimming', 'other_sport'].includes(formData.category) && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Sensacion</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setFormData({ ...formData, feeling: n })}
                          className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                            formData.feeling === n ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solo mostrar notas si no es el formato strava:xxx */}
                {!(formData.notes?.startsWith('strava:')) && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Notas</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-2 border border-zinc-700 rounded-lg bg-zinc-800 text-zinc-100 text-sm" rows={2} />
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.completed === 1} onChange={(e) => setFormData({ ...formData, completed: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500" />
                  <span className="text-sm text-zinc-300">Completado</span>
                </label>

                {/* Link a ver detalles completos */}
                {selectedEvent && (
                  <a
                    href={`/activity/${selectedEvent.id}`}
                    className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    <span className="text-xs font-medium text-emerald-400">Ver detalles</span>
                    <svg className="w-3 h-3 ml-auto text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                )}

                {/* Link a Strava si es una actividad sincronizada */}
                {(() => {
                  const stravaId = selectedEvent?.stravaId || (selectedEvent?.notes?.startsWith('strava:') ? selectedEvent.notes.replace('strava:', '') : null);
                  if (!stravaId) return null;
                  return (
                    <a
                      href={`https://www.strava.com/activities/${stravaId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FC4C02">
                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                      </svg>
                      <span className="text-xs font-medium text-orange-400">Ver en Strava</span>
                      <svg className="w-3 h-3 ml-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  );
                })()}

                <div className="flex gap-2 pt-2">
                  {selectedEvent && (
                    <button type="button" onClick={handleDelete} className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm">
                      Eliminar
                    </button>
                  )}
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-zinc-700 rounded-lg text-zinc-400 hover:bg-zinc-800 transition-colors text-sm">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
