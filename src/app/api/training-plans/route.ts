import { db } from '@/lib/db'
import { trainingPlans, trainingPlanEvents } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// GET - Lista de planes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let plans

    if (status) {
      plans = await db
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.status, status))
        .orderBy(desc(trainingPlans.createdAt))
    } else {
      plans = await db
        .select()
        .from(trainingPlans)
        .orderBy(desc(trainingPlans.createdAt))
    }

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json({ error: 'Error fetching plans' }, { status: 500 })
  }
}

// POST - Crear plan con eventos
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, raceType, raceDate, level, totalWeeks, totalKm, phases, events } = body

    // Crear el plan
    const [plan] = await db
      .insert(trainingPlans)
      .values({
        name,
        raceType,
        raceDate,
        level,
        totalWeeks,
        totalKm,
        phases,
        status: 'draft',
      })
      .returning()

    // Crear los eventos del plan
    if (events && events.length > 0) {
      const planEvents = events.map(
        (
          event: {
            date: string
            type: string
            title?: string
            distance?: number
            duration?: number
            notes?: string
          },
          index: number
        ) => ({
          planId: plan.id,
          date: event.date,
          type: event.type,
          title: event.title,
          distance: event.distance,
          duration: event.duration,
          notes: event.notes,
          sortOrder: index,
        })
      )

      await db.insert(trainingPlanEvents).values(planEvents)
    }

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json({ error: 'Error creating plan' }, { status: 500 })
  }
}
