'use client';

import { useState } from 'react';

type ExportType = 'workouts' | 'weight' | 'profile' | 'all';
type ExportFormat = 'json' | 'csv';

export default function ExportPage() {
  const [exportType, setExportType] = useState<ExportType>('workouts');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?type=${exportType}&format=${exportFormat}`);

      if (exportFormat === 'csv' && exportType !== 'all') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?type=${exportType}&format=json`);
      const data = await res.json();
      setPreview(JSON.stringify(data, null, 2).slice(0, 2000) + '...');
    } catch (error) {
      console.error('Error previewing:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportOptions: { id: ExportType; label: string; description: string }[] = [
    { id: 'workouts', label: 'Entrenamientos', description: 'Todos tus entrenamientos completados' },
    { id: 'weight', label: 'Peso', description: 'Historial de peso' },
    { id: 'profile', label: 'Perfil', description: 'Datos de tu perfil' },
    { id: 'all', label: 'Todo', description: 'Exportar todos los datos' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">Exportar Datos</h1>
        <p className="text-sm text-zinc-500">
          Descarga tus datos en formato JSON o CSV para backup o analisis externo
        </p>
      </div>

      <div className="space-y-6">
        {/* Tipo de datos */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Que quieres exportar?
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {exportOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setExportType(opt.id)}
                className={`p-4 rounded-lg text-left transition-colors ${
                  exportType === opt.id
                    ? 'bg-emerald-600/20 border border-emerald-500/30'
                    : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                }`}
              >
                <p className="text-sm font-medium text-zinc-200">{opt.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Formato */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
            Formato
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => setExportFormat('json')}
              className={`flex-1 p-4 rounded-lg text-left transition-colors ${
                exportFormat === 'json'
                  ? 'bg-emerald-600/20 border border-emerald-500/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <p className="text-sm font-medium text-zinc-200">JSON</p>
              <p className="text-xs text-zinc-500 mt-1">Formato estructurado, ideal para backups</p>
            </button>
            <button
              onClick={() => setExportFormat('csv')}
              disabled={exportType === 'all'}
              className={`flex-1 p-4 rounded-lg text-left transition-colors ${
                exportFormat === 'csv' && exportType !== 'all'
                  ? 'bg-emerald-600/20 border border-emerald-500/30'
                  : exportType === 'all'
                    ? 'bg-zinc-800/30 border border-transparent opacity-50 cursor-not-allowed'
                    : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <p className="text-sm font-medium text-zinc-200">CSV</p>
              <p className="text-xs text-zinc-500 mt-1">
                {exportType === 'all' ? 'No disponible para "Todo"' : 'Para Excel/Google Sheets'}
              </p>
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Vista previa
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Descargar {exportFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                Vista previa
              </h2>
              <button onClick={() => setPreview(null)} className="text-xs text-zinc-500 hover:text-zinc-300">
                Cerrar
              </button>
            </div>
            <pre className="text-xs text-zinc-400 overflow-x-auto bg-zinc-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {preview}
            </pre>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            <strong>Nota:</strong> Los archivos exportados contienen tus datos personales. Guardalos
            en un lugar seguro.
          </p>
        </div>
      </div>
    </div>
  );
}
