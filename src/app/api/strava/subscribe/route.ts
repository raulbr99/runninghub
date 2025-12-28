import { NextResponse } from 'next/server';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || 'RUNNINGHUB_STRAVA';

// POST: Crear suscripción al webhook
export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const callbackUrl = `${baseUrl}/api/strava/webhook`;

  try {
    const response = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        callback_url: callbackUrl,
        verify_token: STRAVA_VERIFY_TOKEN,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Strava subscription error:', data);
      return NextResponse.json({ error: data.message || 'Subscription failed', details: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, subscription: data });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

// GET: Ver suscripción actual
export async function GET() {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/push_subscriptions?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`
    );

    const data = await response.json();
    return NextResponse.json({ subscriptions: data });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// DELETE: Eliminar suscripción
export async function DELETE() {
  try {
    // Primero obtener las suscripciones
    const getResponse = await fetch(
      `https://www.strava.com/api/v3/push_subscriptions?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`
    );
    const subscriptions = await getResponse.json();

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found' });
    }

    // Eliminar cada suscripción
    for (const sub of subscriptions) {
      await fetch(`https://www.strava.com/api/v3/push_subscriptions/${sub.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
        }),
      });
    }

    return NextResponse.json({ success: true, deleted: subscriptions.length });
  } catch (error) {
    console.error('Error deleting subscriptions:', error);
    return NextResponse.json({ error: 'Failed to delete subscriptions' }, { status: 500 });
  }
}
