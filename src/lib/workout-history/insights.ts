// Análisis accionable: carrera, fuerza y progresión por ejercicio en una ventana de tiempo.
// Solo se usan campos registrados: lo que falta se queda como «sin dato» (null), nunca como 0.

import { exerciseKey, exerciseStats, type ExerciseStats, type Period } from './analytics';
import { addDays, mondayOf } from './plan';
import { isRunSession } from './planProgress';
import type { WorkoutSession } from './types';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export type InsightWindow = '8w' | '12w' | '26w' | '12m' | 'all';

export const WINDOW_OPTIONS: Array<{ id: InsightWindow; label: string; long: string }> = [
  { id: '8w', label: '8 sem', long: 'últimas 8 semanas' },
  { id: '12w', label: '12 sem', long: 'últimas 12 semanas' },
  { id: '26w', label: '26 sem', long: 'últimas 26 semanas' },
  { id: '12m', label: '12 meses', long: 'últimos 12 meses' },
  { id: 'all', label: 'Todo', long: 'todo el historial' },
];

const WINDOW_WEEKS: Record<Exclude<InsightWindow, 'all'>, number> = { '8w': 8, '12w': 12, '26w': 26, '12m': 52 };

export interface DateRange {
  from: string;
  to: string;
}

/** Ventana de semanas completas (lunes–domingo) que termina en la semana de `today`. */
export function windowRange(window: InsightWindow, today: string, sessions: WorkoutSession[]): DateRange | null {
  if (window === 'all') {
    let first: string | null = null;
    for (const s of sessions) if (first === null || s.date < first) first = s.date;
    return first === null ? null : { from: first, to: today };
  }
  return { from: addDays(mondayOf(today), -7 * (WINDOW_WEEKS[window] - 1)), to: today };
}

/** Ventana inmediatamente anterior y de la misma longitud en semanas. */
export function previousRange(window: InsightWindow, range: DateRange): DateRange | null {
  if (window === 'all') return null;
  return { from: addDays(range.from, -7 * WINDOW_WEEKS[window]), to: addDays(range.from, -1) };
}

export function inRange(sessions: WorkoutSession[], range: DateRange): WorkoutSession[] {
  return sessions.filter((s) => s.date >= range.from && s.date <= range.to);
}

// ---------------------------------------------------------------------------
// Periodos

function periodKey(date: string, period: Period): string {
  return period === 'week' ? mondayOf(date) : date.slice(0, 7);
}

function nextKey(key: string, period: Period): string {
  if (period === 'week') return addDays(key, 7);
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function labels(key: string, period: Period): { label: string; fullLabel: string } {
  const [y, m, d] = key.split('-').map(Number);
  if (period === 'week') return { label: `${d} ${MONTHS[m - 1]}`, fullLabel: `Semana del ${d} ${MONTHS[m - 1]} ${y}` };
  return { label: `${MONTHS[m - 1]} ${String(y).slice(2)}`, fullLabel: `${MONTHS_LONG[m - 1]} ${y}` };
}

export const MAX_INSIGHT_BUCKETS: Record<Period, number> = { week: 52, month: 36 };

function periodKeys(range: DateRange, period: Period): { keys: string[]; truncated: boolean } {
  const keys: string[] = [];
  const last = periodKey(range.to, period);
  let key = periodKey(range.from, period);
  for (let i = 0; i < 3000; i += 1) {
    keys.push(key);
    if (key >= last) break;
    key = nextKey(key, period);
  }
  const max = MAX_INSIGHT_BUCKETS[period];
  return keys.length > max ? { keys: keys.slice(-max), truncated: true } : { keys, truncated: false };
}

// ---------------------------------------------------------------------------
// Carrera

export interface RunBucket {
  key: string;
  label: string;
  fullLabel: string;
  runs: number;
  runsWithDistance: number;
  /** null si no hay ninguna carrera con distancia en el periodo */
  km: number | null;
  longestKm: number | null;
  longestDate: string | null;
}

export interface RunSummary {
  runs: number;
  runsWithDistance: number;
  km: number | null;
  durationMin: number | null;
  runsWithDuration: number;
  longest: { km: number; date: string; title: string } | null;
  last: { date: string; km: number | null } | null;
  /** Semanas con al menos una carrera con distancia */
  activeWeeks: number;
  kmPerActiveWeek: number | null;
}

export function runSummary(sessions: WorkoutSession[]): RunSummary {
  const summary: RunSummary = {
    runs: 0,
    runsWithDistance: 0,
    km: null,
    durationMin: null,
    runsWithDuration: 0,
    longest: null,
    last: null,
    activeWeeks: 0,
    kmPerActiveWeek: null,
  };
  const weeks = new Set<string>();
  for (const s of sessions) {
    if (!isRunSession(s)) continue;
    summary.runs += 1;
    if (summary.last === null || s.date > summary.last.date) summary.last = { date: s.date, km: s.distanceKm };
    if (s.durationMin !== null) {
      summary.durationMin = (summary.durationMin ?? 0) + s.durationMin;
      summary.runsWithDuration += 1;
    }
    if (s.distanceKm === null) continue;
    summary.runsWithDistance += 1;
    summary.km = (summary.km ?? 0) + s.distanceKm;
    weeks.add(mondayOf(s.date));
    if (summary.longest === null || s.distanceKm > summary.longest.km) {
      summary.longest = { km: s.distanceKm, date: s.date, title: s.title };
    }
  }
  summary.activeWeeks = weeks.size;
  summary.kmPerActiveWeek = summary.km !== null && weeks.size > 0 ? summary.km / weeks.size : null;
  return summary;
}

export function runBuckets(
  sessions: WorkoutSession[],
  range: DateRange,
  period: Period
): { buckets: RunBucket[]; truncated: boolean } {
  const { keys, truncated } = periodKeys(range, period);
  const map = new Map<string, RunBucket>();
  for (const key of keys) {
    map.set(key, { key, ...labels(key, period), runs: 0, runsWithDistance: 0, km: null, longestKm: null, longestDate: null });
  }
  for (const s of sessions) {
    if (!isRunSession(s)) continue;
    const bucket = map.get(periodKey(s.date, period));
    if (!bucket) continue;
    bucket.runs += 1;
    if (s.distanceKm === null) continue;
    bucket.runsWithDistance += 1;
    bucket.km = (bucket.km ?? 0) + s.distanceKm;
    if (bucket.longestKm === null || s.distanceKm > bucket.longestKm) {
      bucket.longestKm = s.distanceKm;
      bucket.longestDate = s.date;
    }
  }
  return { buckets: [...map.values()], truncated };
}

// ---------------------------------------------------------------------------
// Fuerza

export interface StrengthBucket {
  key: string;
  label: string;
  fullLabel: string;
  sessions: number;
  partialSessions: number;
  /** Sesiones de fuerza sin ninguna serie anotada */
  sessionsWithoutSets: number;
  /** Series con repeticiones anotadas; null si ninguna sesión del periodo tiene series */
  effectiveSets: number | null;
  /** Series anotadas sin repeticiones (no se cuentan como efectivas) */
  setsWithoutReps: number;
}

export interface StrengthSummary {
  sessions: number;
  partialSessions: number;
  sessionsWithSets: number;
  effectiveSets: number | null;
  setsWithoutReps: number;
  setsPerSession: number | null;
  activeWeeks: number;
  last: string | null;
}

function countSets(s: WorkoutSession): { effective: number; withoutReps: number } {
  let effective = 0;
  let withoutReps = 0;
  for (const e of s.exercises) {
    for (const set of e.sets) {
      if (set.reps !== null && set.reps > 0) effective += 1;
      else withoutReps += 1;
    }
  }
  return { effective, withoutReps };
}

export function strengthSummary(sessions: WorkoutSession[]): StrengthSummary {
  const summary: StrengthSummary = {
    sessions: 0,
    partialSessions: 0,
    sessionsWithSets: 0,
    effectiveSets: null,
    setsWithoutReps: 0,
    setsPerSession: null,
    activeWeeks: 0,
    last: null,
  };
  const weeks = new Set<string>();
  for (const s of sessions) {
    if (s.type !== 'strength') continue;
    summary.sessions += 1;
    if (s.partial) summary.partialSessions += 1;
    weeks.add(mondayOf(s.date));
    if (summary.last === null || s.date > summary.last) summary.last = s.date;
    const { effective, withoutReps } = countSets(s);
    summary.setsWithoutReps += withoutReps;
    if (effective > 0) {
      summary.sessionsWithSets += 1;
      summary.effectiveSets = (summary.effectiveSets ?? 0) + effective;
    }
  }
  summary.activeWeeks = weeks.size;
  summary.setsPerSession =
    summary.effectiveSets !== null && summary.sessionsWithSets > 0 ? summary.effectiveSets / summary.sessionsWithSets : null;
  return summary;
}

export function strengthBuckets(
  sessions: WorkoutSession[],
  range: DateRange,
  period: Period
): { buckets: StrengthBucket[]; truncated: boolean } {
  const { keys, truncated } = periodKeys(range, period);
  const map = new Map<string, StrengthBucket>();
  for (const key of keys) {
    map.set(key, {
      key,
      ...labels(key, period),
      sessions: 0,
      partialSessions: 0,
      sessionsWithoutSets: 0,
      effectiveSets: null,
      setsWithoutReps: 0,
    });
  }
  for (const s of sessions) {
    if (s.type !== 'strength') continue;
    const bucket = map.get(periodKey(s.date, period));
    if (!bucket) continue;
    bucket.sessions += 1;
    if (s.partial) bucket.partialSessions += 1;
    const { effective, withoutReps } = countSets(s);
    bucket.setsWithoutReps += withoutReps;
    if (effective > 0) bucket.effectiveSets = (bucket.effectiveSets ?? 0) + effective;
    else bucket.sessionsWithoutSets += 1;
  }
  return { buckets: [...map.values()], truncated };
}

// ---------------------------------------------------------------------------
// Progresión por ejercicio

export type LoadComparability = 'ok' | 'mixed-equipment' | 'mixed-sides' | 'mixed-basis' | 'single' | 'no-load';

export interface ExerciseProgressRow {
  key: string;
  name: string;
  sessions: number;
  sets: number;
  lastDate: string;
  /** Carga máxima de la primera y la última sesión con kg dentro de la ventana */
  firstLoad: { kg: number; date: string } | null;
  lastLoad: { kg: number; date: string } | null;
  /** Diferencia en kg; null si no es comparable */
  deltaKg: number | null;
  comparability: LoadComparability;
  perSide: boolean;
  machine: boolean;
  equipmentKnown: boolean;
  /** Mejor carga de todo el historial analizado (kg anotados) */
  best: { kg: number; reps: number | null; date: string; inWindow: boolean } | null;
  bestReps: { reps: number; date: string } | null;
}

function pointLoad(p: ExerciseStats['progression'][number]): number | null {
  if (p.top !== null) return p.top;
  if (p.left !== null || p.right !== null) return Math.max(p.left ?? 0, p.right ?? 0);
  return null;
}

/** Detecta anotaciones de carga que no representan la misma base de comparación. */
function loadBasis(notes: string | null): string | null {
  if (!notes) return null;
  if (/\b(por lado|por cada lado|cada lado)\b/i.test(notes)) return 'per-side';
  if (/\b(por mancuerna|por mano|cada mancuerna)\b/i.test(notes)) return 'per-implement';
  if (/\b(peso total|carga total|total entre ambas)\b/i.test(notes)) return 'total';
  return null;
}

/**
 * Una fila por ejercicio con actividad en la ventana. El cambio de carga solo se calcula entre
 * sesiones del mismo ejercicio y cuando el tipo de equipo y de serie (bilateral / por lado) no cambia.
 */
export function exerciseProgressRows(windowSessions: WorkoutSession[], allSessions: WorkoutSession[], from: string): ExerciseProgressRow[] {
  const windowStats = exerciseStats(windowSessions);
  const allStats = new Map(exerciseStats(allSessions).map((s) => [s.key, s]));
  const sessionById = new Map(allSessions.map((s) => [s.id, s]));

  return windowStats.map((st): ExerciseProgressRow => {
    const loaded = st.progression
      .map((p) => {
        const session = sessionById.get(p.sessionId);
        const exercise = session?.exercises.find((entry) => exerciseKey(entry.name) === st.key);
        return { date: p.date, kg: pointLoad(p), sided: p.top === null, basis: loadBasis(exercise?.notes ?? null) };
      })
      .filter((p): p is { date: string; kg: number; sided: boolean; basis: string | null } => p.kg !== null);
    const first = loaded[0] ?? null;
    const last = loaded[loaded.length - 1] ?? null;
    const mixedSides = loaded.some((p) => p.sided) && loaded.some((p) => !p.sided);
    const knownBases = new Set(loaded.map((p) => p.basis).filter((basis): basis is string => basis !== null));
    const mixedBasis = knownBases.size > 1 || (knownBases.size > 0 && loaded.some((p) => p.basis === null));

    let comparability: LoadComparability = 'ok';
    if (loaded.length === 0) comparability = 'no-load';
    else if (st.machine && st.freeWeight) comparability = 'mixed-equipment';
    else if (mixedSides) comparability = 'mixed-sides';
    else if (mixedBasis) comparability = 'mixed-basis';
    else if (loaded.length < 2) comparability = 'single';

    const all = allStats.get(st.key) ?? st;
    const bestRecord = st.machine && !st.freeWeight ? all.bestMachineLoad : (all.bestLoad ?? all.bestMachineLoad);

    return {
      key: st.key,
      name: st.name,
      sessions: st.sessions,
      sets: st.sets,
      lastDate: st.lastDate,
      firstLoad: first ? { kg: first.kg, date: first.date } : null,
      lastLoad: last ? { kg: last.kg, date: last.date } : null,
      deltaKg: comparability === 'ok' && first && last ? last.kg - first.kg : null,
      comparability,
      perSide: loaded.length > 0 && loaded.every((p) => p.sided),
      machine: st.machine,
      equipmentKnown: st.equipment.length > 0,
      best:
        bestRecord && comparability !== 'mixed-equipment' && comparability !== 'mixed-basis'
          ? { kg: bestRecord.weightKg, reps: bestRecord.reps, date: bestRecord.date, inWindow: bestRecord.date >= from }
          : null,
      bestReps: all.bestReps ? { reps: all.bestReps.reps, date: all.bestReps.date } : null,
    };
  });
}
