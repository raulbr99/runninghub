'use client';

import { useState, useEffect } from 'react';

interface Settings {
  id: string;
  selectedModel: string;
  updatedAt: string;
}

const AVAILABLE_MODELS = [
  // OpenAI
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Modelo mas avanzado de OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Version ligera y rapida de GPT-4o' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'GPT-4 optimizado para velocidad' },
  { id: 'openai/o1', name: 'o1', provider: 'OpenAI', description: 'Modelo de razonamiento avanzado' },
  { id: 'openai/o1-mini', name: 'o1 Mini', provider: 'OpenAI', description: 'Version ligera del modelo o1' },
  // Anthropic
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Equilibrio entre capacidad y velocidad' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Modelo mas capaz de Anthropic' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Rapido y eficiente' },
  // Google
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Ultimo modelo de Google, gratis' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google', description: 'Modelo Pro de Google' },
  // Meta
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', description: 'Ultimo Llama de Meta' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta', description: 'Modelo gigante de Meta' },
  // Mistral
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral', description: 'Modelo grande de Mistral' },
  { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B', provider: 'Mistral', description: 'Modelo MoE de Mistral' },
  // DeepSeek
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', description: 'Modelo conversacional de DeepSeek' },
  // Qwen
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen', description: 'Ultimo modelo de Alibaba' },
];

const PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral', 'DeepSeek', 'Qwen'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o');
  const [filterProvider, setFilterProvider] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSelectedModel(data.selectedModel || 'openai/gpt-4o');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModel }),
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

  const filteredModels = filterProvider
    ? AVAILABLE_MODELS.filter(m => m.provider === filterProvider)
    : AVAILABLE_MODELS;

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

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>&#129302;</span> Modelo de IA para el Coach
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Selecciona el modelo de lenguaje que usara tu coach
          </p>
        </div>

        <div className="p-4">
          {/* Filtro por proveedor */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por proveedor:</p>
            <div className="flex flex-wrap gap-2">
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
              {PROVIDERS.map((provider) => (
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
          </div>

          {/* Lista de modelos */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredModels.map((model) => (
              <label
                key={model.id}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                  selectedModel === model.id
                    ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">{model.name}</p>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                      {model.provider}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{model.description}</p>
                </div>
                {selectedModel === model.id && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            ))}
          </div>

          {/* Modelo seleccionado */}
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Modelo seleccionado: <span className="font-mono font-medium text-gray-900 dark:text-white">{selectedModel}</span>
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
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
                Guardar
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
            <p className="font-medium text-blue-900 dark:text-blue-200">Sobre los modelos</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Cada modelo tiene diferentes capacidades y costos. Los modelos mas grandes suelen ser mas precisos pero mas lentos y caros.
              Puedes cambiar el modelo en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
