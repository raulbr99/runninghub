import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
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
      .from(calendarEvents)
      .where(and(gte(calendarEvents.date, startDate), lte(calendarEvents.date, endDate)))
      .orderBy(calendarEvents.date);

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error loading events:', error);
    return NextResponse.json({ error: 'Error loading events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Construir eventData segun la categoria
    const eventData: Record<string, unknown> = {};

    if (data.category === 'running') {
      if (data.pace) eventData.pace = data.pace;
      if (data.cadence) eventData.cadence = data.cadence;
    } else if (data.category === 'strength') {
      if (data.exercises) eventData.exercises = data.exercises;
      if (data.muscleGroups) eventData.muscleGroups = data.muscleGroups;
    } else if (data.category === 'cycling') {
      if (data.avgSpeed) eventData.avgSpeed = data.avgSpeed;
      if (data.power) eventData.power = data.power;
    } else if (data.category === 'swimming') {
      if (data.laps) eventData.laps = data.laps;
      if (data.poolLength) eventData.poolLength = data.poolLength;
      if (data.strokeType) eventData.strokeType = data.strokeType;
    } else if (data.category === 'other_sport') {
      if (data.intensity) eventData.intensity = data.intensity;
    } else if (data.category === 'personal') {
      if (data.location) eventData.location = data.location;
      if (data.allDay !== undefined) eventData.allDay = data.allDay;
    } else if (data.category === 'rest') {
      if (data.reason) eventData.reason = data.reason;
    }

    const [event] = await db
      .insert(calendarEvents)
      .values({
        date: data.date,
        category: data.category || 'running',
        type: data.type,
        title: data.title || null,
        time: data.time || null,
        distance: data.distance || null,
        duration: data.duration || null,
        notes: data.notes || null,
        heartRate: data.heartRate || null,
        elevationGain: data.elevationGain || null,
        calories: data.calories || null,
        feeling: data.feeling || null,
        completed: data.completed || 0,
        eventData: Object.keys(eventData).length > 0 ? eventData : null,
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

    // Construir eventData segun la categoria
    const eventData: Record<string, unknown> = {};

    if (data.category === 'running') {
      if (data.pace) eventData.pace = data.pace;
      if (data.cadence) eventData.cadence = data.cadence;
    } else if (data.category === 'strength') {
      if (data.exercises) eventData.exercises = data.exercises;
      if (data.muscleGroups) eventData.muscleGroups = data.muscleGroups;
    } else if (data.category === 'cycling') {
      if (data.avgSpeed) eventData.avgSpeed = data.avgSpeed;
      if (data.power) eventData.power = data.power;
    } else if (data.category === 'swimming') {
      if (data.laps) eventData.laps = data.laps;
      if (data.poolLength) eventData.poolLength = data.poolLength;
      if (data.strokeType) eventData.strokeType = data.strokeType;
    } else if (data.category === 'other_sport') {
      if (data.intensity) eventData.intensity = data.intensity;
    } else if (data.category === 'personal') {
      if (data.location) eventData.location = data.location;
      if (data.allDay !== undefined) eventData.allDay = data.allDay;
    } else if (data.category === 'rest') {
      if (data.reason) eventData.reason = data.reason;
    }

    const [event] = await db
      .update(calendarEvents)
      .set({
        date: data.date,
        category: data.category,
        type: data.type,
        title: data.title,
        time: data.time,
        distance: data.distance,
        duration: data.duration,
        notes: data.notes,
        heartRate: data.heartRate,
        elevationGain: data.elevationGain,
        calories: data.calories,
        feeling: data.feeling,
        completed: data.completed,
        eventData: Object.keys(eventData).length > 0 ? eventData : null,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, data.id))
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

    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Error deleting event' }, { status: 500 });
  }
}
