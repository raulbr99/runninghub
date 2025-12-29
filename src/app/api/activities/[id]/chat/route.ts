import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calendarEvents, runnerProfile, EventData } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { messages, model = 'openai/gpt-4o-mini' }: { messages: ChatMessage[]; model?: string } = await request.json();

    // Obtener la actividad
    const events = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .limit(1);

    if (events.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const activity = events[0];
    const eventData = (activity.eventData || {}) as EventData;

    // Obtener perfil del corredor para contexto
    const profiles = await db.select().from(runnerProfile).limit(1);
    const profile = profiles[0] || null;

    // Construir datos de la actividad
    const activityData = {
      fecha: activity.date,
      hora: activity.time,
      tipo: activity.type,
      titulo: activity.title,
      distancia: activity.distance ? `${activity.distance} km` : null,
      duracion: activity.duration ? `${activity.duration} min` : null,
      tiempoMovimiento: activity.movingTime ? `${Math.floor(activity.movingTime / 60)}:${(activity.movingTime % 60).toString().padStart(2, '0')}` : null,
      tiempoTotal: activity.elapsedTime ? `${Math.floor(activity.elapsedTime / 60)}:${(activity.elapsedTime % 60).toString().padStart(2, '0')}` : null,
      ritmoMedio: eventData.pace,
      velocidadMedia: activity.averageSpeed ? `${(activity.averageSpeed * 3.6).toFixed(1)} km/h` : null,
      velocidadMaxima: activity.maxSpeed ? `${(activity.maxSpeed * 3.6).toFixed(1)} km/h` : null,
      fcMedia: activity.heartRate ? `${activity.heartRate} bpm` : null,
      fcMaxima: activity.maxHeartRate ? `${activity.maxHeartRate} bpm` : null,
      cadencia: activity.averageCadence ? `${Math.round(activity.averageCadence * 2)} ppm` : null,
      desnivelPositivo: activity.elevationGain ? `${Math.round(activity.elevationGain)} m` : null,
      altitudMaxima: activity.elevHigh ? `${Math.round(activity.elevHigh)} m` : null,
      altitudMinima: activity.elevLow ? `${Math.round(activity.elevLow)} m` : null,
      calorias: activity.calories ? `${activity.calories} kcal` : null,
      potenciaMedia: activity.averageWatts ? `${Math.round(activity.averageWatts)} W` : null,
      potenciaNormalizada: activity.weightedAverageWatts ? `${Math.round(activity.weightedAverageWatts)} W` : null,
      potenciaMaxima: activity.maxWatts ? `${activity.maxWatts} W` : null,
      temperatura: activity.averageTemp ? `${activity.averageTemp}°C` : null,
      esfuerzoRelativo: activity.sufferScore,
      equipamiento: activity.gearName,
      dispositivo: activity.deviceName,
      kudos: activity.kudosCount,
      prs: activity.prCount,
      logros: activity.achievementCount,
      splits: activity.splitsMetric,
      vueltas: activity.laps,
      segmentos: activity.segmentEfforts,
      sensacion: activity.feeling,
      descripcion: activity.description,
    };

    // Filtrar valores null
    const filteredData = Object.fromEntries(
      Object.entries(activityData).filter(([, v]) => v !== null && v !== undefined)
    );

    const systemPrompt = `Eres un coach de running experto. Estás analizando una actividad específica del usuario y respondiendo sus preguntas sobre ella.

${profile ? `Contexto del corredor:
- Nombre: ${profile.name || 'No especificado'}
- Edad: ${profile.age || 'No especificada'}
- Peso: ${profile.weight ? profile.weight + ' kg' : 'No especificado'}
- Años corriendo: ${profile.yearsRunning || 'No especificado'}
- Km semanales: ${profile.weeklyKm || 'No especificado'}
- Objetivo actual: ${profile.currentGoal || 'No especificado'}
- PRs: 5K ${profile.pb5k || '-'}, 10K ${profile.pb10k || '-'}, Media ${profile.pbHalfMarathon || '-'}, Maratón ${profile.pbMarathon || '-'}
` : ''}

Datos de la actividad que estamos analizando:
${JSON.stringify(filteredData, null, 2)}

Responde las preguntas del usuario sobre esta actividad de forma específica, usando los datos disponibles. Sé conciso pero informativo. Usa un tono motivador y profesional.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No se pudo generar la respuesta.';

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in activity chat:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
