const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH_BASE = 'https://www.strava.com/oauth';

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
}

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: StravaAthlete;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // metros
  moving_time: number; // segundos
  elapsed_time: number; // segundos
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number; // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
  workout_type?: number;
}

export function getAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read,activity:read_all',
  });
  return `${STRAVA_OAUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeToken(code: string): Promise<StravaTokenResponse> {
  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange token: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

export async function getActivities(
  accessToken: string,
  page: number = 1,
  perPage: number = 30,
  after?: number
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  if (after) params.set('after', after.toString());

  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get activities: ${error}`);
  }

  return response.json();
}

export async function getAthlete(accessToken: string): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get athlete: ${error}`);
  }

  return response.json();
}

export async function deauthorize(accessToken: string): Promise<void> {
  const response = await fetch(`${STRAVA_OAUTH_BASE}/deauthorize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to deauthorize: ${error}`);
  }
}

// Mapea tipo de actividad de Strava a tipo de evento en RunningHub
export function mapStravaActivityType(activity: StravaActivity): string {
  // Solo importamos actividades de running
  if (activity.type !== 'Run' && activity.sport_type !== 'Run') {
    return 'other';
  }

  const distanceKm = activity.distance / 1000;
  const paceMinPerKm = activity.moving_time / 60 / distanceKm;

  // workout_type: 0 = default, 1 = race, 2 = long run, 3 = workout (intervals/tempo)
  if (activity.workout_type === 1) return 'race';
  if (activity.workout_type === 2) return 'long';
  if (activity.workout_type === 3) {
    // Determinar si es tempo o intervals basado en ritmo
    return paceMinPerKm < 5 ? 'intervals' : 'tempo';
  }

  // Clasificar por distancia si no hay workout_type
  if (distanceKm >= 18) return 'long';
  if (distanceKm <= 6 && paceMinPerKm > 6) return 'recovery';

  return 'easy';
}

// Convierte m/s a min/km string
export function formatPace(speedMs: number): string {
  if (speedMs <= 0) return '-';
  const paceMinPerKm = 1000 / speedMs / 60;
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
