import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runningEvents } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

// DELETE: Eliminar actividades duplicadas de Strava
export async function DELETE() {
  try {
    // Eliminar duplicados: mantener solo el registro más antiguo de cada stravaId
    // Primero, identificar los IDs a eliminar (los duplicados más nuevos)
    const result = await db.execute(sql`
      DELETE FROM running_events
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(strava_id, REPLACE(notes, 'strava:', ''))
              ORDER BY created_at ASC
            ) as rn
          FROM running_events
          WHERE strava_id IS NOT NULL OR notes LIKE 'strava:%'
        ) sub
        WHERE rn > 1
      )
    `);

    return NextResponse.json({
      success: true,
      message: 'Duplicados eliminados',
      result
    });
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
