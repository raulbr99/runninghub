import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { challenges, userStats, runningEvents, books } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { CHALLENGE_TEMPLATES } from '@/lib/gamification';

// GET - Obtener retos activos y completados
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Retos activos (no completados y no expirados)
    const activeChallenges = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.completed, 0),
          gte(challenges.endDate, today)
        )
      )
      .orderBy(challenges.endDate);

    // Actualizar progreso de retos activos
    for (const challenge of activeChallenges) {
      let current = 0;

      if (challenge.type === 'weekly_distance') {
        const result = await db
          .select({
            total: sql<number>`coalesce(sum(${runningEvents.distance}), 0)`,
          })
          .from(runningEvents)
          .where(
            and(
              gte(runningEvents.date, challenge.startDate),
              lte(runningEvents.date, challenge.endDate),
              eq(runningEvents.completed, 1)
            )
          );
        current = Math.round(Number(result[0]?.total || 0));
      } else if (challenge.type === 'weekly_workouts') {
        const result = await db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(runningEvents)
          .where(
            and(
              gte(runningEvents.date, challenge.startDate),
              lte(runningEvents.date, challenge.endDate),
              eq(runningEvents.completed, 1)
            )
          );
        current = Number(result[0]?.count || 0);
      } else if (challenge.type === 'weekly_pages') {
        // Contar páginas leídas esta semana
        const result = await db
          .select({
            total: sql<number>`coalesce(sum(${books.currentPage}), 0)`,
          })
          .from(books);
        current = Number(result[0]?.total || 0);
      }

      // Actualizar progreso
      if (current !== challenge.current) {
        const isCompleted = current >= challenge.target;
        await db
          .update(challenges)
          .set({
            current,
            completed: isCompleted ? 1 : 0,
          })
          .where(eq(challenges.id, challenge.id));

        // Si se completó, dar XP
        if (isCompleted && challenge.completed === 0) {
          await db
            .update(userStats)
            .set({
              totalXp: sql`${userStats.totalXp} + ${challenge.xpReward}`,
              updatedAt: new Date(),
            });
        }
      }
    }

    // Re-fetch después de actualizar
    const updatedActive = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.completed, 0),
          gte(challenges.endDate, today)
        )
      )
      .orderBy(challenges.endDate);

    // Retos completados recientemente
    const completedChallenges = await db
      .select()
      .from(challenges)
      .where(eq(challenges.completed, 1))
      .orderBy(desc(challenges.endDate))
      .limit(5);

    return NextResponse.json({
      active: updatedActive,
      completed: completedChallenges,
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }
}

// POST - Crear nuevo reto o generar retos semanales
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (data.generateWeekly) {
      // Generar retos semanales automáticos
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lunes
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo

      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];

      // Verificar si ya hay retos esta semana
      const existingWeekly = await db
        .select()
        .from(challenges)
        .where(
          and(
            eq(challenges.startDate, startDate),
            eq(challenges.completed, 0)
          )
        );

      if (existingWeekly.length > 0) {
        return NextResponse.json({
          message: 'Weekly challenges already exist',
          challenges: existingWeekly,
        });
      }

      // Crear retos de la semana
      const newChallenges = [];

      // Reto de distancia
      const distanceTemplate = CHALLENGE_TEMPLATES.find(t => t.type === 'weekly_distance')!;
      const distanceTarget = distanceTemplate.targets[Math.floor(Math.random() * distanceTemplate.targets.length)];
      newChallenges.push({
        type: 'weekly_distance',
        title: `Semana de ${distanceTarget}km`,
        description: `Corre ${distanceTarget}km esta semana`,
        target: distanceTarget,
        xpReward: distanceTemplate.xpReward,
        startDate,
        endDate,
      });

      // Reto de entrenamientos
      const workoutTemplate = CHALLENGE_TEMPLATES.find(t => t.type === 'weekly_workouts')!;
      const workoutTarget = workoutTemplate.targets[Math.floor(Math.random() * workoutTemplate.targets.length)];
      newChallenges.push({
        type: 'weekly_workouts',
        title: `${workoutTarget} entrenamientos`,
        description: `Completa ${workoutTarget} entrenamientos esta semana`,
        target: workoutTarget,
        xpReward: workoutTemplate.xpReward,
        startDate,
        endDate,
      });

      // Reto de lectura
      const readingTemplate = CHALLENGE_TEMPLATES.find(t => t.type === 'weekly_pages')!;
      const readingTarget = readingTemplate.targets[Math.floor(Math.random() * readingTemplate.targets.length)];
      newChallenges.push({
        type: 'weekly_pages',
        title: `Leer ${readingTarget} páginas`,
        description: `Lee ${readingTarget} páginas esta semana`,
        target: readingTarget,
        xpReward: readingTemplate.xpReward,
        startDate,
        endDate,
      });

      const created = await db.insert(challenges).values(newChallenges).returning();

      return NextResponse.json({
        message: 'Weekly challenges created',
        challenges: created,
      });
    }

    // Crear reto personalizado
    const newChallenge = await db.insert(challenges).values({
      type: data.type,
      title: data.title,
      description: data.description,
      target: data.target,
      xpReward: data.xpReward || 100,
      startDate: data.startDate,
      endDate: data.endDate,
    }).returning();

    return NextResponse.json(newChallenge[0]);
  } catch (error) {
    console.error('Error creating challenge:', error);
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
  }
}
