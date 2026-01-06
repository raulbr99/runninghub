import { db } from '@/lib/db'
import { trainingPlans, trainingPlanEvents } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// GET - Obtener plan con eventos
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, id))

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const events = await db
      .select()
      .from(trainingPlanEvents)
      .where(eq(trainingPlanEvents.planId, id))
      .orderBy(asc(trainingPlanEvents.date), asc(trainingPlanEvents.sortOrder))

    return NextResponse.json({ ...plan, events })
  } catch (error) {
    console.error('Error fetching plan:', error)
    return NextResponse.json({ error: 'Error fetching plan' }, { status: 500 })
  }
}

// DELETE - Eliminar plan (eventos se eliminan en cascada)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.delete(trainingPlans).where(eq(trainingPlans.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json({ error: 'Error deleting plan' }, { status: 500 })
  }
}

// PATCH - Actualizar estado del plan
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, addedToCalendar } = body

    const updateData: { status?: string; addedToCalendar?: number; updatedAt: Date } = {
      updatedAt: new Date(),
    }

    if (status) updateData.status = status
    if (addedToCalendar !== undefined) updateData.addedToCalendar = addedToCalendar ? 1 : 0

    const [plan] = await db
      .update(trainingPlans)
      .set(updateData)
      .where(eq(trainingPlans.id, id))
      .returning()

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json({ error: 'Error updating plan' }, { status: 500 })
  }
}
