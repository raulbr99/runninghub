'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import MarkdownRenderer from './MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LifestyleInfo {
  occupation?: string;
  workScheduleStart?: string;
  workScheduleEnd?: string;
  personality?: string;
  relationshipStatus?: string;
  lifeNotes?: string;
}

interface RunnerProfile {
  id: string;
  name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  yearsRunning: number | null;
  weeklyKm: number | null;
  pb5k: string | null;
  pb10k: string | null;
  pbHalfMarathon: string | null;
  pbMarathon: string | null;
  currentGoal: string | null;
  targetRace: string | null;
  injuries: string | null;
  healthNotes: string | null;
  additionalInfo: LifestyleInfo | null;
}

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  bodyFat: number | null;
  muscleMass: number | null;
}

interface PageContext {
  page: string;
  data?: Record<string, unknown>;
}

const getPageContext = (pathname: string): PageContext => {
  if (pathname === '/') return { page: 'dashboard', data: { description: 'Panel principal con resumen de entrenamientos, XP, racha y retos' } };
  if (pathname === '/calendar') return { page: 'calendario', data: { description: 'Calendario de entrenamientos' } };
  if (pathname === '/weight') return { page: 'peso', data: { description: 'Registro y seguimiento de peso' } };
  if (pathname === '/nutrition') return { page: 'nutricion', data: { description: 'Registro de comidas y macros' } };
  if (pathname === '/profile') return { page: 'perfil', data: { description: 'Perfil del corredor y logros' } };
  if (pathname === '/reading') return { page: 'biblioteca', data: { description: 'Lista de libros y lectura' } };
  if (pathname === '/habits') return { page: 'habitos', data: { description: 'Habitos personalizables diarios' } };
  if (pathname === '/achievements') return { page: 'logros', data: { description: 'Todos los logros y progreso' } };
  if (pathname === '/settings') return { page: 'ajustes', data: { description: 'Configuracion de la app' } };
  if (pathname.startsWith('/activity/')) return { page: 'actividad', data: { description: 'Detalle de actividad de Strava' } };
  return { page: 'general' };
};

const buildSystemPrompt = (profile: RunnerProfile | null, latestWeight: WeightEntry | null, pageContext: PageContext) => {
  let basePrompt = `Eres un coach integral experto en running, nutricion y salud. Tu conocimiento incluye:

RUNNING:
- Planes de entrenamiento personalizados (5K, 10K, media maraton, maraton, trail)
- Tecnica de carrera y biomecanica
- Prevencion y recuperacion de lesiones
- Estrategias de carrera y pacing

NUTRICION:
- Dietas para deportistas y corredores
- Macronutrientes y timing de comidas
- Suplementacion deportiva
- Hidratacion

SALUD Y PESO:
- Control de peso corporal
- Composicion corporal (grasa, musculo)
- Recuperacion y descanso
- Salud general del deportista

TOOLS DISPONIBLES:
1. save_runner_profile - Guarda informacion del corredor
2. get_running_events - Obtiene entrenamientos del calendario
3. create_running_event - Crea entrenamientos en el calendario
4. log_weight - Registra el peso del usuario
5. get_weight_history - Obtiene historial de peso
6. log_meal - Registra comidas
7. get_nutrition_summary - Obtiene resumen nutricional del dia
8. set_nutrition_goals - Establece objetivos nutricionales

Usa estas herramientas proactivamente. Por ejemplo:
- Si dicen "peso 75kg", usa log_weight
- Si dicen "desayune huevos con tostadas", usa log_meal
- Si preguntan "que entrenos tengo", usa get_running_events
- Si dicen "ponme un rodaje de 10km el lunes", usa create_running_event

CONTEXTO ACTUAL:
- El usuario esta en la pagina: ${pageContext.page}
- ${pageContext.data?.description || ''}`;

  if (profile || latestWeight) {
    const profileInfo: string[] = [];
    if (profile?.name) profileInfo.push(`Nombre: ${profile.name}`);
    if (profile?.age) profileInfo.push(`Edad: ${profile.age} anos`);

    if (latestWeight) {
      profileInfo.push(`Peso actual: ${latestWeight.weight} kg (registrado el ${latestWeight.date})`);
      if (latestWeight.bodyFat) profileInfo.push(`Grasa corporal: ${latestWeight.bodyFat}%`);
      if (latestWeight.muscleMass) profileInfo.push(`Masa muscular: ${latestWeight.muscleMass} kg`);
    } else if (profile?.weight) {
      profileInfo.push(`Peso: ${profile.weight} kg`);
    }

    if (profile?.height) profileInfo.push(`Altura: ${profile.height} cm`);
    if (profile?.yearsRunning) profileInfo.push(`Experiencia: ${profile.yearsRunning} anos corriendo`);
    if (profile?.weeklyKm) profileInfo.push(`Volumen semanal: ${profile.weeklyKm} km`);

    const pbs: string[] = [];
    if (profile?.pb5k) pbs.push(`5K: ${profile.pb5k}`);
    if (profile?.pb10k) pbs.push(`10K: ${profile.pb10k}`);
    if (profile?.pbHalfMarathon) pbs.push(`Media: ${profile.pbHalfMarathon}`);
    if (profile?.pbMarathon) pbs.push(`Maraton: ${profile.pbMarathon}`);
    if (pbs.length > 0) profileInfo.push(`Marcas: ${pbs.join(', ')}`);

    if (profile?.currentGoal) profileInfo.push(`Objetivo: ${profile.currentGoal}`);
    if (profile?.targetRace) profileInfo.push(`Carrera objetivo: ${profile.targetRace}`);
    if (profile?.injuries) profileInfo.push(`Lesiones: ${profile.injuries}`);
    if (profile?.healthNotes) profileInfo.push(`Salud: ${profile.healthNotes}`);

    // Estilo de vida
    const lifestyle = profile?.additionalInfo;
    if (lifestyle) {
      if (lifestyle.occupation) profileInfo.push(`Ocupacion: ${lifestyle.occupation}`);
      if (lifestyle.workScheduleStart && lifestyle.workScheduleEnd) {
        profileInfo.push(`Horario laboral: ${lifestyle.workScheduleStart} a ${lifestyle.workScheduleEnd}`);
      }
      if (lifestyle.personality) {
        const personalityMap: Record<string, string> = {
          introvert: 'Introvertido/timido',
          extrovert: 'Extrovertido/social',
          ambivert: 'Ambivertido'
        };
        profileInfo.push(`Personalidad: ${personalityMap[lifestyle.personality] || lifestyle.personality}`);
      }
      if (lifestyle.relationshipStatus) {
        const relationMap: Record<string, string> = {
          single: 'Soltero/a',
          relationship: 'Con pareja',
          married: 'Casado/a',
          complicated: 'Es complicado'
        };
        profileInfo.push(`Estado: ${relationMap[lifestyle.relationshipStatus] || lifestyle.relationshipStatus}`);
      }
      if (lifestyle.lifeNotes) profileInfo.push(`Notas de vida: ${lifestyle.lifeNotes}`);
    }

    if (profileInfo.length > 0) {
      basePrompt += `\n\n--- PERFIL DEL USUARIO ---\n${profileInfo.join('\n')}\n--- FIN PERFIL ---`;
    }
  }

  return basePrompt;
};

export default function ChatPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('openai/gpt-4o');
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // No mostrar en la pagina del coach (ya tiene su propio chat)
  if (pathname === '/coach') return null;

  useEffect(() => {
    // Cargar datos iniciales
    loadProfile();
    loadLatestWeight();
    loadSettings();
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/runner-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadLatestWeight = async () => {
    try {
      const res = await fetch('/api/weight?limit=1');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLatestWeight(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading weight:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.selectedModel) setModel(data.selectedModel);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const context = getPageContext(pathname);
      const systemPrompt = buildSystemPrompt(profile, latestWeight, context);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages.map(msg => ({ role: msg.role, content: msg.content }))
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model, temperature: 0.7 }),
      });

      if (!response.ok) throw new Error('Error en la respuesta');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
            }
            if (parsed.profileSaved) loadProfile();
            if (parsed.weightLogged) loadLatestWeight();
          } catch { /* ignore */ }
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Error al obtener respuesta.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const context = getPageContext(pathname);

  return (
    <>
      {/* Floating button - hidden on mobile when chat is open */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0 max-sm:hidden'
            : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat popup - fullscreen on mobile */}
      <div className={`fixed z-50 transition-all duration-300
        max-sm:inset-0 max-sm:bottom-0 max-sm:right-0
        sm:bottom-24 sm:right-6 sm:w-[450px] sm:max-w-[calc(100vw-3rem)]
        ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full max-sm:rounded-none sm:rounded-2xl sm:h-[600px]">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-500 to-emerald-600 max-sm:pt-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-base">🏃</span>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Coach</p>
                  <p className="text-[10px] text-white/80">En: {context.page}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Limpiar chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                {/* Close button for mobile */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all sm:hidden"
                  title="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Pregunta lo que necesites sobre {context.page}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {context.page === 'dashboard' && (
                    <>
                      <button onClick={() => setInput('Como voy con mis retos?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Como voy con mis retos?</button>
                      <button onClick={() => setInput('Que entreno tengo hoy?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Que entreno tengo hoy?</button>
                    </>
                  )}
                  {context.page === 'calendario' && (
                    <>
                      <button onClick={() => setInput('Ponme un entreno para manana')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Ponme un entreno</button>
                      <button onClick={() => setInput('Que deberia entrenar esta semana?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Plan semanal</button>
                    </>
                  )}
                  {context.page === 'peso' && (
                    <>
                      <button onClick={() => setInput('Como puedo bajar de peso?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Bajar de peso</button>
                      <button onClick={() => setInput('Cual es mi peso ideal?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Peso ideal</button>
                    </>
                  )}
                  {context.page === 'nutricion' && (
                    <>
                      <button onClick={() => setInput('Que deberia comer antes de correr?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Antes de correr</button>
                      <button onClick={() => setInput('Cuantas calorias necesito?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Calorias diarias</button>
                    </>
                  )}
                  {context.page === 'biblioteca' && (
                    <>
                      <button onClick={() => setInput('Recomiendame un libro de running')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Libro de running</button>
                      <button onClick={() => setInput('Libros de mentalidad deportiva')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Mentalidad</button>
                    </>
                  )}
                  {context.page === 'actividad' && (
                    <>
                      <button onClick={() => setInput('Analiza este entrenamiento')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Analizar entreno</button>
                      <button onClick={() => setInput('Como puedo mejorar?')} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">Mejorar</button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-2xl rounded-br-md px-3 py-2'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.content ? (
                      <div className="prose prose-xs prose-gray dark:prose-invert max-w-none text-xs [&>*]:text-xs [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    ) : (
                      <div className="flex gap-1 py-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Escribe tu pregunta..."
                className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
