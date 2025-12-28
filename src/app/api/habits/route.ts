import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyHabits, userStats } from '@/lib/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { XP_REWARDS } from '@/lib/gamification';

// GET - Obtener habitos del dia o historial reciente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const history = searchParams.get('history');

    if (history) {
      // Obtener historial de los ultimos N dias
      const days = parseInt(history) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const habits = await db
        .select()
        .from(dailyHabits)
        .where(gte(dailyHabits.date, startDate.toISOString().split('T')[0]))
        .orderBy(desc(dailyHabits.date));

      return NextResponse.json(habits);
    }

    // Obtener habito de un dia especifico
    const habit = await db
      .select()
      .from(dailyHabits)
      .where(eq(dailyHabits.date, date))
      .limit(1);

    return NextResponse.json(habit[0] || null);
  } catch (error) {
    console.error('Error fetching habits:', error);
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

// POST - Registrar habitos del dia
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const today = new Date().toISOString().split('T')[0];
    const date = data.date || today;

    // Verificar si ya existe registro para este dia
    const existing = await db
      .select()
      .from(dailyHabits)
      .where(eq(dailyHabits.date, date))
      .limit(1);

    let habit;
    let xpEarned = 0;
    let streakUpdate = false;

    if (existing.length > 0) {
      // Actualizar registro existente
      const prevWorkout = existing[0].didWorkout;
      const prevRead = existing[0].didRead;

      habit = await db
        .update(dailyHabits)
        .set({
          didWorkout: data.didWorkout ?? existing[0].didWorkout,
          didRead: data.didRead ?? existing[0].didRead,
        })
        .where(eq(dailyHabits.id, existing[0].id))
        .returning();

      // Calcular XP solo para nuevos habitos completados
      if (data.didWorkout && !prevWorkout) {
        xpEarned += XP_REWARDS.workout_completed;
        streakUpdate = true;
      }
      if (data.didRead && !prevRead) {
        xpEarned += XP_REWARDS.pages_read_10;
      }
    } else {
      // Crear nuevo registro
      habit = await db
        .insert(dailyHabits)
        .values({
          date,
          didWorkout: data.didWorkout ? 1 : 0,
          didRead: data.didRead ? 1 : 0,
        })
        .returning();

      if (data.didWorkout) {
        xpEarned += XP_REWARDS.workout_completed;
        streakUpdate = true;
      }
      if (data.didRead) {
        xpEarned += XP_REWARDS.pages_read_10;
      }
    }

    // Actualizar XP si se gano algo
    if (xpEarned > 0) {
      await db
        .update(userStats)
        .set({
          totalXp: sql`${userStats.totalXp} + ${xpEarned}`,
          updatedAt: new Date(),
        });
    }

    // Actualizar racha si hubo entrenamiento
    if (streakUpdate && date === today) {
      await updateStreak();
    }

    return NextResponse.json({
      habit: habit[0],
      xpEarned,
    });
  } catch (error) {
    console.error('Error saving habit:', error);
    return NextResponse.json({ error: 'Failed to save habit' }, { status: 500 });
  }
}

// Funcion para actualizar la racha
async function updateStreak() {
  try {
    const stats = await db.select().from(userStats).limit(1);
    if (stats.length === 0) return;

    const currentStats = stats[0];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Verificar si hubo actividad ayer
    const yesterdayHabit = await db
      .select()
      .from(dailyHabits)
      .where(eq(dailyHabits.date, yesterdayStr))
      .limit(1);

    let newStreak = 1;

    if (yesterdayHabit.length > 0 && yesterdayHabit[0].didWorkout) {
      // Continuar racha
      newStreak = (currentStats.currentStreak || 0) + 1;
    }

    const newLongest = Math.max(currentStats.longestStreak || 0, newStreak);

    await db
      .update(userStats)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: todayStr,
        updatedAt: new Date(),
      })
      .where(eq(userStats.id, currentStats.id));
  } catch (error) {
    console.error('Error updating streak:', error);
  }
}
