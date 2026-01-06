'use client';

import { useState, useEffect } from 'react';

interface Race {
  id: string;
  name: string;
  date: string;
  distance: number;
  distanceType?: string;
  location?: string;
  country?: string;
  finishTime?: number;
  position?: number;
  categoryPosition?: number;
  totalParticipants?: number;
  category?: string;
  avgPace?: number;
  avgHeartRate?: number;
  elevationGain?: number;
  dorsalNumber?: string;
  cost?: number;
  website?: string;
  notes?: string;
  status: string;
}

const DISTANCE_TYPES = [
  { value: '5k', label: '5K', km: 5 },
  { value: '10k', label: '10K', km: 10 },
  { value: 'half_marathon', label: 'Media Maraton', km: 21.1 },
  { value: 'marathon', label: 'Maraton', km: 42.195 },
  { value: 'ultra', label: 'Ultra', km: 50 },
  { value: 'trail', label: 'Trail', km: 0 },
  { value: 'other', label: 'Otro', km: 0 },
];

export default function RacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [form, setForm] = useState({
    name: '',
    date: '',
    distance: 10,
    distanceType: '10k',
    location: '',
    status: 'upcoming',
    finishTime: 0,
    position: 0,
    dorsalNumber: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/races');
      if (res.ok) {
        const data = await res.json();
        setRaces(data.races);
      }
    } catch (error) {
      console.error('Error loading races:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', date: '', distance: 10, distanceType: '10k', location: '', status: 'upcoming', finishTime: 0, position: 0, dorsalNumber: '', notes: '' });
        loadData();
      }
    } catch (error) {
      console.error('Error creating race:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filteredRaces = races.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return r.status === 'upcoming';
    return r.status === 'completed';
  });

  const upcomingRaces = races.filter((r) => r.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const completedRaces = races.filter((r) => r.status === 'completed');

  // Stats
  const totalRaces = completedRaces.length;
  const totalKm = completedRaces.reduce((sum, r) => sum + r.distance, 0);
  const avgPosition = completedRaces.filter((r) => r.position).reduce((sum, r, _, arr) => sum + (r.position || 0) / arr.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">Mis Carreras</h1>
          <p className="text-sm text-zinc-500">Historial de competiciones y proximos eventos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors">
          + Nueva Carrera
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Carreras</p>
          <p className="text-3xl font-mono text-emerald-400">{totalRaces}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Km Competidos</p>
          <p className="text-3xl font-mono text-zinc-100">{Math.round(totalKm)}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Proximas</p>
          <p className="text-3xl font-mono text-amber-400">{upcomingRaces.length}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Media Puesto</p>
          <p className="text-3xl font-mono text-zinc-100">{avgPosition ? Math.round(avgPosition) : '-'}</p>
        </div>
      </div>

      {/* Proxima carrera */}
      {upcomingRaces[0] && (
        <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-500/30">
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Proxima Carrera</p>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-medium text-zinc-100">{upcomingRaces[0].name}</h3>
              <p className="text-sm text-zinc-400">{upcomingRaces[0].location} - {upcomingRaces[0].distance} km</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono text-emerald-400">
                {Math.ceil((new Date(upcomingRaces[0].date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
              </p>
              <p className="text-xs text-zinc-500">{new Date(upcomingRaces[0].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {(['all', 'upcoming', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === f ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'}`}
          >
            {f === 'all' ? 'Todas' : f === 'upcoming' ? 'Proximas' : 'Completadas'}
          </button>
        ))}
      </div>

      {/* Lista de carreras */}
      <div className="space-y-3">
        {filteredRaces.map((race) => (
          <div key={race.id} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-zinc-100">{race.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${race.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {race.status === 'completed' ? 'Completada' : 'Proxima'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  {new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {race.location && ` - ${race.location}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono text-zinc-100">{race.distance} km</p>
                {race.finishTime && race.finishTime > 0 && (
                  <p className="text-sm text-emerald-400">{formatTime(race.finishTime)}</p>
                )}
                {race.position && (
                  <p className="text-xs text-zinc-500">Puesto #{race.position}</p>
                )}
              </div>
            </div>
            {race.dorsalNumber && (
              <p className="text-xs text-zinc-600 mt-2">Dorsal: {race.dorsalNumber}</p>
            )}
          </div>
        ))}
      </div>

      {filteredRaces.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400">No hay carreras registradas</p>
        </div>
      )}

      {/* Modal nueva carrera */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-zinc-100 mb-4">Nueva Carrera</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  placeholder="Ej: Media Maraton Valencia"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Tipo</label>
                  <select
                    value={form.distanceType}
                    onChange={(e) => {
                      const type = DISTANCE_TYPES.find((d) => d.value === e.target.value);
                      setForm({ ...form, distanceType: e.target.value, distance: type?.km || form.distance });
                    }}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    {DISTANCE_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Distancia (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.distance}
                    onChange={(e) => setForm({ ...form, distance: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="upcoming">Proxima</option>
                    <option value="completed">Completada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Ubicacion</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  placeholder="Ej: Valencia, Espana"
                />
              </div>
              {form.status === 'completed' && (
                <>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tiempo (segundos)</label>
                    <input
                      type="number"
                      value={form.finishTime}
                      onChange={(e) => setForm({ ...form, finishTime: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                      placeholder="Ej: 5400 para 1:30:00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Posicion</label>
                    <input
                      type="number"
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Dorsal</label>
                <input
                  type="text"
                  value={form.dorsalNumber}
                  onChange={(e) => setForm({ ...form, dorsalNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-500 text-white rounded-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
