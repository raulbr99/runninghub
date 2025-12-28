'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Settings {
  id: string;
  selectedModel: string;
  selectedModels: string[];
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
        if (prev.length === 1) return prev; // Keep at least one
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setMessage({ type: 'success', text: `${selectedModels.length} modelo(s) guardado(s)` });
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">&#9881;</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Configuracion</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Personaliza tu experiencia en RunningHub</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Strava */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
            </svg>
            Strava
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sincroniza tus entrenamientos automaticamente
          </p>
        </div>
        <div className="p-4">
          {stravaLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stravaStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                {stravaStatus.athlete?.profile && (
                  <img
                    src={stravaStatus.athlete.profile}
                    alt="Profile"
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {stravaStatus.athlete?.name || 'Atleta'}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Conectado
                  </p>
                </div>
                <button
                  onClick={disconnectStrava}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Desconectar
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={syncStrava}
                  disabled={stravaSyncing}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {stravaSyncing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sincronizar actividades
                    </>
                  )}
                </button>
              </div>

              {syncResult && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{syncResult.imported}</span> importadas,{' '}
                  <span className="font-medium">{syncResult.skipped}</span> ya existian
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Conecta tu cuenta de Strava para importar tus entrenamientos automaticamente
              </p>
              <button
                onClick={connectStrava}
                className="px-6 py-3 bg-[#FC4C02] hover:bg-[#e04400] text-white rounded-xl font-medium flex items-center gap-2 mx-auto transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                </svg>
                Conectar con Strava
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modelos seleccionados */}
      {selectedModels.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            {selectedModels.length} modelo(s) seleccionado(s) para el chat:
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedModels.map(modelId => {
              const model = allModels.find(m => m.id === modelId);
              return (
                <span
                  key={modelId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-lg text-sm"
                >
                  {model?.name || modelId.split('/').pop()}
                  <button
                    onClick={() => toggleModel(modelId)}
                    className="ml-1 hover:text-red-500"
                    disabled={selectedModels.length === 1}
                  >
                    &#10005;
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>&#129302;</span> Modelos de IA para el Coach
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {loadingModels ? 'Cargando modelos...' : `Selecciona los modelos que quieres usar (${allModels.length} disponibles)`}
          </p>
        </div>

        <div className="p-4">
          {/* Buscador */}
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar modelo..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFreeOnly(!showFreeOnly)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showFreeOnly
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Solo gratis
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={() => setFilterProvider(null)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterProvider === null
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            {providers.slice(0, 10).map((provider) => (
              <button
                key={provider}
                onClick={() => setFilterProvider(provider)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterProvider === provider
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {provider}
              </button>
            ))}
          </div>

          {/* Lista de modelos */}
          {loadingModels ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Mostrando {filteredModels.length} modelos
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
                      className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleModel(model.id)}
                        className="w-5 h-5 mt-1 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 dark:text-white">{model.name}</p>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                            {provider}
                          </span>
                          {isFree && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                              Gratis
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{model.id}</p>
                        {model.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{model.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span title="Contexto">&#128196; {formatContextLength(model.context_length)}</span>
                          <span title="Precio input">&#8593; {formatPrice(model.pricing.prompt)}</span>
                          <span title="Precio output">&#8595; {formatPrice(model.pricing.completion)}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving || selectedModels.length === 0}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar ({selectedModels.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <span className="text-xl">&#128161;</span>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">Seleccion multiple</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Puedes seleccionar varios modelos y cambiar entre ellos en el chat usando el dropdown.
              Los modelos gratuitos tienen limites de uso.
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
