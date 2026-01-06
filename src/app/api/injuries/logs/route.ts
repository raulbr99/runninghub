import { db } from '@/lib/db';
import { injuryLogs } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [newLog] = await db
      .insert(injuryLogs)
      .values({
        injuryId: body.injuryId,
        date: body.date,
        painLevel: body.painLevel,
        notes: body.notes,
        treatment: body.treatment,
      })
      .returning();

    return NextResponse.json(newLog);
  } catch (error) {
    console.error('Error creating injury log:', error);
    return NextResponse.json({ error: 'Error creating log' }, { status: 500 });
  }
}
