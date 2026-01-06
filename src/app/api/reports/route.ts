import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { gte, lte, eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'weekly';
    const dateParam = searchParams.get('date');

    const baseDate = dateParam ? new Date(dateParam) : new Date();

    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (type === 'weekly') {
      const dayOfWeek = baseDate.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(prevEndDate.getDate() - 7);
    } else {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
      prevEndDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0);
      prevEndDate.setHours(23, 59, 59, 999);
    }

    const currentEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.date, startDate.toISOString().split('T')[0]),
          lte(calendarEvents.date, endDate.toISOString().split('T')[0]),
          eq(calendarEvents.completed, 1)
        )
      );

    const prevEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.date, prevStartDate.toISOString().split('T')[0]),
          lte(calendarEvents.date, prevEndDate.toISOString().split('T')[0]),
          eq(calendarEvents.completed, 1)
        )
      );

    const calculateStats = (
      events: {
        category: string | null;
        distance: number | null;
        duration: number | null;
        date: string;
        type: string;
      }[]
    ) => {
      const runningEvents = events.filter((e) => e.category === 'running');
      const totalKm = runningEvents.reduce((sum, e) => sum + (e.distance || 0), 0);
      const totalMinutes = runningEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
      const sessions = runningEvents.length;

      let avgPace = 0;
      if (totalKm > 0 && totalMinutes > 0) {
        avgPace = totalMinutes / totalKm;
      }

      let longestRun = 0;
      let fastestPace = Infinity;
      let bestWorkout = null;

      for (const e of runningEvents) {
        if (e.distance && e.distance > longestRun) {
          longestRun = e.distance;
        }
        if (e.distance && e.duration && e.distance > 3) {
          const pace = e.duration / e.distance;
          if (pace < fastestPace) {
            fastestPace = pace;
            bestWorkout = e;
          }
        }
      }

      const byType: Record<string, { count: number; km: number; minutes: number }> = {};
      for (const e of runningEvents) {
        if (!byType[e.type]) {
          byType[e.type] = { count: 0, km: 0, minutes: 0 };
        }
        byType[e.type].count++;
        byType[e.type].km += e.distance || 0;
        byType[e.type].minutes += e.duration || 0;
      }

      const byDay: Record<string, { km: number; minutes: number }> = {};
      for (const e of runningEvents) {
        if (!byDay[e.date]) {
          byDay[e.date] = { km: 0, minutes: 0 };
        }
        byDay[e.date].km += e.distance || 0;
        byDay[e.date].minutes += e.duration || 0;
      }

      return {
        totalKm: Math.round(totalKm * 10) / 10,
        totalMinutes,
        sessions,
        avgPace: avgPace > 0 ? Math.round(avgPace * 100) / 100 : null,
        longestRun: longestRun > 0 ? longestRun : null,
        fastestPace: fastestPace < Infinity ? Math.round(fastestPace * 100) / 100 : null,
        bestWorkout,
        byType,
        byDay,
      };
    };

    const current = calculateStats(currentEvents);
    const previous = calculateStats(prevEvents);

    const kmChange =
      previous.totalKm > 0 ? ((current.totalKm - previous.totalKm) / previous.totalKm) * 100 : null;
    const sessionsChange =
      previous.sessions > 0
        ? ((current.sessions - previous.sessions) / previous.sessions) * 100
        : null;
    const minutesChange =
      previous.totalMinutes > 0
        ? ((current.totalMinutes - previous.totalMinutes) / previous.totalMinutes) * 100
        : null;

    return NextResponse.json({
      type,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      current,
      previous,
      changes: {
        km: kmChange ? Math.round(kmChange) : null,
        sessions: sessionsChange ? Math.round(sessionsChange) : null,
        minutes: minutesChange ? Math.round(minutesChange) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Error fetching report' }, { status: 500 });
  }
}
