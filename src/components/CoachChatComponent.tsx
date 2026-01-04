'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // base64 image
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
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  bodyFat: number | null;
  muscleMass: number | null;
}

interface CalendarEvent {
  id: string;
  date: string;
  category: string;
  type: string;
  title: string | null;
  time: string | null;
  duration: number | null;
  distance: number | null;
  completed: number;
}

const buildSystemPrompt = (profile: RunnerProfile | null, latestWeight: WeightEntry | null, calendarEvents: CalendarEvent[] = []) => {
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

IMPORTANTE: Antes de crear un entrenamiento, revisa los eventos existentes en el calendario para evitar duplicados o conflictos de horario.

Usa estas herramientas proactivamente. Por ejemplo:
- Si dicen "peso 75kg", usa log_weight
- Si preguntan "que entrenos tengo", usa get_running_events
- Si dicen "ponme un rodaje de 10km el lunes", usa create_running_event`;

  if (profile || latestWeight) {
    const profileInfo: string[] = [];
    if (profile?.name) profileInfo.push(`Nombre: ${profile.name}`);
    if (profile?.age) profileInfo.push(`Edad: ${profile.age} anos`);

    // Usar el peso del historial si existe, sino el del perfil
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

    if (profileInfo.length > 0) {
      basePrompt += `\n\n--- PERFIL DEL USUARIO ---\n${profileInfo.join('\n')}\n--- FIN PERFIL ---`;
    }
  }

  // Añadir eventos del calendario al contexto
  if (calendarEvents.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const futureEvents = calendarEvents.filter(e => e.date >= today).slice(0, 30);
    const pastEvents = calendarEvents.filter(e => e.date < today).slice(-10);

    if (futureEvents.length > 0 || pastEvents.length > 0) {
      basePrompt += `\n\n--- CALENDARIO DEL USUARIO (eventos existentes) ---`;
      basePrompt += `\nFecha actual: ${today}`;

      if (futureEvents.length > 0) {
        basePrompt += `\n\nPROXIMOS EVENTOS:`;
        for (const event of futureEvents) {
          const info = [`${event.date}: ${event.type}`];
          if (event.title) info.push(`"${event.title}"`);
          if (event.distance) info.push(`${event.distance}km`);
          if (event.duration) info.push(`${event.duration}min`);
          if (event.time) info.push(`a las ${event.time}`);
          info.push(event.completed ? '(completado)' : '(pendiente)');
          basePrompt += `\n- ${info.join(' ')}`;
        }
      }

      if (pastEvents.length > 0) {
        basePrompt += `\n\nULTIMOS ENTRENAMIENTOS:`;
        for (const event of pastEvents) {
          const info = [`${event.date}: ${event.type}`];
          if (event.title) info.push(`"${event.title}"`);
          if (event.distance) info.push(`${event.distance}km`);
          if (event.duration) info.push(`${event.duration}min`);
          info.push(event.completed ? '(completado)' : '(no completado)');
          basePrompt += `\n- ${info.join(' ')}`;
        }
      }

      basePrompt += `\n--- FIN CALENDARIO ---`;
    }
  }

  return basePrompt;
};

interface Props {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export default function CoachChatComponent({ conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [model, setModel] = useState('openai/gpt-4o');
  const [availableModels, setAvailableModels] = useState<string[]>(['openai/gpt-4o']);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
    loadProfile();
    loadSettings();
    loadLatestWeight();
    loadCalendarEvents();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const models = data.selectedModels || ['openai/gpt-4o'];
        setAvailableModels(models);
        if (data.selectedModel && models.includes(data.selectedModel)) {
          setModel(data.selectedModel);
        } else if (models.length > 0) {
          setModel(models[0]);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    if (conversationId) loadConversation(conversationId);
  }, [conversationId]);

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

  const loadCalendarEvents = async () => {
    try {
      // Cargar eventos de los ultimos 30 dias y proximos 60 dias
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 60);

      const res = await fetch(`/api/running-events?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCalendarEvents(data);
        }
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })));
        setModel(data.model);
        setCurrentConversationId(id);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const createConversation = async (firstMessage: string) => {
    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, model }),
      });
      const data = await res.json();
      setCurrentConversationId(data.id);
      onConversationCreated?.(data.id);
      loadConversations();
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    try {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Eliminar esta conversacion?')) return;
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      setConversations(conversations.filter(c => c.id !== id));
      if (currentConversationId === id) clearChat();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pastedImage) || loading) return;

    const userMessage: Message = { role: 'user', content: input || 'Analiza esta imagen', image: pastedImage || undefined };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentImage = pastedImage;
    setInput('');
    setPastedImage(null);
    setLoading(true);

    let convId = currentConversationId;
    if (!convId) convId = await createConversation(input || 'Imagen adjunta');
    if (convId) await saveMessage(convId, 'user', input || 'Imagen adjunta');

    try {
      const systemPrompt = buildSystemPrompt(profile, latestWeight, calendarEvents);

      // Build messages with image support
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages.map(msg => {
          if (msg.image) {
            return {
              role: msg.role,
              content: [
                { type: 'text', text: msg.content || 'Analiza esta imagen' },
                { type: 'image_url', image_url: { url: msg.image } }
              ]
            };
          }
          return { role: msg.role, content: msg.content };
        })
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model, temperature: 0.7, hasImage: !!currentImage }),
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
            if (parsed.eventCreated) loadCalendarEvents();
          } catch { /* ignore */ }
        }
      }

      if (convId && assistantContent) {
        await saveMessage(convId, 'assistant', assistantContent);
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
    setCurrentConversationId(null);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setPastedImage(base64);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const removeImage = () => {
    setPastedImage(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPastedImage(base64);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const quickPrompts = [
    { text: 'Plan de entrenamiento', prompt: 'Quiero un plan de entrenamiento para ' },
    { text: 'Nutricion running', prompt: 'Que debo comer antes y despues de correr?' },
    { text: 'Control de peso', prompt: 'Quiero bajar de peso, que me recomiendas?' },
    { text: 'Recuperacion', prompt: 'Como puedo mejorar mi recuperacion entre entrenos?' },
  ];

  const hasProfileData = profile && (profile.name || profile.currentGoal || profile.pb5k);

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Sidebar historial */}
      <div className={`${showHistory ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-zinc-800/50 bg-zinc-900 flex flex-col`}>
        <div className="p-4 border-b border-zinc-800/50">
          <h3 className="font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider text-sm">
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Historial
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-4">Sin conversaciones</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    currentConversationId === conv.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'hover:bg-zinc-800/50 text-zinc-400'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{conv.title}</p>
                    <p className="text-xs text-zinc-600">{formatDate(conv.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar perfil */}
      <div className={`${showProfile ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-zinc-800/50 bg-zinc-900 flex flex-col`}>
        <div className="p-4 border-b border-zinc-800/50">
          <h3 className="font-light text-zinc-100 flex items-center gap-2 uppercase tracking-wider text-sm">
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Mi Perfil
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {profile ? (
            <div className="space-y-5 text-sm">
              <div>
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Datos personales</h4>
                <div className="space-y-1.5 text-zinc-300">
                  <p><span className="text-zinc-500">Nombre:</span> {profile.name || '-'}</p>
                  <p><span className="text-zinc-500">Edad:</span> {profile.age ? `${profile.age} anos` : '-'}</p>
                  <p><span className="text-zinc-500">Peso:</span> {profile.weight ? `${profile.weight} kg` : '-'}</p>
                  <p><span className="text-zinc-500">Altura:</span> {profile.height ? `${profile.height} cm` : '-'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Marcas personales</h4>
                <div className="space-y-1.5 text-zinc-300">
                  <p><span className="text-zinc-500">5K:</span> <span className="font-mono">{profile.pb5k || '-'}</span></p>
                  <p><span className="text-zinc-500">10K:</span> <span className="font-mono">{profile.pb10k || '-'}</span></p>
                  <p><span className="text-zinc-500">Media:</span> <span className="font-mono">{profile.pbHalfMarathon || '-'}</span></p>
                  <p><span className="text-zinc-500">Maraton:</span> <span className="font-mono">{profile.pbMarathon || '-'}</span></p>
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Objetivos</h4>
                <div className="space-y-1.5 text-zinc-300">
                  <p><span className="text-zinc-500">Objetivo:</span> {profile.currentGoal || '-'}</p>
                  <p><span className="text-zinc-500">Carrera:</span> {profile.targetRace || '-'}</p>
                </div>
              </div>
              {(profile.injuries || profile.healthNotes) && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Salud</h4>
                  <div className="space-y-1.5 text-zinc-300">
                    {profile.injuries && <p><span className="text-zinc-500">Lesiones:</span> {profile.injuries}</p>}
                    {profile.healthNotes && <p><span className="text-zinc-500">Notas:</span> {profile.healthNotes}</p>}
                  </div>
                </div>
              )}
              <p className="text-xs text-zinc-600 pt-2">
                Perfil sincronizado automaticamente con el chat.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-4">Cargando perfil...</p>
          )}
        </div>
      </div>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-4">
              <div className="w-16 h-16 mb-6 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <p className="text-xl font-light text-zinc-100 mb-2 tracking-wide">COACH</p>
              <p className="text-sm text-center mb-6 max-w-md text-zinc-500">
                Running, nutricion y control de peso. Pregunta lo que necesites.
              </p>
              {hasProfileData && (
                <div className="mb-6 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Perfil sincronizado: {profile?.name || 'Corredor'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {quickPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(item.prompt)}
                    className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all text-left group"
                  >
                    <span className="text-sm text-zinc-400 group-hover:text-zinc-200">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 px-4 space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse max-w-[80%]' : 'w-full'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </div>
                    )}
                    <div className={`text-sm ${
                      msg.role === 'user'
                        ? 'rounded-xl px-4 py-3 bg-emerald-600 text-white'
                        : 'flex-1 text-zinc-200 pt-1'
                    }`}>
                      {msg.role === 'user' ? (
                        <div>
                          {msg.image && (
                            <img src={msg.image} alt="Attached" className="max-h-48 rounded-lg mb-2" />
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ) : msg.content ? (
                        <div className="prose prose-sm prose-invert prose-emerald max-w-none prose-p:text-zinc-300 prose-headings:text-zinc-100 prose-strong:text-zinc-100 prose-code:text-emerald-400 prose-li:text-zinc-300">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      ) : (
                        <div className="flex gap-1.5 py-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-800/50 bg-zinc-900/80 backdrop-blur p-3 sm:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 sm:gap-3 items-center">
              <button
                onClick={() => { setShowHistory(!showHistory); setShowProfile(false); }}
                className={`p-2.5 rounded-lg transition-all ${
                  showHistory
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600'
                }`}
                title="Historial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </button>

              <button
                onClick={() => { setShowProfile(!showProfile); setShowHistory(false); }}
                className={`p-2.5 rounded-lg transition-all ${
                  showProfile
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600'
                }`}
                title="Mi Perfil"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-2 px-3 py-2.5 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-sm text-zinc-300 hover:border-zinc-600 transition-all"
                  title="Cambiar modelo"
                >
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  <span className="hidden sm:inline max-w-[100px] truncate text-zinc-400">{model.split('/').pop()}</span>
                  <svg className={`w-4 h-4 text-zinc-600 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {showModelDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowModelDropdown(false)} />
                    <div className="absolute bottom-full mb-2 left-0 w-64 max-h-80 overflow-y-auto bg-zinc-900 rounded-lg border border-zinc-800 z-20">
                      <div className="p-2">
                        <div className="flex items-center justify-between px-3 py-2">
                          <p className="text-xs text-zinc-500 uppercase tracking-wider">Modelos</p>
                          <a href="/settings" className="text-xs text-emerald-500 hover:text-emerald-400">Editar</a>
                        </div>
                        {availableModels.map((modelId) => {
                          const isSelected = model === modelId;
                          const provider = modelId.split('/')[0];
                          const modelName = modelId.split('/').pop();
                          return (
                            <button
                              key={modelId}
                              onClick={() => { setModel(modelId); setShowModelDropdown(false); }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'hover:bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                              }`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{modelName}</p>
                                <p className="text-xs text-zinc-600 truncate">{provider}</p>
                              </div>
                              {isSelected && (
                                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="p-2.5 rounded-lg bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-50"
                title="Adjuntar imagen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </button>

              <div className="flex-1 relative">
                {pastedImage && (
                  <div className="absolute bottom-full mb-2 left-0 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
                    <div className="relative">
                      <img src={pastedImage} alt="Preview" className="max-h-32 max-w-48 rounded object-contain" />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Imagen lista para enviar</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  onPaste={handlePaste}
                  placeholder={pastedImage ? "Añade un mensaje o envia la imagen..." : "Escribe tu pregunta..."}
                  className="w-full p-2.5 sm:p-3 pr-12 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || (!input.trim() && !pastedImage)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>

              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Nueva conversacion"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
