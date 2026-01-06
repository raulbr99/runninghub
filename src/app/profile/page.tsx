'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRarityColor } from '@/lib/gamification';

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  progressPercent: number;
}

interface AchievementsData {
  achievements: Achievement[];
  stats: { unlocked: number; total: number; percent: number };
}

interface LifestyleInfo {
  occupation?: string;
  workScheduleStart?: string;
  workScheduleEnd?: string;
  personality?: string;
  relationshipStatus?: string;
  lifeNotes?: string;
}

interface RunnerProfile {
  id: string;
  name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  yearsRunning: number | null;
  weeklyKm: number | null;
  thresholdPace: number | null;
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
  additionalInfo: LifestyleInfo | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [achievements, setAchievements] = useState<AchievementsData | null>(null);
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
    thresholdPace: '',
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
    // Estilo de vida
    occupation: '',
    workScheduleStart: '',
    workScheduleEnd: '',
    personality: '',
    relationshipStatus: '',
    lifeNotes: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, achievementsRes] = await Promise.all([
        fetch('/api/runner-profile'),
        fetch('/api/achievements'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        if (data) {
          const lifestyle = data.additionalInfo || {};
          setFormData({
            name: data.name || '',
            age: data.age?.toString() || '',
            weight: data.weight?.toString() || '',
            height: data.height?.toString() || '',
            yearsRunning: data.yearsRunning?.toString() || '',
            weeklyKm: data.weeklyKm?.toString() || '',
            thresholdPace: data.thresholdPace?.toString() || '',
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
            // Estilo de vida
            occupation: lifestyle.occupation || '',
            workScheduleStart: lifestyle.workScheduleStart || '',
            workScheduleEnd: lifestyle.workScheduleEnd || '',
            personality: lifestyle.personality || '',
            relationshipStatus: lifestyle.relationshipStatus || '',
            lifeNotes: lifestyle.lifeNotes || '',
          });
        }
      }

      if (achievementsRes.ok) {
        setAchievements(await achievementsRes.json());
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
      thresholdPace: formData.thresholdPace ? parseFloat(formData.thresholdPace) : null,
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
      additionalInfo: {
        occupation: formData.occupation || null,
        workScheduleStart: formData.workScheduleStart || null,
        workScheduleEnd: formData.workScheduleEnd || null,
        personality: formData.personality || null,
        relationshipStatus: formData.relationshipStatus || null,
        lifeNotes: formData.lifeNotes || null,
      },
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Perfil</h1>
        </div>
        <p className="text-sm text-zinc-500">Datos para personalizar tu entrenamiento</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Personales */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
              </svg>
              Datos Personales
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Nombre</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Edad</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="70.5"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Altura (cm)</label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="175"
              />
            </div>
          </div>
        </div>

        {/* Experiencia */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              Experiencia
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Anos corriendo</label>
              <input
                type="number"
                name="yearsRunning"
                value={formData.yearsRunning}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Km/semana habitual</label>
              <input
                type="number"
                step="0.1"
                name="weeklyKm"
                value={formData.weeklyKm}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="40"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Ritmo umbral (min/km)</label>
              <input
                type="number"
                step="0.1"
                name="thresholdPace"
                value={formData.thresholdPace}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="5.0"
              />
              <p className="text-xs text-zinc-600 mt-1">Ej: 5.0 = 5:00/km, 4.5 = 4:30/km</p>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Terreno preferido</label>
              <select
                name="preferredTerrain"
                value={formData.preferredTerrain}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              >
                <option value="">Seleccionar...</option>
                <option value="asfalto">Asfalto</option>
                <option value="trail">Trail/Montana</option>
                <option value="pista">Pista</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Tiempo max. sesion (min)</label>
              <input
                type="number"
                name="maxTimePerSession"
                value={formData.maxTimePerSession}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="90"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Dias disponibles</label>
              <input
                type="text"
                name="availableDays"
                value={formData.availableDays}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Lunes, Miercoles, Viernes, Domingo"
              />
            </div>
          </div>
        </div>

        {/* Marcas Personales */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
              </svg>
              Marcas Personales
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">5K</label>
              <input
                type="text"
                name="pb5k"
                value={formData.pb5k}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="20:30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">10K</label>
              <input
                type="text"
                name="pb10k"
                value={formData.pb10k}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="42:00"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Media</label>
              <input
                type="text"
                name="pbHalfMarathon"
                value={formData.pbHalfMarathon}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="1:35:00"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Maraton</label>
              <input
                type="text"
                name="pbMarathon"
                value={formData.pbMarathon}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="3:20:00"
              />
            </div>
          </div>
        </div>

        {/* Objetivos */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
              Objetivos
            </h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Objetivo actual</label>
              <textarea
                name="currentGoal"
                value={formData.currentGoal}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Ej: Bajar de 45 minutos en 10K, correr mi primera maraton..."
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Carrera objetivo</label>
              <input
                type="text"
                name="targetRace"
                value={formData.targetRace}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Maraton de Madrid"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Fecha objetivo</label>
              <input
                type="date"
                name="targetDate"
                value={formData.targetDate}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Tiempo objetivo</label>
              <input
                type="text"
                name="targetTime"
                value={formData.targetTime}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="3:15:00"
              />
            </div>
          </div>
        </div>

        {/* Salud */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
              Salud
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Lesiones actuales</label>
              <textarea
                name="injuries"
                value={formData.injuries}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Describe cualquier lesion o molestia..."
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Notas de salud</label>
              <textarea
                name="healthNotes"
                value={formData.healthNotes}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Alergias, medicamentos, condiciones relevantes..."
              />
            </div>
          </div>
        </div>

        {/* Estilo de Vida */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
              Estilo de Vida
            </h2>
            <p className="text-xs text-zinc-600 mt-1">Contexto personal para el coach</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Ocupacion</label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Ej: Programador, Estudiante..."
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Estado de relacion</label>
              <select
                name="relationshipStatus"
                value={formData.relationshipStatus}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              >
                <option value="">Seleccionar...</option>
                <option value="single">Soltero/a</option>
                <option value="relationship">Con pareja</option>
                <option value="married">Casado/a</option>
                <option value="complicated">Es complicado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Horario inicio</label>
              <input
                type="time"
                name="workScheduleStart"
                value={formData.workScheduleStart}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Horario fin</label>
              <input
                type="time"
                name="workScheduleEnd"
                value={formData.workScheduleEnd}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Personalidad</label>
              <select
                name="personality"
                value={formData.personality}
                onChange={handleChange}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              >
                <option value="">Seleccionar...</option>
                <option value="introvert">Introvertido</option>
                <option value="extrovert">Extrovertido</option>
                <option value="ambivert">Ambivertido</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Notas adicionales</label>
              <textarea
                name="lifeNotes"
                value={formData.lifeNotes}
                onChange={handleChange}
                rows={2}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Hobbies, responsabilidades, limitaciones de tiempo..."
              />
            </div>
          </div>
        </div>

        {/* Boton Guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Guardar
              </>
            )}
          </button>
        </div>
      </form>

      {/* Logros */}
      {achievements && (
        <div className="mt-8 bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
            <h2 className="text-sm font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
              </svg>
              Logros
            </h2>
            <Link href="/achievements" className="text-emerald-500 text-xs hover:text-emerald-400">
              Ver todos ({achievements.stats.unlocked}/{achievements.stats.total})
            </Link>
          </div>
          <div className="p-4">
            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-500 text-xs uppercase tracking-wider">Progreso</span>
                <span className="font-mono text-zinc-300">{achievements.stats.percent}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  style={{ width: `${achievements.stats.percent}%` }}
                />
              </div>
            </div>

            {/* Recent unlocked */}
            <div className="mb-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Desbloqueados</p>
              <div className="flex gap-2 flex-wrap">
                {achievements.achievements
                  .filter(a => a.unlocked)
                  .slice(-6)
                  .reverse()
                  .map(achievement => (
                    <div
                      key={achievement.id}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${getRarityColor(achievement.rarity).replace('text-', 'border-')} bg-zinc-800/50`}
                      title={achievement.name}
                    >
                      {achievement.icon}
                    </div>
                  ))}
                {achievements.achievements.filter(a => a.unlocked).length === 0 && (
                  <p className="text-sm text-zinc-600">Sin logros desbloqueados</p>
                )}
              </div>
            </div>

            {/* Next to unlock */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Proximos</p>
              <div className="space-y-3">
                {achievements.achievements
                  .filter(a => !a.unlocked)
                  .sort((a, b) => b.progressPercent - a.progressPercent)
                  .slice(0, 3)
                  .map(achievement => (
                    <div key={achievement.id} className="flex items-center gap-3">
                      <span className="text-lg opacity-40">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-400">{achievement.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${achievement.progressPercent}%` }} />
                          </div>
                          <span className="text-xs text-zinc-600 font-mono">{achievement.progressPercent}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
