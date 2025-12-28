import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stravaTokens, runningEvents } from '@/lib/db/schema';
import { getActivities, refreshAccessToken, mapStravaActivityType, formatPace } from '@/lib/strava';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    // Obtener token
    const tokens = await db.select().from(stravaTokens).limit(1);

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Not connected to Strava' }, { status: 401 });
    }

    let token = tokens[0];
    const now = Math.floor(Date.now() / 1000);

    // Refrescar token si está expirado
    if (token.expiresAt < now) {
      try {
        const newToken = await refreshAccessToken(token.refreshToken);
        await db
          .update(stravaTokens)
          .set({
            accessToken: newToken.access_token,
            refreshToken: newToken.refresh_token,
            expiresAt: newToken.expires_at,
            updatedAt: new Date(),
          })
          .where(eq(stravaTokens.id, token.id));
        token = { ...token, accessToken: newToken.access_token };
      } catch {
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      }
    }

    // Obtener actividades de los últimos 30 días
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const activities = await getActivities(token.accessToken, 1, 50, thirtyDaysAgo);

    let imported = 0;
    let skipped = 0;

    for (const activity of activities) {
      // Verificar si ya existe un evento con el mismo strava_id en las notas
      const stravaId = `strava:${activity.id}`;
      const existingEvents = await db
        .select()
        .from(runningEvents)
        .where(eq(runningEvents.notes, stravaId))
        .limit(1);

      if (existingEvents.length > 0) {
        skipped++;
        continue;
      }

      // Crear nuevo evento
      const date = activity.start_date_local.split('T')[0];
      const distanceKm = Math.round((activity.distance / 1000) * 100) / 100;
      const durationMin = Math.round(activity.moving_time / 60);
      const pace = formatPace(activity.average_speed);
      const eventType = mapStravaActivityType(activity);

      await db.insert(runningEvents).values({
        date,
        category: 'running',
        type: eventType,
        title: activity.name,
        distance: distanceKm,
        duration: durationMin,
        pace,
        heartRate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
        notes: stravaId,
        completed: 1,
      });

      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: activities.length,
    });
  } catch (error) {
    console.error('Error syncing Strava activities:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
