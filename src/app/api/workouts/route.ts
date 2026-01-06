import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { eq, desc, and, gte, isNotNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    let workouts;

    if (type) {
      workouts = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.completed, 1),
            eq(calendarEvents.category, 'running'),
            eq(calendarEvents.type, type),
            gte(calendarEvents.date, threeMonthsAgo.toISOString().split('T')[0]),
            isNotNull(calendarEvents.distance)
          )
        )
        .orderBy(desc(calendarEvents.date))
        .limit(limit);
    } else {
      workouts = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.completed, 1),
            eq(calendarEvents.category, 'running'),
            gte(calendarEvents.date, threeMonthsAgo.toISOString().split('T')[0]),
            isNotNull(calendarEvents.distance)
          )
        )
        .orderBy(desc(calendarEvents.date))
        .limit(limit);
    }

    return NextResponse.json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json({ error: 'Error fetching workouts' }, { status: 500 });
  }
}
