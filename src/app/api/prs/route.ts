import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const STANDARD_DISTANCES = [
  { name: '1K', km: 1, tolerance: 0.05 },
  { name: '5K', km: 5, tolerance: 0.2 },
  { name: '10K', km: 10, tolerance: 0.3 },
  { name: '15K', km: 15, tolerance: 0.5 },
  { name: 'Media Maraton', km: 21.0975, tolerance: 0.5 },
  { name: 'Maraton', km: 42.195, tolerance: 1 },
];

export async function GET() {
  try {
    // Obtener todos los eventos de running completados con distancia
    const events = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.completed, 1), eq(calendarEvents.category, 'running')))
      .orderBy(desc(calendarEvents.date));

    // Calcular PRs por distancia estándar
    const prs: {
      distance: string;
      km: number;
      bestTime: number | null;
      bestPace: number | null;
      date: string | null;
      eventId: string | null;
      history: { date: string; time: number; pace: number }[];
    }[] = [];

    for (const dist of STANDARD_DISTANCES) {
      const matchingEvents = events.filter((e) => {
        if (!e.distance || !e.duration) return false;
        return Math.abs(e.distance - dist.km) <= dist.tolerance;
      });

      if (matchingEvents.length === 0) {
        prs.push({
          distance: dist.name,
          km: dist.km,
          bestTime: null,
          bestPace: null,
          date: null,
          eventId: null,
          history: [],
        });
        continue;
      }

      // Ordenar por tiempo (mejor primero)
      const sorted = matchingEvents.sort((a, b) => a.duration! - b.duration!);
      const best = sorted[0];

      prs.push({
        distance: dist.name,
        km: dist.km,
        bestTime: best.duration,
        bestPace: best.duration! / (best.distance || dist.km),
        date: best.date,
        eventId: best.id,
        history: sorted.slice(0, 10).map((e) => ({
          date: e.date,
          time: e.duration!,
          pace: e.duration! / (e.distance || dist.km),
        })),
      });
    }

    // También calcular el mejor pace general (para carreras > 5km)
    const longRuns = events.filter((e) => e.distance && e.distance >= 5 && e.duration);
    let bestOverallPace = null;
    if (longRuns.length > 0) {
      const withPace = longRuns.map((e) => ({
        ...e,
        pace: e.duration! / e.distance!,
      }));
      const fastest = withPace.sort((a, b) => a.pace - b.pace)[0];
      bestOverallPace = {
        pace: fastest.pace,
        distance: fastest.distance,
        duration: fastest.duration,
        date: fastest.date,
      };
    }

    // Tirada más larga
    let longestRun = null;
    const withDistance = events.filter((e) => e.distance);
    if (withDistance.length > 0) {
      const longest = withDistance.sort((a, b) => b.distance! - a.distance!)[0];
      longestRun = {
        distance: longest.distance,
        duration: longest.duration,
        date: longest.date,
      };
    }

    return NextResponse.json({
      prs,
      bestOverallPace,
      longestRun,
      totalRaces: events.filter((e) => e.type === 'race').length,
      totalRuns: events.length,
    });
  } catch (error) {
    console.error('Error fetching PRs:', error);
    return NextResponse.json({ error: 'Error fetching PRs' }, { status: 500 });
  }
}
