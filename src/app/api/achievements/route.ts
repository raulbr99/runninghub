import { db } from '@/lib/db';
import { achievements, userStats, calendarEvents, challenges } from '@/lib/db/schema';
import { desc, eq, and, gte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// Definición de todos los logros disponibles
const ACHIEVEMENT_DEFINITIONS = [
  // Distancia total
  { id: 'distance_100', name: 'Primer Centenario', description: 'Corre 100 km en total', icon: '🏃', category: 'distance', threshold: 100 },
  { id: 'distance_500', name: 'Medio Millar', description: 'Corre 500 km en total', icon: '🎯', category: 'distance', threshold: 500 },
  { id: 'distance_1000', name: 'Club de los 1000', description: 'Corre 1000 km en total', icon: '🏅', category: 'distance', threshold: 1000 },
  { id: 'distance_2500', name: 'Explorador', description: 'Corre 2500 km en total', icon: '🗺️', category: 'distance', threshold: 2500 },
  { id: 'distance_5000', name: 'Ultrafondista', description: 'Corre 5000 km en total', icon: '🏆', category: 'distance', threshold: 5000 },

  // Entrenamientos
  { id: 'workouts_10', name: 'Arrancando Motores', description: 'Completa 10 entrenamientos', icon: '🔥', category: 'workouts', threshold: 10 },
  { id: 'workouts_50', name: 'Constancia', description: 'Completa 50 entrenamientos', icon: '💪', category: 'workouts', threshold: 50 },
  { id: 'workouts_100', name: 'Centurión', description: 'Completa 100 entrenamientos', icon: '⚔️', category: 'workouts', threshold: 100 },
  { id: 'workouts_250', name: 'Incansable', description: 'Completa 250 entrenamientos', icon: '🦾', category: 'workouts', threshold: 250 },
  { id: 'workouts_500', name: 'Leyenda', description: 'Completa 500 entrenamientos', icon: '👑', category: 'workouts', threshold: 500 },

  // Rachas
  { id: 'streak_7', name: 'Semana Perfecta', description: 'Mantén una racha de 7 días', icon: '📅', category: 'streak', threshold: 7 },
  { id: 'streak_30', name: 'Mes de Hierro', description: 'Mantén una racha de 30 días', icon: '🗓️', category: 'streak', threshold: 30 },
  { id: 'streak_100', name: 'Imparable', description: 'Mantén una racha de 100 días', icon: '🚀', category: 'streak', threshold: 100 },

  // Tiradas largas
  { id: 'long_run_20', name: 'Tirada Larga', description: 'Completa una tirada de 20+ km', icon: '🛤️', category: 'single_run', threshold: 20 },
  { id: 'long_run_30', name: 'Maratoniano', description: 'Completa una tirada de 30+ km', icon: '🏃‍♂️', category: 'single_run', threshold: 30 },
  { id: 'long_run_42', name: 'Distancia Maratón', description: 'Corre 42 km en un solo entrenamiento', icon: '🎖️', category: 'single_run', threshold: 42 },

  // Tiempo total
  { id: 'time_24h', name: 'Día Completo', description: 'Acumula 24 horas de entrenamiento', icon: '⏰', category: 'time', threshold: 1440 },
  { id: 'time_100h', name: 'Centenar de Horas', description: 'Acumula 100 horas de entrenamiento', icon: '⌛', category: 'time', threshold: 6000 },

  // Desnivel
  { id: 'elevation_1000', name: 'Montañero', description: 'Acumula 1000m de desnivel positivo', icon: '⛰️', category: 'elevation', threshold: 1000 },
  { id: 'elevation_5000', name: 'Escalador', description: 'Acumula 5000m de desnivel positivo', icon: '🏔️', category: 'elevation', threshold: 5000 },
  { id: 'elevation_everest', name: 'Everesting', description: 'Acumula 8848m de desnivel positivo', icon: '🗻', category: 'elevation', threshold: 8848 },

  // Madrugador/Nocturno
  { id: 'early_bird_10', name: 'Madrugador', description: 'Entrena antes de las 7am 10 veces', icon: '🌅', category: 'special', threshold: 10 },
  { id: 'night_owl_10', name: 'Búho Nocturno', description: 'Entrena después de las 21h 10 veces', icon: '🌙', category: 'special', threshold: 10 },

  // Variedad
  { id: 'variety_all_types', name: 'Versátil', description: 'Completa todos los tipos de entreno', icon: '🎨', category: 'variety', threshold: 6 },
];

export async function GET() {
  try {
    // Obtener logros desbloqueados
    const unlocked = await db.select().from(achievements);
    const unlockedIds = new Set(unlocked.map((a) => a.achievementId));

    // Obtener stats del usuario (para rachas)
    const [stats] = await db.select().from(userStats).limit(1);

    // Calcular totales directamente desde calendarEvents (entrenamientos completados)
    const [totals] = await db
      .select({
        totalDistance: sql<number>`coalesce(sum(${calendarEvents.distance}), 0)`,
        totalWorkouts: sql<number>`count(*)`,
        totalTime: sql<number>`coalesce(sum(${calendarEvents.duration}), 0)`,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.category, 'running'),
          eq(calendarEvents.completed, 1)
        )
      );

    // Calcular progreso de cada logro
    const achievementsWithProgress = await Promise.all(
      ACHIEVEMENT_DEFINITIONS.map(async (def) => {
        let progress = 0;
        const total = def.threshold;

        switch (def.category) {
          case 'distance':
            progress = Number(totals?.totalDistance) || 0;
            break;
          case 'workouts':
            progress = Number(totals?.totalWorkouts) || 0;
            break;
          case 'streak':
            progress = stats?.longestStreak || 0;
            break;
          case 'time':
            progress = Number(totals?.totalTime) || 0;
            break;
          case 'single_run': {
            const [longest] = await db
              .select({ maxDistance: sql<number>`max(${calendarEvents.distance})` })
              .from(calendarEvents)
              .where(
                and(
                  eq(calendarEvents.category, 'running'),
                  eq(calendarEvents.completed, 1)
                )
              );
            progress = longest?.maxDistance || 0;
            break;
          }
          case 'elevation': {
            const [elev] = await db
              .select({ totalElev: sql<number>`sum(${calendarEvents.elevationGain})` })
              .from(calendarEvents)
              .where(
                and(
                  eq(calendarEvents.category, 'running'),
                  eq(calendarEvents.completed, 1)
                )
              );
            progress = elev?.totalElev || 0;
            break;
          }
          case 'special': {
            if (def.id.includes('early_bird')) {
              const [count] = await db
                .select({ count: sql<number>`count(*)` })
                .from(calendarEvents)
                .where(
                  and(
                    eq(calendarEvents.category, 'running'),
                    eq(calendarEvents.completed, 1),
                    sql`${calendarEvents.time} < '07:00'`
                  )
                );
              progress = count?.count || 0;
            } else if (def.id.includes('night_owl')) {
              const [count] = await db
                .select({ count: sql<number>`count(*)` })
                .from(calendarEvents)
                .where(
                  and(
                    eq(calendarEvents.category, 'running'),
                    eq(calendarEvents.completed, 1),
                    sql`${calendarEvents.time} >= '21:00'`
                  )
                );
              progress = count?.count || 0;
            }
            break;
          }
          case 'variety': {
            const types = await db
              .selectDistinct({ type: calendarEvents.type })
              .from(calendarEvents)
              .where(
                and(
                  eq(calendarEvents.category, 'running'),
                  eq(calendarEvents.completed, 1)
                )
              );
            progress = types.length;
            break;
          }
        }

        const isUnlocked = unlockedIds.has(def.id);
        const unlockedAt = unlocked.find((a) => a.achievementId === def.id)?.unlockedAt;

        return {
          ...def,
          progress: Math.min(progress, total),
          total,
          percentage: Math.min(Math.round((progress / total) * 100), 100),
          isUnlocked,
          unlockedAt: unlockedAt?.toISOString(),
        };
      })
    );

    // Obtener retos activos
    const today = new Date().toISOString().split('T')[0];
    const activeChallenges = await db
      .select()
      .from(challenges)
      .where(
        and(
          gte(challenges.endDate, today),
          eq(challenges.completed, 0)
        )
      )
      .orderBy(challenges.endDate);

    return NextResponse.json({
      achievements: achievementsWithProgress,
      stats: stats || { totalXp: 0, level: 1, currentStreak: 0 },
      challenges: activeChallenges,
      unlockedCount: unlocked.length,
      totalCount: ACHIEVEMENT_DEFINITIONS.length,
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Error fetching achievements' }, { status: 500 });
  }
}

// Desbloquear un logro manualmente (para testing o imports)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificar que el logro existe
    const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === body.achievementId);
    if (!def) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    // Verificar si ya está desbloqueado
    const [existing] = await db
      .select()
      .from(achievements)
      .where(eq(achievements.achievementId, body.achievementId));

    if (existing) {
      return NextResponse.json({ error: 'Already unlocked' }, { status: 400 });
    }

    // Desbloquear
    const [newAchievement] = await db
      .insert(achievements)
      .values({
        achievementId: body.achievementId,
        progress: def.threshold,
      })
      .returning();

    return NextResponse.json(newAchievement);
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return NextResponse.json({ error: 'Error unlocking achievement' }, { status: 500 });
  }
}
