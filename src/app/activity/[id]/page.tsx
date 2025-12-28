'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Cargar mapa dinámicamente para evitar problemas con SSR
const ActivityMap = dynamic(() => import('@/components/ActivityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
    </div>
  ),
});

interface StreamData {
  time?: { data: number[] };
  distance?: { data: number[] };
  altitude?: { data: number[] };
  heartrate?: { data: number[] };
  cadence?: { data: number[] };
  watts?: { data: number[] };
  velocity_smooth?: { data: number[] };
  grade_smooth?: { data: number[] };
  temp?: { data: number[] };
}

interface Split {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  pace_zone: number;
}

interface Lap {
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  lap_index: number;
}

interface SegmentEffort {
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_cadence?: number;
  average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  segment: {
    name: string;
    distance: number;
    average_grade: number;
    maximum_grade: number;
    elevation_high: number;
    elevation_low: number;
    city: string;
    state: string;
    country: string;
    climb_category: number;
  };
  kom_rank?: number;
  pr_rank?: number;
}

interface Activity {
  id: string;
  date: string;
  time?: string;
  category: string;
  type: string;
  title?: string;
  distance?: number;
  duration?: number;
  pace?: string;
  heartRate?: number;
  feeling?: number;
  completed?: number;
  notes?: string;
  description?: string;
  // Strava fields
  stravaId?: string;
  movingTime?: number;
  elapsedTime?: number;
  sportType?: string;
  workoutType?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  elevationGain?: number;
  elevHigh?: number;
  elevLow?: number;
  maxHeartRate?: number;
  hasHeartrate?: number;
  averageCadence?: number;
  averageWatts?: number;
  maxWatts?: number;
  weightedAverageWatts?: number;
  deviceWatts?: number;
  kilojoules?: number;
  calories?: number;
  sufferScore?: number;
  averageTemp?: number;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  mapPolyline?: string;
  timezone?: string;
  gearId?: string;
  gearName?: string;
  deviceName?: string;
  kudosCount?: number;
  commentCount?: number;
  achievementCount?: number;
  prCount?: number;
  splitsMetric?: Split[];
  laps?: Lap[];
  segmentEfforts?: SegmentEffort[];
}

const ACTIVITY_TYPES: Record<string, { icon: string; label: string; color: string }> = {
  easy: { icon: '🏃', label: 'Rodaje', color: 'bg-green-500' },
  tempo: { icon: '💨', label: 'Tempo', color: 'bg-yellow-500' },
  intervals: { icon: '⚡', label: 'Series', color: 'bg-red-500' },
  long: { icon: '🏔️', label: 'Largo', color: 'bg-blue-500' },
  recovery: { icon: '🧘', label: 'Recuperacion', color: 'bg-purple-500' },
  race: { icon: '🏆', label: 'Competicion', color: 'bg-orange-500' },
  strength: { icon: '💪', label: 'Fuerza', color: 'bg-pink-500' },
  cycling: { icon: '🚴', label: 'Ciclismo', color: 'bg-cyan-500' },
  swim: { icon: '🏊', label: 'Natacion', color: 'bg-blue-400' },
  walk: { icon: '🚶', label: 'Caminata', color: 'bg-teal-500' },
  other: { icon: '🎯', label: 'Otro', color: 'bg-gray-500' },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPace(speedMs: number): string {
  if (speedMs <= 0) return '-';
  const paceMinPerKm = 1000 / speedMs / 60;
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getClimbCategory(category: number): string {
  switch (category) {
    case 0: return 'NC';
    case 1: return 'Cat 4';
    case 2: return 'Cat 3';
    case 3: return 'Cat 2';
    case 4: return 'Cat 1';
    case 5: return 'HC';
    default: return '-';
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ActivityPage() {
  const params = useParams();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'charts' | 'splits' | 'laps' | 'segments'>('overview');
  const [streams, setStreams] = useState<StreamData | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // AI Summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    async function loadActivity() {
      try {
        const res = await fetch(`/api/activities/${params.id}`);
        if (!res.ok) throw new Error('Activity not found');
        const data = await res.json();
        setActivity(data);
      } catch (error) {
        console.error('Error loading activity:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadActivity();
    }
  }, [params.id]);

  // Cargar streams cuando se selecciona la pestaña de gráficas
  useEffect(() => {
    async function loadStreams() {
      if (!activity?.stravaId && !activity?.notes?.startsWith('strava:')) return;

      setLoadingStreams(true);
      try {
        const res = await fetch(`/api/activities/${params.id}/streams`);
        if (res.ok) {
          const data = await res.json();
          setStreams(data);
        }
      } catch (error) {
        console.error('Error loading streams:', error);
      } finally {
        setLoadingStreams(false);
      }
    }

    if (activeTab === 'charts' && !streams && activity) {
      loadStreams();
    }
  }, [activeTab, activity, params.id, streams]);

  // Preparar datos para las gráficas
  const chartData = streams?.distance?.data?.map((dist, i) => ({
    distance: Math.round(dist / 10) / 100, // km con 2 decimales
    altitude: streams.altitude?.data?.[i],
    heartrate: streams.heartrate?.data?.[i],
    cadence: streams.cadence?.data?.[i] ? streams.cadence.data[i] * 2 : undefined, // SPM
    pace: streams.velocity_smooth?.data?.[i] ? 1000 / streams.velocity_smooth.data[i] / 60 : undefined, // min/km
    watts: streams.watts?.data?.[i],
    grade: streams.grade_smooth?.data?.[i],
    temp: streams.temp?.data?.[i],
  })) || [];

  // Cargar resumen de IA cuando se selecciona la pestaña de análisis
  useEffect(() => {
    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const res = await fetch(`/api/activities/${params.id}/summary`);
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
        }
      } catch (error) {
        console.error('Error loading summary:', error);
      } finally {
        setLoadingSummary(false);
      }
    }

    if (activeTab === 'analysis' && !summary && activity) {
      loadSummary();
    }
  }, [activeTab, activity, params.id, summary]);

  // Función para enviar mensaje al chat
  async function sendChatMessage() {
    if (!chatInput.trim() || sendingMessage) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setSendingMessage(true);

    try {
      const res = await fetch(`/api/activities/${params.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  }

  // Reducir datos para mejor rendimiento (tomar cada N puntos)
  const sampleRate = Math.max(1, Math.floor(chartData.length / 500));
  const sampledData = chartData.filter((_, i) => i % sampleRate === 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 dark:text-gray-400">Actividad no encontrada</p>
        <Link href="/calendar" className="text-green-600 hover:underline">
          Volver al calendario
        </Link>
      </div>
    );
  }

  const typeInfo = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.other;
  const isStravaActivity = !!(activity.stravaId || activity.notes?.startsWith('strava:'));
  const hasSplits = activity.splitsMetric && activity.splitsMetric.length > 0;
  const hasLaps = activity.laps && activity.laps.length > 0;
  const hasSegments = activity.segmentEfforts && activity.segmentEfforts.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {activity.title || typeInfo.label}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(activity.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {activity.time && ` a las ${activity.time}`}
              </p>
            </div>
            {activity.stravaId && (
              <a
                href={`https://www.strava.com/activities/${activity.stravaId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FC4C02">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Type Badge & Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className={`text-3xl p-3 rounded-xl ${typeInfo.color} bg-opacity-20`}>
              {typeInfo.icon}
            </span>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activity.sportType || typeInfo.label}</p>
              <p className={`text-lg font-semibold ${typeInfo.color.replace('bg-', 'text-')}`}>
                {typeInfo.label}
              </p>
            </div>
            {activity.feeling && (
              <div className="ml-auto text-3xl">
                {activity.feeling === 1 ? '😫' : activity.feeling === 2 ? '😓' : activity.feeling === 3 ? '😐' : activity.feeling === 4 ? '😊' : '🤩'}
              </div>
            )}
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {activity.distance && (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activity.distance.toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">km</p>
              </div>
            )}
            {activity.movingTime && (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(activity.movingTime)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tiempo</p>
              </div>
            )}
            {activity.pace && (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activity.pace}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">min/km</p>
              </div>
            )}
            {activity.elevationGain !== undefined && activity.elevationGain > 0 && (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(activity.elevationGain)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">m desnivel</p>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        {activity.mapPolyline && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Ruta</h2>
            <ActivityMap
              encodedPolyline={activity.mapPolyline}
              startLat={activity.startLat}
              startLng={activity.startLng}
              endLat={activity.endLat}
              endLng={activity.endLng}
            />
          </div>
        )}

        {/* Tabs */}
        {(isStravaActivity || hasSplits || hasLaps || hasSegments) && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'overview'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              Analisis IA
            </button>
            {isStravaActivity && (
              <button
                onClick={() => setActiveTab('charts')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'charts'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                Graficas
              </button>
            )}
            {hasSplits && (
              <button
                onClick={() => setActiveTab('splits')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'splits'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                Splits ({activity.splitsMetric?.length})
              </button>
            )}
            {hasLaps && (
              <button
                onClick={() => setActiveTab('laps')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'laps'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                Vueltas ({activity.laps?.length})
              </button>
            )}
            {hasSegments && (
              <button
                onClick={() => setActiveTab('segments')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'segments'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                Segmentos ({activity.segmentEfforts?.length})
              </button>
            )}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'analysis' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analisis con IA</h2>
              {summary && (
                <button
                  onClick={() => { setSummary(null); }}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Regenerar
                </button>
              )}
            </div>
            {loadingSummary ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Analizando actividad...</span>
              </div>
            ) : summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {summary.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <h3 key={i} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>;
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="text-gray-700 dark:text-gray-300 ml-4">{line.substring(2)}</li>;
                  }
                  if (line.trim()) {
                    return <p key={i} className="text-gray-700 dark:text-gray-300 mb-2">{line}</p>;
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">Genera un analisis detallado de tu actividad con IA</p>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Generar Analisis
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Detailed Stats Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalles</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {activity.heartRate && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-400">FC Media</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{activity.heartRate} bpm</p>
                  </div>
                )}
                {activity.maxHeartRate && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-400">FC Max</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{activity.maxHeartRate} bpm</p>
                  </div>
                )}
                {activity.averageCadence && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs text-purple-600 dark:text-purple-400">Cadencia</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(activity.averageCadence * 2)} ppm</p>
                  </div>
                )}
                {activity.maxSpeed && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">Vel. Max</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{(activity.maxSpeed * 3.6).toFixed(1)} km/h</p>
                  </div>
                )}
                {activity.calories && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-orange-600 dark:text-orange-400">Calorias</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{activity.calories} kcal</p>
                  </div>
                )}
                {activity.sufferScore && (
                  <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                    <p className="text-xs text-pink-600 dark:text-pink-400">Esfuerzo Relativo</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{activity.sufferScore}</p>
                  </div>
                )}
                {activity.averageWatts && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Potencia Media</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(activity.averageWatts)} W</p>
                  </div>
                )}
                {activity.weightedAverageWatts && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Potencia Normalizada</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(activity.weightedAverageWatts)} W</p>
                  </div>
                )}
                {activity.maxWatts && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Potencia Max</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{activity.maxWatts} W</p>
                  </div>
                )}
                {activity.kilojoules && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400">Trabajo</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(activity.kilojoules)} kJ</p>
                  </div>
                )}
                {activity.averageTemp !== undefined && activity.averageTemp !== null && (
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <p className="text-xs text-cyan-600 dark:text-cyan-400">Temperatura</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{activity.averageTemp}°C</p>
                  </div>
                )}
                {activity.elevHigh !== undefined && activity.elevLow !== undefined && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <p className="text-xs text-teal-600 dark:text-teal-400">Altitud</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(activity.elevLow)} - {Math.round(activity.elevHigh)} m</p>
                  </div>
                )}
                {activity.elapsedTime && activity.movingTime && activity.elapsedTime > activity.movingTime && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tiempo Parado</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatTime(activity.elapsedTime - activity.movingTime)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gear & Device */}
            {(activity.gearName || activity.deviceName) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Equipamiento</h2>
                <div className="space-y-3">
                  {activity.gearName && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👟</span>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Zapatillas/Bici</p>
                        <p className="font-medium text-gray-900 dark:text-white">{activity.gearName}</p>
                      </div>
                    </div>
                  )}
                  {activity.deviceName && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⌚</span>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Dispositivo</p>
                        <p className="font-medium text-gray-900 dark:text-white">{activity.deviceName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social Stats */}
            {(activity.kudosCount || activity.prCount || activity.achievementCount) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social</h2>
                <div className="flex gap-6">
                  {activity.kudosCount !== undefined && activity.kudosCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👏</span>
                      <span className="font-medium text-gray-900 dark:text-white">{activity.kudosCount} kudos</span>
                    </div>
                  )}
                  {activity.prCount !== undefined && activity.prCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏅</span>
                      <span className="font-medium text-gray-900 dark:text-white">{activity.prCount} PRs</span>
                    </div>
                  )}
                  {activity.achievementCount !== undefined && activity.achievementCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏆</span>
                      <span className="font-medium text-gray-900 dark:text-white">{activity.achievementCount} logros</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {activity.description && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Descripcion</h2>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{activity.description}</p>
              </div>
            )}
          </>
        )}

        {/* Charts Tab */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            {loadingStreams ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando datos...</span>
              </div>
            ) : sampledData.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm text-center text-gray-500 dark:text-gray-400">
                No hay datos de streaming disponibles para esta actividad
              </div>
            ) : (
              <>
                {/* Altitude Chart */}
                {streams?.altitude && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Altitud</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sampledData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis
                            dataKey="distance"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickFormatter={(v) => `${v} km`}
                          />
                          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${v} m`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => [`${Math.round(value as number)} m`, 'Altitud']}
                            labelFormatter={(label) => `${label} km`}
                          />
                          <Area
                            type="monotone"
                            dataKey="altitude"
                            stroke="#10B981"
                            fill="#10B981"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Heart Rate Chart */}
                {streams?.heartrate && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Frecuencia Cardiaca</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sampledData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis
                            dataKey="distance"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickFormatter={(v) => `${v} km`}
                          />
                          <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => [`${Math.round(value as number)} bpm`, 'FC']}
                            labelFormatter={(label) => `${label} km`}
                          />
                          <Line
                            type="monotone"
                            dataKey="heartrate"
                            stroke="#EF4444"
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Pace Chart */}
                {streams?.velocity_smooth && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ritmo</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sampledData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis
                            dataKey="distance"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickFormatter={(v) => `${v} km`}
                          />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={12}
                            reversed
                            domain={['auto', 'auto']}
                            tickFormatter={(v) => {
                              const min = Math.floor(v);
                              const sec = Math.round((v - min) * 60);
                              return `${min}:${sec.toString().padStart(2, '0')}`;
                            }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => {
                              const v = value as number;
                              const min = Math.floor(v);
                              const sec = Math.round((v - min) * 60);
                              return [`${min}:${sec.toString().padStart(2, '0')} /km`, 'Ritmo'];
                            }}
                            labelFormatter={(label) => `${label} km`}
                          />
                          <Line
                            type="monotone"
                            dataKey="pace"
                            stroke="#3B82F6"
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Cadence Chart */}
                {streams?.cadence && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cadencia</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sampledData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis
                            dataKey="distance"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickFormatter={(v) => `${v} km`}
                          />
                          <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => [`${Math.round(value as number)} ppm`, 'Cadencia']}
                            labelFormatter={(label) => `${label} km`}
                          />
                          <Line
                            type="monotone"
                            dataKey="cadence"
                            stroke="#8B5CF6"
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Power Chart */}
                {streams?.watts && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Potencia</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sampledData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis
                            dataKey="distance"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickFormatter={(v) => `${v} km`}
                          />
                          <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 'auto']} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => [`${Math.round(value as number)} W`, 'Potencia']}
                            labelFormatter={(label) => `${label} km`}
                          />
                          <Line
                            type="monotone"
                            dataKey="watts"
                            stroke="#F59E0B"
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Grade Chart */}
                {streams?.grade_smooth && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pendiente</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sampledData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis
                            dataKey="distance"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickFormatter={(v) => `${v} km`}
                          />
                          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Pendiente']}
                            labelFormatter={(label) => `${label} km`}
                          />
                          <Area
                            type="monotone"
                            dataKey="grade"
                            stroke="#14B8A6"
                            fill="#14B8A6"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Splits Tab */}
        {activeTab === 'splits' && activity.splitsMetric && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Splits por Kilometro</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 font-medium">Km</th>
                    <th className="pb-2 font-medium">Ritmo</th>
                    <th className="pb-2 font-medium">Desnivel</th>
                    <th className="pb-2 font-medium">Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.splitsMetric.map((split, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 font-medium text-gray-900 dark:text-white">{split.split}</td>
                      <td className="py-3 text-gray-900 dark:text-white">{formatPace(split.average_speed)} /km</td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">
                        {split.elevation_difference > 0 ? '+' : ''}{Math.round(split.elevation_difference)} m
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">{formatTime(split.moving_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Laps Tab */}
        {activeTab === 'laps' && activity.laps && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vueltas</h2>
            <div className="space-y-3">
              {activity.laps.map((lap, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900 dark:text-white">{lap.name}</p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatTime(lap.moving_time)}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Dist: </span>
                      <span className="text-gray-900 dark:text-white">{(lap.distance / 1000).toFixed(2)} km</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Ritmo: </span>
                      <span className="text-gray-900 dark:text-white">{formatPace(lap.average_speed)} /km</span>
                    </div>
                    {lap.total_elevation_gain > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Desn: </span>
                        <span className="text-gray-900 dark:text-white">+{Math.round(lap.total_elevation_gain)} m</span>
                      </div>
                    )}
                    {lap.average_heartrate && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">FC: </span>
                        <span className="text-gray-900 dark:text-white">{Math.round(lap.average_heartrate)} bpm</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segments Tab */}
        {activeTab === 'segments' && activity.segmentEfforts && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Segmentos</h2>
            <div className="space-y-4">
              {activity.segmentEfforts.map((effort, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{effort.segment.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {effort.segment.city}, {effort.segment.state}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {effort.pr_rank && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                          PR #{effort.pr_rank}
                        </span>
                      )}
                      {effort.kom_rank && (
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                          KOM #{effort.kom_rank}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Dist: </span>
                      <span className="text-gray-900 dark:text-white">{(effort.segment.distance / 1000).toFixed(2)} km</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tiempo: </span>
                      <span className="text-gray-900 dark:text-white">{formatTime(effort.elapsed_time)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Pend: </span>
                      <span className="text-gray-900 dark:text-white">{effort.segment.average_grade.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Cat: </span>
                      <span className="text-gray-900 dark:text-white">{getClimbCategory(effort.segment.climb_category)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Sidebar */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Chat sobre la actividad</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pregunta cualquier cosa</p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Pregunta sobre tu actividad:
                </p>
                <div className="space-y-2">
                  {[
                    '¿Como fue mi ritmo?',
                    '¿En que puedo mejorar?',
                    '¿Que zonas de FC use?',
                    '¿Como estuvo mi cadencia?',
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setChatInput(suggestion);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {sendingMessage && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingMessage}
                className="p-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Overlay */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          onClick={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
