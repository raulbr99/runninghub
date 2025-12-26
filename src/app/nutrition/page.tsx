'use client';

import { useState, useEffect } from 'react';

interface NutritionEntry {
  id: string;
  date: string;
  mealType: string;
  description: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  notes: string | null;
}

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Desayuno', icon: '🌅', color: 'bg-orange-500' },
  { id: 'lunch', label: 'Almuerzo', icon: '☀️', color: 'bg-yellow-500' },
  { id: 'dinner', label: 'Cena', icon: '🌙', color: 'bg-indigo-500' },
  { id: 'snack', label: 'Snack', icon: '🍎', color: 'bg-green-500' },
];

export default function NutritionPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<NutritionEntry | null>(null);
  const [formData, setFormData] = useState({
    mealType: 'breakfast',
    description: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    notes: '',
  });

  useEffect(() => {
    loadEntries();
    loadGoals();
  }, [date]);

  const loadEntries = async () => {
    try {
      const res = await fetch(`/api/nutrition?date=${date}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setEntries(data);
    } catch (error) {
      console.error('Error loading nutrition entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    try {
      const res = await fetch('/api/nutrition-goals');
      const data = await res.json();
      if (res.ok) setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0),
    protein: acc.protein + (e.protein || 0),
    carbs: acc.carbs + (e.carbs || 0),
    fats: acc.fats + (e.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const openModal = (entry?: NutritionEntry) => {
    if (entry) {
      setSelectedEntry(entry);
      setFormData({
        mealType: entry.mealType,
        description: entry.description,
        calories: entry.calories?.toString() || '',
        protein: entry.protein?.toString() || '',
        carbs: entry.carbs?.toString() || '',
        fats: entry.fats?.toString() || '',
        notes: entry.notes || '',
      });
    } else {
      setSelectedEntry(null);
      setFormData({ mealType: 'breakfast', description: '', calories: '', protein: '', carbs: '', fats: '', notes: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: selectedEntry?.id,
      date,
      mealType: formData.mealType,
      description: formData.description,
      calories: formData.calories ? parseInt(formData.calories) : null,
      protein: formData.protein ? parseFloat(formData.protein) : null,
      carbs: formData.carbs ? parseFloat(formData.carbs) : null,
      fats: formData.fats ? parseFloat(formData.fats) : null,
      notes: formData.notes || null,
    };

    try {
      const res = await fetch('/api/nutrition', {
        method: selectedEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) { loadEntries(); closeModal(); }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry || !confirm('Eliminar esta comida?')) return;
    try {
      await fetch(`/api/nutrition?id=${selectedEntry.id}`, { method: 'DELETE' });
      loadEntries();
      closeModal();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const saveGoals = async () => {
    try {
      await fetch('/api/nutrition-goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goals),
      });
      setShowGoalsModal(false);
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const getProgress = (current: number, goal: number) => Math.min((current / goal) * 100, 100);
  const getMealType = (id: string) => MEAL_TYPES.find(t => t.id === id) || MEAL_TYPES[0];

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍎</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Nutricion</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGoalsModal(true)} className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Objetivos
            </button>
            <button onClick={() => openModal()} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Anadir
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={prevDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <button onClick={nextDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Calorias</p>
            <span className="text-xs text-gray-400">{goals.calories}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{totals.calories}</p>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${getProgress(totals.calories, goals.calories)}%` }} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Proteinas</p>
            <span className="text-xs text-gray-400">{goals.protein}g</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{totals.protein.toFixed(0)}g</p>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${getProgress(totals.protein, goals.protein)}%` }} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Carbos</p>
            <span className="text-xs text-gray-400">{goals.carbs}g</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{totals.carbs.toFixed(0)}g</p>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${getProgress(totals.carbs, goals.carbs)}%` }} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Grasas</p>
            <span className="text-xs text-gray-400">{goals.fats}g</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{totals.fats.toFixed(0)}g</p>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${getProgress(totals.fats, goals.fats)}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Comidas del dia</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay comidas registradas</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {entries.map((entry) => {
              const mealType = getMealType(entry.mealType);
              return (
                <div
                  key={entry.id}
                  onClick={() => openModal(entry)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${mealType.color} flex items-center justify-center text-xl flex-shrink-0`}>
                      {mealType.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{mealType.label}</p>
                          <p className="text-sm text-gray-500 truncate">{entry.description}</p>
                        </div>
                        <div className="text-right text-sm">
                          {entry.calories && <p className="font-medium text-gray-900 dark:text-white">{entry.calories} kcal</p>}
                          <p className="text-gray-400">
                            {[
                              entry.protein && `P: ${entry.protein}g`,
                              entry.carbs && `C: ${entry.carbs}g`,
                              entry.fats && `G: ${entry.fats}g`,
                            ].filter(Boolean).join(' | ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedEntry ? 'Editar' : 'Anadir'} Comida
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de comida</label>
                  <div className="grid grid-cols-4 gap-2">
                    {MEAL_TYPES.map((type) => (
                      <button key={type.id} type="button" onClick={() => setFormData({ ...formData, mealType: type.id })}
                        className={`p-2 rounded-lg text-center text-xs transition-all ${
                          formData.mealType === type.id ? `${type.color} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                        <span className="text-lg">{type.icon}</span>
                        <p className="mt-1">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion *</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ej: Tostadas con aguacate y huevos" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Calorias</label>
                    <input type="number" value={formData.calories} onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proteinas (g)</label>
                    <input type="number" step="0.1" value={formData.protein} onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="25" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carbos (g)</label>
                    <input type="number" step="0.1" value={formData.carbs} onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="45" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grasas (g)</label>
                    <input type="number" step="0.1" value={formData.fats} onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="15" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
                </div>

                <div className="flex gap-3 pt-2">
                  {selectedEntry && (
                    <button type="button" onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
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

      {showGoalsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Objetivos Nutricionales</h3>
                <button onClick={() => setShowGoalsModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Calorias diarias</label>
                  <input type="number" value={goals.calories} onChange={(e) => setGoals({ ...goals, calories: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proteinas (g)</label>
                  <input type="number" value={goals.protein} onChange={(e) => setGoals({ ...goals, protein: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carbohidratos (g)</label>
                  <input type="number" value={goals.carbs} onChange={(e) => setGoals({ ...goals, carbs: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grasas (g)</label>
                  <input type="number" value={goals.fats} onChange={(e) => setGoals({ ...goals, fats: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowGoalsModal(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                    Cancelar
                  </button>
                  <button type="button" onClick={saveGoals} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
