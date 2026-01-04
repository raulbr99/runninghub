import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';

interface EditRequest {
  plan: {
    planName: string;
    totalWeeks: number;
    weeklyVolume: number[];
    phases: { name: string; weeks: string; focus: string }[];
    events: {
      date: string;
      type: string;
      title: string;
      distance?: number | null;
      duration: number;
      notes: string;
    }[];
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { plan, message }: EditRequest = await request.json();

    if (!plan || !message) {
      return new Response(JSON.stringify({ error: 'Plan y mensaje son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener modelo configurado
    const settings = await db.select().from(appSettings).limit(1);
    const modelToUse = settings[0]?.trainingPlanModel || 'openai/gpt-4o';

    const systemPrompt = `Eres un entrenador de running profesional. El usuario tiene un plan de entrenamiento generado y quiere hacer modificaciones.

REGLAS CRITICAS DE FORMATO:
1. Responde SOLO con JSON puro, sin bloques de codigo markdown
2. El JSON debe ser valido y parseable directamente
3. Devuelve el plan COMPLETO modificado, no solo los cambios

Tu respuesta debe ser el plan completo actualizado con los cambios solicitados.`;

    const userPrompt = `PLAN ACTUAL:
${JSON.stringify(plan, null, 2)}

SOLICITUD DEL USUARIO:
${message}

Devuelve el plan COMPLETO con las modificaciones aplicadas. Mantén la misma estructura JSON.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'RunningHub Training Plan Edit',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 32000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'training_plan',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                planName: { type: 'string' },
                totalWeeks: { type: 'number' },
                weeklyVolume: {
                  type: 'array',
                  items: { type: 'number' }
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
                      date: { type: 'string' },
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
      return new Response(JSON.stringify({ error: 'Error al editar el plan' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    console.log('Model used:', modelToUse);
    console.log('Finish reason:', result.choices?.[0]?.finish_reason);
    console.log('Usage:', JSON.stringify(result.usage));
    const planContent = result.choices?.[0]?.message?.content;

    if (!planContent) {
      return new Response(JSON.stringify({ error: 'No se pudo editar el plan' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      let cleanContent = planContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const updatedPlan = JSON.parse(cleanContent);
      return new Response(JSON.stringify(updatedPlan), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (parseError) {
      console.error('Error parsing edited plan JSON:', planContent);
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
    console.error('Training plan edit API error:', error);
    return new Response(JSON.stringify({ error: 'Error al procesar la solicitud' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
