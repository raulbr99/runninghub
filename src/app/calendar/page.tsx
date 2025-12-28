'use client';

import { useState, useEffect } from 'react';

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const RUNNING_TYPES = [
  { id: 'easy', label: 'Rodaje suave', color: 'bg-green-500', icon: '🏃' },
  { id: 'tempo', label: 'Tempo', color: 'bg-orange-500', icon: '⚡' },
  { id: 'intervals', label: 'Series', color: 'bg-red-500', icon: '🔥' },
  { id: 'long', label: 'Tirada larga', color: 'bg-blue-500', icon: '🛤️' },
  { id: 'rest', label: 'Descanso', color: 'bg-gray-400', icon: '😴' },
  { id: 'race', label: 'Carrera', color: 'bg-purple-500', icon: '🏆' },
  { id: 'strength', label: 'Fuerza', color: 'bg-yellow-500', icon: '💪' },
  { id: 'recovery', label: 'Recuperacion', color: 'bg-teal-500', icon: '🧘' },
  { id: 'cycling', label: 'Ciclismo', color: 'bg-sky-500', icon: '🚴' },
  { id: 'walk', label: 'Caminata', color: 'bg-lime-500', icon: '🚶' },
  { id: 'swim', label: 'Natacion', color: 'bg-cyan-500', icon: '🏊' },
  { id: 'other', label: 'Otro', color: 'bg-slate-500', icon: '🏅' },
];

const PERSONAL_TYPES = [
  { id: 'event', label: 'Evento', color: 'bg-indigo-500', icon: '📅' },
  { id: 'appointment', label: 'Cita', color: 'bg-pink-500', icon: '🗓️' },
  { id: 'task', label: 'Tarea', color: 'bg-cyan-500', icon: '✅' },
  { id: 'reminder', label: 'Recordatorio', color: 'bg-amber-500', icon: '🔔' },
];

interface CalendarEvent {
  id: string;
  date: string;
  category: 'running' | 'personal';
  type: string;
  title: string | null;
  time: string | null;
  distance: number | null;
  duration: number | null;
  pace: string | null;
  notes: string | null;
  heartRate: number | null;
  feeling: number | null;
  completed: number;
  // Campos de Strava
  stravaId: string | null;
  movingTime: number | null;
  elapsedTime: number | null;
  elevationGain: number | null;
  maxSpeed: number | null;
  averageSpeed: number | null;
  maxHeartRate: number | null;
  averageCadence: number | null;
  averageWatts: number | null;
  maxWatts: number | null;
  calories: number | null;
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
    category: 'running' as 'running' | 'personal',
    type: 'easy',
    title: '',
    time: '',
    distance: '',
    duration: '',
    pace: '',
    notes: '',
    heartRate: '',
    feeling: 3,
    completed: 0,
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

  const getEventType = (category: string, type: string) => {
    if (category === 'personal') return PERSONAL_TYPES.find(t => t.id === type) || PERSONAL_TYPES[0];
    return RUNNING_TYPES.find(t => t.id === type) || RUNNING_TYPES[0];
  };

  const openModal = (dateStr: string, event?: CalendarEvent) => {
    setSelectedDate(dateStr);
    setSelectedEvent(event || null);
    if (event) {
      setFormData({
        category: event.category || 'running',
        type: event.type,
        title: event.title || '',
        time: event.time || '',
        distance: event.distance?.toString() || '',
        duration: event.duration?.toString() || '',
        pace: event.pace || '',
        notes: event.notes || '',
        heartRate: event.heartRate?.toString() || '',
        feeling: event.feeling || 3,
        completed: event.completed,
      });
    } else {
      setFormData({ category: 'running', type: 'easy', title: '', time: '', distance: '', duration: '', pace: '', notes: '', heartRate: '', feeling: 3, completed: 0 });
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
    const payload = {
      id: selectedEvent?.id,
      date: selectedDate,
      category: formData.category,
      type: formData.type,
      title: formData.title || null,
      time: formData.time || null,
      distance: formData.distance ? parseFloat(formData.distance) : null,
      duration: formData.duration ? parseInt(formData.duration) : null,
      pace: formData.pace || null,
      notes: formData.notes || null,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
      feeling: formData.category === 'running' ? formData.feeling : null,
      completed: formData.completed,
    };

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

  const runningEvents = events.filter(e => e.category === 'running' || !e.category);
  const monthStats = runningEvents.reduce((acc, e) => {
    if (e.completed) {
      acc.totalDistance += e.distance || 0;
      acc.totalDuration += e.duration || 0;
      acc.completedRuns++;
    }
    return acc;
  }, { totalDistance: 0, totalDuration: 0, completedRuns: 0 });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📅</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Calendario</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Planifica entrenamientos y eventos</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Distancia</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{monthStats.totalDistance.toFixed(1)} km</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Tiempo</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{Math.floor(monthStats.totalDuration / 60)}h {monthStats.totalDuration % 60}m</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Entrenos</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{monthStats.completedRuns}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white min-w-[160px] sm:min-w-[200px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
            Hoy
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {DAYS.map((day) => (
            <div key={day} className="py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
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
                className={`min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] p-1.5 sm:p-2 lg:p-3 border-b border-r border-gray-100 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  index % 7 === 6 ? 'border-r-0' : ''
                } ${index >= 35 ? 'border-b-0' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm ${
                    item.isToday
                      ? 'bg-green-600 text-white font-semibold'
                      : item.currentMonth
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {item.day}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((event) => {
                    const eventType = getEventType(event.category || 'running', event.type);
                    const displayText = event.category === 'personal'
                      ? event.title || eventType.label
                      : event.distance ? `${event.distance}km` : eventType.label;
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); openModal(dateStr, event); }}
                        className={`text-xs sm:text-sm p-1 sm:p-1.5 rounded-md ${eventType.color} text-white truncate ${
                          event.completed ? 'opacity-100' : 'opacity-60 border border-dashed border-white/50'
                        }`}
                      >
                        <span className="mr-1">{eventType.icon}</span>
                        <span className="hidden sm:inline">{displayText}</span>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedEvent ? 'Editar' : 'Nuevo'} Evento
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <button type="button" onClick={() => setFormData({ ...formData, category: 'running', type: 'easy' })}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      formData.category === 'running' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    🏃 Running
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, category: 'personal', type: 'event' })}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      formData.category === 'personal' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    📅 Personal
                  </button>
                </div>

                {formData.category === 'running' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de entrenamiento</label>
                      <div className="grid grid-cols-4 gap-2">
                        {RUNNING_TYPES.map((type) => (
                          <button key={type.id} type="button" onClick={() => setFormData({ ...formData, type: type.id })}
                            className={`p-2 rounded-lg text-center text-xs transition-all ${
                              formData.type === type.id ? `${type.color} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                            <span className="text-lg">{type.icon}</span>
                            <p className="mt-1 truncate">{type.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distancia (km)</label>
                        <input type="number" step="0.1" value={formData.distance} onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="10.5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duracion (min)</label>
                        <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="60" />
                      </div>
                    </div>

                    {/* Datos adicionales de la actividad */}
                    {(selectedEvent?.elevationGain || selectedEvent?.calories || selectedEvent?.maxHeartRate || selectedEvent?.averageCadence || selectedEvent?.maxSpeed || selectedEvent?.averageWatts || selectedEvent?.sufferScore || (selectedEvent?.elapsedTime && selectedEvent?.movingTime)) && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {selectedEvent.elevationGain && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Desnivel</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{Math.round(selectedEvent.elevationGain)} m</p>
                          </div>
                        )}
                        {selectedEvent.calories && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Calorias</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedEvent.calories} kcal</p>
                          </div>
                        )}
                        {selectedEvent.heartRate && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">FC Media</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedEvent.heartRate} bpm</p>
                          </div>
                        )}
                        {selectedEvent.maxHeartRate && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">FC Max</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedEvent.maxHeartRate} bpm</p>
                          </div>
                        )}
                        {selectedEvent.averageCadence && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Cadencia</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{Math.round(selectedEvent.averageCadence * 2)} ppm</p>
                          </div>
                        )}
                        {selectedEvent.maxSpeed && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Vel. Max</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{(selectedEvent.maxSpeed * 3.6).toFixed(1)} km/h</p>
                          </div>
                        )}
                        {selectedEvent.averageWatts && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Potencia</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{Math.round(selectedEvent.averageWatts)} W</p>
                          </div>
                        )}
                        {selectedEvent.sufferScore && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Esfuerzo</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedEvent.sufferScore}</p>
                          </div>
                        )}
                        {selectedEvent.elapsedTime && selectedEvent.movingTime && selectedEvent.elapsedTime > selectedEvent.movingTime && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">T. Parado</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{Math.round((selectedEvent.elapsedTime - selectedEvent.movingTime) / 60)} min</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Como te sentiste?</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" onClick={() => setFormData({ ...formData, feeling: n })}
                            className={`flex-1 p-2 rounded-lg text-xl transition-all ${
                              formData.feeling === n ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500' : 'bg-gray-100 dark:bg-gray-700'
                            }`}>
                            {n === 1 ? '😫' : n === 2 ? '😓' : n === 3 ? '😐' : n === 4 ? '😊' : '🤩'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de evento</label>
                      <div className="grid grid-cols-4 gap-2">
                        {PERSONAL_TYPES.map((type) => (
                          <button key={type.id} type="button" onClick={() => setFormData({ ...formData, type: type.id })}
                            className={`p-2 rounded-lg text-center text-xs transition-all ${
                              formData.type === type.id ? `${type.color} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                            <span className="text-lg">{type.icon}</span>
                            <p className="mt-1 truncate">{type.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titulo</label>
                      <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Nombre del evento" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                      <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                  </>
                )}

                {/* Solo mostrar notas si no es el formato strava:xxx */}
                {!(formData.notes?.startsWith('strava:')) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.completed === 1} onChange={(e) => setFormData({ ...formData, completed: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Completado</span>
                </label>

                {/* Link a ver detalles completos */}
                {selectedEvent && (
                  <a
                    href={`/activity/${selectedEvent.id}`}
                    className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Ver detalles completos</span>
                    <svg className="w-4 h-4 ml-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FC4C02">
                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                      </svg>
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Ver en Strava</span>
                      <svg className="w-4 h-4 ml-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  );
                })()}

                <div className="flex gap-3 pt-2">
                  {selectedEvent && (
                    <button type="button" onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      Eliminar
                    </button>
                  )}
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
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
