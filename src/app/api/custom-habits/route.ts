import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customHabits } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET - Obtener todos los hábitos activos
export async function GET() {
  try {
    const habits = await db
      .select()
      .from(customHabits)
      .where(eq(customHabits.isActive, 1))
      .orderBy(asc(customHabits.sortOrder), asc(customHabits.createdAt));

    return NextResponse.json(habits);
  } catch (error) {
    console.error('Error fetching custom habits:', error);
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

// POST - Crear nuevo hábito
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const [habit] = await db
      .insert(customHabits)
      .values({
        name: data.name,
        description: data.description || null,
        icon: data.icon || '⭐',
        color: data.color || '#6366f1',
        frequency: data.frequency || 'daily',
        specificDays: data.specificDays || null,
        trackingType: data.trackingType || 'boolean',
        targetValue: data.targetValue || null,
        unit: data.unit || null,
        xpReward: data.xpReward || 10,
        sortOrder: data.sortOrder || 0,
      })
      .returning();

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    console.error('Error creating habit:', error);
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}

// PUT - Actualizar hábito
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json({ error: 'Habit ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ['name', 'description', 'icon', 'color', 'frequency', 'specificDays', 'trackingType', 'targetValue', 'unit', 'xpReward', 'isActive', 'sortOrder'];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const [habit] = await db
      .update(customHabits)
      .set(updateData)
      .where(eq(customHabits.id, data.id))
      .returning();

    return NextResponse.json(habit);
  } catch (error) {
    console.error('Error updating habit:', error);
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
  }
}

// DELETE - Eliminar hábito (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Habit ID required' }, { status: 400 });
    }

    await db
      .update(customHabits)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(eq(customHabits.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting habit:', error);
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
  }
}
