import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { achievements, userStats, runningEvents, books } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ACHIEVEMENTS } from '@/lib/gamification';

// GET - Obtener todos los logros con estado de desbloqueo
export async function GET() {
  try {
    // Obtener logros desbloqueados
    const unlockedList = await db.select().from(achievements);
    const unlockedMap = new Map(
      unlockedList.map(a => [a.achievementId, a])
    );

    // Obtener stats actuales para calcular progreso
    const stats = await db.select().from(userStats).limit(1);
    const currentStats = stats[0] || { totalXp: 0, currentStreak: 0, longestStreak: 0 };

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
      level: currentStats.level || 1,
      total_xp: currentStats.totalXp,
    };

    // Mapear logros con estado y progreso
    const achievementsWithStatus = ACHIEVEMENTS.map(achievement => {
      const unlocked = unlockedMap.get(achievement.id);
      let currentProgress = 0;

      // Calcular progreso actual
      switch (achievement.requirement.type) {
        case 'total_workouts':
          currentProgress = totals.total_workouts;
          break;
        case 'total_distance':
          currentProgress = totals.total_distance;
          break;
        case 'books_read':
          currentProgress = totals.books_read;
          break;
        case 'pages_read':
          currentProgress = totals.pages_read;
          break;
        case 'streak':
          currentProgress = Math.max(totals.streak, currentStats.longestStreak);
          break;
        case 'level':
          currentProgress = totals.level;
          break;
        case 'total_xp':
          currentProgress = totals.total_xp;
          break;
      }

      return {
        ...achievement,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt,
        currentProgress,
        progressPercent: Math.min(100, Math.round((currentProgress / achievement.requirement.value) * 100)),
      };
    });

    // Agrupar por categoría
    const byCategory = {
      running: achievementsWithStatus.filter(a => a.category === 'running'),
      consistency: achievementsWithStatus.filter(a => a.category === 'consistency'),
      reading: achievementsWithStatus.filter(a => a.category === 'reading'),
      milestone: achievementsWithStatus.filter(a => a.category === 'milestone'),
    };

    // Stats
    const totalUnlocked = achievementsWithStatus.filter(a => a.unlocked).length;
    const totalAchievements = ACHIEVEMENTS.length;

    return NextResponse.json({
      achievements: achievementsWithStatus,
      byCategory,
      stats: {
        unlocked: totalUnlocked,
        total: totalAchievements,
        percent: Math.round((totalUnlocked / totalAchievements) * 100),
      },
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}
