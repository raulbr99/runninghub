import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile, runningEvents, weightEntries, nutritionEntries, nutritionGoals } from '@/lib/db/schema';
import { and, gte, lte, desc, eq } from 'drizzle-orm';

// Tool definitions
const saveProfileTool = {
  type: 'function' as const,
  function: {
    name: 'save_runner_profile',
    description: 'Guarda o actualiza informacion del perfil del corredor.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del corredor' },
        age: { type: 'number', description: 'Edad en anos' },
        weight: { type: 'number', description: 'Peso en kg' },
        height: { type: 'number', description: 'Altura en cm' },
        yearsRunning: { type: 'number', description: 'Anos de experiencia corriendo' },
        weeklyKm: { type: 'number', description: 'Kilometros semanales habituales' },
        pb5k: { type: 'string', description: 'Marca personal 5K (formato MM:SS)' },
        pb10k: { type: 'string', description: 'Marca personal 10K' },
        pbHalfMarathon: { type: 'string', description: 'Marca personal media maraton' },
        pbMarathon: { type: 'string', description: 'Marca personal maraton' },
        currentGoal: { type: 'string', description: 'Objetivo actual del corredor' },
        targetRace: { type: 'string', description: 'Carrera objetivo' },
        targetTime: { type: 'string', description: 'Tiempo objetivo para la carrera' },
        injuries: { type: 'string', description: 'Lesiones pasadas o actuales' },
        healthNotes: { type: 'string', description: 'Notas de salud relevantes' },
        preferredTerrain: { type: 'string', description: 'Terreno preferido' },
        availableDays: { type: 'string', description: 'Dias disponibles para entrenar' },
        maxTimePerSession: { type: 'number', description: 'Tiempo maximo por sesion en minutos' },
        coachNotes: { type: 'string', description: 'Notas sobre el corredor' },
      },
      required: [],
    },
  },
};

const getEventsTool = {
  type: 'function' as const,
  function: {
    name: 'get_running_events',
    description: 'Obtiene los eventos y entrenamientos del calendario.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Fecha de inicio YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Fecha de fin YYYY-MM-DD' },
        category: { type: 'string', enum: ['running', 'personal', 'all'], description: 'Categoria de eventos' },
        limit: { type: 'number', description: 'Limite de eventos' },
      },
      required: [],
    },
  },
};

const createEventTool = {
  type: 'function' as const,
  function: {
    name: 'create_running_event',
    description: 'Crea un nuevo evento o entrenamiento en el calendario.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha del evento YYYY-MM-DD' },
        category: { type: 'string', enum: ['running', 'personal'], description: 'Categoria' },
        type: { type: 'string', description: 'Tipo de evento: easy, tempo, interval, long, recovery, race, strength, rest' },
        title: { type: 'string', description: 'Titulo del evento' },
        time: { type: 'string', description: 'Hora HH:MM' },
        distance: { type: 'number', description: 'Distancia en km' },
        duration: { type: 'number', description: 'Duracion en minutos' },
        pace: { type: 'string', description: 'Ritmo M:SS' },
        notes: { type: 'string', description: 'Notas adicionales' },
      },
      required: ['date', 'type'],
    },
  },
};

const logWeightTool = {
  type: 'function' as const,
  function: {
    name: 'log_weight',
    description: 'Registra el peso del usuario.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha YYYY-MM-DD (por defecto hoy)' },
        weight: { type: 'number', description: 'Peso en kg' },
        bodyFat: { type: 'number', description: 'Porcentaje de grasa corporal' },
        muscleMass: { type: 'number', description: 'Masa muscular en kg' },
        notes: { type: 'string', description: 'Notas' },
      },
      required: ['weight'],
    },
  },
};

const getWeightHistoryTool = {
  type: 'function' as const,
  function: {
    name: 'get_weight_history',
    description: 'Obtiene el historial de peso.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Numero de registros a obtener (por defecto 30)' },
      },
      required: [],
    },
  },
};

const logMealTool = {
  type: 'function' as const,
  function: {
    name: 'log_meal',
    description: 'Registra una comida.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha YYYY-MM-DD (por defecto hoy)' },
        mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Tipo de comida' },
        description: { type: 'string', description: 'Descripcion de la comida' },
        calories: { type: 'number', description: 'Calorias' },
        protein: { type: 'number', description: 'Proteinas en gramos' },
        carbs: { type: 'number', description: 'Carbohidratos en gramos' },
        fats: { type: 'number', description: 'Grasas en gramos' },
        notes: { type: 'string', description: 'Notas' },
      },
      required: ['mealType', 'description'],
    },
  },
};

const getNutritionSummaryTool = {
  type: 'function' as const,
  function: {
    name: 'get_nutrition_summary',
    description: 'Obtiene el resumen nutricional del dia.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha YYYY-MM-DD (por defecto hoy)' },
      },
      required: [],
    },
  },
};

const setNutritionGoalsTool = {
  type: 'function' as const,
  function: {
    name: 'set_nutrition_goals',
    description: 'Establece los objetivos nutricionales diarios.',
    parameters: {
      type: 'object',
      properties: {
        calories: { type: 'number', description: 'Calorias objetivo' },
        protein: { type: 'number', description: 'Proteinas objetivo en gramos' },
        carbs: { type: 'number', description: 'Carbohidratos objetivo en gramos' },
        fats: { type: 'number', description: 'Grasas objetivo en gramos' },
      },
      required: [],
    },
  },
};

// Tool execution functions
async function executeProfileSave(args: Record<string, unknown>) {
  try {
    const profiles = await db.select().from(runnerProfile).limit(1);
    const updateData: Record<string, unknown> = {};
    const stringFields = ['name', 'pb5k', 'pb10k', 'pbHalfMarathon', 'pbMarathon', 'currentGoal', 'targetRace', 'targetTime', 'injuries', 'healthNotes', 'preferredTerrain', 'availableDays', 'coachNotes'];
    const numberFields = ['age', 'weight', 'height', 'yearsRunning', 'weeklyKm', 'maxTimePerSession'];

    for (const field of stringFields) {
      if (args[field] !== undefined) updateData[field] = args[field];
    }
    for (const field of numberFields) {
      if (args[field] !== undefined) updateData[field] = Number(args[field]);
    }

    if (Object.keys(updateData).length === 0) return { success: true, message: 'No hay datos para actualizar' };
    updateData.updatedAt = new Date();

    if (profiles.length === 0) {
      await db.insert(runnerProfile).values(updateData);
    } else {
      await db.update(runnerProfile).set(updateData).where(eq(runnerProfile.id, profiles[0].id));
    }
    return { success: true, message: 'Perfil actualizado correctamente' };
  } catch (error) {
    console.error('Error saving profile:', error);
    return { success: false, message: 'Error al guardar el perfil' };
  }
}

async function executeGetEvents(args: Record<string, unknown>) {
  try {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const startDate = (args.startDate as string) || defaultStart.toISOString().split('T')[0];
    const endDate = (args.endDate as string) || defaultEnd.toISOString().split('T')[0];
    const category = (args.category as string) || 'all';
    const limit = (args.limit as number) || 20;

    const events = await db
      .select()
      .from(runningEvents)
      .where(and(gte(runningEvents.date, startDate), lte(runningEvents.date, endDate)))
      .orderBy(runningEvents.date)
      .limit(limit);

    const filteredEvents = category === 'all' ? events : events.filter(e => e.category === category);
    return { success: true, events: filteredEvents, count: filteredEvents.length };
  } catch (error) {
    console.error('Error getting events:', error);
    return { success: false, message: 'Error al obtener eventos', events: [] };
  }
}

async function executeCreateEvent(args: Record<string, unknown>) {
  try {
    const category = (args.category as string) || 'running';

    // Construir eventData segun la categoria
    const eventData: Record<string, unknown> = {};
    if (category === 'running' && args.pace) {
      eventData.pace = args.pace as string;
    }

    const [event] = await db
      .insert(runningEvents)
      .values({
        date: args.date as string,
        category,
        type: args.type as string,
        title: (args.title as string) || null,
        time: (args.time as string) || null,
        distance: args.distance ? Number(args.distance) : null,
        duration: args.duration ? Number(args.duration) : null,
        notes: (args.notes as string) || null,
        eventData: Object.keys(eventData).length > 0 ? eventData : null,
        completed: 0,
      })
      .returning();
    return { success: true, message: 'Evento creado', event };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, message: 'Error al crear evento' };
  }
}

async function executeLogWeight(args: Record<string, unknown>) {
  try {
    const date = (args.date as string) || new Date().toISOString().split('T')[0];
    const [entry] = await db
      .insert(weightEntries)
      .values({
        date,
        weight: Number(args.weight),
        bodyFat: args.bodyFat ? Number(args.bodyFat) : null,
        muscleMass: args.muscleMass ? Number(args.muscleMass) : null,
        notes: (args.notes as string) || null,
      })
      .returning();
    return { success: true, message: 'Peso registrado', entry };
  } catch (error) {
    console.error('Error logging weight:', error);
    return { success: false, message: 'Error al registrar peso' };
  }
}

async function executeGetWeightHistory(args: Record<string, unknown>) {
  try {
    const limit = (args.limit as number) || 30;
    const entries = await db
      .select()
      .from(weightEntries)
      .orderBy(desc(weightEntries.date))
      .limit(limit);
    return { success: true, entries, count: entries.length };
  } catch (error) {
    console.error('Error getting weight history:', error);
    return { success: false, message: 'Error al obtener historial', entries: [] };
  }
}

async function executeLogMeal(args: Record<string, unknown>) {
  try {
    const date = (args.date as string) || new Date().toISOString().split('T')[0];
    const [entry] = await db
      .insert(nutritionEntries)
      .values({
        date,
        mealType: args.mealType as string,
        description: args.description as string,
        calories: args.calories ? Number(args.calories) : null,
        protein: args.protein ? Number(args.protein) : null,
        carbs: args.carbs ? Number(args.carbs) : null,
        fats: args.fats ? Number(args.fats) : null,
        notes: (args.notes as string) || null,
      })
      .returning();
    return { success: true, message: 'Comida registrada', entry };
  } catch (error) {
    console.error('Error logging meal:', error);
    return { success: false, message: 'Error al registrar comida' };
  }
}

async function executeGetNutritionSummary(args: Record<string, unknown>) {
  try {
    const date = (args.date as string) || new Date().toISOString().split('T')[0];
    const entries = await db
      .select()
      .from(nutritionEntries)
      .where(gte(nutritionEntries.date, date));

    const todayEntries = entries.filter(e => e.date === date);
    const totals = todayEntries.reduce((acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fats: acc.fats + (e.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const goals = await db.select().from(nutritionGoals).limit(1);
    return { success: true, date, meals: todayEntries, totals, goals: goals[0] || null };
  } catch (error) {
    console.error('Error getting nutrition summary:', error);
    return { success: false, message: 'Error al obtener resumen' };
  }
}

async function executeSetNutritionGoals(args: Record<string, unknown>) {
  try {
    const existing = await db.select().from(nutritionGoals).limit(1);
    const data = {
      calories: args.calories ? Number(args.calories) : null,
      protein: args.protein ? Number(args.protein) : null,
      carbs: args.carbs ? Number(args.carbs) : null,
      fats: args.fats ? Number(args.fats) : null,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      await db.insert(nutritionGoals).values(data);
    } else {
      await db.update(nutritionGoals).set(data).where(eq(nutritionGoals.id, existing[0].id));
    }
    return { success: true, message: 'Objetivos actualizados' };
  } catch (error) {
    console.error('Error setting goals:', error);
    return { success: false, message: 'Error al establecer objetivos' };
  }
}

async function executeTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'save_runner_profile': return executeProfileSave(args);
    case 'get_running_events': return executeGetEvents(args);
    case 'create_running_event': return executeCreateEvent(args);
    case 'log_weight': return executeLogWeight(args);
    case 'get_weight_history': return executeGetWeightHistory(args);
    case 'log_meal': return executeLogMeal(args);
    case 'get_nutrition_summary': return executeGetNutritionSummary(args);
    case 'set_nutrition_goals': return executeSetNutritionGoals(args);
    default: return { success: false, message: `Tool desconocido: ${name}` };
  }
}

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'openai/gpt-4o', temperature = 0.7 }: ChatRequest = await request.json();

    const tools = [saveProfileTool, getEventsTool, createEventTool, logWeightTool, getWeightHistoryTool, logMealTool, getNutritionSummaryTool, setNutritionGoalsTool];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'RunningHub Coach',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        tools,
        tool_choice: 'auto',
        stream: true,
        max_tokens: 2000,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function processStream(
      reader: ReadableStreamDefaultReader<Uint8Array>,
      controller: ReadableStreamDefaultController<Uint8Array>,
      collectToolCall: boolean
    ) {
      let toolCallId = '', toolCallName = '', toolCallArgs = '', contentBuffer = '', hasToolCall = false, lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const combined = lineBuffer + chunk;
        const lines = combined.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            const finishReason = parsed.choices?.[0]?.finish_reason;

            if (collectToolCall && delta?.tool_calls) {
              hasToolCall = true;
              for (const tc of delta.tool_calls) {
                if (tc.id) toolCallId = tc.id;
                if (tc.function?.name) toolCallName = tc.function.name;
                if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
              }
            }

            if (delta?.content) {
              contentBuffer += delta.content;

              // Detectar texto repetitivo (más de 20 caracteres iguales seguidos)
              const lastChars = contentBuffer.slice(-50);
              const repeatedPattern = /(.)\1{20,}/.test(lastChars);
              if (repeatedPattern) {
                console.warn('Detected repetitive output, stopping stream');
                reader.releaseLock();
                return { toolCallId, toolCallName, toolCallArgs, contentBuffer, hasToolCall };
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta.content })}\n\n`));
            }

            if (finishReason === 'tool_calls' && hasToolCall) {
              reader.releaseLock();
              return { toolCallId, toolCallName, toolCallArgs, contentBuffer, hasToolCall: true };
            }
          } catch { /* ignore */ }
        }
      }

      reader.releaseLock();
      return { toolCallId, toolCallName, toolCallArgs, contentBuffer, hasToolCall };
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        try {
          const toolCallData = await processStream(reader, controller, true);

          if (toolCallData.hasToolCall && toolCallData.toolCallArgs) {
            try {
              let cleanArgs = toolCallData.toolCallArgs.trim();

              // Find the first complete JSON object by counting braces
              let braceCount = 0;
              let startIndex = -1;
              let endIndex = -1;

              for (let i = 0; i < cleanArgs.length; i++) {
                if (cleanArgs[i] === '{') {
                  if (braceCount === 0) startIndex = i;
                  braceCount++;
                } else if (cleanArgs[i] === '}') {
                  braceCount--;
                  if (braceCount === 0 && startIndex !== -1) {
                    endIndex = i;
                    break;
                  }
                }
              }

              if (startIndex !== -1 && endIndex !== -1) {
                cleanArgs = cleanArgs.substring(startIndex, endIndex + 1);
              }

              const args = JSON.parse(cleanArgs);
              const toolResult = await executeTool(toolCallData.toolCallName, args);

              const notification: Record<string, unknown> = { toolExecuted: toolCallData.toolCallName };
              if (toolCallData.toolCallName === 'save_runner_profile') notification.profileSaved = true;
              if (toolCallData.toolCallName === 'create_running_event') notification.eventCreated = true;
              if (toolCallData.toolCallName === 'log_weight') notification.weightLogged = true;
              if (toolCallData.toolCallName === 'log_meal') notification.mealLogged = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`));

              const continueMessages = [
                ...messages,
                {
                  role: 'assistant',
                  content: toolCallData.contentBuffer || null,
                  tool_calls: [{ id: toolCallData.toolCallId || 'id', type: 'function', function: { name: toolCallData.toolCallName, arguments: toolCallData.toolCallArgs } }]
                },
                { role: 'tool', tool_call_id: toolCallData.toolCallId || 'id', content: JSON.stringify(toolResult) }
              ];

              const continueResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'http://localhost:3000',
                  'X-Title': 'RunningHub Coach',
                },
                body: JSON.stringify({
                  model,
                  messages: continueMessages,
                  temperature,
                  stream: true,
                  max_tokens: 2000,
                  frequency_penalty: 0.5,
                  presence_penalty: 0.3,
                }),
              });

              if (continueResponse.ok && continueResponse.body) {
                const continueReader = continueResponse.body.getReader();
                await processStream(continueReader, controller, false);
              }
            } catch (e) {
              console.error('Error processing tool call:', e);
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Error al procesar la solicitud' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
