import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runningEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const events = await db
      .select()
      .from(runningEvents)
      .where(eq(runningEvents.id, id))
      .limit(1);

    if (events.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json(events[0]);
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
