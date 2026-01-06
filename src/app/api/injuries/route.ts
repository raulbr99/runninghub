import { db } from '@/lib/db';
import { injuries, injuryLogs } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const allInjuries = await db
      .select()
      .from(injuries)
      .orderBy(desc(injuries.startDate));

    // Get logs for each active injury
    const activeInjuries = allInjuries.filter((i) => i.status === 'active' || i.status === 'recovering');
    const logsMap = new Map<string, typeof injuryLogs.$inferSelect[]>();

    for (const injury of activeInjuries) {
      const logs = await db
        .select()
        .from(injuryLogs)
        .where(eq(injuryLogs.injuryId, injury.id))
        .orderBy(desc(injuryLogs.date))
        .limit(10);
      logsMap.set(injury.id, logs);
    }

    return NextResponse.json({
      injuries: allInjuries,
      logs: Object.fromEntries(logsMap),
    });
  } catch (error) {
    console.error('Error fetching injuries:', error);
    return NextResponse.json({ error: 'Error fetching injuries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [newInjury] = await db
      .insert(injuries)
      .values({
        name: body.name,
        bodyPart: body.bodyPart,
        side: body.side,
        severity: body.severity,
        status: body.status || 'active',
        startDate: body.startDate,
        endDate: body.endDate,
        cause: body.cause,
        symptoms: body.symptoms,
        treatment: body.treatment,
        doctor: body.doctor,
        diagnosis: body.diagnosis,
        notes: body.notes,
        daysOff: body.daysOff || 0,
      })
      .returning();

    // If initial pain level provided, create first log
    if (body.initialPainLevel) {
      await db.insert(injuryLogs).values({
        injuryId: newInjury.id,
        date: body.startDate,
        painLevel: body.initialPainLevel,
        notes: 'Registro inicial',
      });
    }

    return NextResponse.json(newInjury);
  } catch (error) {
    console.error('Error creating injury:', error);
    return NextResponse.json({ error: 'Error creating injury' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const [updated] = await db
      .update(injuries)
      .set({
        name: body.name,
        bodyPart: body.bodyPart,
        side: body.side,
        severity: body.severity,
        status: body.status,
        endDate: body.endDate,
        cause: body.cause,
        symptoms: body.symptoms,
        treatment: body.treatment,
        doctor: body.doctor,
        diagnosis: body.diagnosis,
        notes: body.notes,
        daysOff: body.daysOff,
        updatedAt: new Date(),
      })
      .where(eq(injuries.id, body.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating injury:', error);
    return NextResponse.json({ error: 'Error updating injury' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await db.delete(injuries).where(eq(injuries.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting injury:', error);
    return NextResponse.json({ error: 'Error deleting injury' }, { status: 500 });
  }
}
