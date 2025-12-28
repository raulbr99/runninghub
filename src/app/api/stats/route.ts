import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userStats, achievements, runningEvents, books, dailyHabits } from '@/lib/db/schema';
import { eq, sql, gte, and } from 'drizzle-orm';
import { calculateLevel, ACHIEVEMENTS } from '@/lib/gamification';

// GET - Obtener estadísticas del usuario
export async function GET() {
  try {
    // Obtener o crear stats del usuario
    let stats = await db.select().from(userStats).limit(1);

    if (stats.length === 0) {
      // Crear stats iniciales
      const newStats = await db.insert(userStats).values({}).returning();
      stats = newStats;
    }

    // Calcular totales desde los datos reales
    const workoutTotals = await db
      .select({
        count: sql<number>`count(*)`,
        totalDistance: sql<number>`coalesce(sum(${runningEvents.distance}), 0)`,
        totalTime: sql<number>`coalesce(sum(${runningEvents.duration}), 0)`,
      })
      .from(runningEvents)
      .where(eq(runningEvents.completed, 1));

    const bookTotals = await db
      .select({
        completed: sql<number>`count(*) filter (where ${books.status} = 'completed')`,
        totalPages: sql<number>`coalesce(sum(${books.currentPage}), 0)`,
      })
      .from(books);

    // Obtener logros desbloqueados
    const unlockedAchievements = await db.select().from(achievements);
    const unlockedIds = unlockedAchievements.map(a => a.achievementId);

    // Calcular racha actual
    const today = new Date().toISOString().split('T')[0];
    const todayHabits = await db
      .select()
      .from(dailyHabits)
      .where(eq(dailyHabits.date, today))
      .limit(1);

    const currentStats = stats[0];
    const calculatedLevel = calculateLevel(currentStats.totalXp);

    return NextResponse.json({
      ...currentStats,
      level: calculatedLevel,
      totalWorkouts: Number(workoutTotals[0]?.count || 0),
      totalDistance: Number(workoutTotals[0]?.totalDistance || 0),
      totalTime: Number(workoutTotals[0]?.totalTime || 0),
      totalBooksRead: Number(bookTotals[0]?.completed || 0),
      totalPagesRead: Number(bookTotals[0]?.totalPages || 0),
      unlockedAchievements: unlockedIds,
      todayCompleted: todayHabits.length > 0 && (todayHabits[0].didWorkout || todayHabits[0].didRead),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

// POST - Añadir XP y verificar logros
export async function POST(request: Request) {
  try {
    const { xpToAdd, source } = await request.json();

    // Obtener stats actuales
    let stats = await db.select().from(userStats).limit(1);

    if (stats.length === 0) {
      const newStats = await db.insert(userStats).values({}).returning();
      stats = newStats;
    }

    const currentStats = stats[0];
    const newTotalXp = currentStats.totalXp + (xpToAdd || 0);
    const newLevel = calculateLevel(newTotalXp);

    // Actualizar stats
    await db
      .update(userStats)
      .set({
        totalXp: newTotalXp,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(userStats.id, currentStats.id));

    // Verificar nuevos logros
    const unlockedAchievements = await db.select().from(achievements);
    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));

    // Obtener totales actuales
    const workoutTotals = await db
      .select({
        count: sql<number>`count(*)`,
        totalDistance: sql<number>`coalesce(sum(${runningEvents.distance}), 0)`,
      })
      .from(runningEvents)
      .where(eq(runningEvents.completed, 1));

    const bookTotals = await db
      .select({
        completed: sql<number>`count(*) filter (where ${books.status} = 'completed')`,
        totalPages: sql<number>`coalesce(sum(${books.currentPage}), 0)`,
      })
      .from(books);

    const totals = {
      total_workouts: Number(workoutTotals[0]?.count || 0),
      total_distance: Number(workoutTotals[0]?.totalDistance || 0),
      books_read: Number(bookTotals[0]?.completed || 0),
      pages_read: Number(bookTotals[0]?.totalPages || 0),
      streak: currentStats.currentStreak,
      level: newLevel,
      total_xp: newTotalXp,
    };

    const newlyUnlocked: string[] = [];

    // Verificar cada logro
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) continue;

      let achieved = false;
      const req = achievement.requirement;

      switch (req.type) {
        case 'total_workouts':
          achieved = totals.total_workouts >= req.value;
          break;
        case 'total_distance':
          achieved = totals.total_distance >= req.value;
          break;
        case 'books_read':
          achieved = totals.books_read >= req.value;
          break;
        case 'pages_read':
          achieved = totals.pages_read >= req.value;
          break;
        case 'streak':
          achieved = totals.streak >= req.value;
          break;
        case 'level':
          achieved = totals.level >= req.value;
          break;
        case 'total_xp':
          achieved = totals.total_xp >= req.value;
          break;
      }

      if (achieved) {
        await db.insert(achievements).values({
          achievementId: achievement.id,
          progress: req.value,
        });
        newlyUnlocked.push(achievement.id);

        // Añadir XP del logro
        await db
          .update(userStats)
          .set({
            totalXp: sql`${userStats.totalXp} + ${achievement.xpReward}`,
          })
          .where(eq(userStats.id, currentStats.id));
      }
    }

    return NextResponse.json({
      success: true,
      newTotalXp,
      newLevel,
      newlyUnlocked,
      source,
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
