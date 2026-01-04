'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Settings {
  id: string;
  selectedModel: string;
  selectedModels: string[];
  trainingPlanModel: string | null;
  updatedAt: string;
}

interface StravaStatus {
  connected: boolean;
  athlete?: {
    id: string;
    name: string;
    profile: string;
  };
}

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(['openai/gpt-4o']);
  const [trainingPlanModel, setTrainingPlanModel] = useState<string>('openai/gpt-4o');
  const [filterProvider, setFilterProvider] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  // Strava
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [stravaLoading, setStravaLoading] = useState(true);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number } | null>(null);

  useEffect(() => {
    loadSettings();
    loadModels();
    loadStravaStatus();

    // Verificar resultado de OAuth
    const stravaResult = searchParams.get('strava');
    if (stravaResult === 'success') {
      setMessage({ type: 'success', text: 'Strava conectado correctamente' });
      loadStravaStatus();
    } else if (stravaResult === 'error') {
      setMessage({ type: 'error', text: 'Error al conectar con Strava' });
    }
  }, [searchParams]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSelectedModels(data.selectedModels || ['openai/gpt-4o']);
        setTrainingPlanModel(data.trainingPlanModel || 'openai/gpt-4o');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.data) {
        const chatModels = data.data.filter((m: OpenRouterModel) => {
          const modality = m.architecture?.modality || '';
          const inputModalities = m.architecture?.input_modalities || [];
          return modality.includes('text') || inputModalities.includes('text');
        });
        setAllModels(chatModels);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadStravaStatus = async () => {
    try {
      const res = await fetch('/api/strava/status');
      if (res.ok) {
        const data = await res.json();
        setStravaStatus(data);
      }
    } catch (error) {
      console.error('Error loading Strava status:', error);
    } finally {
      setStravaLoading(false);
    }
  };

  const connectStrava = () => {
    window.location.href = '/api/strava/auth';
  };

  const disconnectStrava = async () => {
    if (!confirm('Desconectar tu cuenta de Strava?')) return;
    try {
      const res = await fetch('/api/strava/status', { method: 'DELETE' });
      if (res.ok) {
        setStravaStatus({ connected: false });
        setMessage({ type: 'success', text: 'Strava desconectado' });
        setSyncResult(null);
      }
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      setMessage({ type: 'error', text: 'Error al desconectar' });
    }
  };

  const syncStrava = async () => {
    setStravaSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ imported: data.imported, skipped: data.skipped });
        setMessage({ type: 'success', text: `${data.imported} actividades importadas` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al sincronizar' });
      }
    } catch (error) {
      console.error('Error syncing Strava:', error);
      setMessage({ type: 'error', text: 'Error al sincronizar' });
    } finally {
      setStravaSyncing(false);
    }
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== modelId);
      }
      return [...prev, modelId];
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedModels,
          selectedModel: selectedModels[0],
          trainingPlanModel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setMessage({ type: 'success', text: 'Configuracion guardada' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Error al guardar' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const providers = useMemo(() => {
    const providerSet = new Set<string>();
    allModels.forEach(m => {
      const provider = m.id.split('/')[0];
      providerSet.add(provider);
    });
    return Array.from(providerSet).sort();
  }, [allModels]);

  const filteredModels = useMemo(() => {
    return allModels.filter(m => {
      const provider = m.id.split('/')[0];
      const matchesProvider = !filterProvider || provider === filterProvider;
      const matchesSearch = !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase());
      const isFree = parseFloat(m.pricing.prompt) === 0;
      const matchesFree = !showFreeOnly || isFree;
      return matchesProvider && matchesSearch && matchesFree;
    });
  }, [allModels, filterProvider, searchQuery, showFreeOnly]);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return 'Gratis';
    return `$${(num * 1000000).toFixed(2)}/1M`;
  };

  const formatContextLength = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
    if (length >= 1000) return `${Math.round(length / 1000)}K`;
    return length.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Configuracion</h1>
        </div>
        <p className="text-sm text-zinc-500">Personaliza tu experiencia</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Strava */}
      <div className="mb-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-800/50">
          <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
            </svg>
            Strava
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Sincroniza tus entrenamientos automaticamente
          </p>
        </div>
        <div className="p-4">
          {stravaLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stravaStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                {stravaStatus.athlete?.profile && (
                  <img
                    src={stravaStatus.athlete.profile}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-100">
                    {stravaStatus.athlete?.name || 'Atleta'}
                  </p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    Conectado
                  </p>
                </div>
                <button
                  onClick={disconnectStrava}
                  className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Desconectar
                </button>
              </div>

              <button
                onClick={syncStrava}
                disabled={stravaSyncing}
                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {stravaSyncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Sincronizar actividades
                  </>
                )}
              </button>

              {syncResult && (
                <div className="p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400 font-mono">
                  <span className="text-zinc-200">{syncResult.imported}</span> importadas,{' '}
                  <span className="text-zinc-200">{syncResult.skipped}</span> ya existian
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-zinc-500 text-sm mb-4">
                Conecta tu cuenta de Strava para importar actividades
              </p>
              <button
                onClick={connectStrava}
                className="px-6 py-3 bg-[#FC4C02] hover:bg-[#e04400] text-white rounded-lg text-sm font-medium flex items-center gap-2 mx-auto transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                </svg>
                Conectar con Strava
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modelo para Plan de Entrenamiento */}
      <div className="mb-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-800/50">
          <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
            Modelo Plan de Entrenamiento
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Modelo IA para generar planes de entrenamiento personalizados
          </p>
        </div>
        <div className="p-4">
          {loadingModels ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={trainingPlanModel}
                onChange={(e) => setTrainingPlanModel(e.target.value)}
                className="w-full px-4 py-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              >
                {allModels.slice(0, 100).map((model) => {
                  const isFree = parseFloat(model.pricing.prompt) === 0;
                  return (
                    <option key={model.id} value={model.id}>
                      {model.name} {isFree ? '(Gratis)' : `($${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/1M)`}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-zinc-500">
                Modelo actual: <span className="text-emerald-400 font-mono">{trainingPlanModel}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modelos seleccionados */}
      {selectedModels.length > 0 && (
        <div className="mb-6 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <p className="text-xs font-medium text-emerald-400 mb-2 uppercase tracking-wider">
            {selectedModels.length} modelo(s) seleccionado(s):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedModels.map(modelId => {
              const model = allModels.find(m => m.id === modelId);
              return (
                <span
                  key={modelId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs"
                >
                  {model?.name || modelId.split('/').pop()}
                  <button
                    onClick={() => toggleModel(modelId)}
                    className="ml-1 hover:text-red-400"
                    disabled={selectedModels.length === 1}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Modelos IA */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-800/50">
          <h2 className="text-sm font-light text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Modelos IA
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {loadingModels ? 'Cargando...' : `${allModels.length} modelos disponibles`}
          </p>
        </div>

        <div className="p-4">
          {/* Buscador */}
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar modelo..."
                className="w-full pl-10 pr-4 py-2.5 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFreeOnly(!showFreeOnly)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors uppercase tracking-wider ${
                showFreeOnly
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
              }`}
            >
              Solo gratis
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => setFilterProvider(null)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filterProvider === null
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
              }`}
            >
              Todos
            </button>
            {providers.slice(0, 10).map((provider) => (
              <button
                key={provider}
                onClick={() => setFilterProvider(provider)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filterProvider === provider
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
                }`}
              >
                {provider}
              </button>
            ))}
          </div>

          {/* Lista de modelos */}
          {loadingModels ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 mb-2 font-mono">
                {filteredModels.length} modelos
              </p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredModels.map((model) => {
                  const provider = model.id.split('/')[0];
                  const isFree = parseFloat(model.pricing.prompt) === 0;
                  const isSelected = selectedModels.includes(model.id);
                  return (
                    <div
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleModel(model.id)}
                        className="w-4 h-4 mt-0.5 text-emerald-600 rounded bg-zinc-700 border-zinc-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-zinc-100">{model.name}</p>
                          <span className="px-1.5 py-0.5 text-xs rounded bg-zinc-700 text-zinc-400">
                            {provider}
                          </span>
                          {isFree && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400">
                              Gratis
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5 font-mono truncate">{model.id}</p>
                        {model.description && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{model.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500 font-mono">
                          <span>{formatContextLength(model.context_length)} ctx</span>
                          <span>{formatPrice(model.pricing.prompt)}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800/50 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving || selectedModels.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Guardar ({selectedModels.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-300">Seleccion multiple</p>
            <p className="text-xs text-blue-400/70 mt-1">
              Puedes seleccionar varios modelos y cambiar entre ellos en el chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
