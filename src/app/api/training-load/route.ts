import { db } from '@/lib/db';
import { calendarEvents, runnerProfile } from '@/lib/db/schema';
import { gte, eq, and, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Calcular TSS (Training Stress Score) simplificado
// TSS = (duration * intensity^2) / 3600 * 100
// Intensity basada en el ritmo vs umbral
function calculateTSS(
  duration: number,
  distance: number,
  type: string,
  thresholdPace?: number
): number {
  if (!duration || !distance) return 0;

  const pace = duration / distance; // min/km
  const threshold = thresholdPace || 5; // Default 5:00/km

  // Intensity Factor (IF) = threshold / actual pace (invertido porque menor pace = más rápido)
  let intensityFactor = threshold / pace;

  // Ajustar por tipo de entreno
  const typeMultipliers: Record<string, number> = {
    easy: 0.7,
    recovery: 0.6,
    long: 0.75,
    tempo: 0.88,
    intervals: 0.95,
    race: 1.0,
  };

  const multiplier = typeMultipliers[type] || 0.75;
  intensityFactor = Math.min(intensityFactor * multiplier, 1.2);

  // TSS = (duration_seconds * IF^2) / 3600 * 100
  const tss = ((duration * 60 * Math.pow(intensityFactor, 2)) / 3600) * 100;

  return Math.round(tss);
}

// Calcular media exponencial ponderada
function calculateEWMA(values: number[], halfLife: number): number {
  if (values.length === 0) return 0;

  const decay = Math.log(2) / halfLife;
  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    const weight = Math.exp(-decay * index);
    numerator += value * weight;
    denominator += weight;
  });

  return denominator > 0 ? numerator / denominator : 0;
}

export async function GET() {
  try {
    // Obtener umbral del perfil del usuario
    const profiles = await db.select().from(runnerProfile).limit(1);
    const thresholdPace = profiles[0]?.thresholdPace || 5; // Default 5:00/km

    // Obtener entrenamientos de los últimos 90 días
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.date, ninetyDaysAgo.toISOString().split('T')[0]),
          eq(calendarEvents.completed, 1),
          eq(calendarEvents.category, 'running')
        )
      )
      .orderBy(desc(calendarEvents.date));

    // Crear mapa de TSS por día
    const today = new Date();
    const tssPerDay: Map<string, number> = new Map();

    // Inicializar todos los días con 0
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      tssPerDay.set(date.toISOString().split('T')[0], 0);
    }

    // Calcular TSS por día
    events.forEach((event) => {
      const tss = calculateTSS(
        event.duration || 0,
        event.distance || 0,
        event.type,
        thresholdPace
      );
      const currentTss = tssPerDay.get(event.date) || 0;
      tssPerDay.set(event.date, currentTss + tss);
    });

    // Convertir a array ordenado (más reciente primero)
    const tssArray = Array.from(tssPerDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, tss]) => tss);

    // Calcular CTL (Chronic - 42 días) y ATL (Acute - 7 días)
    const ctl = calculateEWMA(tssArray.slice(0, 42), 42);
    const atl = calculateEWMA(tssArray.slice(0, 7), 7);
    const tsb = ctl - atl; // Training Stress Balance (Form)

    // Calcular histórico para gráfica (últimos 60 días)
    const history: { date: string; ctl: number; atl: number; tsb: number; tss: number }[] = [];

    for (let i = 59; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Calcular CTL y ATL para este día
      const tssForCtl = Array.from(tssPerDay.entries())
        .filter(([d]) => d <= dateStr)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 42)
        .map(([, tss]) => tss);

      const tssForAtl = tssForCtl.slice(0, 7);

      const dayCtl = calculateEWMA(tssForCtl, 42);
      const dayAtl = calculateEWMA(tssForAtl, 7);

      history.push({
        date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        ctl: Math.round(dayCtl),
        atl: Math.round(dayAtl),
        tsb: Math.round(dayCtl - dayAtl),
        tss: tssPerDay.get(dateStr) || 0,
      });
    }

    // Calcular carga semanal
    const weeklyLoad: { week: string; tss: number; km: number; hours: number }[] = [];
    for (let w = 0; w < 8; w++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7 + 1);

      let weekTss = 0;
      let weekKm = 0;
      let weekMinutes = 0;

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split('T')[0];
        weekTss += tssPerDay.get(dateStr) || 0;

        const dayEvents = events.filter((e) => e.date === dateStr);
        dayEvents.forEach((e) => {
          weekKm += e.distance || 0;
          weekMinutes += e.duration || 0;
        });
      }

      weeklyLoad.unshift({
        week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        tss: weekTss,
        km: Math.round(weekKm * 10) / 10,
        hours: Math.round((weekMinutes / 60) * 10) / 10,
      });
    }

    // Determinar estado de forma
    let formStatus = 'neutral';
    let formLabel = 'Normal';
    let formDescription = 'Tu forma está en equilibrio';

    if (tsb > 25) {
      formStatus = 'fresh';
      formLabel = 'Fresco';
      formDescription = 'Muy descansado, ideal para competir';
    } else if (tsb > 10) {
      formStatus = 'good';
      formLabel = 'Buena forma';
      formDescription = 'Bien recuperado, buen momento para entrenar fuerte';
    } else if (tsb > -10) {
      formStatus = 'neutral';
      formLabel = 'Equilibrado';
      formDescription = 'Carga de entrenamiento sostenible';
    } else if (tsb > -25) {
      formStatus = 'tired';
      formLabel = 'Fatigado';
      formDescription = 'Acumulando fatiga, considera descansar';
    } else {
      formStatus = 'overreached';
      formLabel = 'Sobrecargado';
      formDescription = 'Alto riesgo de sobreentrenamiento, descansa';
    }

    // Monotonía y strain (indicadores de riesgo)
    const last7Tss = tssArray.slice(0, 7);
    const avgTss = last7Tss.reduce((a, b) => a + b, 0) / 7;
    const stdDev = Math.sqrt(
      last7Tss.reduce((sum, tss) => sum + Math.pow(tss - avgTss, 2), 0) / 7
    );
    const monotony = stdDev > 0 ? avgTss / stdDev : 0;
    const strain = avgTss * 7 * monotony;

    return NextResponse.json({
      current: {
        ctl: Math.round(ctl),
        atl: Math.round(atl),
        tsb: Math.round(tsb),
        todayTss: tssArray[0] || 0,
      },
      form: {
        status: formStatus,
        label: formLabel,
        description: formDescription,
      },
      risk: {
        monotony: Math.round(monotony * 100) / 100,
        strain: Math.round(strain),
        warning: monotony > 2 || strain > 4000,
      },
      history,
      weeklyLoad,
    });
  } catch (error) {
    console.error('Error calculating training load:', error);
    return NextResponse.json({ error: 'Error calculating training load' }, { status: 500 });
  }
}
