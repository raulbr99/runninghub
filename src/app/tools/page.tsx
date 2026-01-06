'use client'

import React, { useState } from 'react'
import Link from 'next/link'

type Tool = 'predictor' | 'zones' | 'carbs' | 'hydration' | 'splits' | 'tapering'

// Formulas de predicción (Riegel)
const predictTime = (knownDistance: number, knownTime: number, targetDistance: number): number => {
  const exponent = 1.06
  return knownTime * Math.pow(targetDistance / knownDistance, exponent)
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

const parseTime = (time: string): number => {
  const parts = time.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

const distances = [
  { name: '1K', km: 1 },
  { name: '5K', km: 5 },
  { name: '10K', km: 10 },
  { name: 'Media', km: 21.0975 },
  { name: 'Maraton', km: 42.195 },
]

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>('predictor')

  // Predictor state
  const [knownDistance, setKnownDistance] = useState('10')
  const [knownTime, setKnownTime] = useState('50:00')
  const [predictions, setPredictions] = useState<{ name: string; time: string; pace: string }[]>([])

  // Zones state
  const [maxHR, setMaxHR] = useState('185')
  const [restHR, setRestHR] = useState('50')
  const [thresholdPace, setThresholdPace] = useState('5:00')

  // Carbs state
  const [raceDuration, setRaceDuration] = useState('90')
  const [bodyWeight, setBodyWeight] = useState('70')

  // Hydration state
  const [waterGoal, setWaterGoal] = useState(2500)
  const [waterConsumed, setWaterConsumed] = useState(0)

  // Splits state
  const [targetDistance, setTargetDistance] = useState('21.0975')
  const [targetTime, setTargetTime] = useState('1:45:00')
  const [splitStrategy, setSplitStrategy] = useState<'even' | 'negative' | 'positive'>('even')

  // Tapering state
  const [raceDate, setRaceDate] = useState('')
  const [currentVolume, setCurrentVolume] = useState('50')

  const calculatePredictions = () => {
    const distKm = parseFloat(knownDistance)
    const timeSec = parseTime(knownTime)
    if (!distKm || !timeSec) return

    const preds = distances.map((d) => {
      const predTime = predictTime(distKm, timeSec, d.km)
      const pacePerKm = predTime / d.km
      return {
        name: d.name,
        time: formatTime(predTime),
        pace: formatTime(pacePerKm) + '/km',
      }
    })
    setPredictions(preds)
  }

  const calculateZones = () => {
    const max = parseInt(maxHR)
    const rest = parseInt(restHR)
    const reserve = max - rest

    return [
      { zone: 1, name: 'Recuperacion', min: rest + reserve * 0.5, max: rest + reserve * 0.6, color: 'bg-blue-500' },
      { zone: 2, name: 'Aerobico', min: rest + reserve * 0.6, max: rest + reserve * 0.7, color: 'bg-green-500' },
      { zone: 3, name: 'Tempo', min: rest + reserve * 0.7, max: rest + reserve * 0.8, color: 'bg-yellow-500' },
      { zone: 4, name: 'Umbral', min: rest + reserve * 0.8, max: rest + reserve * 0.9, color: 'bg-orange-500' },
      { zone: 5, name: 'VO2max', min: rest + reserve * 0.9, max: max, color: 'bg-red-500' },
    ]
  }

  const calculatePaceZones = () => {
    const thresholdSec = parseTime(thresholdPace)
    return [
      { zone: 1, name: 'Recuperacion', pace: formatTime(thresholdSec * 1.25) + ' - ' + formatTime(thresholdSec * 1.15), color: 'bg-blue-500' },
      { zone: 2, name: 'Aerobico', pace: formatTime(thresholdSec * 1.15) + ' - ' + formatTime(thresholdSec * 1.08), color: 'bg-green-500' },
      { zone: 3, name: 'Tempo', pace: formatTime(thresholdSec * 1.08) + ' - ' + formatTime(thresholdSec * 1.02), color: 'bg-yellow-500' },
      { zone: 4, name: 'Umbral', pace: formatTime(thresholdSec * 1.02) + ' - ' + formatTime(thresholdSec * 0.97), color: 'bg-orange-500' },
      { zone: 5, name: 'VO2max', pace: formatTime(thresholdSec * 0.97) + ' - ' + formatTime(thresholdSec * 0.90), color: 'bg-red-500' },
    ]
  }

  const calculateCarbs = () => {
    const duration = parseInt(raceDuration)
    const weight = parseInt(bodyWeight)

    // 60-90g carbos/hora para esfuerzos >60min
    const carbsPerHour = duration > 120 ? 90 : duration > 60 ? 60 : 30
    const totalCarbs = (duration / 60) * carbsPerHour

    // Cada gel tiene ~25g de carbos
    const gels = Math.ceil(totalCarbs / 25)

    // Hidratacion: 500-750ml/hora
    const waterMl = (duration / 60) * 600

    return {
      totalCarbs: Math.round(totalCarbs),
      gels,
      waterMl: Math.round(waterMl),
      carbsPerHour,
    }
  }

  const addWater = (ml: number) => {
    setWaterConsumed((prev) => Math.min(prev + ml, waterGoal * 1.5))
  }

  const calculateSplits = () => {
    const dist = parseFloat(targetDistance)
    const timeSec = parseTime(targetTime)
    if (!dist || !timeSec) return []

    const avgPace = timeSec / dist
    const splits: { km: number; pace: number; cumulative: number }[] = []
    const fullKms = Math.floor(dist)

    for (let i = 1; i <= fullKms; i++) {
      let pace = avgPace
      if (splitStrategy === 'negative') {
        pace = avgPace * (1.05 - (i / fullKms) * 0.1)
      } else if (splitStrategy === 'positive') {
        pace = avgPace * (0.95 + (i / fullKms) * 0.1)
      }
      splits.push({
        km: i,
        pace,
        cumulative: splits.reduce((sum, s) => sum + s.pace, 0) + pace,
      })
    }

    const remaining = dist - fullKms
    if (remaining > 0.1) {
      let pace = avgPace * remaining
      if (splitStrategy === 'negative') {
        pace = avgPace * 0.95 * remaining
      } else if (splitStrategy === 'positive') {
        pace = avgPace * 1.05 * remaining
      }
      splits.push({
        km: dist,
        pace,
        cumulative: splits.reduce((sum, s) => sum + s.pace, 0) + pace,
      })
    }

    return splits
  }

  const calculateTapering = () => {
    if (!raceDate) return []
    const race = new Date(raceDate)
    const today = new Date()
    const daysUntil = Math.ceil((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const volume = parseInt(currentVolume)

    const plan = []
    const startTaper = Math.min(daysUntil, 21)

    for (let week = 3; week >= 1; week--) {
      const weekStart = new Date(race)
      weekStart.setDate(race.getDate() - week * 7)

      let volumePercent = 100
      let intensity = 'normal'
      let focus = ''

      if (week === 3) {
        volumePercent = 75
        intensity = 'moderada'
        focus = 'Ultimo entreno largo, reducir volumen gradualmente'
      } else if (week === 2) {
        volumePercent = 50
        intensity = 'baja-moderada'
        focus = 'Mantener ritmo de carrera en sesiones cortas'
      } else if (week === 1) {
        volumePercent = 30
        intensity = 'baja'
        focus = 'Activacion, descanso, preparacion mental'
      }

      plan.push({
        week,
        weekStart,
        volumeKm: Math.round(volume * volumePercent / 100),
        volumePercent,
        intensity,
        focus,
      })
    }

    return plan
  }

  const tools = [
    { id: 'predictor' as Tool, label: 'Predictor', icon: '🎯' },
    { id: 'zones' as Tool, label: 'Zonas', icon: '💓' },
    { id: 'splits' as Tool, label: 'Splits', icon: '⏱️' },
    { id: 'carbs' as Tool, label: 'Carbos', icon: '🍌' },
    { id: 'hydration' as Tool, label: 'Agua', icon: '💧' },
    { id: 'tapering' as Tool, label: 'Tapering', icon: '📉' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300 mb-3 inline-flex items-center gap-1 uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Inicio
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Herramientas</h1>
            <p className="text-sm text-zinc-500">Calculadoras para runners</p>
          </div>
        </div>
      </div>

      {/* Tool tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTool === tool.id
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <span>{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* Predictor */}
      {activeTool === 'predictor' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
              Tu marca conocida
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Distancia (km)</label>
                <select
                  value={knownDistance}
                  onChange={(e) => setKnownDistance(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100"
                >
                  <option value="1">1K</option>
                  <option value="5">5K</option>
                  <option value="10">10K</option>
                  <option value="21.0975">Media Maraton</option>
                  <option value="42.195">Maraton</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Tiempo (mm:ss o h:mm:ss)</label>
                <input
                  type="text"
                  value={knownTime}
                  onChange={(e) => setKnownTime(e.target.value)}
                  placeholder="50:00"
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
                />
              </div>
            </div>
            <button
              onClick={calculatePredictions}
              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              Calcular Predicciones
            </button>
          </div>

          {predictions.length > 0 && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
              <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
                Tiempos estimados
              </h2>
              <div className="space-y-3">
                {predictions.map((p) => (
                  <div key={p.name} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                    <span className="text-zinc-300 font-medium">{p.name}</span>
                    <div className="text-right">
                      <span className="text-emerald-400 font-mono text-lg">{p.time}</span>
                      <span className="text-zinc-500 text-sm ml-2">({p.pace})</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-4">
                * Basado en la formula de Riegel. Los tiempos son estimaciones.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Zones */}
      {activeTool === 'zones' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
              Zonas de frecuencia cardiaca
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">FC Maxima</label>
                <input
                  type="number"
                  value={maxHR}
                  onChange={(e) => setMaxHR(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">FC Reposo</label>
                <input
                  type="number"
                  value={restHR}
                  onChange={(e) => setRestHR(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              {calculateZones().map((z) => (
                <div key={z.zone} className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg ${z.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {z.zone}
                  </div>
                  <span className="text-zinc-300 flex-1">{z.name}</span>
                  <span className="text-zinc-100 font-mono">
                    {Math.round(z.min)} - {Math.round(z.max)} bpm
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
              Zonas de ritmo
            </h2>
            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Ritmo umbral (min/km)</label>
              <input
                type="text"
                value={thresholdPace}
                onChange={(e) => setThresholdPace(e.target.value)}
                placeholder="5:00"
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
              />
            </div>
            <div className="space-y-2">
              {calculatePaceZones().map((z) => (
                <div key={z.zone} className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg ${z.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {z.zone}
                  </div>
                  <span className="text-zinc-300 flex-1">{z.name}</span>
                  <span className="text-zinc-100 font-mono text-sm">{z.pace}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Carbs */}
      {activeTool === 'carbs' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
              Calculadora de nutricion
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Duracion estimada (min)</label>
                <input
                  type="number"
                  value={raceDuration}
                  onChange={(e) => setRaceDuration(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Peso corporal (kg)</label>
                <input
                  type="number"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
                />
              </div>
            </div>

            {(() => {
              const carbs = calculateCarbs()
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-mono text-amber-400">{carbs.totalCarbs}g</p>
                    <p className="text-xs text-zinc-500 uppercase">Carbos total</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-mono text-emerald-400">{carbs.gels}</p>
                    <p className="text-xs text-zinc-500 uppercase">Geles (~25g)</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-mono text-blue-400">{carbs.waterMl}ml</p>
                    <p className="text-xs text-zinc-500 uppercase">Agua</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-mono text-zinc-300">{carbs.carbsPerHour}g/h</p>
                    <p className="text-xs text-zinc-500 uppercase">Ritmo</p>
                  </div>
                </div>
              )
            })()}

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-200">
                <strong>Consejo:</strong> Toma el primer gel a los 45-60 min y luego cada 30-45 min.
                Practica en entrenamientos antes de la carrera.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hydration */}
      {activeTool === 'hydration' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
              Hidratacion diaria
            </h2>

            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Objetivo diario (ml)</label>
              <input
                type="number"
                value={waterGoal}
                onChange={(e) => setWaterGoal(parseInt(e.target.value) || 2500)}
                className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
              />
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Progreso</span>
                <span className="text-blue-400 font-mono">{waterConsumed} / {waterGoal} ml</span>
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                  style={{ width: `${Math.min((waterConsumed / waterGoal) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1 text-right">
                {Math.round((waterConsumed / waterGoal) * 100)}%
              </p>
            </div>

            {/* Quick add buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[150, 250, 330, 500].map((ml) => (
                <button
                  key={ml}
                  onClick={() => addWater(ml)}
                  className="p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg text-blue-400 font-mono text-sm transition-colors"
                >
                  +{ml}ml
                </button>
              ))}
            </div>

            <button
              onClick={() => setWaterConsumed(0)}
              className="mt-4 w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              Reiniciar
            </button>
          </div>

          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h3 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-3">
              Recomendaciones
            </h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                2-3 litros/dia para runners
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                +500ml por cada hora de entrenamiento
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                Bebe antes de tener sed
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                Orina clara = buena hidratacion
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Splits */}
      {activeTool === 'splits' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
              Calculadora de Splits
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Distancia</label>
                <select
                  value={targetDistance}
                  onChange={(e) => setTargetDistance(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100"
                >
                  <option value="5">5K</option>
                  <option value="10">10K</option>
                  <option value="15">15K</option>
                  <option value="21.0975">Media Maraton</option>
                  <option value="42.195">Maraton</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Tiempo objetivo (h:mm:ss)</label>
                <input
                  type="text"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  placeholder="1:45:00"
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Estrategia</label>
              <div className="flex gap-2">
                {[
                  { id: 'even', label: 'Constante', desc: 'Mismo ritmo' },
                  { id: 'negative', label: 'Negativo', desc: 'Acelerar al final' },
                  { id: 'positive', label: 'Positivo', desc: 'Empezar rapido' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSplitStrategy(s.id as 'even' | 'negative' | 'positive')}
                    className={`flex-1 p-3 rounded-lg text-sm transition-colors ${
                      splitStrategy === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    <span className="block font-medium">{s.label}</span>
                    <span className="block text-xs opacity-70">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {calculateSplits().length > 0 && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
              <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
                Tu plan de splits
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase">
                      <th className="text-left p-2">Km</th>
                      <th className="text-right p-2">Ritmo</th>
                      <th className="text-right p-2">Parcial</th>
                      <th className="text-right p-2">Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateSplits().map((split, i) => (
                      <tr key={i} className="border-t border-zinc-800/50">
                        <td className="p-2 text-zinc-300">{split.km}</td>
                        <td className="p-2 text-right font-mono text-emerald-400">
                          {formatTime(split.pace)}/km
                        </td>
                        <td className="p-2 text-right font-mono text-zinc-400">
                          {formatTime(split.pace)}
                        </td>
                        <td className="p-2 text-right font-mono text-zinc-200">
                          {formatTime(split.cumulative)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-emerald-200">
                  <strong>Ritmo medio:</strong>{' '}
                  {formatTime(parseTime(targetTime) / parseFloat(targetDistance))}/km
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tapering */}
      {activeTool === 'tapering' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
              Planificador de Tapering
            </h2>
            <p className="text-sm text-zinc-500 mb-4">
              El tapering reduce el volumen de entrenamiento antes de una carrera para llegar descansado y en forma optima.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Fecha de carrera</label>
                <input
                  type="date"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Volumen semanal actual (km)</label>
                <input
                  type="number"
                  value={currentVolume}
                  onChange={(e) => setCurrentVolume(e.target.value)}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono"
                />
              </div>
            </div>
          </div>

          {calculateTapering().length > 0 && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
              <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider mb-4">
                Plan de Tapering (3 semanas)
              </h2>
              <div className="space-y-4">
                {calculateTapering().map((week) => (
                  <div key={week.week} className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-300 font-medium">
                        Semana -{week.week} ({week.weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                      </span>
                      <span className="text-emerald-400 font-mono">{week.volumeKm} km</span>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${week.volumePercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{week.volumePercent}%</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      <strong>Intensidad:</strong> {week.intensity}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">{week.focus}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-200">
                  <strong>Consejo:</strong> Mantén la intensidad de los entrenos de calidad pero reduce el volumen.
                  Es normal sentirse &quot;pesado&quot; los primeros dias de tapering.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
