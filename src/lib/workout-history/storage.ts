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
