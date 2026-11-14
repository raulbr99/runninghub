'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import {
  EMPTY_FILTERS,
  filterSessions,
  hasActiveFilters,
  listExercises,
  type ExerciseOption,
  type HistoryFilters,
  type Period,
  type StatusFilter,
} from '@/lib/workout-history/analytics';
import { applyMerge, planMerge, type ConflictStrategy } from '@/lib/workout-history/merge';
import {
  clearStoredHistory,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  saveSessions,
  seedHistoryIfNeeded,
  subscribeHistory,
} from '@/lib/workout-history/storage';
import { MAX_IMPORT_BYTES, parseHistoryText } from '@/lib/workout-history/validate';
import type { WorkoutSession } from '@/lib/workout-history/types';
import {
  downloadJsonBackup,
  downloadRawText,
  downloadSessionsCsv,
  formatDate,
  formatNumber,
  generateId,
} from '@/lib/workout-history/format';
import {
  Dialog,
  ICONS,
  Icon,
  buttonDanger,
  buttonPrimary,
  buttonSecondary,
  cardClass,
  inputClass,
  labelClass,
} from './ui';
import SessionForm from './SessionForm';
import ImportDialog, { type ImportPreview } from './ImportDialog';
import HistoryList from './HistoryList';
import OverviewPanel from './OverviewPanel';
import ExercisesPanel from './ExercisesPanel';
import FormatHelp from './FormatHelp';

type Tab = 'resumen' | 'historial' | 'ejercicios';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'historial', label: 'Historial' },
  { id: 'ejercicios', label: 'Ejercicios' },
];

interface Notice {
  kind: 'success' | 'error';
  text: string;
  undo?: WorkoutSession;
}

const NO_SESSIONS: WorkoutSession[] = [];

export default function WorkoutHistoryDashboard() {
  const snapshot = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistoryServerSnapshot);
  const [seedReady, setSeedReady] = useState(false);
  const sessions = snapshot.status === 'ready' ? snapshot.sessions : NO_SESSIONS;

  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<Tab>('resumen');
  const [period, setPeriod] = useState<Period>('week');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [form, setForm] = useState<{ open: boolean; session: WorkoutSession | null }>({ open: false, session: null });
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSession | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const importNonce = useRef(0);

  useEffect(() => {
    let mounted = true;
    void seedHistoryIfNeeded()
      .catch((error) => {
        if (mounted) setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar el historial inicial.' });
      })
      .finally(() => {
        if (mounted) setSeedReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => filterSessions(sessions, filters), [sessions, filters]);
  const exerciseOptions = useMemo(() => listExercises(sessions), [sessions]);
  const focusKey = filters.exercise || null;
  const focusName = exerciseOptions.find((o) => o.key === focusKey)?.name ?? null;
  const filtersActive = hasActiveFilters(filters);

  const persist = (next: WorkoutSession[], text: string, undo?: WorkoutSession): boolean => {
    try {
      saveSessions(next);
      setNotice({ kind: 'success', text, undo });
      return true;
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' });
      return false;
    }
  };

  const handleSave = (session: WorkoutSession) => {
    const exists = sessions.some((s) => s.id === session.id);
    const next = exists ? sessions.map((s) => (s.id === session.id ? session : s)) : [...sessions, session];
    if (persist(next, exists ? `Cambios guardados en «${session.title}».` : `«${session.title}» guardado en este navegador.`)) {
      setForm({ open: false, session: null });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    persist(
      sessions.filter((s) => s.id !== target.id),
      `Eliminado «${target.title}» (${formatDate(target.date)}).`,
      target
    );
    setDeleteTarget(null);
  };

  const handleUndo = (session: WorkoutSession) => {
    if (sessions.some((s) => s.id === session.id)) return;
    persist([...sessions, session], `Restaurado «${session.title}».`);
  };

  const openFilePicker = () => fileInput.current?.click();

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    importNonce.current += 1;
    if (file.size > MAX_IMPORT_BYTES) {
      setPreview({
        nonce: importNonce.current,
        fileName: file.name,
        result: { ok: false, error: `El archivo pesa demasiado (máx. ${MAX_IMPORT_BYTES / 1024 / 1024} MB).` },
        plan: null,
      });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setPreview({
        nonce: importNonce.current,
        fileName: file.name,
        result: { ok: false, error: 'No se pudo leer el archivo.' },
        plan: null,
      });
      return;
    }
    const result = parseHistoryText(text);
    setPreview({
      nonce: importNonce.current,
      fileName: file.name,
      result,
      plan: result.ok ? planMerge(sessions, result.data.sessions) : null,
    });
  };

  const handleImport = (strategy: ConflictStrategy) => {
    if (!preview || !preview.result.ok) return;
    // Se recalcula el plan con los datos actuales por si cambiaron desde la vista previa.
    const plan = planMerge(sessions, preview.result.data.sessions);
    const merged = applyMerge(sessions, plan, strategy, generateId);
    const parts = [`${merged.added} añadidas`];
    if (merged.replaced > 0) parts.push(`${merged.replaced} reemplazadas`);
    if (merged.keptExisting > 0) parts.push(`${merged.keptExisting} en conflicto sin tocar`);
    if (plan.identicalCount > 0) parts.push(`${plan.identicalCount} ya estaban`);
    if (persist(merged.sessions, `Importación completada: ${parts.join(', ')}.`)) {
      setPreview(null);
    }
  };

  const updateFilters = (patch: Partial<HistoryFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="px-4 pt-16 pb-28 sm:px-6 md:pt-6 lg:px-8 lg:pt-8 max-w-7xl mx-auto space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Icon path={ICONS.history} className="w-5 h-5 text-emerald-500" />
            </div>
            <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Historial de entrenos</h1>
          </div>
          <p className="text-sm text-zinc-400">Sesiones completadas, búsqueda y análisis de fuerza y cardio.</p>
        </div>
        {snapshot.status === 'ready' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonPrimary} onClick={() => setForm({ open: true, session: null })}>
              <Icon path={ICONS.plus} /> Añadir
            </button>
            <button type="button" className={buttonSecondary} onClick={openFilePicker}>
              <Icon path={ICONS.upload} /> Importar JSON
            </button>
            <button
              type="button"
              className={buttonSecondary}
              disabled={sessions.length === 0}
              onClick={() => downloadJsonBackup(sessions)}
              title="Descarga una copia completa en JSON para restaurarla después"
            >
              <Icon path={ICONS.download} /> Copia JSON
            </button>
            <button
              type="button"
              className={buttonSecondary}
              disabled={filtered.length === 0}
              onClick={() => downloadSessionsCsv(filtered)}
              title={filtersActive ? 'Exporta solo las sesiones filtradas' : 'Exporta todas las sesiones'}
            >
              <Icon path={ICONS.download} /> CSV{filtersActive ? ' (filtrado)' : ''}
            </button>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFile}
          aria-hidden="true"
          tabIndex={-1}
        />
      </header>

      <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-zinc-300">
        <Icon path={ICONS.lock} className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <span className="text-zinc-100">Historial inicial incluido en este despliegue.</span> Las sesiones base se descargan
          desde el enlace de la web; quien tenga acceso a la URL puede consultarlas. Los cambios que hagas después se guardan
          solo en el almacenamiento local de este navegador y no aparecen en otros dispositivos. Descarga una{' '}
          <span className="text-zinc-100">copia JSON</span> de vez en cuando para conservar tus cambios.
        </p>
      </div>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
            notice.kind === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-zinc-700 bg-zinc-900 text-zinc-200'
          }`}
        >
          <span>{notice.text}</span>
          <span className="flex items-center gap-2">
            {notice.undo && (
              <button
                type="button"
                onClick={() => notice.undo && handleUndo(notice.undo)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                Deshacer
              </button>
            )}
            <button type="button" onClick={() => setNotice(null)} className="p-1 text-zinc-400 hover:text-zinc-200" aria-label="Cerrar aviso">
              <Icon path={ICONS.close} className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {(!seedReady || snapshot.status === 'loading') && (
        <div className="py-16 flex justify-center" aria-label="Cargando">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {snapshot.status === 'error' && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3 text-sm">
          <div className="flex items-start gap-2 text-red-200">
            <Icon path={ICONS.warning} className="w-5 h-5 shrink-0" />
            <p>{snapshot.message}</p>
          </div>
          <p className="text-zinc-300">
            No se ha modificado nada. Descarga el contenido tal cual para conservarlo y, si quieres empezar de cero, borra los
            datos guardados.
          </p>
          <div className="flex flex-wrap gap-2">
            {snapshot.raw && (
              <button type="button" className={buttonSecondary} onClick={() => downloadRawText(snapshot.raw)}>
                <Icon path={ICONS.download} /> Descargar datos sin procesar
              </button>
            )}
            {snapshot.raw && (
              <button type="button" className="px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg" onClick={() => setConfirmReset(true)}>
                Borrar datos guardados…
              </button>
            )}
          </div>
        </div>
      )}

      {snapshot.status === 'ready' && sessions.length === 0 && (
        <EmptyState onImport={openFilePicker} onAdd={() => setForm({ open: true, session: null })} />
      )}

      {snapshot.status === 'ready' && sessions.length > 0 && (
        <>
          <FiltersBar
            filters={filters}
            exerciseOptions={exerciseOptions}
            onChange={updateFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
            active={filtersActive}
            shown={filtered.length}
            total={sessions.length}
          />

          <div role="tablist" aria-label="Secciones del historial" className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-2 text-sm -mb-px border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? 'border-emerald-500 text-zinc-100'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.label}
                {t.id === 'historial' && <span className="ml-1.5 text-xs text-zinc-500">{formatNumber(filtered.length)}</span>}
              </button>
            ))}
          </div>

          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-400 text-center space-y-2">
                <p>Ninguna sesión coincide con los filtros.</p>
                <button type="button" className="text-emerald-400 hover:text-emerald-300" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Quitar filtros
                </button>
              </div>
            ) : tab === 'resumen' ? (
              <OverviewPanel
                sessions={filtered}
                allSessions={sessions}
                focusKey={focusKey}
                focusName={focusName}
                period={period}
                onPeriodChange={setPeriod}
              />
            ) : tab === 'historial' ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    Orden
                    <select
                      value={order}
                      onChange={(e) => setOrder(e.target.value === 'asc' ? 'asc' : 'desc')}
                      className={`${inputClass} py-1 w-auto`}
                    >
                      <option value="desc">Más recientes primero</option>
                      <option value="asc">Más antiguas primero</option>
                    </select>
                  </label>
                </div>
                <HistoryList
                  sessions={filtered}
                  order={order}
                  onEdit={(s) => setForm({ open: true, session: s })}
                  onDelete={(s) => setDeleteTarget(s)}
                />
              </div>
            ) : (
              <ExercisesPanel sessions={filtered} focusKey={focusKey} />
            )}
          </div>

          <FormatHelp />
        </>
      )}

      <SessionForm
        open={form.open}
        initial={form.session}
        allSessions={sessions}
        onCancel={() => setForm({ open: false, session: null })}
        onSave={handleSave}
      />

      <ImportDialog preview={preview} onCancel={() => setPreview(null)} onConfirm={handleImport} />

      <Dialog
        open={deleteTarget !== null}
        size="sm"
        title="Eliminar entrenamiento"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button type="button" className={buttonSecondary} onClick={() => setDeleteTarget(null)} autoFocus>
              Cancelar
            </button>
            <button type="button" className={buttonDanger} onClick={handleDelete}>
              <Icon path={ICONS.trash} /> Sí, eliminar
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-zinc-200">
              ¿Eliminar <span className="font-medium">«{deleteTarget.title}»</span> del {formatDate(deleteTarget.date)}?
            </p>
            <p className="text-zinc-400">
              {deleteTarget.exercises.length > 0 && <>{deleteSummary(deleteTarget)} </>}
              Se borra solo de este navegador. Podrás deshacerlo justo después; si no, solo se recupera desde una copia JSON.
            </p>
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmReset}
        size="sm"
        title="Borrar datos guardados"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <button type="button" className={buttonSecondary} onClick={() => setConfirmReset(false)} autoFocus>
              Cancelar
            </button>
            <button
              type="button"
              className={buttonDanger}
              onClick={() => {
                clearStoredHistory();
                setConfirmReset(false);
                setNotice({ kind: 'success', text: 'Datos locales borrados. Puedes importar una copia JSON.' });
              }}
            >
              Borrar todo
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">
          Se eliminará todo el historial guardado en este navegador. Si no has descargado los datos sin procesar, no se podrán
          recuperar.
        </p>
      </Dialog>
    </div>
  );
}

function deleteSummary(session: WorkoutSession): string {
  const exercises = session.exercises.length;
  const sets = session.exercises.reduce((acc, e) => acc + e.sets.length, 0);
  return `Incluye ${exercises} ${exercises === 1 ? 'ejercicio' : 'ejercicios'} y ${sets} ${sets === 1 ? 'serie' : 'series'}.`;
}

function EmptyState({ onImport, onAdd }: { onImport: () => void; onAdd: () => void }) {
  return (
    <div className={`${cardClass} p-6 sm:p-8 space-y-5`}>
      <div className="max-w-xl space-y-2">
        <h2 className="text-lg text-zinc-100">Aún no hay entrenamientos en este navegador</h2>
        <p className="text-sm text-zinc-400">
          Importa un archivo JSON con tus sesiones (fuerza y cardio) o añade la primera a mano. Cuando haya datos verás aquí el
          resumen, el historial con búsqueda y filtros, y los récords y la progresión de cada ejercicio.
        </p>
      </div>
      <ol className="text-sm text-zinc-300 space-y-1 list-decimal pl-5">
        <li>Prepara un archivo con el formato de abajo (o una copia exportada desde esta página).</li>
        <li>Pulsa «Importar JSON», revisa el resumen y confirma.</li>
        <li>Guarda de vez en cuando una «Copia JSON»: los datos solo viven en este navegador.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonPrimary} onClick={onImport}>
          <Icon path={ICONS.upload} /> Importar JSON
        </button>
        <button type="button" className={buttonSecondary} onClick={onAdd}>
          <Icon path={ICONS.plus} /> Añadir entrenamiento
        </button>
      </div>
      <FormatHelp defaultOpen />
    </div>
  );
}

interface FiltersBarProps {
  filters: HistoryFilters;
  exerciseOptions: ExerciseOption[];
  onChange: (patch: Partial<HistoryFilters>) => void;
  onReset: () => void;
  active: boolean;
  shown: number;
  total: number;
}

function FiltersBar({ filters, exerciseOptions, onChange, onReset, active, shown, total }: FiltersBarProps) {
  return (
    <section aria-label="Filtros" className={`${cardClass} p-3 sm:p-4 space-y-3`}>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6 xl:grid-cols-12">
        <div className="col-span-2 md:col-span-6 xl:col-span-4">
          <label htmlFor="flt-query" className={labelClass}>
            Buscar
          </label>
          <div className="relative">
            <Icon path={ICONS.search} className="w-4 h-4 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="flt-query"
              type="search"
              value={filters.query}
              onChange={(e) => onChange({ query: e.target.value })}
              className={`${inputClass} pl-8`}
              placeholder="Título, ejercicio, nota, grupo…"
            />
          </div>
        </div>
        <div className="col-span-2 md:col-span-3 xl:col-span-3">
          <span id="flt-type-label" className={labelClass}>
            Tipo
          </span>
          <div
            role="radiogroup"
            aria-labelledby="flt-type-label"
            className="grid grid-cols-3 gap-0.5 p-0.5 rounded-lg bg-zinc-800/50 border border-zinc-700/60"
          >
            {(
              [
                ['all', 'Todo'],
                ['strength', 'Fuerza'],
                ['cardio', 'Cardio'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={filters.type === value}
                onClick={() => onChange({ type: value })}
                className={`py-1.5 rounded-md text-xs transition-colors ${
                  filters.type === value ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-1 md:col-span-3 xl:col-span-3">
          <label htmlFor="flt-exercise" className={labelClass}>
            Ejercicio
          </label>
          <select
            id="flt-exercise"
            value={filters.exercise}
            onChange={(e) => onChange({ exercise: e.target.value })}
            className={inputClass}
          >
            <option value="">Todos</option>
            {exerciseOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name} ({o.count})
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-1 md:col-span-2 xl:col-span-2">
          <label htmlFor="flt-status" className={labelClass}>
            Estado
          </label>
          <select
            id="flt-status"
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as StatusFilter })}
            className={inputClass}
          >
            <option value="all">Todas</option>
            <option value="complete">Completas</option>
            <option value="partial">Parciales</option>
            <option value="incomplete">Datos incompletos</option>
          </select>
        </div>
        <div className="col-span-1 md:col-span-2 xl:col-span-2">
          <label htmlFor="flt-from" className={labelClass}>
            Desde
          </label>
          <input
            id="flt-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => onChange({ from: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="col-span-1 md:col-span-2 xl:col-span-2">
          <label htmlFor="flt-to" className={labelClass}>
            Hasta
          </label>
          <input
            id="flt-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => onChange({ to: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <p aria-live="polite">
          {active ? (
            <>
              Mostrando <span className="text-zinc-200">{formatNumber(shown)}</span> de {formatNumber(total)} sesiones. Las
              métricas y gráficos usan solo las sesiones filtradas.
            </>
          ) : (
            <>{formatNumber(total)} sesiones guardadas en este navegador.</>
          )}
        </p>
        {active && (
          <button type="button" onClick={onReset} className="text-emerald-400 hover:text-emerald-300">
            Quitar filtros
          </button>
        )}
      </div>
    </section>
  );
}
