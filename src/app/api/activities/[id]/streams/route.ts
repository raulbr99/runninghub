import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stravaTokens, runningEvents } from '@/lib/db/schema';
import { getActivityStreams, refreshAccessToken } from '@/lib/strava';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Obtener la actividad para verificar que existe y obtener stravaId
    const events = await db
      .select()
      .from(runningEvents)
      .where(eq(runningEvents.id, id))
      .limit(1);

    if (events.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const activity = events[0];

    // Verificar que es una actividad de Strava
    const stravaId = activity.stravaId ||
      (activity.notes?.startsWith('strava:') ? activity.notes.replace('strava:', '') : null);

    if (!stravaId) {
      return NextResponse.json({ error: 'Not a Strava activity' }, { status: 400 });
    }

    // Obtener token de Strava
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

    // Obtener streams de Strava
    const streams = await getActivityStreams(token.accessToken, parseInt(stravaId));

    return NextResponse.json(streams);
  } catch (error) {
    console.error('Error fetching activity streams:', error);
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}
