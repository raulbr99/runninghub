import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stravaTokens, runningEvents } from '@/lib/db/schema';
import { refreshAccessToken, mapStravaActivityType, formatPace } from '@/lib/strava';
import { eq } from 'drizzle-orm';

const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || 'RUNNINGHUB_STRAVA';

// GET: Verificación del webhook (Strava challenge)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
    console.log('Strava webhook verified');
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST: Recibir eventos de Strava
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    console.log('Strava webhook event:', event);

    // Solo procesamos actividades de creación
    if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
      return NextResponse.json({ received: true });
    }

    const athleteId = event.owner_id?.toString();
    const activityId = event.object_id;

    if (!athleteId || !activityId) {
      return NextResponse.json({ received: true });
    }

    // Buscar token del atleta
    const tokens = await db
      .select()
      .from(stravaTokens)
      .where(eq(stravaTokens.athleteId, athleteId))
      .limit(1);

    if (tokens.length === 0) {
      console.log('No token found for athlete:', athleteId);
      return NextResponse.json({ received: true });
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
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return NextResponse.json({ received: true });
      }
    }

    // Obtener detalles de la actividad
    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      }
    );

    if (!activityRes.ok) {
      console.error('Failed to fetch activity:', await activityRes.text());
      return NextResponse.json({ received: true });
    }

    const activity = await activityRes.json();

    // Solo importar actividades de running
    if (activity.type !== 'Run' && activity.sport_type !== 'Run') {
      return NextResponse.json({ received: true });
    }

    // Verificar si ya existe
    const stravaIdNote = `strava:${activity.id}`;
    const existing = await db
      .select()
      .from(runningEvents)
      .where(eq(runningEvents.notes, stravaIdNote))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ received: true, skipped: true });
    }

    // Crear evento
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
      notes: stravaIdNote,
      completed: 1,
    });

    console.log('Activity imported:', activity.name);
    return NextResponse.json({ received: true, imported: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}
