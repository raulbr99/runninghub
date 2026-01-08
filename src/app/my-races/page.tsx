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

interface RacePhoto {
  id: string;
  raceId: string;
  url: string;
  caption?: string;
}

const DISTANCE_TYPES = [
  { value: '5k', label: '5K', km: 5 },
  { value: '10k', label: '10K', km: 10 },
  { value: 'half_marathon', label: 'Media Maratón', km: 21.1 },
  { value: 'marathon', label: 'Maratón', km: 42.195 },
  { value: 'ultra', label: 'Ultra', km: 50 },
  { value: 'trail', label: 'Trail', km: 0 },
  { value: 'other', label: 'Otro', km: 0 },
];

const emptyForm = {
  id: '',
  name: '',
  date: '',
  distance: 10,
  distanceType: '10k',
  location: '',
  status: 'upcoming',
  finishTimeH: 0,
  finishTimeM: 0,
  finishTimeS: 0,
  position: 0,
  totalParticipants: 0,
  dorsalNumber: '',
  elevationGain: 0,
  avgHeartRate: 0,
  notes: '',
  website: '',
};

export default function RacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [photos, setPhotos] = useState<Record<string, RacePhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [expandedRace, setExpandedRace] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/races');
      if (res.ok) {
        const data = await res.json();
        setRaces(data.races);
        setPhotos(data.photos || {});
      }
    } catch (error) {
      console.error('Error loading races:', error);
    } finally {
      setLoading(false);
    }
  };

  const secondsToHMS = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  };

  const hmsToSeconds = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

  const formatTime = (seconds: number) => {
    if (!seconds) return '-';
    const { h, m, s } = secondsToHMS(seconds);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const calculatePace = (distanceKm: number, timeSeconds: number) => {
    if (!distanceKm || !timeSeconds) return null;
    const paceSeconds = timeSeconds / distanceKm;
    const paceMin = Math.floor(paceSeconds / 60);
    const paceSec = Math.round(paceSeconds % 60);
    return `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`;
  };

  const openEditForm = (race: Race) => {
    const time = race.finishTime ? secondsToHMS(race.finishTime) : { h: 0, m: 0, s: 0 };
    setForm({
      id: race.id,
      name: race.name,
      date: race.date,
      distance: race.distance,
      distanceType: race.distanceType || '10k',
      location: race.location || '',
      status: race.status,
      finishTimeH: time.h,
      finishTimeM: time.m,
      finishTimeS: time.s,
      position: race.position || 0,
      totalParticipants: race.totalParticipants || 0,
      dorsalNumber: race.dorsalNumber || '',
      elevationGain: race.elevationGain || 0,
      avgHeartRate: race.avgHeartRate || 0,
      notes: race.notes || '',
      website: race.website || '',
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finishTime = hmsToSeconds(form.finishTimeH, form.finishTimeM, form.finishTimeS);
    const avgPace = finishTime && form.distance ? Math.round(finishTime / form.distance) : null;

    const payload = {
      ...form,
      finishTime: finishTime || null,
      avgPace,
      position: form.position || null,
      totalParticipants: form.totalParticipants || null,
      elevationGain: form.elevationGain || null,
      avgHeartRate: form.avgHeartRate || null,
    };

    try {
      const res = await fetch('/api/races', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        setIsEditing(false);
        setForm(emptyForm);
        loadData();
      }
    } catch (error) {
      console.error('Error saving race:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta carrera?')) return;
    try {
      const res = await fetch(`/api/races?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRaces(races.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error('Error deleting race:', error);
    }
  };

  const filteredRaces = races.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return r.status === 'upcoming';
    return r.status === 'completed';
  });

  const upcomingRaces = races.filter((r) => r.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const completedRaces = races.filter((r) => r.status === 'completed');

  const totalRaces = completedRaces.length;
  const totalKm = completedRaces.reduce((sum, r) => sum + r.distance, 0);
  const avgPosition = completedRaces.filter((r) => r.position).length > 0
    ? Math.round(completedRaces.filter((r) => r.position).reduce((sum, r) => sum + (r.position || 0), 0) / completedRaces.filter((r) => r.position).length)
    : null;
  const bestPace = completedRaces.filter((r) => r.avgPace).reduce((best, r) => (r.avgPace && (!best || r.avgPace < best)) ? r.avgPace : best, null as number | null);

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
          <p className="text-sm text-zinc-500">Historial de competiciones y próximos eventos</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setIsEditing(false); setShowForm(true); }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva Carrera
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Carreras</p>
          <p className="text-3xl font-mono text-emerald-400">{totalRaces}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Km Competidos</p>
          <p className="text-3xl font-mono text-zinc-100">{Math.round(totalKm)}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Próximas</p>
          <p className="text-3xl font-mono text-amber-400">{upcomingRaces.length}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Media Puesto</p>
          <p className="text-3xl font-mono text-zinc-100">{avgPosition || '-'}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Mejor Ritmo</p>
          <p className="text-2xl font-mono text-emerald-400">{bestPace ? `${Math.floor(bestPace / 60)}:${(bestPace % 60).toString().padStart(2, '0')}` : '-'}</p>
        </div>
      </div>

      {/* Próxima carrera destacada */}
      {upcomingRaces[0] && (
        <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-500/30">
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Próxima Carrera</p>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-medium text-zinc-100">{upcomingRaces[0].name}</h3>
              <p className="text-sm text-zinc-400">
                {upcomingRaces[0].location && `${upcomingRaces[0].location} - `}
                {upcomingRaces[0].distance} km
                {upcomingRaces[0].dorsalNumber && ` | Dorsal: ${upcomingRaces[0].dorsalNumber}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono text-emerald-400">
                {Math.ceil((new Date(upcomingRaces[0].date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(upcomingRaces[0].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
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
            {f === 'all' ? 'Todas' : f === 'upcoming' ? 'Próximas' : 'Completadas'}
          </button>
        ))}
      </div>

      {/* Lista de carreras */}
      <div className="space-y-3">
        {filteredRaces.map((race) => {
          const isExpanded = expandedRace === race.id;
          const racePhotos = photos[race.id] || [];
          const pace = calculatePace(race.distance, race.finishTime || 0);

          return (
            <div key={race.id} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                onClick={() => setExpandedRace(isExpanded ? null : race.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-zinc-100">{race.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${race.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {race.status === 'completed' ? 'Completada' : 'Próxima'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      {new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {race.location && ` - ${race.location}`}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-lg font-mono text-zinc-100">{race.distance} km</p>
                      {race.finishTime && race.finishTime > 0 && (
                        <p className="text-sm text-emerald-400">{formatTime(race.finishTime)}</p>
                      )}
                    </div>
                    <svg className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Detalles expandidos */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-800/50 pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    {pace && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase">Ritmo</p>
                        <p className="text-lg font-mono text-zinc-100">{pace}</p>
                      </div>
                    )}
                    {race.position && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase">Posición</p>
                        <p className="text-lg font-mono text-zinc-100">
                          #{race.position}
                          {race.totalParticipants && <span className="text-zinc-500 text-sm">/{race.totalParticipants}</span>}
                        </p>
                      </div>
                    )}
                    {race.elevationGain && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase">Desnivel</p>
                        <p className="text-lg font-mono text-zinc-100">{race.elevationGain}m</p>
                      </div>
                    )}
                    {race.avgHeartRate && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase">FC Media</p>
                        <p className="text-lg font-mono text-zinc-100">{race.avgHeartRate} bpm</p>
                      </div>
                    )}
                    {race.dorsalNumber && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase">Dorsal</p>
                        <p className="text-lg font-mono text-zinc-100">{race.dorsalNumber}</p>
                      </div>
                    )}
                  </div>

                  {race.notes && (
                    <p className="text-sm text-zinc-400 mb-4 italic">{race.notes}</p>
                  )}

                  {race.website && (
                    <a href={race.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:underline mb-4 block">
                      Ver web de la carrera
                    </a>
                  )}

                  {/* Fotos */}
                  {racePhotos.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-zinc-500 uppercase mb-2">Fotos</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {racePhotos.map((photo) => (
                          <img
                            key={photo.id}
                            src={photo.url}
                            alt={photo.caption || 'Foto de carrera'}
                            className="h-24 w-auto rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2 border-t border-zinc-800/50">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditForm(race); }}
                      className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(race.id); }}
                      className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredRaces.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400">No hay carreras registradas</p>
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-zinc-100 mb-4">
              {isEditing ? 'Editar Carrera' : 'Nueva Carrera'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  placeholder="Ej: Media Maratón Valencia"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="upcoming">Próxima</option>
                    <option value="completed">Completada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Distancia (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.distance}
                    onChange={(e) => setForm({ ...form, distance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Ubicación</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  placeholder="Ej: Valencia, España"
                />
              </div>

              {form.status === 'completed' && (
                <>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tiempo (HH:MM:SS)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={form.finishTimeH}
                          onChange={(e) => setForm({ ...form, finishTimeH: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-center"
                          placeholder="HH"
                        />
                        <p className="text-xs text-zinc-600 text-center mt-1">Horas</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={form.finishTimeM}
                          onChange={(e) => setForm({ ...form, finishTimeM: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-center"
                          placeholder="MM"
                        />
                        <p className="text-xs text-zinc-600 text-center mt-1">Min</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={form.finishTimeS}
                          onChange={(e) => setForm({ ...form, finishTimeS: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-center"
                          placeholder="SS"
                        />
                        <p className="text-xs text-zinc-600 text-center mt-1">Seg</p>
                      </div>
                    </div>
                    {form.distance > 0 && (form.finishTimeH > 0 || form.finishTimeM > 0 || form.finishTimeS > 0) && (
                      <p className="text-sm text-emerald-400 mt-2">
                        Ritmo: {calculatePace(form.distance, hmsToSeconds(form.finishTimeH, form.finishTimeM, form.finishTimeS))}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Posición</label>
                      <input
                        type="number"
                        min="0"
                        value={form.position || ''}
                        onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                        placeholder="Ej: 156"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Total Participantes</label>
                      <input
                        type="number"
                        min="0"
                        value={form.totalParticipants || ''}
                        onChange={(e) => setForm({ ...form, totalParticipants: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                        placeholder="Ej: 5000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Desnivel (m)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.elevationGain || ''}
                        onChange={(e) => setForm({ ...form, elevationGain: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                        placeholder="Ej: 350"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">FC Media (bpm)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.avgHeartRate || ''}
                        onChange={(e) => setForm({ ...form, avgHeartRate: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                        placeholder="Ej: 165"
                      />
                    </div>
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
                  placeholder="Ej: 1234"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Web de la carrera</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 resize-none"
                  rows={3}
                  placeholder="Sensaciones, meteorología, estrategia..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setIsEditing(false); }}
                  className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  {isEditing ? 'Guardar Cambios' : 'Crear Carrera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
