'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface PlanEvent {
  id: string
  date: string
  type: string
  title: string | null
  distance: number | null
  duration: number | null
  notes: string | null
}

interface PlanPhase {
  name: string
  weeks: string
  focus: string
}

interface TrainingPlan {
  id: string
  name: string
  raceType: string
  raceDate: string | null
  level: string
  totalWeeks: number
  totalKm: number | null
  phases: PlanPhase[] | null
  status: string
  addedToCalendar: number
  events: PlanEvent[]
}

const typeIcons: Record<string, { color: string; bg: string }> = {
  easy: { color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  tempo: { color: 'text-orange-400', bg: 'bg-orange-500/20' },
  intervals: { color: 'text-red-400', bg: 'bg-red-500/20' },
  fartlek: { color: 'text-purple-400', bg: 'bg-purple-500/20' },
  long: { color: 'text-blue-400', bg: 'bg-blue-500/20' },
  recovery: { color: 'text-pink-400', bg: 'bg-pink-500/20' },
  race: { color: 'text-amber-400', bg: 'bg-amber-500/20' },
  strength: { color: 'text-zinc-400', bg: 'bg-zinc-500/20' },
  rest: { color: 'text-zinc-500', bg: 'bg-zinc-600/20' },
}

const typeLabels: Record<string, string> = {
  easy: 'Rodaje',
  tempo: 'Tempo',
  intervals: 'Series',
  fartlek: 'Fartlek',
  long: 'Tirada larga',
  recovery: 'Recuperacion',
  race: 'Carrera',
  strength: 'Fuerza',
  rest: 'Descanso',
}

const raceTypeLabels: Record<string, string> = {
  '5k': '5K',
  '10k': '10K',
  half_marathon: 'Media Maraton',
  marathon: 'Maraton',
  trail: 'Trail',
  ultra: 'Ultra',
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    loadPlan()
  }, [id])

  useEffect(() => {
    if (plan?.events.length) {
      const firstEventDate = new Date(plan.events[0].date)
      setCurrentMonth(
        new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1)
      )
    }
  }, [plan])

  const loadPlan = async () => {
    try {
      const response = await fetch(`/api/training-plans/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPlan(data)
      }
    } catch (error) {
      console.error('Error loading plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCalendar = async () => {
    if (!plan || adding) return

    setAdding(true)
    try {
      const response = await fetch(`/api/training-plans/${id}/add-to-calendar`, {
        method: 'POST',
      })
      if (response.ok) {
        setPlan((prev) => (prev ? { ...prev, addedToCalendar: 1, status: 'active' } : null))
        alert('Plan añadido al calendario')
      }
    } catch (error) {
      console.error('Error adding to calendar:', error)
      alert('Error al añadir al calendario')
    } finally {
      setAdding(false)
    }
  }

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: (Date | null)[] = []

    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    if (!plan) return []
    const dateStr = date.toISOString().split('T')[0]
    return plan.events.filter((e) => e.date === dateStr)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400">Plan no encontrado</p>
        <Link href="/plans" className="text-emerald-500 hover:underline mt-2 inline-block">
          Volver a planes
        </Link>
      </div>
    )
  }

  const totalKm = plan.events.reduce((sum, e) => sum + (e.distance || 0), 0)
  const totalSessions = plan.events.filter((e) => e.type !== 'rest').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/plans"
          className="text-xs text-zinc-500 hover:text-zinc-300 mb-3 inline-flex items-center gap-1 uppercase tracking-wider"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Planes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-zinc-100">{plan.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
              <span>{raceTypeLabels[plan.raceType] || plan.raceType}</span>
              <span>•</span>
              <span>{plan.totalWeeks} semanas</span>
              {plan.raceDate && (
                <>
                  <span>•</span>
                  <span>Carrera: {formatDate(plan.raceDate)}</span>
                </>
              )}
            </div>
          </div>

          {plan.addedToCalendar === 0 ? (
            <button
              onClick={addToCalendar}
              disabled={adding}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {adding ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              )}
              Añadir al Calendario
            </button>
          ) : (
            <span className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm border border-emerald-600/30">
              Ya en calendario
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
          <p className="text-2xl font-mono text-emerald-400">{totalSessions}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Sesiones</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
          <p className="text-2xl font-mono text-zinc-100">{totalKm.toFixed(0)}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Km Total</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
          <p className="text-2xl font-mono text-zinc-100">{plan.totalWeeks}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Semanas</p>
        </div>
      </div>

      {/* Phases */}
      {plan.phases && plan.phases.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {plan.phases.map((phase, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-xs text-zinc-400 border border-zinc-700/50"
            >
              <span className="text-zinc-200 font-medium">{phase.name}</span> (S
              {phase.weeks}): {phase.focus}
            </span>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
        {/* Calendar header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <h2 className="text-lg font-light text-zinc-100 capitalize">
            {currentMonth.toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-800/50">
          {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs text-zinc-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {getCalendarDays().map((date, i) => {
            const events = date ? getEventsForDate(date) : []
            const isToday =
              date?.toDateString() === new Date().toDateString()

            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 border-b border-r border-zinc-800/30 ${
                  !date ? 'bg-zinc-900/30' : ''
                } ${isToday ? 'bg-emerald-500/5' : ''}`}
              >
                {date && (
                  <>
                    <span
                      className={`text-sm ${
                        isToday
                          ? 'text-emerald-400 font-medium'
                          : 'text-zinc-500'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {events.map((event) => {
                        const style = typeIcons[event.type] || typeIcons.easy
                        return (
                          <div
                            key={event.id}
                            className={`${style.bg} rounded px-1.5 py-0.5 text-xs truncate`}
                          >
                            <span className={style.color}>
                              {event.title || typeLabels[event.type] || event.type}
                            </span>
                            {event.distance && (
                              <span className="text-zinc-500 ml-1">
                                {event.distance}km
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(typeLabels).map(([type, label]) => {
          const style = typeIcons[type]
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${style.bg}`} />
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
