'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Injury {
  id: string;
  name: string;
  bodyPart: string;
  side?: string;
  severity: string;
  status: string;
  startDate: string;
  endDate?: string;
  cause?: string;
  symptoms?: string;
  treatment?: string;
  doctor?: string;
  diagnosis?: string;
  notes?: string;
  daysOff: number;
}

interface InjuryLog {
  id: string;
  injuryId: string;
  date: string;
  painLevel: number;
  notes?: string;
  treatment?: string;
}

const BODY_PARTS = [
  { value: 'foot', label: 'Pie' },
  { value: 'ankle', label: 'Tobillo' },
  { value: 'shin', label: 'Espinilla' },
  { value: 'calf', label: 'Gemelo' },
  { value: 'knee', label: 'Rodilla' },
  { value: 'hamstring', label: 'Isquio' },
  { value: 'quad', label: 'Cuadriceps' },
  { value: 'hip', label: 'Cadera' },
  { value: 'back', label: 'Espalda' },
  { value: 'other', label: 'Otro' },
];

export default function InjuriesPage() {
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [logs, setLogs] = useState<Record<string, InjuryLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState<Injury | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bodyPart: 'knee',
    side: '',
    severity: 'moderate',
    startDate: new Date().toISOString().split('T')[0],
    cause: '',
    symptoms: '',
    treatment: '',
    initialPainLevel: 5,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/injuries');
      if (res.ok) {
        const data = await res.json();
        setInjuries(data.injuries);
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error loading injuries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/injuries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({
          name: '',
          bodyPart: 'knee',
          side: '',
          severity: 'moderate',
          startDate: new Date().toISOString().split('T')[0],
          cause: '',
          symptoms: '',
          treatment: '',
          initialPainLevel: 5,
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating injury:', error);
    }
  };

  const handleStatusUpdate = async (injury: Injury, newStatus: string) => {
    try {
      const res = await fetch('/api/injuries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...injury,
          status: newStatus,
          endDate: newStatus === 'healed' ? new Date().toISOString().split('T')[0] : injury.endDate,
        }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error updating injury:', error);
    }
  };

  const handleLogPain = async (painLevel: number, notes: string) => {
    if (!selectedInjury) return;
    try {
      const res = await fetch('/api/injuries/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          injuryId: selectedInjury.id,
          date: new Date().toISOString().split('T')[0],
          painLevel,
          notes,
        }),
      });
      if (res.ok) {
        setShowLogForm(false);
        loadData();
      }
    } catch (error) {
      console.error('Error logging pain:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'text-emerald-400 bg-emerald-500/20';
      case 'moderate': return 'text-amber-400 bg-amber-500/20';
      case 'severe': return 'text-red-400 bg-red-500/20';
      default: return 'text-zinc-400 bg-zinc-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400 bg-red-500/20';
      case 'recovering': return 'text-amber-400 bg-amber-500/20';
      case 'healed': return 'text-emerald-400 bg-emerald-500/20';
      default: return 'text-zinc-400 bg-zinc-500/20';
    }
  };

  const activeInjuries = injuries.filter((i) => i.status !== 'healed');
  const healedInjuries = injuries.filter((i) => i.status === 'healed');

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
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">
            Tracker de Lesiones
          </h1>
          <p className="text-sm text-zinc-500">
            Registra y monitorea tus lesiones para prevenir recaidas
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          + Nueva Lesion
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Activas</p>
          <p className="text-3xl font-mono text-red-400">{activeInjuries.filter((i) => i.status === 'active').length}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Recuperandose</p>
          <p className="text-3xl font-mono text-amber-400">{activeInjuries.filter((i) => i.status === 'recovering').length}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Curadas</p>
          <p className="text-3xl font-mono text-emerald-400">{healedInjuries.length}</p>
        </div>
      </div>

      {activeInjuries.length === 0 && healedInjuries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400">Sin lesiones registradas</p>
          <p className="text-sm text-zinc-600 mt-1">Esperemos que siga asi</p>
        </div>
      )}

      {/* Lesiones activas */}
      {activeInjuries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Lesiones Activas</h2>
          <div className="space-y-4">
            {activeInjuries.map((injury) => (
              <div key={injury.id} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-zinc-100">{injury.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {BODY_PARTS.find((b) => b.value === injury.bodyPart)?.label}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(injury.severity)}`}>
                      {injury.severity === 'mild' ? 'Leve' : injury.severity === 'moderate' ? 'Moderada' : 'Grave'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(injury.status)}`}>
                      {injury.status === 'active' ? 'Activa' : 'Recuperandose'}
                    </span>
                  </div>
                </div>

                {logs[injury.id] && logs[injury.id].length > 1 && (
                  <div className="mt-4 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...logs[injury.id]].reverse()}>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                        <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} width={25} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value) => [`${value}/10`, 'Dolor']}
                        />
                        <Line type="monotone" dataKey="painLevel" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setSelectedInjury(injury); setShowLogForm(true); }}
                    className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Registrar dolor
                  </button>
                  {injury.status === 'active' && (
                    <button
                      onClick={() => handleStatusUpdate(injury, 'recovering')}
                      className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                    >
                      Marcar en recuperacion
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate(injury, 'healed')}
                    className="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                  >
                    Marcar curada
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {healedInjuries.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Historial</h2>
          <div className="space-y-2">
            {healedInjuries.map((injury) => (
              <div key={injury.id} className="bg-zinc-900/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-zinc-300">{injury.name}</p>
                  <p className="text-xs text-zinc-500">{injury.startDate} - {injury.endDate}</p>
                </div>
                <span className="text-emerald-400 text-sm">Curada</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nueva lesion */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-zinc-100 mb-4">Nueva Lesion</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  placeholder="Ej: Fascitis plantar"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Zona</label>
                  <select
                    value={form.bodyPart}
                    onChange={(e) => setForm({ ...form, bodyPart: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    {BODY_PARTS.map((bp) => (
                      <option key={bp.value} value={bp.value}>{bp.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Gravedad</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="mild">Leve</option>
                    <option value="moderate">Moderada</option>
                    <option value="severe">Grave</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nivel de dolor inicial (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.initialPainLevel}
                  onChange={(e) => setForm({ ...form, initialPainLevel: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-center text-zinc-300">{form.initialPainLevel}/10</div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-red-500 text-white rounded-lg">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal registrar dolor */}
      {showLogForm && selectedInjury && (
        <LogPainModal
          injury={selectedInjury}
          onClose={() => { setShowLogForm(false); setSelectedInjury(null); }}
          onSave={handleLogPain}
        />
      )}
    </div>
  );
}

function LogPainModal({ injury, onClose, onSave }: { injury: Injury; onClose: () => void; onSave: (painLevel: number, notes: string) => void; }) {
  const [painLevel, setPainLevel] = useState(5);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-sm">
        <h2 className="text-lg font-medium text-zinc-100 mb-2">Registrar Dolor</h2>
        <p className="text-sm text-zinc-500 mb-4">{injury.name}</p>
        
        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-2">Nivel de dolor</label>
          <input type="range" min="1" max="10" value={painLevel} onChange={(e) => setPainLevel(parseInt(e.target.value))} className="w-full" />
          <div className="text-center text-2xl font-mono text-red-400">{painLevel}/10</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-1">Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100" rows={2} />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg">Cancelar</button>
          <button onClick={() => onSave(painLevel, notes)} className="flex-1 py-2 bg-red-500 text-white rounded-lg">Guardar</button>
        </div>
      </div>
    </div>
  );
}
