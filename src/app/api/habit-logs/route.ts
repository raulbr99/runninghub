import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { habitLogs, customHabits, userStats } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

// GET - Obtener logs de hábitos por fecha o rango
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const habitId = searchParams.get('habitId');

    let query = db.select().from(habitLogs);

    if (habitId) {
      query = query.where(eq(habitLogs.habitId, habitId)) as typeof query;
    }

    if (date) {
      query = query.where(eq(habitLogs.date, date)) as typeof query;
    } else if (startDate && endDate) {
      query = query.where(and(
        gte(habitLogs.date, startDate),
        lte(habitLogs.date, endDate)
      )) as typeof query;
    }

    const logs = await query.orderBy(desc(habitLogs.date));

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching habit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// POST - Registrar o toggle hábito completado
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { habitId, date, value, notes, toggle } = data;
    const logDate = date || new Date().toISOString().split('T')[0];

    if (!habitId) {
      return NextResponse.json({ error: 'Habit ID required' }, { status: 400 });
    }

    // Obtener info del hábito
    const [habit] = await db
      .select()
      .from(customHabits)
      .where(eq(customHabits.id, habitId))
      .limit(1);

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Verificar si ya existe log para esta fecha
    const existing = await db
      .select()
      .from(habitLogs)
      .where(and(
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.date, logDate)
      ))
      .limit(1);

    let log;
    let xpEarned = 0;
    let action: 'created' | 'updated' | 'deleted' = 'created';

    if (existing.length > 0) {
      if (toggle) {
        // Toggle: eliminar el log existente
        await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));

        // Restar XP
        if (existing[0].xpEarned > 0) {
          await db
            .update(userStats)
            .set({
              totalXp: sql`GREATEST(0, ${userStats.totalXp} - ${existing[0].xpEarned})`,
              updatedAt: new Date(),
            });
        }

        return NextResponse.json({
          action: 'deleted',
          xpEarned: -existing[0].xpEarned,
        });
      }

      // Actualizar log existente
      const isNowComplete = value !== undefined
        ? (habit.trackingType === 'boolean' ? value >= 1 : value >= (habit.targetValue || 1))
        : existing[0].completed === 1;

      const wasComplete = existing[0].completed === 1;

      // Calcular XP diferencial
      if (isNowComplete && !wasComplete) {
        xpEarned = habit.xpReward;
      } else if (!isNowComplete && wasComplete) {
        xpEarned = -existing[0].xpEarned;
      }

      [log] = await db
        .update(habitLogs)
        .set({
          completed: isNowComplete ? 1 : 0,
          value: value ?? existing[0].value,
          notes: notes ?? existing[0].notes,
          xpEarned: isNowComplete ? habit.xpReward : 0,
        })
        .where(eq(habitLogs.id, existing[0].id))
        .returning();

      action = 'updated';
    } else {
      // Crear nuevo log
      const isComplete = habit.trackingType === 'boolean'
        ? true
        : (value || 0) >= (habit.targetValue || 1);

      xpEarned = isComplete ? habit.xpReward : 0;

      [log] = await db
        .insert(habitLogs)
        .values({
          habitId,
          date: logDate,
          completed: isComplete ? 1 : 0,
          value: value || (habit.trackingType === 'boolean' ? 1 : null),
          notes: notes || null,
          xpEarned,
        })
        .returning();
    }

    // Actualizar XP total
    if (xpEarned !== 0) {
      await db
        .update(userStats)
        .set({
          totalXp: sql`GREATEST(0, ${userStats.totalXp} + ${xpEarned})`,
          updatedAt: new Date(),
        });
    }

    return NextResponse.json({
      log,
      action,
      xpEarned,
    });
  } catch (error) {
    console.error('Error saving habit log:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}

// DELETE - Eliminar log específico
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
    }

    // Obtener log para restar XP
    const [log] = await db
      .select()
      .from(habitLogs)
      .where(eq(habitLogs.id, id))
      .limit(1);

    if (log && log.xpEarned > 0) {
      await db
        .update(userStats)
        .set({
          totalXp: sql`GREATEST(0, ${userStats.totalXp} - ${log.xpEarned})`,
          updatedAt: new Date(),
        });
    }

    await db.delete(habitLogs).where(eq(habitLogs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting habit log:', error);
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
  }
}
