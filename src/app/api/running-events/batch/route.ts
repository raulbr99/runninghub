import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';

interface BatchEvent {
  date: string;
  type: string;
  title: string;
  distance?: number | null;
  duration?: number | null;
  notes?: string | null;
}

interface BatchRequest {
  events: BatchEvent[];
  planName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { events, planName }: BatchRequest = await request.json();

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron eventos' }, { status: 400 });
    }

    // Limitar a 200 eventos maximo
    if (events.length > 200) {
      return NextResponse.json({ error: 'Maximo 200 eventos por solicitud' }, { status: 400 });
    }

    const eventsToInsert = events.map(event => ({
      date: event.date,
      category: event.type === 'strength' ? 'strength' : event.type === 'rest' ? 'rest' : 'running',
      type: event.type,
      title: event.title || null,
      distance: event.distance ?? null,
      duration: event.duration ?? null,
      notes: event.notes ? `${planName ? `[${planName}] ` : ''}${event.notes}` : (planName || null),
      completed: 0,
    }));

    // Insertar en lotes de 50
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < eventsToInsert.length; i += batchSize) {
      const batch = eventsToInsert.slice(i, i + batchSize);
      await db.insert(calendarEvents).values(batch);
      insertedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      message: `${insertedCount} eventos creados correctamente`
    });
  } catch (error) {
    console.error('Batch create error:', error);
    return NextResponse.json({ error: 'Error al crear eventos' }, { status: 500 });
  }
}
