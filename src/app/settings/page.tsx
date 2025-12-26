'use client';

import { useState, useEffect, useMemo } from 'react';

interface Settings {
  id: string;
  selectedModel: string;
  selectedModels: string[];
  updatedAt: string;
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

export default function SettingsPage() {
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

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

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
