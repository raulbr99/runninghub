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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
              </svg>
            </div>
            <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Peso</h1>
          </div>
          <button onClick={() => openModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Registrar
          </button>
        </div>
        <p className="text-sm text-zinc-500">Registra y visualiza tu progreso</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Actual</p>
          <p className="text-2xl font-mono text-zinc-100">{latestWeight.toFixed(1)}<span className="text-sm text-zinc-500 ml-1">kg</span></p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Cambio</p>
          <p className={`text-2xl font-mono ${weightChange > 0 ? 'text-red-400' : weightChange < 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}<span className="text-sm ml-1">kg</span>
          </p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Minimo</p>
          <p className="text-2xl font-mono text-zinc-100">{minWeight.toFixed(1)}<span className="text-sm text-zinc-500 ml-1">kg</span></p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Maximo</p>
          <p className="text-2xl font-mono text-zinc-100">{maxWeight.toFixed(1)}<span className="text-sm text-zinc-500 ml-1">kg</span></p>
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50 mb-6">
        <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">Evolucion</h2>
        <div className="h-40 flex items-end gap-0.5">
          {chartData.map((entry) => {
            const height = chartRange > 0 ? ((entry.weight - chartMin) / chartRange) * 100 : 50;
            return (
              <div key={entry.id} className="flex-1 flex flex-col items-center group">
                <div className="relative w-full">
                  <div
                    className="w-full bg-emerald-500/80 rounded-t transition-all hover:bg-emerald-400"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 border border-zinc-700">
                    {entry.weight} kg - {entry.date}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-600 font-mono">
          <span>{chartData[0]?.date || '-'}</span>
          <span>{chartData[chartData.length - 1]?.date || '-'}</span>
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-800/50">
          <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider">Historial</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">No hay registros</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {entries.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                onClick={() => openModal(entry)}
                className="p-4 hover:bg-zinc-800/30 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-mono text-zinc-100">{entry.weight} kg</p>
                  <p className="text-xs text-zinc-500">{new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right text-xs text-zinc-500 font-mono">
                  {entry.bodyFat && <p>Grasa: {entry.bodyFat}%</p>}
                  {entry.muscleMass && <p>Musculo: {entry.muscleMass} kg</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md border border-zinc-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-light text-zinc-100 uppercase tracking-wider">
                  {selectedEntry ? 'Editar' : 'Registrar'} Peso
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Fecha</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Peso (kg) *</label>
                  <input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50" placeholder="75.5" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">% Grasa</label>
                    <input type="number" step="0.1" value={formData.bodyFat} onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                      className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50" placeholder="18.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Musculo (kg)</label>
                    <input type="number" step="0.1" value={formData.muscleMass} onChange={(e) => setFormData({ ...formData, muscleMass: e.target.value })}
                      className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50" placeholder="35.0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Notas</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50" rows={2} />
                </div>

                <div className="flex gap-3 pt-2">
                  {selectedEntry && (
                    <button type="button" onClick={handleDelete} className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm">
                      Eliminar
                    </button>
                  )}
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-zinc-700 rounded-lg text-zinc-400 text-sm hover:bg-zinc-800">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm">
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
