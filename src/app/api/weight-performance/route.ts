import { db } from '@/lib/db';
import { calendarEvents, weightEntries } from '@/lib/db/schema';
import { gte, eq, and, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Obtener pesos
    const weights = await db
      .select()
      .from(weightEntries)
      .where(gte(weightEntries.date, sixMonthsAgo.toISOString().split('T')[0]))
      .orderBy(desc(weightEntries.date));

    // Obtener entrenamientos de running
    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.date, sixMonthsAgo.toISOString().split('T')[0]),
          eq(calendarEvents.completed, 1),
          eq(calendarEvents.category, 'running')
        )
      )
      .orderBy(desc(calendarEvents.date));

    if (weights.length < 3 || events.length < 5) {
      return NextResponse.json({
        hasData: false,
        message: 'Necesitas al menos 3 registros de peso y 5 entrenamientos para ver correlaciones',
      });
    }

    // Crear mapa de peso por fecha (con interpolación)
    const weightMap = new Map<string, number>();
    weights.forEach((w) => {
      weightMap.set(w.date, w.weight);
    });

    // Función para obtener peso aproximado para una fecha
    const getWeightForDate = (dateStr: string): number | null => {
      if (weightMap.has(dateStr)) return weightMap.get(dateStr)!;

      // Buscar peso más cercano
      const targetDate = new Date(dateStr).getTime();
      let closestWeight = null;
      let closestDiff = Infinity;

      weights.forEach((w) => {
        const diff = Math.abs(new Date(w.date).getTime() - targetDate);
        if (diff < closestDiff && diff < 7 * 24 * 60 * 60 * 1000) {
          // Max 7 días
          closestDiff = diff;
          closestWeight = w.weight;
        }
      });

      return closestWeight;
    };

    // Analizar rendimiento por rango de peso
    const performanceByWeight: {
      weight: number;
      avgPace: number;
      count: number;
      date: string;
    }[] = [];

    events.forEach((event) => {
      if (!event.distance || !event.duration || event.distance < 3) return;

      const weight = getWeightForDate(event.date);
      if (!weight) return;

      const pace = event.duration / event.distance;

      performanceByWeight.push({
        weight,
        avgPace: pace,
        count: 1,
        date: event.date,
      });
    });

    if (performanceByWeight.length < 5) {
      return NextResponse.json({
        hasData: false,
        message: 'No hay suficientes datos de peso asociados a entrenamientos',
      });
    }

    // Calcular correlación
    const n = performanceByWeight.length;
    const sumX = performanceByWeight.reduce((sum, p) => sum + p.weight, 0);
    const sumY = performanceByWeight.reduce((sum, p) => sum + p.avgPace, 0);
    const sumXY = performanceByWeight.reduce((sum, p) => sum + p.weight * p.avgPace, 0);
    const sumX2 = performanceByWeight.reduce((sum, p) => sum + p.weight * p.weight, 0);
    const sumY2 = performanceByWeight.reduce((sum, p) => sum + p.avgPace * p.avgPace, 0);

    const correlation =
      (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    // Agrupar por rangos de peso
    const weightRanges: { range: string; avgPace: number; count: number; minWeight: number }[] = [];
    const minWeight = Math.floor(Math.min(...performanceByWeight.map((p) => p.weight)));
    const maxWeight = Math.ceil(Math.max(...performanceByWeight.map((p) => p.weight)));
    const rangeSize = 2; // 2kg por rango

    for (let w = minWeight; w <= maxWeight; w += rangeSize) {
      const inRange = performanceByWeight.filter((p) => p.weight >= w && p.weight < w + rangeSize);
      if (inRange.length > 0) {
        const avgPace = inRange.reduce((sum, p) => sum + p.avgPace, 0) / inRange.length;
        weightRanges.push({
          range: `${w}-${w + rangeSize}`,
          avgPace: Math.round(avgPace * 100) / 100,
          count: inRange.length,
          minWeight: w,
        });
      }
    }

    // Datos para scatter plot
    const scatterData = performanceByWeight.map((p) => ({
      weight: p.weight,
      pace: Math.round(p.avgPace * 100) / 100,
    }));

    // Calcular mejor peso estimado
    const sortedByPace = [...performanceByWeight].sort((a, b) => a.avgPace - b.avgPace);
    const bestPerformances = sortedByPace.slice(0, Math.ceil(n * 0.2)); // Top 20%
    const optimalWeight =
      bestPerformances.reduce((sum, p) => sum + p.weight, 0) / bestPerformances.length;

    // Tendencia temporal
    const monthlyData: { month: string; avgWeight: number; avgPace: number }[] = [];
    const monthMap = new Map<string, { weights: number[]; paces: number[] }>();

    performanceByWeight.forEach((p) => {
      const month = p.date.substring(0, 7);
      if (!monthMap.has(month)) {
        monthMap.set(month, { weights: [], paces: [] });
      }
      monthMap.get(month)!.weights.push(p.weight);
      monthMap.get(month)!.paces.push(p.avgPace);
    });

    Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([month, data]) => {
        monthlyData.push({
          month: new Date(month + '-01').toLocaleDateString('es-ES', { month: 'short' }),
          avgWeight: Math.round((data.weights.reduce((a, b) => a + b, 0) / data.weights.length) * 10) / 10,
          avgPace: Math.round((data.paces.reduce((a, b) => a + b, 0) / data.paces.length) * 100) / 100,
        });
      });

    return NextResponse.json({
      hasData: true,
      correlation: Math.round(correlation * 100) / 100,
      optimalWeight: Math.round(optimalWeight * 10) / 10,
      currentWeight: weights[0]?.weight || null,
      weightRanges,
      scatterData,
      monthlyData,
      dataPoints: n,
    });
  } catch (error) {
    console.error('Error calculating weight-performance:', error);
    return NextResponse.json({ error: 'Error calculating correlation' }, { status: 500 });
  }
}
