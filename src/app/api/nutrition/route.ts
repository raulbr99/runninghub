import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nutritionEntries } from '@/lib/db/schema';
import { eq, desc, gte, lte, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query;
    if (date) {
      query = db
        .select()
        .from(nutritionEntries)
        .where(eq(nutritionEntries.date, date))
        .orderBy(desc(nutritionEntries.createdAt));
    } else {
      query = db
        .select()
        .from(nutritionEntries)
        .orderBy(desc(nutritionEntries.date))
        .limit(limit);
    }

    const entries = await query;
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error loading nutrition entries:', error);
    return NextResponse.json({ error: 'Error loading nutrition entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const [entry] = await db
      .insert(nutritionEntries)
      .values({
        date: data.date || new Date().toISOString().split('T')[0],
        mealType: data.mealType,
        description: data.description,
        calories: data.calories || null,
        protein: data.protein || null,
        carbs: data.carbs || null,
        fats: data.fats || null,
        notes: data.notes || null,
      })
      .returning();

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error creating nutrition entry:', error);
    return NextResponse.json({ error: 'Error creating nutrition entry' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const [entry] = await db
      .update(nutritionEntries)
      .set({
        date: data.date,
        mealType: data.mealType,
        description: data.description,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
        notes: data.notes,
      })
      .where(eq(nutritionEntries.id, data.id))
      .returning();

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating nutrition entry:', error);
    return NextResponse.json({ error: 'Error updating nutrition entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.delete(nutritionEntries).where(eq(nutritionEntries.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting nutrition entry:', error);
    return NextResponse.json({ error: 'Error deleting nutrition entry' }, { status: 500 });
  }
}
