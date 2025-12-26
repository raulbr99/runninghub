'use client';

import { useState, useEffect } from 'react';

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  bodyFat: number | null;
  muscleMass: number | null;
  notes: string | null;
}

export default function WeightPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WeightEntry | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFat: '',
    muscleMass: '',
    notes: '',
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const res = await fetch('/api/weight?limit=60');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setEntries(data);
    } catch (error) {
      console.error('Error loading weight entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (entry?: WeightEntry) => {
    if (entry) {
      setSelectedEntry(entry);
      setFormData({
        date: entry.date,
        weight: entry.weight.toString(),
        bodyFat: entry.bodyFat?.toString() || '',
        muscleMass: entry.muscleMass?.toString() || '',
        notes: entry.notes || '',
      });
    } else {
      setSelectedEntry(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        bodyFat: '',
        muscleMass: '',
        notes: '',
      });
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
      date: formData.date,
      weight: parseFloat(formData.weight),
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : null,
      muscleMass: formData.muscleMass ? parseFloat(formData.muscleMass) : null,
      notes: formData.notes || null,
    };

    try {
      const res = await fetch('/api/weight', {
        method: selectedEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) { loadEntries(); closeModal(); }
    } catch (error) {
      console.error('Error saving weight:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry || !confirm('Eliminar este registro?')) return;
    try {
      await fetch(`/api/weight?id=${selectedEntry.id}`, { method: 'DELETE' });
      loadEntries();
      closeModal();
    } catch (error) {
      console.error('Error deleting weight:', error);
    }
  };

  const latestWeight = entries[0]?.weight || 0;
  const previousWeight = entries[1]?.weight || latestWeight;
  const weightChange = latestWeight - previousWeight;
  const minWeight = entries.length > 0 ? Math.min(...entries.map(e => e.weight)) : 0;
  const maxWeight = entries.length > 0 ? Math.max(...entries.map(e => e.weight)) : 0;

  const chartData = [...entries].reverse().slice(-30);
  const chartMin = Math.floor(minWeight - 2);
  const chartMax = Math.ceil(maxWeight + 2);
  const chartRange = chartMax - chartMin;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚖️</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Control de Peso</h1>
          </div>
          <button onClick={() => openModal()} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar
          </button>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Registra y visualiza tu progreso</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Peso actual</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{latestWeight.toFixed(1)} kg</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cambio</p>
          <p className={`text-2xl font-bold ${weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-green-500' : 'text-gray-500'}`}>
            {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Minimo</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{minWeight.toFixed(1)} kg</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Maximo</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{maxWeight.toFixed(1)} kg</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolucion (ultimos 30 registros)</h2>
        <div className="h-48 flex items-end gap-1">
          {chartData.map((entry, idx) => {
            const height = chartRange > 0 ? ((entry.weight - chartMin) / chartRange) * 100 : 50;
            return (
              <div key={entry.id} className="flex-1 flex flex-col items-center group">
                <div className="relative w-full">
                  <div
                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    {entry.weight} kg - {entry.date}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{chartData[0]?.date || '-'}</span>
          <span>{chartData[chartData.length - 1]?.date || '-'}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Historial</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay registros</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {entries.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                onClick={() => openModal(entry)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{entry.weight} kg</p>
                  <p className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {entry.bodyFat && <p>Grasa: {entry.bodyFat}%</p>}
                  {entry.muscleMass && <p>Musculo: {entry.muscleMass} kg</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedEntry ? 'Editar' : 'Registrar'} Peso
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peso (kg) *</label>
                  <input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="75.5" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">% Grasa</label>
                    <input type="number" step="0.1" value={formData.bodyFat} onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="18.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Musculo (kg)</label>
                    <input type="number" step="0.1" value={formData.muscleMass} onChange={(e) => setFormData({ ...formData, muscleMass: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="35.0" />
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
    </div>
  );
}
