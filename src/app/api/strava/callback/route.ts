import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stravaTokens } from '@/lib/db/schema';
import { exchangeToken } from '@/lib/strava';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?strava=error&message=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/settings?strava=error&message=no_code`);
  }

  try {
    const tokenData = await exchangeToken(code);

    if (!tokenData.athlete) {
      return NextResponse.redirect(`${baseUrl}/settings?strava=error&message=no_athlete`);
    }

    const athleteId = tokenData.athlete.id.toString();
    const athleteName = `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`;
    const athleteProfile = tokenData.athlete.profile;

    // Verificar si ya existe un token para este atleta
    const existing = await db
      .select()
      .from(stravaTokens)
      .where(eq(stravaTokens.athleteId, athleteId))
      .limit(1);

    if (existing.length > 0) {
      // Actualizar token existente
      await db
        .update(stravaTokens)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_at,
          athleteName,
          athleteProfile,
          updatedAt: new Date(),
        })
        .where(eq(stravaTokens.athleteId, athleteId));
    } else {
      // Crear nuevo token
      await db.insert(stravaTokens).values({
        athleteId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_at,
        athleteName,
        athleteProfile,
      });
    }

    return NextResponse.redirect(`${baseUrl}/settings?strava=success`);
  } catch (err) {
    console.error('Strava callback error:', err);
    return NextResponse.redirect(`${baseUrl}/settings?strava=error&message=token_exchange_failed`);
  }
}
