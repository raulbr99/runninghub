'use client';

import { useState, useEffect, useRef } from 'react';

interface Workout {
  id: string;
  date: string;
  type: string;
  title: string | null;
  distance: number | null;
  duration: number | null;
  avgHr: number | null;
}

const TYPE_LABELS: Record<string, string> = {
  easy: 'Rodaje',
  tempo: 'Tempo',
  intervals: 'Series',
  long: 'Tirada larga',
  recovery: 'Recuperacion',
  race: 'Carrera',
};

const THEMES = [
  { id: 'dark', name: 'Oscuro', bg: 'bg-zinc-900', text: 'text-zinc-100', accent: 'text-emerald-400' },
  { id: 'light', name: 'Claro', bg: 'bg-white', text: 'text-zinc-900', accent: 'text-emerald-600' },
  { id: 'green', name: 'Verde', bg: 'bg-emerald-900', text: 'text-emerald-50', accent: 'text-emerald-300' },
  { id: 'blue', name: 'Azul', bg: 'bg-blue-900', text: 'text-blue-50', accent: 'text-blue-300' },
];

export default function SharePage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [theme, setTheme] = useState(THEMES[0]);
  const [loading, setLoading] = useState(true);
  const [showName, setShowName] = useState(true);
  const [userName, setUserName] = useState('Runner');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWorkouts();
    loadProfile();
  }, []);

  const loadWorkouts = async () => {
    try {
      const res = await fetch('/api/workouts?limit=20');
      if (res.ok) {
        const data = await res.json();
        setWorkouts(data);
        if (data.length > 0) {
          setSelectedWorkout(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/runner-profile');
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          setUserName(data.name);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (distance: number, duration: number) => {
    const pace = duration / distance;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const downloadImage = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `workout-${selectedWorkout?.date || 'share'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error al generar la imagen. Intenta de nuevo.');
    }
  };

  const copyToClipboard = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert('Imagen copiada al portapapeles');
        }
      });
    } catch (error) {
      console.error('Error copying image:', error);
      alert('Error al copiar. Intenta descargar la imagen.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">
          Compartir Entrenamiento
        </h1>
        <p className="text-sm text-zinc-500">Genera una imagen para compartir en redes sociales</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Configuración */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
              Seleccionar entrenamiento
            </h2>
            <select
              value={selectedWorkout?.id || ''}
              onChange={(e) => {
                const workout = workouts.find((w) => w.id === e.target.value);
                setSelectedWorkout(workout || null);
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {formatDate(w.date)} - {TYPE_LABELS[w.type] || w.type} - {w.distance?.toFixed(1)}{' '}
                  km
                </option>
              ))}
            </select>
          </div>

          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">Tema</h2>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t)}
                  className={`p-3 rounded-lg ${t.bg} border-2 transition-colors ${
                    theme.id === t.id ? 'border-emerald-500' : 'border-transparent'
                  }`}
                >
                  <span className={`text-xs ${t.text}`}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
              Opciones
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-zinc-300">Mostrar nombre</span>
            </label>
            {showName && (
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-3 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Tu nombre"
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadImage}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Descargar
            </button>
            <button
              onClick={copyToClipboard}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copiar
            </button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Vista previa
          </h2>
          <div
            ref={cardRef}
            className={`${theme.bg} rounded-2xl p-8 shadow-2xl`}
            style={{ aspectRatio: '1/1', maxWidth: '400px' }}
          >
            {selectedWorkout ? (
              <div className="h-full flex flex-col justify-between">
                <div>
                  {showName && (
                    <p className={`text-sm ${theme.accent} uppercase tracking-wider mb-1`}>
                      {userName}
                    </p>
                  )}
                  <p className={`text-xs ${theme.text} opacity-60`}>
                    {formatDate(selectedWorkout.date)}
                  </p>
                </div>

                <div className="text-center py-8">
                  <p
                    className={`text-6xl font-bold ${theme.accent}`}
                    style={{ fontFamily: 'system-ui' }}
                  >
                    {selectedWorkout.distance?.toFixed(2)}
                  </p>
                  <p className={`text-2xl ${theme.text} opacity-80 -mt-1`}>kilometros</p>

                  <div className={`mt-6 flex justify-center gap-8 ${theme.text}`}>
                    <div className="text-center">
                      <p className="text-2xl font-mono">
                        {selectedWorkout.duration ? formatTime(selectedWorkout.duration) : '-'}
                      </p>
                      <p className="text-xs opacity-60 uppercase">Tiempo</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-mono">
                        {selectedWorkout.distance && selectedWorkout.duration
                          ? formatPace(selectedWorkout.distance, selectedWorkout.duration)
                          : '-'}
                      </p>
                      <p className="text-xs opacity-60 uppercase">Ritmo /km</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${theme.accent} bg-white/10`}
                  >
                    {TYPE_LABELS[selectedWorkout.type] || selectedWorkout.type}
                  </span>
                  <span className={`text-xs ${theme.text} opacity-40`}>RunningHub</span>
                </div>
              </div>
            ) : (
              <div className={`h-full flex items-center justify-center ${theme.text} opacity-50`}>
                Selecciona un entrenamiento
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
