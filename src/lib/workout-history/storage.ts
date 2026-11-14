// Almacén local (localStorage) del historial. Solo se ejecuta en el navegador.
// No hay ninguna llamada de red: los datos nunca salen de este navegador.

import { HISTORY_SCHEMA_VERSION, HISTORY_STORAGE_KEY, type HistoryFile, type WorkoutSession } from './types';
import { parseHistoryText } from './validate';

export type HistorySnapshot =
  | { status: 'loading' }
  | { status: 'ready'; sessions: WorkoutSession[] }
  | { status: 'error'; message: string; raw: string };

const LOADING: HistorySnapshot = { status: 'loading' };
const listeners = new Set<() => void>();
let cached: HistorySnapshot | null = null;
const HISTORY_SEED_KEY = 'runninghub.workoutHistory.seed.v1';
let seedPromise: Promise<void> | null = null;

export function compareSessionsDesc(a: WorkoutSession, b: WorkoutSession): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.title.localeCompare(b.title, 'es');
}

function readFromStorage(): HistorySnapshot {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  } catch {
    return {
      status: 'error',
      message:
        'Este navegador no permite usar el almacenamiento local (puede estar en modo privado o bloqueado). Sin él no se pueden guardar entrenamientos.',
      raw: '',
    };
  }
  if (raw === null) return { status: 'ready', sessions: [] };

  const result = parseHistoryText(raw);
  if (!result.ok) {
    return { status: 'error', message: `Los datos guardados no se pueden leer: ${result.error}`, raw };
  }
  if (result.data.invalid.length > 0) {
    const first = result.data.invalid[0];
    return {
      status: 'error',
      message: `Hay ${result.data.invalid.length} registro(s) guardado(s) dañado(s) (p. ej. ${first.label}: ${first.errors[0] ?? 'error'}).`,
      raw,
    };
  }
  const missingId = result.data.sessions.some((s) => s.id === null);
  if (missingId) {
    return { status: 'error', message: 'Hay registros guardados sin identificador.', raw };
  }
  const sessions = result.data.sessions.map((s) => ({ ...s, id: s.id as string })).sort(compareSessionsDesc);
  return { status: 'ready', sessions };
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorageEvent(event: StorageEvent) {
  if (event.key === null || event.key === HISTORY_STORAGE_KEY) {
    cached = null;
    emit();
  }
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onStorageEvent);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorageEvent);
  };
}

export function getHistorySnapshot(): HistorySnapshot {
  if (cached === null) cached = readFromStorage();
  return cached;
}

export function getHistoryServerSnapshot(): HistorySnapshot {
  return LOADING;
}

/** Carga una sola vez el historial inicial publicado y lo fusiona sin sobrescribir datos locales. */
export function seedHistoryIfNeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    if (window.localStorage.getItem(HISTORY_SEED_KEY) === 'loaded') return;

    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    let existing: WorkoutSession[] = [];
    if (raw !== null) {
      const stored = parseHistoryText(raw);
      if (!stored.ok || stored.data.invalid.length > 0 || stored.data.sessions.some((s) => s.id === null)) {
        throw new Error('No pude añadir el historial inicial porque los datos actuales del navegador no se pueden leer. No he modificado nada.');
      }
      existing = stored.data.sessions.map((s) => ({ ...s, id: s.id as string }));
    }

    const response = await fetch('/history-seed.json', { cache: 'force-cache' });
    if (!response.ok) throw new Error('No se pudo descargar el historial inicial. Recarga la página para intentarlo de nuevo.');
    const imported = parseHistoryText(await response.text());
    if (!imported.ok || imported.data.invalid.length > 0 || imported.data.sessions.some((s) => s.id === null)) {
      throw new Error('El historial inicial publicado no supera la validación; no he cambiado los datos locales.');
    }

    const ids = new Set(existing.map((s) => s.id));
    const additions = imported.data.sessions
      .filter((s) => s.id !== null && !ids.has(s.id))
      .map((s) => ({ ...s, id: s.id as string }));
    const sessions = [...existing, ...additions].sort(compareSessionsDesc);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: HISTORY_SCHEMA_VERSION, sessions }));
    window.localStorage.setItem(HISTORY_SEED_KEY, 'loaded');
    cached = { status: 'ready', sessions };
    emit();
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

export function buildHistoryFile(sessions: WorkoutSession[], withExportDate: boolean): HistoryFile {
  const file: HistoryFile = { version: HISTORY_SCHEMA_VERSION, sessions: [...sessions].sort(compareSessionsDesc) };
  if (withExportDate) file.exportedAt = new Date().toISOString();
  return file;
}

/** Guarda la lista completa. Lanza Error con un mensaje legible si no se puede escribir. */
export function saveSessions(sessions: WorkoutSession[]): void {
  const current = getHistorySnapshot();
  if (current.status === 'error') {
    throw new Error('No se guarda nada mientras los datos existentes no se puedan leer, para no sobrescribirlos.');
  }
  const file = buildHistoryFile(sessions, false);
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(file));
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
    throw new Error(
      quota
        ? 'No queda espacio en el almacenamiento local del navegador. Exporta una copia y elimina registros antiguos.'
        : 'No se pudo guardar en el almacenamiento local del navegador.'
    );
  }
  cached = { status: 'ready', sessions: file.sessions };
  emit();
}

/** Borra por completo los datos guardados (solo tras confirmación explícita del usuario). */
export function clearStoredHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  } finally {
    cached = null;
    emit();
  }
}
