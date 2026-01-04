import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile, appSettings } from '@/lib/db/schema';

interface PlanRequest {
  raceType: '5k' | '10k' | 'half_marathon' | 'marathon' | 'trail' | 'ultra';
  raceName?: string;
  raceDate: string;
  targetTime?: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  currentWeeklyKm?: number;
  recentRaceTime?: string;
  availableDays: number[];
  maxHoursPerSession: number;
  longRunDay: number;
  includeStrength: boolean;
  includeIntervals: boolean;
  includeTempo: boolean;
}

const raceDistances: Record<string, number> = {
  '5k': 5,
  '10k': 10,
  'half_marathon': 21.1,
  'marathon': 42.2,
  'trail': 25,
  'ultra': 50,
};

const raceNames: Record<string, string> = {
  '5k': '5K',
  '10k': '10K',
  'half_marathon': 'Media Maraton',
  'marathon': 'Maraton',
  'trail': 'Trail',
  'ultra': 'Ultra',
};

const levelDescriptions: Record<string, string> = {
  beginner: 'principiante (menos de 1 ano corriendo, pocas carreras)',
  intermediate: 'intermedio (1-3 anos corriendo, varias carreras completadas)',
  advanced: 'avanzado (mas de 3 anos corriendo, muchas carreras, busca mejora de marcas)',
};

function calculateWeeks(raceDate: string): number {
  const race = new Date(raceDate);
  const now = new Date();
  const diffMs = race.getTime() - now.getTime();
  const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
  return Math.max(4, Math.min(24, weeks));
}

function getDayName(day: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  return days[day] || 'Domingo';
}

export async function POST(request: NextRequest) {
  try {
    const data: PlanRequest = await request.json();

    // Validaciones
    const raceDate = new Date(data.raceDate);
    const now = new Date();
    if (raceDate <= now) {
      return new Response(JSON.stringify({ error: 'La fecha de la carrera debe ser futura' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const weeks = calculateWeeks(data.raceDate);
    if (weeks < 4) {
      return new Response(JSON.stringify({ error: 'Necesitas al menos 4 semanas para un plan de entrenamiento' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener perfil del usuario para personalizar
    const profiles = await db.select().from(runnerProfile).limit(1);
    const profile = profiles[0] || null;

    // Obtener modelo configurado
    const settings = await db.select().from(appSettings).limit(1);
    const modelToUse = settings[0]?.trainingPlanModel || 'openai/gpt-4o';

    // Construir el prompt
    const availableDayNames = data.availableDays.map(d => getDayName(d)).join(', ');
    const longRunDayName = getDayName(data.longRunDay);
    const raceDistance = raceDistances[data.raceType];
    const raceName = data.raceName || raceNames[data.raceType];

    let profileContext = '';
    if (profile) {
      const profileParts = [];
      if (profile.name) profileParts.push(`Nombre: ${profile.name}`);
      if (profile.age) profileParts.push(`Edad: ${profile.age} anos`);
      if (profile.weight) profileParts.push(`Peso: ${profile.weight} kg`);
      if (profile.pb5k) profileParts.push(`Marca 5K: ${profile.pb5k}`);
      if (profile.pb10k) profileParts.push(`Marca 10K: ${profile.pb10k}`);
      if (profile.pbHalfMarathon) profileParts.push(`Marca Media: ${profile.pbHalfMarathon}`);
      if (profile.pbMarathon) profileParts.push(`Marca Maraton: ${profile.pbMarathon}`);
      if (profile.injuries) profileParts.push(`Lesiones a considerar: ${profile.injuries}`);
      if (profileParts.length > 0) {
        profileContext = `\n\nPERFIL DEL CORREDOR:\n${profileParts.join('\n')}`;
      }
    }

    const systemPrompt = `Eres un entrenador de running profesional con experiencia en preparacion de atletas para carreras.
Genera planes de entrenamiento personalizados, periodizados y realistas.

REGLAS CRITICAS DE FORMATO:
1. Responde SOLO con JSON puro, sin bloques de codigo markdown (NO uses \`\`\`json)
2. El JSON debe ser valido y parseable directamente
3. NO incluyas texto antes o despues del JSON
4. Verifica que todas las comas y llaves esten correctas

REGLAS DE CONTENIDO:
1. Las fechas deben estar en formato YYYY-MM-DD
2. Los tipos de entrenamiento validos son: easy, tempo, intervals, fartlek, long, recovery, race, strength, rest
3. Usa periodizacion inteligente: base -> build -> peak -> taper
4. Incluye semanas de descarga cada 3-4 semanas
5. Ajusta el volumen gradualmente (no mas del 10% semanal)
6. El dia de tirada larga debe ser siempre el especificado por el usuario`;

    const userPrompt = `Genera un plan de entrenamiento para:

CARRERA OBJETIVO:
- Tipo: ${raceNames[data.raceType]} (${raceDistance} km)
- Nombre: ${raceName}
- Fecha: ${data.raceDate}
- Semanas disponibles: ${weeks}
${data.targetTime ? `- Tiempo objetivo: ${data.targetTime}` : ''}

NIVEL DEL CORREDOR:
- Nivel: ${levelDescriptions[data.currentLevel]}
${data.currentWeeklyKm ? `- Kilometraje semanal actual: ${data.currentWeeklyKm} km` : ''}
${data.recentRaceTime ? `- Ultima marca en distancia similar: ${data.recentRaceTime}` : ''}

DISPONIBILIDAD:
- Dias disponibles: ${availableDayNames}
- Dia preferido para tirada larga: ${longRunDayName}
- Tiempo maximo por sesion: ${data.maxHoursPerSession} horas

PREFERENCIAS:
- Incluir fuerza: ${data.includeStrength ? 'Si' : 'No'}
- Incluir intervalos/series: ${data.includeIntervals ? 'Si' : 'No'}
- Incluir tempo/ritmo controlado: ${data.includeTempo ? 'Si' : 'No'}
${profileContext}

ESTRUCTURA JSON REQUERIDA:
{
  "planName": "string - nombre descriptivo del plan",
  "totalWeeks": number,
  "weeklyVolume": [number] - km por semana,
  "phases": [
    { "name": "string", "weeks": "string (ej: 1-4)", "focus": "string" }
  ],
  "events": [
    {
      "date": "YYYY-MM-DD",
      "type": "easy|tempo|intervals|fartlek|long|recovery|race|strength|rest",
      "title": "string - titulo corto",
      "distance": number - km (null para fuerza/descanso),
      "duration": number - minutos,
      "notes": "string - descripcion del entrenamiento con ritmos si aplica"
    }
  ]
}

Genera el plan completo con TODOS los entrenamientos de las ${weeks} semanas.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'RunningHub Training Plan',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 16000,
        ...(modelToUse.startsWith('openai/') ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return new Response(JSON.stringify({ error: 'Error al generar el plan' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    const planContent = result.choices?.[0]?.message?.content;

    if (!planContent) {
      return new Response(JSON.stringify({ error: 'No se pudo generar el plan' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Limpiar el contenido: quitar bloques de markdown si existen
      let cleanContent = planContent.trim();

      // Quitar ```json al inicio y ``` al final
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const plan = JSON.parse(cleanContent);
      return new Response(JSON.stringify(plan), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (parseError) {
      console.error('Error parsing plan JSON:', planContent);
      console.error('Parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Error al procesar el plan. El modelo genero JSON invalido. Intenta de nuevo o cambia el modelo en Configuracion.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Training plan API error:', error);
    return new Response(JSON.stringify({ error: 'Error al procesar la solicitud' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
