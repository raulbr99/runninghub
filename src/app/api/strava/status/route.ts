import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stravaTokens } from '@/lib/db/schema';
import { refreshAccessToken } from '@/lib/strava';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const tokens = await db.select().from(stravaTokens).limit(1);

    if (tokens.length === 0) {
      return NextResponse.json({ connected: false });
    }

    const token = tokens[0];
    const now = Math.floor(Date.now() / 1000);

    // Si el token está expirado, intentar refrescarlo
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
      } catch {
        // Si falla el refresh, la conexión ya no es válida
        return NextResponse.json({ connected: false, error: 'token_expired' });
      }
    }

    return NextResponse.json({
      connected: true,
      athlete: {
        id: token.athleteId,
        name: token.athleteName,
        profile: token.athleteProfile,
      },
    });
  } catch (error) {
    console.error('Error checking Strava status:', error);
    return NextResponse.json({ connected: false, error: 'unknown' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const tokens = await db.select().from(stravaTokens).limit(1);

    if (tokens.length > 0) {
      // Intentar desautorizar en Strava (opcional, puede fallar)
      try {
        const { deauthorize } = await import('@/lib/strava');
        await deauthorize(tokens[0].accessToken);
      } catch {
        // Ignorar error de desautorización
      }

      // Eliminar token de la base de datos
      await db.delete(stravaTokens).where(eq(stravaTokens.id, tokens[0].id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Strava:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
