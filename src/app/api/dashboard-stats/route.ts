import { db } from '@/lib/db'
import { calendarEvents, runnerProfile } from '@/lib/db/schema'
import { gte, lte, eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await requireAuth()
    const now = new Date()

    // Obtener estadísticas de las últimas 8 semanas
    const eightWeeksAgo = new Date(now)
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.date, eightWeeksAgo.toISOString().split('T')[0]),
          lte(calendarEvents.date, now.toISOString().split('T')[0]),
          eq(calendarEvents.completed, 1)
        )
      )
      .orderBy(calendarEvents.date)

    // Agrupar por semana
    const weeklyStats: { week: string; km: number; sessions: number; minutes: number }[] = []
    const weekMap = new Map<string, { km: number; sessions: number; minutes: number }>()

    events.forEach((event) => {
      const eventDate = new Date(event.date)
      const weekStart = new Date(eventDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { km: 0, sessions: 0, minutes: 0 })
      }
      const week = weekMap.get(weekKey)!
      week.km += event.distance || 0
      week.minutes += event.duration || 0
      if (event.category === 'running' || event.category === 'cycling') {
        week.sessions++
      }
    })

    // Ordenar por semana
    Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([week, data]) => {
        const weekDate = new Date(week)
        weeklyStats.push({
          week: `${weekDate.getDate()}/${weekDate.getMonth() + 1}`,
          km: Math.round(data.km * 10) / 10,
          sessions: data.sessions,
          minutes: data.minutes,
        })
      })

    // Obtener próxima carrera
    const nextRace = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.date, now.toISOString().split('T')[0]),
          eq(calendarEvents.type, 'race')
        )
      )
      .orderBy(calendarEvents.date)
      .limit(1)

    // Obtener perfil para fecha objetivo
    const [profile] = await db
      .select()
      .from(runnerProfile)
      .where(eq(runnerProfile.userId, userId))
      .limit(1)

    // PRs del mes actual
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.date, monthStart.toISOString().split('T')[0]),
          eq(calendarEvents.completed, 1),
          eq(calendarEvents.category, 'running')
        )
      )

    // Calcular PRs simples
    let longestRun = 0
    let fastestPace = Infinity

    monthEvents.forEach((event) => {
      if (event.distance && event.distance > longestRun) {
        longestRun = event.distance
      }
      if (event.distance && event.duration && event.distance > 3) {
        const pace = event.duration / event.distance
        if (pace < fastestPace) {
          fastestPace = pace
        }
      }
    })

    // Frases motivacionales
    const quotes = [
      { quote: 'El dolor es temporal, el orgullo es para siempre.', author: 'Desconocido' },
      { quote: 'No corres contra otros, corres contra ti mismo.', author: 'Steve Prefontaine' },
      { quote: 'El cuerpo logra lo que la mente cree.', author: 'Desconocido' },
      { quote: 'Cada kilometro es un paso mas hacia tu mejor version.', author: 'Desconocido' },
      { quote: 'El exito no es definitivo, el fracaso no es fatal.', author: 'Winston Churchill' },
      { quote: 'Sueña grande. Empieza pequeño. Actua ahora.', author: 'Robin Sharma' },
      { quote: 'La disciplina es el puente entre metas y logros.', author: 'Jim Rohn' },
      { quote: 'No hay atajos hacia ningun lugar que valga la pena ir.', author: 'Beverly Sills' },
    ]
    const todayQuote = quotes[new Date().getDate() % quotes.length]

    return NextResponse.json({
      weeklyStats,
      nextRace: nextRace[0] || null,
      targetDate: profile?.targetDate || null,
      targetRace: profile?.targetRace || null,
      prs: {
        longestRun: longestRun > 0 ? longestRun : null,
        fastestPace: fastestPace < Infinity ? fastestPace : null,
      },
      quote: todayQuote,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 })
  }
}
