'use client';

import { useState, useEffect } from 'react';

interface RunnerProfile {
  id: string;
  name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  yearsRunning: number | null;
  weeklyKm: number | null;
  pb5k: string | null;
  pb10k: string | null;
  pbHalfMarathon: string | null;
  pbMarathon: string | null;
  currentGoal: string | null;
  targetRace: string | null;
  targetDate: string | null;
  targetTime: string | null;
  injuries: string | null;
  healthNotes: string | null;
  preferredTerrain: string | null;
  availableDays: string | null;
  maxTimePerSession: number | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    yearsRunning: '',
    weeklyKm: '',
    pb5k: '',
    pb10k: '',
    pbHalfMarathon: '',
    pbMarathon: '',
    currentGoal: '',
    targetRace: '',
    targetDate: '',
    targetTime: '',
    injuries: '',
    healthNotes: '',
    preferredTerrain: '',
    availableDays: '',
    maxTimePerSession: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/runner-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData({
          name: data.name || '',
          age: data.age?.toString() || '',
          weight: data.weight?.toString() || '',
          height: data.height?.toString() || '',
          yearsRunning: data.yearsRunning?.toString() || '',
          weeklyKm: data.weeklyKm?.toString() || '',
          pb5k: data.pb5k || '',
          pb10k: data.pb10k || '',
          pbHalfMarathon: data.pbHalfMarathon || '',
          pbMarathon: data.pbMarathon || '',
          currentGoal: data.currentGoal || '',
          targetRace: data.targetRace || '',
          targetDate: data.targetDate || '',
          targetTime: data.targetTime || '',
          injuries: data.injuries || '',
          healthNotes: data.healthNotes || '',
          preferredTerrain: data.preferredTerrain || '',
          availableDays: data.availableDays || '',
          maxTimePerSession: data.maxTimePerSession?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      name: formData.name || null,
      age: formData.age ? parseInt(formData.age) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      height: formData.height ? parseInt(formData.height) : null,
      yearsRunning: formData.yearsRunning ? parseInt(formData.yearsRunning) : null,
      weeklyKm: formData.weeklyKm ? parseFloat(formData.weeklyKm) : null,
      pb5k: formData.pb5k || null,
      pb10k: formData.pb10k || null,
      pbHalfMarathon: formData.pbHalfMarathon || null,
      pbMarathon: formData.pbMarathon || null,
      currentGoal: formData.currentGoal || null,
      targetRace: formData.targetRace || null,
      targetDate: formData.targetDate || null,
      targetTime: formData.targetTime || null,
      injuries: formData.injuries || null,
      healthNotes: formData.healthNotes || null,
      preferredTerrain: formData.preferredTerrain || null,
      availableDays: formData.availableDays || null,
      maxTimePerSession: formData.maxTimePerSession ? parseInt(formData.maxTimePerSession) : null,
    };

    try {
      const res = await fetch('/api/runner-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setMessage({ type: 'success', text: 'Perfil guardado correctamente' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar el perfil' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Error al guardar el perfil' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">👤</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Configura tu perfil de corredor para que el coach te conozca mejor</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Personales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>📋</span> Datos Personales
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Edad</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="70.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Altura (cm)</label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="175"
              />
            </div>
          </div>
        </div>

        {/* Experiencia */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🏃</span> Experiencia
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anos corriendo</label>
              <input
                type="number"
                name="yearsRunning"
                value={formData.yearsRunning}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Km/semana habitual</label>
              <input
                type="number"
                step="0.1"
                name="weeklyKm"
                value={formData.weeklyKm}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terreno preferido</label>
              <select
                name="preferredTerrain"
                value={formData.preferredTerrain}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Seleccionar...</option>
                <option value="asfalto">Asfalto</option>
                <option value="trail">Trail/Montana</option>
                <option value="pista">Pista</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiempo max. por sesion (min)</label>
              <input
                type="number"
                name="maxTimePerSession"
                value={formData.maxTimePerSession}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="90"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dias disponibles para entrenar</label>
              <input
                type="text"
                name="availableDays"
                value={formData.availableDays}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Lunes, Miercoles, Viernes, Domingo"
              />
            </div>
          </div>
        </div>

        {/* Marcas Personales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🏆</span> Marcas Personales
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">5K</label>
              <input
                type="text"
                name="pb5k"
                value={formData.pb5k}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="20:30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">10K</label>
              <input
                type="text"
                name="pb10k"
                value={formData.pb10k}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="42:00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Media Maraton</label>
              <input
                type="text"
                name="pbHalfMarathon"
                value={formData.pbHalfMarathon}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="1:35:00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maraton</label>
              <input
                type="text"
                name="pbMarathon"
                value={formData.pbMarathon}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="3:20:00"
              />
            </div>
          </div>
        </div>

        {/* Objetivos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🎯</span> Objetivos
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo actual</label>
              <textarea
                name="currentGoal"
                value={formData.currentGoal}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ej: Bajar de 45 minutos en 10K, correr mi primera maraton..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carrera objetivo</label>
              <input
                type="text"
                name="targetRace"
                value={formData.targetRace}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Maraton de Madrid"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha objetivo</label>
              <input
                type="date"
                name="targetDate"
                value={formData.targetDate}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiempo objetivo</label>
              <input
                type="text"
                name="targetTime"
                value={formData.targetTime}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="3:15:00"
              />
            </div>
          </div>
        </div>

        {/* Salud */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>💚</span> Salud
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lesiones o molestias actuales</label>
              <textarea
                name="injuries"
                value={formData.injuries}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe cualquier lesion o molestia que tengas..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas de salud</label>
              <textarea
                name="healthNotes"
                value={formData.healthNotes}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Alergias, medicamentos, condiciones medicas relevantes..."
              />
            </div>
          </div>
        </div>

        {/* Boton Guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar Perfil
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
