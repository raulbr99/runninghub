import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { eq, and, lt, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get('id');

    if (!raceId) {
      // Obtener todas las carreras completadas
      const races = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.type, 'race'), eq(calendarEvents.completed, 1)))
        .orderBy(desc(calendarEvents.date));

      return NextResponse.json(races);
    }

    // Obtener carrera específica
    const [race] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, raceId));

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    }

    // Buscar carreras anteriores de distancia similar para comparar
    const distanceRange = race.distance ? race.distance * 0.1 : 1;
    const previousRaces = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.type, 'race'),
          eq(calendarEvents.completed, 1),
          lt(calendarEvents.date, race.date)
        )
      )
      .orderBy(desc(calendarEvents.date));

    // Filtrar por distancia similar
    const similarRaces = previousRaces.filter((r) => {
      if (!r.distance || !race.distance) return false;
      return Math.abs(r.distance - race.distance) <= distanceRange;
    });

    // Calcular estadísticas
    const pace = race.distance && race.duration ? race.duration / race.distance : null;

    // Mejor tiempo en distancia similar
    let bestTime = null;
    let improvement = null;
    if (similarRaces.length > 0 && race.duration) {
      const bestPrevious = similarRaces.reduce((best, r) => {
        if (!r.duration) return best;
        if (!best || r.duration < best.duration!) return r;
        return best;
      }, null as (typeof similarRaces)[0] | null);

      if (bestPrevious?.duration) {
        bestTime = bestPrevious;
        improvement = bestPrevious.duration - race.duration;
      }
    }

    // Calcular splits estimados si hay datos
    const splits = [];
    if (race.distance && race.duration && pace) {
      const fullKms = Math.floor(race.distance);
      for (let i = 1; i <= fullKms; i++) {
        splits.push({
          km: i,
          time: pace, // Asumimos pace constante sin datos reales
          cumulative: pace * i,
        });
      }
      // Último tramo parcial
      const remaining = race.distance - fullKms;
      if (remaining > 0.1) {
        splits.push({
          km: race.distance,
          time: pace * remaining,
          cumulative: race.duration,
        });
      }
    }

    // Análisis de la estrategia (simulado sin datos reales de splits)
    let strategy = 'even';
    let strategyLabel = 'Ritmo constante';
    let strategyDescription = 'Mantuviste un ritmo uniforme durante la carrera.';

    // Calcular percentiles de rendimiento
    let percentile = null;
    if (similarRaces.length >= 3 && race.duration) {
      const sortedTimes = similarRaces
        .filter((r) => r.duration)
        .map((r) => r.duration!)
        .sort((a, b) => a - b);

      const betterThan = sortedTimes.filter((t) => t > race.duration!).length;
      percentile = Math.round((betterThan / sortedTimes.length) * 100);
    }

    // Predicción para otras distancias basada en Riegel
    const predictions: { distance: number; label: string; time: number }[] = [];
    if (race.distance && race.duration) {
      const distances = [
        { d: 5, label: '5K' },
        { d: 10, label: '10K' },
        { d: 21.0975, label: 'Media Maraton' },
        { d: 42.195, label: 'Maraton' },
      ];

      distances.forEach(({ d, label }) => {
        if (Math.abs(d - race.distance!) > 0.5) {
          // No predecir la misma distancia
          const predicted = race.duration! * Math.pow(d / race.distance!, 1.06);
          predictions.push({ distance: d, label, time: predicted });
        }
      });
    }

    return NextResponse.json({
      race,
      pace,
      splits,
      strategy: {
        type: strategy,
        label: strategyLabel,
        description: strategyDescription,
      },
      comparison: {
        previousRaces: similarRaces.slice(0, 5),
        bestTime,
        improvement,
        percentile,
        totalRaces: similarRaces.length,
      },
      predictions,
    });
  } catch (error) {
    console.error('Error fetching race analysis:', error);
    return NextResponse.json({ error: 'Error fetching race analysis' }, { status: 500 });
  }
}
