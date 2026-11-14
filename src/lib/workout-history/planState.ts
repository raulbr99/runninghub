// Estado manual del plan (sesiones marcadas a mano y reprogramaciones).
// Vive solo en localStorage de este navegador, en una clave propia: nunca toca el historial
// de entrenamientos ni se envía a ningún servidor.

import { PLAN_ID, PLAN_ITEM_BY_ID, PLAN_START, RACE_DATE, isValidDateString } from './plan';

export const PLAN_STATE_VERSION = 1;
export const PLAN_STATE_STORAGE_KEY = 'runninghub.planState.v1';
export const PLAN_BACKUP_KIND = 'runninghub.planState';

export interface ManualDone {
  /** Fecha local en la que se da por hecha la sesión */
  date: string;
  /** Momento (ISO) en que se marcó */
  markedAt: string;
}

export interface PlanItemState {
  done?: ManualDone;
  /** Nueva fecha local elegida para la sesión */
  rescheduledTo?: string;
}

export interface PlanState {
  version: typeof PLAN_STATE_VERSION;
  planId: string;
  items: Record<string, PlanItemState>;
}

export interface PlanBackupFile extends PlanState {
  kind: typeof PLAN_BACKUP_KIND;
  exportedAt: string;
}

export type PlanStateSnapshot =
  | { status: 'loading' }
  | { status: 'ready'; state: PlanState }
  | { status: 'error'; message: string; raw: string };

export type PlanParseResult =
  | { ok: true; state: PlanState; ignored: number }
  | { ok: false; error: string };

const LOADING: PlanStateSnapshot = { status: 'loading' };
const listeners = new Set<() => void>();
let cached: PlanStateSnapshot | null = null;

export function emptyPlanState(): PlanState {
  return { version: PLAN_STATE_VERSION, planId: PLAN_ID, items: {} };
}

export function countPlanMarks(state: PlanState): { done: number; rescheduled: number } {
  let done = 0;
  let rescheduled = 0;
  for (const item of Object.values(state.items)) {
    if (item.done) done += 1;
    if (item.rescheduledTo) rescheduled += 1;
  }
  return { done, rescheduled };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Valida un estado guardado o una copia exportada. Las entradas de sesiones que no existen
 * en el plan actual, o con fechas no válidas, se ignoran y se cuentan en `ignored`.
 */
export function parsePlanStateText(text: string): PlanParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  if (!isObject(data)) return { ok: false, error: 'El contenido no tiene el formato de una copia del plan.' };
  if ('sessions' in data && !('items' in data)) {
    return { ok: false, error: 'Este archivo es una copia del historial de entrenos, no del plan. Impórtalo con «Importar JSON».' };
  }
  if (data.kind !== undefined && data.kind !== PLAN_BACKUP_KIND) {
    return { ok: false, error: 'El archivo no es una copia del plan de RunningHub.' };
  }
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
    return { ok: false, error: 'Falta la versión del formato.' };
  }
  if (data.version > PLAN_STATE_VERSION) {
    return { ok: false, error: `La copia usa un formato más nuevo (versión ${data.version}) que esta aplicación no entiende.` };
  }
  if (data.planId !== PLAN_ID) {
    return { ok: false, error: 'La copia pertenece a otro plan y no se puede aplicar a este.' };
  }
  if (!isObject(data.items)) return { ok: false, error: 'La copia no contiene la lista de sesiones del plan.' };

  const state = emptyPlanState();
  let ignored = 0;
  for (const [id, value] of Object.entries(data.items)) {
    const planItem = PLAN_ITEM_BY_ID.get(id);
    if (!planItem || !isObject(value)) {
      ignored += 1;
      continue;
    }
    const entry: PlanItemState = {};
    if (value.done !== undefined && value.done !== null) {
      if (isObject(value.done) && isValidDateString(value.done.date)) {
        entry.done = {
          date: value.done.date,
          markedAt: typeof value.done.markedAt === 'string' ? value.done.markedAt.slice(0, 40) : '',
        };
      } else {
        ignored += 1;
      }
    }
    if (value.rescheduledTo !== undefined && value.rescheduledTo !== null) {
      if (
        isValidDateString(value.rescheduledTo) &&
        !planItem.fixedDate &&
        value.rescheduledTo >= PLAN_START &&
        value.rescheduledTo <= RACE_DATE
      ) {
        if (value.rescheduledTo !== planItem.date) entry.rescheduledTo = value.rescheduledTo;
      } else {
        ignored += 1;
      }
    }
    if (entry.done || entry.rescheduledTo) state.items[id] = entry;
  }
  return { ok: true, state, ignored };
}

function readFromStorage(): PlanStateSnapshot {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(PLAN_STATE_STORAGE_KEY);
  } catch {
    return {
      status: 'error',
      message: 'Este navegador no permite usar el almacenamiento local, así que no se pueden guardar las marcas del plan.',
      raw: '',
    };
  }
  if (raw === null) return { status: 'ready', state: emptyPlanState() };
  const parsed = parsePlanStateText(raw);
  if (!parsed.ok) {
    return { status: 'error', message: `Las marcas del plan guardadas no se pueden leer: ${parsed.error}`, raw };
  }
  return { status: 'ready', state: parsed.state };
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorageEvent(event: StorageEvent) {
  if (event.key === null || event.key === PLAN_STATE_STORAGE_KEY) {
    cached = null;
    emit();
  }
}

export function subscribePlanState(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onStorageEvent);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorageEvent);
  };
}

export function getPlanStateSnapshot(): PlanStateSnapshot {
  if (cached === null) cached = readFromStorage();
  return cached;
}

export function getPlanStateServerSnapshot(): PlanStateSnapshot {
  return LOADING;
}

/** Guarda el estado completo. Lanza Error con mensaje legible si no se puede escribir. */
export function savePlanState(state: PlanState): void {
  const current = getPlanStateSnapshot();
  if (current.status === 'error') {
    throw new Error('No se guarda nada mientras las marcas existentes no se puedan leer, para no sobrescribirlas.');
  }
  const items: Record<string, PlanItemState> = {};
  for (const [id, entry] of Object.entries(state.items)) {
    if (PLAN_ITEM_BY_ID.has(id) && (entry.done || entry.rescheduledTo)) items[id] = entry;
  }
  const next: PlanState = { version: PLAN_STATE_VERSION, planId: PLAN_ID, items };
  try {
    if (Object.keys(items).length === 0) window.localStorage.removeItem(PLAN_STATE_STORAGE_KEY);
    else window.localStorage.setItem(PLAN_STATE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error('No se pudieron guardar las marcas del plan en el almacenamiento local del navegador.');
  }
  cached = { status: 'ready', state: next };
  emit();
}

function currentState(): PlanState {
  const snapshot = getPlanStateSnapshot();
  if (snapshot.status === 'error') {
    throw new Error('Las marcas guardadas no se pueden leer. Descárgalas o bórralas desde la pestaña Calendario antes de continuar.');
  }
  return snapshot.status === 'ready' ? snapshot.state : emptyPlanState();
}

function updateItem(id: string, update: (entry: PlanItemState) => PlanItemState): void {
  if (!PLAN_ITEM_BY_ID.has(id)) throw new Error('Esa sesión no existe en el plan.');
  const state = currentState();
  const entry = update({ ...(state.items[id] ?? {}) });
  const items = { ...state.items };
  if (entry.done || entry.rescheduledTo) items[id] = entry;
  else delete items[id];
  savePlanState({ ...state, items });
}

export function markItemDone(id: string, date: string): void {
  if (!isValidDateString(date)) throw new Error('La fecha no es válida.');
  updateItem(id, (entry) => ({ ...entry, done: { date, markedAt: new Date().toISOString() } }));
}

export function unmarkItemDone(id: string): void {
  updateItem(id, (entry) => {
    const next = { ...entry };
    delete next.done;
    return next;
  });
}

/** `date` null quita la reprogramación y devuelve la sesión a su fecha prevista. */
export function rescheduleItem(id: string, date: string | null): void {
  const planItem = PLAN_ITEM_BY_ID.get(id);
  if (!planItem) throw new Error('Esa sesión no existe en el plan.');
  if (date !== null) {
    if (planItem.fixedDate) throw new Error('La carrera tiene fecha fija y no se puede reprogramar.');
    if (!isValidDateString(date)) throw new Error('La fecha no es válida.');
    if (date < PLAN_START || date > RACE_DATE) throw new Error('La nueva fecha debe estar dentro del plan.');
  }
  updateItem(id, (entry) => {
    const next = { ...entry };
    if (date === null || date === planItem.date) delete next.rescheduledTo;
    else next.rescheduledTo = date;
    return next;
  });
}

/** Combina una copia importada con el estado actual; las entradas importadas prevalecen. */
export function mergePlanStates(current: PlanState, incoming: PlanState): PlanState {
  const items: Record<string, PlanItemState> = { ...current.items };
  for (const [id, entry] of Object.entries(incoming.items)) items[id] = { ...items[id], ...entry };
  return { ...current, items };
}

/** Borra todas las marcas manuales (solo tras confirmación explícita). */
export function clearPlanState(): void {
  try {
    window.localStorage.removeItem(PLAN_STATE_STORAGE_KEY);
  } finally {
    cached = null;
    emit();
  }
}

export function buildPlanBackup(state: PlanState): PlanBackupFile {
  return { kind: PLAN_BACKUP_KIND, ...state, exportedAt: new Date().toISOString() };
}
