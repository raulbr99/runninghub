import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile, appSettings, calendarEvents } from '@/lib/db/schema';
import { gte, eq, and, desc, sql } from 'drizzle-orm';

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

interface TrainingHistory {
  weeklyVolumes: number[];
  avgWeeklyKm: number;
  maxLongRun: number;
  totalWorkouts: number;
  typeDistribution: Record<string, number>;
  trend: 'increasing' | 'stable' | 'decreasing';
  ctl: number;
  atl: number;
  tsb: number;
}

async function getTrainingHistory(thresholdPace: number = 5): Promise<TrainingHistory | null> {
  try {
    // Obtener entrenamientos de las últimas 6 semanas
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.date, sixWeeksAgo.toISOString().split('T')[0]),
          eq(calendarEvents.category, 'running'),
          eq(calendarEvents.completed, 1)
        )
      )
      .orderBy(desc(calendarEvents.date));

    if (events.length === 0) {
      return null;
    }

    // Calcular volumen por semana
    const weeklyData: Map<string, { km: number; workouts: number }> = new Map();
    const typeCount: Record<string, number> = {};
    let maxLongRun = 0;

    events.forEach((event) => {
      const eventDate = new Date(event.date);
      const weekStart = new Date(eventDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekKey = weekStart.toISOString().split('T')[0];

      const current = weeklyData.get(weekKey) || { km: 0, workouts: 0 };
      current.km += event.distance || 0;
      current.workouts += 1;
      weeklyData.set(weekKey, current);

      // Contar tipos de entreno
      typeCount[event.type] = (typeCount[event.type] || 0) + 1;

      // Máxima tirada larga
      if (event.distance && event.distance > maxLongRun) {
        maxLongRun = event.distance;
      }
    });

    // Convertir a array ordenado (más reciente primero)
    const weeklyVolumes = Array.from(weeklyData.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, data]) => data.km);

    // Calcular promedio semanal
    const avgWeeklyKm = weeklyVolumes.length > 0
      ? weeklyVolumes.reduce((a, b) => a + b, 0) / weeklyVolumes.length
      : 0;

    // Calcular tendencia
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (weeklyVolumes.length >= 3) {
      const recent = weeklyVolumes.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const older = weeklyVolumes.slice(-2).reduce((a, b) => a + b, 0) / 2;
      if (recent > older * 1.1) trend = 'increasing';
      else if (recent < older * 0.9) trend = 'decreasing';
    }

    // Calcular TSS simplificado y CTL/ATL
    const tssPerDay: Map<string, number> = new Map();
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      tssPerDay.set(date.toISOString().split('T')[0], 0);
    }

    events.forEach((event) => {
      if (event.duration && event.distance) {
        const pace = event.duration / event.distance;
        let intensityFactor = thresholdPace / pace;

        const typeMultipliers: Record<string, number> = {
          easy: 0.7, recovery: 0.6, long: 0.75,
          tempo: 0.88, intervals: 0.95, race: 1.0
        };
        intensityFactor = Math.min(intensityFactor * (typeMultipliers[event.type] || 0.75), 1.2);

        const tss = ((event.duration * 60 * Math.pow(intensityFactor, 2)) / 3600) * 100;
        const current = tssPerDay.get(event.date) || 0;
        tssPerDay.set(event.date, current + tss);
      }
    });

    const tssArray = Array.from(tssPerDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, tss]) => tss);

    // EWMA para CTL (42 días) y ATL (7 días)
    const calculateEWMA = (values: number[], halfLife: number): number => {
      if (values.length === 0) return 0;
      const decay = Math.log(2) / halfLife;
      let numerator = 0, denominator = 0;
      values.forEach((value, index) => {
        const weight = Math.exp(-decay * index);
        numerator += value * weight;
        denominator += weight;
      });
      return denominator > 0 ? numerator / denominator : 0;
    };

    const ctl = calculateEWMA(tssArray.slice(0, 42), 42);
    const atl = calculateEWMA(tssArray.slice(0, 7), 7);
    const tsb = ctl - atl;

    return {
      weeklyVolumes,
      avgWeeklyKm: Math.round(avgWeeklyKm * 10) / 10,
      maxLongRun: Math.round(maxLongRun * 10) / 10,
      totalWorkouts: events.length,
      typeDistribution: typeCount,
      trend,
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(tsb),
    };
  } catch (error) {
    console.error('Error getting training history:', error);
    return null;
  }
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
    const userThreshold = profile?.thresholdPace || 5;

    // Obtener historial de entrenamientos recientes
    const trainingHistory = await getTrainingHistory(userThreshold);

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

    // Construir contexto del historial de entrenamiento
    let historyContext = '';
    if (trainingHistory) {
      const trendText = {
        increasing: 'aumentando volumen',
        stable: 'estable',
        decreasing: 'reduciendo volumen'
      }[trainingHistory.trend];

      const typeNames: Record<string, string> = {
        easy: 'rodajes suaves', tempo: 'tempo', intervals: 'series',
        fartlek: 'fartlek', long: 'tiradas largas', recovery: 'recuperacion',
        race: 'carreras', trail: 'trail'
      };

      const typeList = Object.entries(trainingHistory.typeDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([type, count]) => `${typeNames[type] || type}: ${count}`)
        .join(', ');

      let formStatus = 'equilibrado';
      if (trainingHistory.tsb > 15) formStatus = 'muy descansado (ideal para competir)';
      else if (trainingHistory.tsb > 5) formStatus = 'bien recuperado';
      else if (trainingHistory.tsb < -15) formStatus = 'acumulando fatiga (cuidado)';
      else if (trainingHistory.tsb < -5) formStatus = 'ligeramente fatigado';

      historyContext = `

HISTORIAL DE ENTRENAMIENTO REAL (ultimas 6 semanas):
- Volumen semanal promedio REAL: ${trainingHistory.avgWeeklyKm} km/semana
- Volumen por semana (reciente a antiguo): ${trainingHistory.weeklyVolumes.map(v => Math.round(v)).join(', ')} km
- Tendencia: ${trendText}
- Total entrenamientos: ${trainingHistory.totalWorkouts}
- Tirada larga maxima: ${trainingHistory.maxLongRun} km
- Tipos de entreno realizados: ${typeList}
- Fitness (CTL): ${trainingHistory.ctl} | Fatiga (ATL): ${trainingHistory.atl} | Forma (TSB): ${trainingHistory.tsb}
- Estado de forma actual: ${formStatus}

IMPORTANTE - USA ESTE HISTORIAL REAL:
- Empieza el plan desde el volumen actual del corredor (${trainingHistory.avgWeeklyKm} km/sem), NO desde cero
- Si el corredor esta fatigado (TSB negativo), empieza con semana de descarga
- Respeta los tipos de entreno que ya hace habitualmente
- La primera tirada larga no debe superar ${Math.round(trainingHistory.maxLongRun * 1.1)} km`;
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

    // Fecha de inicio: hoy o el proximo dia disponible
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const userPrompt = `Genera un plan de entrenamiento para:

FECHA ACTUAL: ${todayStr}
IMPORTANTE: El plan debe empezar DESDE HOY o el proximo dia de entrenamiento disponible. NO empieces en 2 semanas.

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
${profileContext}${historyContext}

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
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'training_plan',
            strict: false,
            schema: {
              type: 'object',
              properties: {
                planName: { type: 'string', description: 'Nombre descriptivo del plan' },
                totalWeeks: { type: 'number', description: 'Numero total de semanas' },
                weeklyVolume: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Km por semana'
                },
                phases: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      weeks: { type: 'string' },
                      focus: { type: 'string' }
                    },
                    required: ['name', 'weeks', 'focus'],
                    additionalProperties: false
                  }
                },
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
                      type: { type: 'string', enum: ['easy', 'tempo', 'intervals', 'fartlek', 'long', 'recovery', 'race', 'strength', 'rest'] },
                      title: { type: 'string' },
                      distance: { type: ['number', 'null'] },
                      duration: { type: 'number' },
                      notes: { type: 'string' }
                    },
                    required: ['date', 'type', 'title', 'distance', 'duration', 'notes'],
                    additionalProperties: false
                  }
                }
              },
              required: ['planName', 'totalWeeks', 'weeklyVolume', 'phases', 'events'],
              additionalProperties: false
            }
          }
        },
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
      console.error('Model used:', modelToUse);
      return new Response(JSON.stringify({
        error: `El modelo ${modelToUse} genero JSON invalido. Prueba con openai/gpt-4o que tiene mejor soporte para structured outputs.`
      }), {
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
