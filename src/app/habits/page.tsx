'use client';

import { useState, useEffect, useCallback } from 'react';

interface CustomHabit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: string;
  specificDays: number[] | null;
  trackingType: string;
  targetValue: number | null;
  unit: string | null;
  xpReward: number;
  isActive: number;
  sortOrder: number;
}

interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: number;
  value: number | null;
  xpEarned: number;
}

const ICONS = ['🏃', '💪', '📚', '🧘', '💧', '🥗', '💤', '✍️', '🎯', '⭐', '🔥', '💡', '🎨', '🎵', '💰', '🧠'];
const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];
const DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function HabitsPage() {
  const [habits, setHabits] = useState<CustomHabit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<CustomHabit | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [xpAnimation, setXpAnimation] = useState<{ habitId: string; xp: number } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '⭐',
    color: '#6366f1',
    frequency: 'daily',
    specificDays: [] as number[],
    trackingType: 'boolean',
    targetValue: '',
    unit: '',
    xpReward: '10',
  });

  const loadData = useCallback(async () => {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        fetch('/api/custom-habits'),
        fetch(`/api/habit-logs?date=${selectedDate}`),
      ]);

      const habitsData = await habitsRes.json();
      const logsData = await logsRes.json();

      if (Array.isArray(habitsData)) setHabits(habitsData);
      if (Array.isArray(logsData)) setLogs(logsData);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (habit?: CustomHabit) => {
    if (habit) {
      setSelectedHabit(habit);
      setFormData({
        name: habit.name,
        description: habit.description || '',
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        specificDays: habit.specificDays || [],
        trackingType: habit.trackingType,
        targetValue: habit.targetValue?.toString() || '',
        unit: habit.unit || '',
        xpReward: habit.xpReward.toString(),
      });
    } else {
      setSelectedHabit(null);
      setFormData({
        name: '',
        description: '',
        icon: '⭐',
        color: '#6366f1',
        frequency: 'daily',
        specificDays: [],
        trackingType: 'boolean',
        targetValue: '',
        unit: '',
        xpReward: '10',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedHabit(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: selectedHabit?.id,
      name: formData.name,
      description: formData.description || null,
      icon: formData.icon,
      color: formData.color,
      frequency: formData.frequency,
      specificDays: formData.frequency === 'specific_days' ? formData.specificDays : null,
      trackingType: formData.trackingType,
      targetValue: formData.targetValue ? parseInt(formData.targetValue) : null,
      unit: formData.unit || null,
      xpReward: parseInt(formData.xpReward) || 10,
    };

    try {
      const res = await fetch('/api/custom-habits', {
        method: selectedHabit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        loadData();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving habit:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedHabit || !confirm('Eliminar este habito?')) return;
    try {
      await fetch(`/api/custom-habits?id=${selectedHabit.id}`, { method: 'DELETE' });
      loadData();
      closeModal();
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const toggleHabit = async (habit: CustomHabit) => {
    try {
      const res = await fetch('/api/habit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: habit.id, date: selectedDate, toggle: true }),
      });

      const result = await res.json();

      if (result.xpEarned && result.xpEarned > 0) {
        setXpAnimation({ habitId: habit.id, xp: result.xpEarned });
        setTimeout(() => setXpAnimation(null), 1500);
      }

      loadData();
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  const isHabitCompleted = (habitId: string) => {
    return logs.some(log => log.habitId === habitId && log.completed === 1);
  };

  const shouldShowHabit = (habit: CustomHabit) => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'specific_days' && habit.specificDays) {
      const dayOfWeek = new Date(selectedDate).getDay();
      return habit.specificDays.includes(dayOfWeek);
    }
    return true;
  };

  const todayHabits = habits.filter(shouldShowHabit);
  const completedCount = todayHabits.filter(h => isHabitCompleted(h.id)).length;
  const completionRate = todayHabits.length > 0 ? Math.round((completedCount / todayHabits.length) * 100) : 0;

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Habitos</h1>
          </div>
          <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo
          </button>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Construye tu rutina diaria</p>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {isToday ? 'Hoy' : new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-sm text-gray-500">{selectedDate}</p>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" disabled={isToday}>
          <svg className={`w-5 h-5 ${isToday ? 'opacity-30' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Progreso del dia</h2>
          <span className="text-2xl font-bold text-indigo-600">{completionRate}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">{completedCount} de {todayHabits.length} habitos completados</p>
      </div>

      {/* Habits List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : todayHabits.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-4xl mb-4">🎯</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No tienes habitos configurados</p>
          <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">
            Crear primer habito
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {todayHabits.map((habit) => {
            const completed = isHabitCompleted(habit.id);
            return (
              <div
                key={habit.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all ${completed ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="p-4 flex items-center gap-4">
                  <button
                    onClick={() => toggleHabit(habit)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all relative ${completed ? 'bg-green-500' : ''}`}
                    style={{ backgroundColor: completed ? undefined : habit.color + '20', color: completed ? 'white' : habit.color }}
                  >
                    {completed ? '✓' : habit.icon}
                    {xpAnimation?.habitId === habit.id && (
                      <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                        +{xpAnimation.xp} XP
                      </span>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${completed ? 'text-green-700 dark:text-green-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {habit.name}
                    </p>
                    {habit.description && (
                      <p className="text-sm text-gray-500 truncate">{habit.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                        +{habit.xpReward} XP
                      </span>
                      {habit.frequency === 'specific_days' && habit.specificDays && (
                        <span className="text-xs text-gray-400">
                          {habit.specificDays.map(d => DAYS[d]).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => openModal(habit)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md my-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedHabit ? 'Editar' : 'Nuevo'} Habito
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ej: Meditar 10 min"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icono</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${formData.icon === icon ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frecuencia</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, frequency: 'daily' })}
                      className={`flex-1 p-2 rounded-lg border-2 text-sm ${formData.frequency === 'daily' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600'}`}
                    >
                      Diario
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, frequency: 'specific_days' })}
                      className={`flex-1 p-2 rounded-lg border-2 text-sm ${formData.frequency === 'specific_days' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600'}`}
                    >
                      Dias especificos
                    </button>
                  </div>
                </div>

                {formData.frequency === 'specific_days' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias</label>
                    <div className="flex gap-1">
                      {DAYS.map((day, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const days = formData.specificDays.includes(idx)
                              ? formData.specificDays.filter(d => d !== idx)
                              : [...formData.specificDays, idx];
                            setFormData({ ...formData, specificDays: days });
                          }}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${formData.specificDays.includes(idx) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">XP por completar</label>
                  <input
                    type="number"
                    value={formData.xpReward}
                    onChange={(e) => setFormData({ ...formData, xpReward: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="100"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {selectedHabit && (
                    <button type="button" onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      Eliminar
                    </button>
                  )}
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
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
