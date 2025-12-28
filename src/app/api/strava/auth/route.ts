import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/strava';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/strava/callback`;
  const authUrl = getAuthUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
