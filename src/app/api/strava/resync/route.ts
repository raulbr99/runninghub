import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stravaTokens, runningEvents } from '@/lib/db/schema';
import { getActivities, refreshAccessToken, mapStravaActivityType, formatPace } from '@/lib/strava';
import { eq, or, like } from 'drizzle-orm';

// POST: Eliminar actividades de Strava y volver a sincronizar con todos los datos
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

    // Eliminar todas las actividades de Strava (por stravaId o por notes con strava:xxx)
    const deleted = await db
      .delete(runningEvents)
      .where(or(
        like(runningEvents.stravaId, '%'),
        like(runningEvents.notes, 'strava:%')
      ));

    // Obtener actividades de los últimos 90 días
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    const activities = await getActivities(token.accessToken, 1, 100, ninetyDaysAgo);

    let imported = 0;

    for (const activity of activities) {
      const stravaId = activity.id.toString();
      const date = activity.start_date_local.split('T')[0];
      const time = activity.start_date_local.split('T')[1]?.substring(0, 5) || null;
      const distanceKm = Math.round((activity.distance / 1000) * 100) / 100;
      const durationMin = Math.round(activity.moving_time / 60);
      const pace = formatPace(activity.average_speed);
      const eventType = mapStravaActivityType(activity);

      await db.insert(runningEvents).values({
        date,
        time,
        category: 'running',
        type: eventType,
        title: activity.name,
        distance: distanceKm,
        duration: durationMin,
        pace,
        heartRate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
        completed: 1,
        stravaId,
        movingTime: activity.moving_time,
        elapsedTime: activity.elapsed_time,
        elevationGain: activity.total_elevation_gain,
        averageSpeed: activity.average_speed,
        maxSpeed: activity.max_speed,
        maxHeartRate: activity.max_heartrate || null,
        averageCadence: activity.average_cadence || null,
        averageWatts: activity.average_watts || null,
        maxWatts: activity.max_watts || null,
        calories: activity.calories || null,
        sufferScore: activity.suffer_score || null,
        startLat: activity.start_latlng?.[0] || null,
        startLng: activity.start_latlng?.[1] || null,
        endLat: activity.end_latlng?.[0] || null,
        endLng: activity.end_latlng?.[1] || null,
        mapPolyline: activity.map?.summary_polyline || null,
        sportType: activity.sport_type,
      });

      imported++;
    }

    return NextResponse.json({
      success: true,
      deleted: deleted.rowCount || 0,
      imported,
      message: `Eliminadas las actividades antiguas y reimportadas ${imported} actividades con todos los datos`,
    });
  } catch (error) {
    console.error('Error resyncing Strava activities:', error);
    return NextResponse.json({ error: 'Resync failed' }, { status: 500 });
  }
}
