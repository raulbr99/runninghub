import { db } from '@/lib/db'
import { trainingPlans, trainingPlanEvents, calendarEvents } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Obtener el plan
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, id))

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Obtener eventos del plan
    const events = await db
      .select()
      .from(trainingPlanEvents)
      .where(eq(trainingPlanEvents.planId, id))
      .orderBy(asc(trainingPlanEvents.date), asc(trainingPlanEvents.sortOrder))

    if (events.length === 0) {
      return NextResponse.json({ error: 'Plan has no events' }, { status: 400 })
    }

    // Convertir eventos del plan a eventos del calendario
    const calendarEventsToInsert = events.map((event) => ({
      date: event.date,
      category:
        event.type === 'strength'
          ? 'strength'
          : event.type === 'rest'
            ? 'rest'
            : 'running',
      type: event.type,
      title: event.title,
      distance: event.distance,
      duration: event.duration,
      notes: event.notes ? `[${plan.name}] ${event.notes}` : `[${plan.name}]`,
      completed: 0,
    }))

    // Insertar en lotes de 50
    const batchSize = 50
    let insertedCount = 0

    for (let i = 0; i < calendarEventsToInsert.length; i += batchSize) {
      const batch = calendarEventsToInsert.slice(i, i + batchSize)
      await db.insert(calendarEvents).values(batch)
      insertedCount += batch.length
    }

    // Marcar el plan como añadido al calendario
    await db
      .update(trainingPlans)
      .set({ addedToCalendar: 1, status: 'active', updatedAt: new Date() })
      .where(eq(trainingPlans.id, id))

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      message: `${insertedCount} eventos añadidos al calendario`,
    })
  } catch (error) {
    console.error('Error adding to calendar:', error)
    return NextResponse.json({ error: 'Error adding to calendar' }, { status: 500 })
  }
}
