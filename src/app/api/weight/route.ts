import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { weightEntries } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');

    const entries = await db
      .select()
      .from(weightEntries)
      .orderBy(desc(weightEntries.date))
      .limit(limit);

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error loading weight entries:', error);
    return NextResponse.json({ error: 'Error loading weight entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const [entry] = await db
      .insert(weightEntries)
      .values({
        date: data.date || new Date().toISOString().split('T')[0],
        weight: data.weight,
        bodyFat: data.bodyFat || null,
        muscleMass: data.muscleMass || null,
        notes: data.notes || null,
      })
      .returning();

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error creating weight entry:', error);
    return NextResponse.json({ error: 'Error creating weight entry' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const [entry] = await db
      .update(weightEntries)
      .set({
        date: data.date,
        weight: data.weight,
        bodyFat: data.bodyFat,
        muscleMass: data.muscleMass,
        notes: data.notes,
      })
      .where(eq(weightEntries.id, data.id))
      .returning();

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating weight entry:', error);
    return NextResponse.json({ error: 'Error updating weight entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.delete(weightEntries).where(eq(weightEntries.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting weight entry:', error);
    return NextResponse.json({ error: 'Error deleting weight entry' }, { status: 500 });
  }
}
