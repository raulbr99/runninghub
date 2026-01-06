import { db } from '@/lib/db';
import { calendarEvents, weightEntries, runnerProfile } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'workouts';
    const format = searchParams.get('format') || 'json';

    let data;

    if (type === 'workouts') {
      data = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.completed, 1))
        .orderBy(desc(calendarEvents.date));
    } else if (type === 'weight') {
      data = await db.select().from(weightEntries).orderBy(desc(weightEntries.date));
    } else if (type === 'profile') {
      const [profile] = await db.select().from(runnerProfile).limit(1);
      data = profile ? [profile] : [];
    } else if (type === 'all') {
      const workouts = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.completed, 1))
        .orderBy(desc(calendarEvents.date));
      const weights = await db.select().from(weightEntries).orderBy(desc(weightEntries.date));
      const [profile] = await db.select().from(runnerProfile).limit(1);

      data = {
        workouts,
        weights,
        profile: profile || null,
        exportDate: new Date().toISOString(),
      };
    }

    if (format === 'csv' && type !== 'all') {
      // Convertir a CSV
      if (!Array.isArray(data) || data.length === 0) {
        return new Response('No data', { status: 404 });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((h) => {
              const val = row[h as keyof typeof row];
              if (val === null || val === undefined) return '';
              if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
              return String(val);
            })
            .join(',')
        ),
      ];

      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Error exporting data' }, { status: 500 });
  }
}
