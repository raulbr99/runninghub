import {
  EQUIPMENT_LABELS,
  EQUIPMENT_VALUES,
  HISTORY_SCHEMA_VERSION,
  SIDE_VALUES,
  type Equipment,
  type ExerciseEntry,
  type ExerciseSet,
  type SessionType,
  type Side,
  type WorkoutSession,
} from './types';

/** Sesión validada; `id` es null si el archivo no lo incluía. */
export type SessionDraft = Omit<WorkoutSession, 'id'> & { id: string | null };

export interface InvalidSession {
  index: number;
  label: string;
  errors: string[];
}

export interface ParsedHistory {
  sessions: SessionDraft[];
  invalid: InvalidSession[];
  warnings: string[];
  totalInFile: number;
}

export type ParseResult = { ok: true; data: ParsedHistory } | { ok: false; error: string };

export const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

const SESSION_KEYS = new Set([
  'id',
  'date',
  'type',
  'category',
  'title',
  'partial',
  'incomplete',
  'status',
  'durationMin',
  'durationMinutes',
  'distanceKm',
  'notes',
  'exercises',
]);
const EXERCISE_KEYS = new Set(['name', 'muscleGroup', 'equipment', 'notes', 'sets']);
const SET_KEYS = new Set(['reps', 'weightKg', 'weight', 'side']);

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class Collector {
  errors: string[] = [];
  push(path: string, message: string) {
    this.errors.push(`${path}: ${message}`);
  }
}

class UnknownKeys {
  private counts = new Map<string, number>();
  check(obj: JsonObject, allowed: Set<string>, level: string) {
    for (const key of Object.keys(obj)) {
      if (!allowed.has(key)) {
        const id = `${level}|${key}`;
        this.counts.set(id, (this.counts.get(id) ?? 0) + 1);
      }
    }
  }
  toWarnings(): string[] {
    return [...this.counts.entries()].map(([id, count]) => {
      const [level, key] = id.split('|');
      return `Campo "${key}" en ${level} no reconocido; se ignora (${count} ${count === 1 ? 'vez' : 'veces'}).`;
    });
  }
}

function readOptionalString(
  obj: JsonObject,
  key: string,
  path: string,
  c: Collector,
  maxLength: number
): string | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    c.push(`${path}.${key}`, 'debe ser texto');
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    c.push(`${path}.${key}`, `demasiado largo (máx. ${maxLength} caracteres)`);
    return null;
  }
  return trimmed === '' ? null : trimmed;
}

/** Acepta números o textos numéricos ("12", "62,5"). Devuelve undefined si no hay valor. */
function readNumber(
  value: unknown,
  path: string,
  c: Collector,
  opts: { min: number; max: number; integer?: boolean }
): number | null {
  if (value === undefined || value === null || value === '') return null;
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string' && /^\s*\d+([.,]\d+)?\s*$/.test(value)) {
    num = Number(value.trim().replace(',', '.'));
  } else {
    c.push(path, `debe ser un número (recibido ${JSON.stringify(value)})`);
    return null;
  }
  if (!Number.isFinite(num)) {
    c.push(path, 'no es un número válido');
    return null;
  }
  if (opts.integer && !Number.isInteger(num)) {
    c.push(path, 'debe ser un número entero');
    return null;
  }
  if (num < opts.min || num > opts.max) {
    c.push(path, `fuera de rango (${opts.min}–${opts.max})`);
    return null;
  }
  return num;
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Acepta "YYYY-MM-DD" o una fecha ISO con hora (se usa la parte de fecha tal cual está escrita). */
function readDate(value: unknown, path: string, c: Collector): string | null {
  if (typeof value !== 'string') {
    c.push(path, 'falta la fecha (formato AAAA-MM-DD)');
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value.trim());
  if (!match) {
    c.push(path, `fecha no válida "${value}" (usa AAAA-MM-DD)`);
    return null;
  }
  const [, ys, ms, ds] = match;
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (y < 1970 || y > 2100 || !isValidCalendarDate(y, m, d)) {
    c.push(path, `fecha inexistente "${value}"`);
    return null;
  }
  return `${ys}-${ms}-${ds}`;
}

function readType(value: unknown, path: string, c: Collector): SessionType | null {
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'strength' || v === 'fuerza') return 'strength';
    if (v === 'cardio') return 'cardio';
  }
  c.push(path, `debe ser "strength" o "cardio" (recibido ${JSON.stringify(value)})`);
  return null;
}

function readBoolean(value: unknown, path: string, c: Collector): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  c.push(path, 'debe ser true o false');
  return false;
}

function readEquipment(value: unknown, path: string, c: Collector): Equipment | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && (EQUIPMENT_VALUES as readonly string[]).includes(value)) {
    return value as Equipment;
  }
  const valid = EQUIPMENT_VALUES.map((v) => `"${v}" (${EQUIPMENT_LABELS[v]})`).join(', ');
  c.push(path, `valor no válido ${JSON.stringify(value)}. Usa uno de: ${valid}`);
  return null;
}

function readSide(value: unknown, path: string, c: Collector): Side | null {
  if (value === undefined || value === null || value === '' || value === 'both') return null;
  if (typeof value === 'string' && (SIDE_VALUES as readonly string[]).includes(value)) {
    return value as Side;
  }
  c.push(path, 'debe ser "left", "right" o no indicarse');
  return null;
}

function parseSet(raw: unknown, path: string, c: Collector, unknown: UnknownKeys): ExerciseSet | null {
  if (!isObject(raw)) {
    c.push(path, 'cada serie debe ser un objeto { "reps": …, "weightKg": … }');
    return null;
  }
  unknown.check(raw, SET_KEYS, 'series');
  const reps = readNumber(raw.reps, `${path}.reps`, c, { min: 0, max: 1000, integer: true });
  const weightSource = raw.weightKg !== undefined ? 'weightKg' : 'weight';
  const weightKg = readNumber(raw[weightSource], `${path}.${weightSource}`, c, { min: 0, max: 1000 });
  const side = readSide(raw.side, `${path}.side`, c);
  return { reps, weightKg, side };
}

function parseExercise(
  raw: unknown,
  path: string,
  c: Collector,
  unknown: UnknownKeys
): ExerciseEntry | null {
  if (!isObject(raw)) {
    c.push(path, 'cada ejercicio debe ser un objeto con "name" y "sets"');
    return null;
  }
  unknown.check(raw, EXERCISE_KEYS, 'ejercicios');
  const name = readOptionalString(raw, 'name', path, c, 120);
  if (!name) c.push(`${path}.name`, 'falta el nombre del ejercicio');
  const muscleGroup = readOptionalString(raw, 'muscleGroup', path, c, 60);
  const equipment = readEquipment(raw.equipment, `${path}.equipment`, c);
  const notes = readOptionalString(raw, 'notes', path, c, 2000);
  const sets: ExerciseSet[] = [];
  if (raw.sets !== undefined && raw.sets !== null) {
    if (!Array.isArray(raw.sets)) {
      c.push(`${path}.sets`, 'debe ser una lista de series');
    } else {
      if (raw.sets.length > 200) c.push(`${path}.sets`, 'demasiadas series (máx. 200)');
      raw.sets.slice(0, 200).forEach((s, i) => {
        const parsed = parseSet(s, `${path}.sets[${i}]`, c, unknown);
        if (parsed) sets.push(parsed);
      });
    }
  }
  return name ? { name, muscleGroup, equipment, notes, sets } : null;
}

function sessionLabel(raw: unknown, index: number): string {
  if (isObject(raw)) {
    const date = typeof raw.date === 'string' ? raw.date.slice(0, 10) : 'sin fecha';
    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'sin título';
    return `#${index + 1} · ${date} · ${title}`;
  }
  return `#${index + 1}`;
}

function parseSession(
  raw: unknown,
  index: number,
  unknown: UnknownKeys
): { session: SessionDraft | null; errors: string[] } {
  const c = new Collector();
  const path = `sessions[${index}]`;
  if (!isObject(raw)) {
    c.push(path, 'cada sesión debe ser un objeto');
    return { session: null, errors: c.errors };
  }
  unknown.check(raw, SESSION_KEYS, 'sesiones');

  let id: string | null = null;
  if (raw.id !== undefined && raw.id !== null) {
    if (typeof raw.id === 'string' && raw.id.trim() !== '' && raw.id.length <= 200) {
      id = raw.id.trim();
    } else if (typeof raw.id === 'number' && Number.isFinite(raw.id)) {
      id = String(raw.id);
    } else {
      c.push(`${path}.id`, 'debe ser un texto no vacío');
    }
  }

  const date = readDate(raw.date, `${path}.date`, c);
  const type = readType(raw.type, `${path}.type`, c);
  const title = readOptionalString(raw, 'title', path, c, 200);
  if (!title) c.push(`${path}.title`, 'falta el título');
  const category = readOptionalString(raw, 'category', path, c, 60);
  const notes = readOptionalString(raw, 'notes', path, c, 5000);

  let partial = readBoolean(raw.partial, `${path}.partial`, c);
  let incomplete = readBoolean(raw.incomplete, `${path}.incomplete`, c);
  if (raw.status !== undefined && raw.status !== null) {
    if (raw.status === 'partial') partial = true;
    else if (raw.status === 'incomplete') incomplete = true;
    else if (raw.status !== 'completed') {
      c.push(`${path}.status`, 'debe ser "completed", "partial" o "incomplete"');
    }
  }

  const durationKey = raw.durationMin !== undefined ? 'durationMin' : 'durationMinutes';
  const durationMin = readNumber(raw[durationKey], `${path}.${durationKey}`, c, { min: 0, max: 1440 });
  const distanceKm = readNumber(raw.distanceKm, `${path}.distanceKm`, c, { min: 0, max: 1000 });

  const exercises: ExerciseEntry[] = [];
  if (raw.exercises !== undefined && raw.exercises !== null) {
    if (!Array.isArray(raw.exercises)) {
      c.push(`${path}.exercises`, 'debe ser una lista de ejercicios');
    } else {
      if (raw.exercises.length > 100) c.push(`${path}.exercises`, 'demasiados ejercicios (máx. 100)');
      raw.exercises.slice(0, 100).forEach((e, i) => {
        const parsed = parseExercise(e, `${path}.exercises[${i}]`, c, unknown);
        if (parsed) exercises.push(parsed);
      });
    }
  }

  if (c.errors.length > 0 || !date || !type || !title) {
    return { session: null, errors: c.errors };
  }
  return {
    session: {
      id,
      date,
      type,
      category,
      title,
      partial,
      incomplete,
      durationMin,
      distanceKm,
      notes,
      exercises,
    },
    errors: [],
  };
}

/** Valida un objeto ya parseado con formato { version: 1, sessions: [...] }. */
export function parseHistoryObject(data: unknown): ParseResult {
  if (Array.isArray(data)) {
    return {
      ok: false,
      error:
        'El archivo es una lista. Se espera un objeto { "version": 1, "sessions": [ … ] } con las sesiones dentro de "sessions".',
    };
  }
  if (!isObject(data)) {
    return { ok: false, error: 'El archivo debe contener un objeto JSON { "version": 1, "sessions": [ … ] }.' };
  }
  if (data.version === undefined) {
    return { ok: false, error: 'Falta "version": 1 en el archivo.' };
  }
  if (data.version !== HISTORY_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Versión de formato no soportada (${JSON.stringify(data.version)}). Esta versión de la app solo entiende "version": 1.`,
    };
  }
  if (!Array.isArray(data.sessions)) {
    return { ok: false, error: 'Falta la lista "sessions" o no es una lista.' };
  }

  const unknown = new UnknownKeys();
  const sessions: SessionDraft[] = [];
  const invalid: InvalidSession[] = [];
  const seenIds = new Map<string, number>();

  data.sessions.forEach((raw, index) => {
    const { session, errors } = parseSession(raw, index, unknown);
    if (session && session.id !== null) {
      const firstIndex = seenIds.get(session.id);
      if (firstIndex !== undefined) {
        invalid.push({
          index,
          label: sessionLabel(raw, index),
          errors: [`sessions[${index}].id: el id "${session.id}" ya aparece en la sesión #${firstIndex + 1} del mismo archivo`],
        });
        return;
      }
      seenIds.set(session.id, index);
    }
    if (session) sessions.push(session);
    else invalid.push({ index, label: sessionLabel(raw, index), errors });
  });

  return {
    ok: true,
    data: { sessions, invalid, warnings: unknown.toWarnings(), totalInFile: data.sessions.length },
  };
}

/** Parsea el texto de un archivo JSON de importación. */
export function parseHistoryText(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : '';
    return { ok: false, error: `El archivo no es JSON válido${detail}.` };
  }
  return parseHistoryObject(data);
}
