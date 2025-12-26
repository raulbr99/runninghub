import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runningEvents } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const events = await db
      .select()
      .from(runningEvents)
      .where(and(gte(runningEvents.date, startDate), lte(runningEvents.date, endDate)))
      .orderBy(runningEvents.date);

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error loading events:', error);
    return NextResponse.json({ error: 'Error loading events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const [event] = await db
      .insert(runningEvents)
      .values({
        date: data.date,
        category: data.category || 'running',
        type: data.type,
        title: data.title || null,
        time: data.time || null,
        distance: data.distance || null,
        duration: data.duration || null,
        pace: data.pace || null,
        notes: data.notes || null,
        heartRate: data.heartRate || null,
        feeling: data.feeling || null,
        completed: data.completed || 0,
      })
      .returning();

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Error creating event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const [event] = await db
      .update(runningEvents)
      .set({
        date: data.date,
        category: data.category,
        type: data.type,
        title: data.title,
        time: data.time,
        distance: data.distance,
        duration: data.duration,
        pace: data.pace,
        notes: data.notes,
        heartRate: data.heartRate,
        feeling: data.feeling,
        completed: data.completed,
        updatedAt: new Date(),
      })
      .where(eq(runningEvents.id, data.id))
      .returning();

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Error updating event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.delete(runningEvents).where(eq(runningEvents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Error deleting event' }, { status: 500 });
  }
}
