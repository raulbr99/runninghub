import { normalizeText } from './merge';
import {
  isMachineLoad,
  isNonTonnageEquipment,
  type Equipment,
  type ExerciseEntry,
  type SessionType,
  type Side,
  type WorkoutSession,
} from './types';

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

/** Paleta categórica (validada para fondo oscuro), asignada por entidad y en orden fijo. */
export const GROUP_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9'];
export const OTHER_COLOR = '#71717a';
export const STRENGTH_COLOR = '#199e70';
export const CARDIO_COLOR = '#3987e5';

// ---------------------------------------------------------------------------
// Filtros

export type StatusFilter = 'all' | 'complete' | 'partial' | 'incomplete';

export interface HistoryFilters {
  query: string;
  from: string;
  to: string;
  type: 'all' | SessionType;
  exercise: string;
  status: StatusFilter;
}

export const EMPTY_FILTERS: HistoryFilters = {
  query: '',
  from: '',
  to: '',
  type: 'all',
  exercise: '',
  status: 'all',
};

export function hasActiveFilters(f: HistoryFilters): boolean {
  return (
    f.query.trim() !== '' || f.from !== '' || f.to !== '' || f.type !== 'all' || f.exercise !== '' || f.status !== 'all'
  );
}

export function exerciseKey(name: string): string {
  return normalizeText(name);
}

function sessionSearchText(s: WorkoutSession): string {
  const pieces = [s.title, s.category ?? '', s.notes ?? ''];
  for (const e of s.exercises) pieces.push(e.name, e.muscleGroup ?? '', e.notes ?? '');
  return normalizeText(pieces.join(' '));
}

export function filterSessions(sessions: WorkoutSession[], f: HistoryFilters): WorkoutSession[] {
  const terms = normalizeText(f.query).split(' ').filter(Boolean);
  return sessions.filter((s) => {
    if (f.from && s.date < f.from) return false;
    if (f.to && s.date > f.to) return false;
    if (f.type !== 'all' && s.type !== f.type) return false;
    if (f.status === 'complete' && (s.partial || s.incomplete)) return false;
    if (f.status === 'partial' && !s.partial) return false;
    if (f.status === 'incomplete' && !s.incomplete) return false;
    if (f.exercise && !s.exercises.some((e) => exerciseKey(e.name) === f.exercise)) return false;
    if (terms.length > 0) {
      const text = sessionSearchText(s);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });
}

export interface ExerciseOption {
  key: string;
  name: string;
  count: number;
}

export function listExercises(sessions: WorkoutSession[]): ExerciseOption[] {
  const map = new Map<string, ExerciseOption>();
  // sessions vienen de más reciente a más antigua: el primer nombre visto es el más reciente
  for (const s of sessions) {
    const seen = new Set<string>();
    for (const e of s.exercises) {
      const key = exerciseKey(e.name);
      if (seen.has(key)) continue;
      seen.add(key);
      const current = map.get(key);
      if (current) current.count += 1;
      else map.set(key, { key, name: e.name, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}

function focusedExercises(s: WorkoutSession, focusKey: string | null): ExerciseEntry[] {
  return focusKey ? s.exercises.filter((e) => exerciseKey(e.name) === focusKey) : s.exercises;
}

// ---------------------------------------------------------------------------
// Tonelaje estimado

export interface TonnageBreakdown {
  /** Peso libre (o equipo no indicado): reps × kg */
  freeKg: number;
  freeSets: number;
  /** Series incluidas en freeKg cuyo equipo no está indicado */
  unknownEquipmentSets: number;
  /** Series unilaterales incluidas en freeKg */
  unilateralSets: number;
  /** Máquina/polea: kg indicados por el aparato, no comparables */
  machineKg: number;
  machineSets: number;
  /** Peso corporal o bandas: no calculable */
  bodyweightSets: number;
  /** Series con 0 kg (sin carga externa) */
  noLoadSets: number;
  /** Series sin reps o sin kg anotados */
  missingSets: number;
}

function emptyTonnage(): TonnageBreakdown {
  return {
    freeKg: 0,
    freeSets: 0,
    unknownEquipmentSets: 0,
    unilateralSets: 0,
    machineKg: 0,
    machineSets: 0,
    bodyweightSets: 0,
    noLoadSets: 0,
    missingSets: 0,
  };
}

function addExerciseTonnage(t: TonnageBreakdown, e: ExerciseEntry) {
  for (const set of e.sets) {
    if (isNonTonnageEquipment(e.equipment)) {
      t.bodyweightSets += 1;
      continue;
    }
    if (set.reps === null || set.weightKg === null) {
      t.missingSets += 1;
      continue;
    }
    if (set.weightKg === 0) {
      t.noLoadSets += 1;
      continue;
    }
    const volume = set.reps * set.weightKg;
    if (isMachineLoad(e.equipment)) {
      t.machineKg += volume;
      t.machineSets += 1;
    } else {
      t.freeKg += volume;
      t.freeSets += 1;
      if (e.equipment === null) t.unknownEquipmentSets += 1;
      if (set.side !== null) t.unilateralSets += 1;
    }
  }
}

export function sessionTonnage(s: WorkoutSession, focusKey: string | null = null): TonnageBreakdown {
  const t = emptyTonnage();
  for (const e of focusedExercises(s, focusKey)) addExerciseTonnage(t, e);
  return t;
}

// ---------------------------------------------------------------------------
// Resumen

export interface Overview {
  sessions: number;
  strength: number;
  cardio: number;
  partial: number;
  incomplete: number;
  firstDate: string | null;
  lastDate: string | null;
  activeWeeks: number;
  durationTotal: number;
  durationKnown: number;
  cardioDistance: number;
  cardioDistanceKnown: number;
  cardioDuration: number;
  cardioDurationKnown: number;
  sets: number;
  exercisesDistinct: number;
  strengthWithoutSets: number;
  tonnage: TonnageBreakdown;
}

export function computeOverview(sessions: WorkoutSession[], focusKey: string | null): Overview {
  const o: Overview = {
    sessions: sessions.length,
    strength: 0,
    cardio: 0,
    partial: 0,
    incomplete: 0,
    firstDate: null,
    lastDate: null,
    activeWeeks: 0,
    durationTotal: 0,
    durationKnown: 0,
    cardioDistance: 0,
    cardioDistanceKnown: 0,
    cardioDuration: 0,
    cardioDurationKnown: 0,
    sets: 0,
    exercisesDistinct: 0,
    strengthWithoutSets: 0,
    tonnage: emptyTonnage(),
  };
  const weeks = new Set<string>();
  const exercises = new Set<string>();
  for (const s of sessions) {
    if (s.type === 'strength') o.strength += 1;
    else o.cardio += 1;
    if (s.partial) o.partial += 1;
    if (s.incomplete) o.incomplete += 1;
    if (o.firstDate === null || s.date < o.firstDate) o.firstDate = s.date;
    if (o.lastDate === null || s.date > o.lastDate) o.lastDate = s.date;
    weeks.add(weekStart(s.date));
    if (s.durationMin !== null) {
      o.durationTotal += s.durationMin;
      o.durationKnown += 1;
    }
    if (s.type === 'cardio') {
      if (s.distanceKm !== null) {
        o.cardioDistance += s.distanceKm;
        o.cardioDistanceKnown += 1;
      }
      if (s.durationMin !== null) {
        o.cardioDuration += s.durationMin;
        o.cardioDurationKnown += 1;
      }
    }
    const exs = focusedExercises(s, focusKey);
    let sessionSets = 0;
    for (const e of exs) {
      exercises.add(exerciseKey(e.name));
      sessionSets += e.sets.length;
      addExerciseTonnage(o.tonnage, e);
    }
    o.sets += sessionSets;
    if (s.type === 'strength' && sessionSets === 0) o.strengthWithoutSets += 1;
  }
  o.activeWeeks = weeks.size;
  o.exercisesDistinct = exercises.size;
  return o;
}

// ---------------------------------------------------------------------------
// Periodos

export type Period = 'week' | 'month';

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Lunes de la semana de la fecha (YYYY-MM-DD). */
export function weekStart(date: string): string {
  const ms = toUtc(date);
  const dow = (new Date(ms).getUTCDay() + 6) % 7;
  return fromUtc(ms - dow * DAY_MS);
}

function periodKey(date: string, period: Period): string {
  return period === 'week' ? weekStart(date) : date.slice(0, 7);
}

function nextPeriodKey(key: string, period: Period): string {
  if (period === 'week') return fromUtc(toUtc(key) + 7 * DAY_MS);
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function periodLabels(key: string, period: Period): { label: string; fullLabel: string } {
  if (period === 'week') {
    const [y, m, d] = key.split('-').map(Number);
    return { label: `${d} ${MONTHS[m - 1]}`, fullLabel: `Semana del ${d} ${MONTHS[m - 1]} ${y}` };
  }
  const [y, m] = key.split('-').map(Number);
  return { label: `${MONTHS[m - 1]} ${String(y).slice(2)}`, fullLabel: `${MONTHS_LONG[m - 1]} ${y}` };
}

/** Lista continua de periodos entre la primera y la última fecha (los últimos `max`). */
function periodRange(sessions: WorkoutSession[], period: Period, max: number): { keys: string[]; truncated: boolean } {
  if (sessions.length === 0) return { keys: [], truncated: false };
  let min = sessions[0].date;
  let maxDate = sessions[0].date;
  for (const s of sessions) {
    if (s.date < min) min = s.date;
    if (s.date > maxDate) maxDate = s.date;
  }
  const keys: string[] = [];
  const last = periodKey(maxDate, period);
  let key = periodKey(min, period);
  // límite de seguridad
  for (let i = 0; i < 2000; i += 1) {
    keys.push(key);
    if (key === last) break;
    key = nextPeriodKey(key, period);
  }
  if (keys.length > max) return { keys: keys.slice(-max), truncated: true };
  return { keys, truncated: false };
}

export interface ActivityBucket {
  key: string;
  label: string;
  fullLabel: string;
  strength: number;
  cardio: number;
  cardioSessions: number;
  cardioWithDistance: number;
  /** null si hubo sesiones de cardio pero ninguna con distancia anotada */
  distanceKm: number | null;
}

export function activityBuckets(
  sessions: WorkoutSession[],
  period: Period,
  max: number
): { buckets: ActivityBucket[]; truncated: boolean } {
  const { keys, truncated } = periodRange(sessions, period, max);
  const map = new Map<string, ActivityBucket>();
  for (const key of keys) {
    map.set(key, {
      key,
      ...periodLabels(key, period),
      strength: 0,
      cardio: 0,
      cardioSessions: 0,
      cardioWithDistance: 0,
      distanceKm: 0,
    });
  }
  for (const s of sessions) {
    const bucket = map.get(periodKey(s.date, period));
    if (!bucket) continue;
    if (s.type === 'strength') bucket.strength += 1;
    else {
      bucket.cardio += 1;
      bucket.cardioSessions += 1;
      if (s.distanceKm !== null) {
        bucket.cardioWithDistance += 1;
        bucket.distanceKm = (bucket.distanceKm ?? 0) + s.distanceKm;
      }
    }
  }
  const buckets = [...map.values()].map((b) =>
    b.cardioSessions > 0 && b.cardioWithDistance === 0 ? { ...b, distanceKm: null } : b
  );
  return { buckets, truncated };
}

// ---------------------------------------------------------------------------
// Grupos musculares

export interface GroupSeries {
  id: string;
  name: string;
  color: string;
}

export interface GroupTotal {
  name: string;
  color: string;
  sets: number;
  sessions: number;
  lastDate: string;
}

export interface MuscleTrends {
  series: GroupSeries[];
  buckets: Array<Record<string, string | number>>;
  totals: GroupTotal[];
  unassignedSets: number;
  truncated: boolean;
}

const OTHER_ID = 'gOther';

/** Asigna color a cada grupo según su volumen en TODO el historial (estable al filtrar). */
export function groupColorMap(allSessions: WorkoutSession[]): Map<string, { id: string; name: string; color: string }> {
  const totals = new Map<string, { name: string; sets: number }>();
  for (const s of allSessions) {
    for (const e of s.exercises) {
      if (!e.muscleGroup) continue;
      const key = normalizeText(e.muscleGroup);
      const current = totals.get(key);
      if (current) current.sets += e.sets.length;
      else totals.set(key, { name: e.muscleGroup, sets: e.sets.length });
    }
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1].sets - a[1].sets || a[1].name.localeCompare(b[1].name, 'es'));
  const result = new Map<string, { id: string; name: string; color: string }>();
  ranked.forEach(([key, value], index) => {
    if (index < GROUP_COLORS.length) {
      result.set(key, { id: `g${index}`, name: value.name, color: GROUP_COLORS[index] });
    } else {
      result.set(key, { id: OTHER_ID, name: 'Otros', color: OTHER_COLOR });
    }
  });
  return result;
}

export function muscleTrends(
  sessions: WorkoutSession[],
  allSessions: WorkoutSession[],
  period: Period,
  focusKey: string | null,
  max: number
): MuscleTrends {
  const colors = groupColorMap(allSessions);
  const { keys, truncated } = periodRange(sessions, period, max);
  const rows = new Map<string, Record<string, string | number>>();
  for (const key of keys) {
    const { label, fullLabel } = periodLabels(key, period);
    rows.set(key, { key, label, fullLabel });
  }
  const usedSeries = new Map<string, GroupSeries>();
  const totals = new Map<string, GroupTotal & { sessionIds: Set<string> }>();
  let unassignedSets = 0;

  for (const s of sessions) {
    const row = rows.get(periodKey(s.date, period));
    for (const e of focusedExercises(s, focusKey)) {
      if (e.sets.length === 0) continue;
      if (!e.muscleGroup) {
        unassignedSets += e.sets.length;
        continue;
      }
      const key = normalizeText(e.muscleGroup);
      const info = colors.get(key) ?? { id: OTHER_ID, name: 'Otros', color: OTHER_COLOR };
      usedSeries.set(info.id, { id: info.id, name: info.name, color: info.color });
      if (row) row[info.id] = (Number(row[info.id]) || 0) + e.sets.length;

      const total = totals.get(key);
      if (total) {
        total.sets += e.sets.length;
        total.sessionIds.add(s.id);
        if (s.date > total.lastDate) total.lastDate = s.date;
      } else {
        totals.set(key, {
          name: e.muscleGroup,
          color: info.color,
          sets: e.sets.length,
          sessions: 0,
          lastDate: s.date,
          sessionIds: new Set([s.id]),
        });
      }
    }
  }

  const series = [...usedSeries.values()].sort((a, b) => {
    if (a.id === OTHER_ID) return 1;
    if (b.id === OTHER_ID) return -1;
    return Number(a.id.slice(1)) - Number(b.id.slice(1));
  });
  // Rellena con 0 los periodos sin series de un grupo (0 series registradas es un dato real).
  const buckets = [...rows.values()].map((row) => {
    const filled = { ...row };
    for (const sr of series) if (filled[sr.id] === undefined) filled[sr.id] = 0;
    return filled;
  });

  return {
    series,
    buckets,
    totals: [...totals.values()]
      .map(({ sessionIds, ...rest }) => ({ ...rest, sessions: sessionIds.size }))
      .sort((a, b) => b.sets - a.sets),
    unassignedSets,
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Ejercicios: récords y progresión

export interface LoadRecord {
  weightKg: number;
  reps: number | null;
  date: string;
  side: Side | null;
}

export interface ProgressPoint {
  sessionId: string;
  date: string;
  /** Carga máxima en series bilaterales (o sin lado indicado) */
  top: number | null;
  left: number | null;
  right: number | null;
  maxReps: number | null;
  sets: number;
  machine: boolean;
}

export interface ExerciseStats {
  key: string;
  name: string;
  muscleGroups: string[];
  equipment: Equipment[];
  machine: boolean;
  freeWeight: boolean;
  unilateral: boolean;
  sessions: number;
  sets: number;
  firstDate: string;
  lastDate: string;
  bestLoad: LoadRecord | null;
  bestMachineLoad: LoadRecord | null;
  bestE1rm: { value: number; weightKg: number; reps: number; date: string } | null;
  bestReps: { reps: number; weightKg: number | null; date: string } | null;
  progression: ProgressPoint[];
}

/** 1RM estimado (Epley). Solo para 1–12 repeticiones. */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (reps < 1 || reps > 12 || weightKg <= 0) return null;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

function maxOrNull(current: number | null, value: number): number {
  return current === null || value > current ? value : current;
}

export function exerciseStats(sessions: WorkoutSession[]): ExerciseStats[] {
  const map = new Map<string, ExerciseStats>();
  const ordered = [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  for (const s of ordered) {
    const pointsInSession = new Map<string, ProgressPoint>();
    for (const e of s.exercises) {
      const key = exerciseKey(e.name);
      let st = map.get(key);
      if (!st) {
        st = {
          key,
          name: e.name,
          muscleGroups: [],
          equipment: [],
          machine: false,
          freeWeight: false,
          unilateral: false,
          sessions: 0,
          sets: 0,
          firstDate: s.date,
          lastDate: s.date,
          bestLoad: null,
          bestMachineLoad: null,
          bestE1rm: null,
          bestReps: null,
          progression: [],
        };
        map.set(key, st);
      }
      st.name = e.name; // nombre más reciente
      st.lastDate = s.date;
      if (e.muscleGroup && !st.muscleGroups.some((g) => normalizeText(g) === normalizeText(e.muscleGroup ?? ''))) {
        st.muscleGroups.push(e.muscleGroup);
      }
      if (e.equipment && !st.equipment.includes(e.equipment)) st.equipment.push(e.equipment);
      const machine = isMachineLoad(e.equipment);
      const nonLoad = isNonTonnageEquipment(e.equipment);
      if (machine) st.machine = true;
      else if (!nonLoad) st.freeWeight = true;

      let point = pointsInSession.get(key);
      if (!point) {
        point = { sessionId: s.id, date: s.date, top: null, left: null, right: null, maxReps: null, sets: 0, machine };
        pointsInSession.set(key, point);
        st.sessions += 1;
        st.progression.push(point);
      }
      if (machine) point.machine = true;

      for (const set of e.sets) {
        st.sets += 1;
        point.sets += 1;
        if (set.side !== null) st.unilateral = true;
        if (set.reps !== null) {
          point.maxReps = maxOrNull(point.maxReps, set.reps);
          if (!st.bestReps || set.reps > st.bestReps.reps) {
            st.bestReps = { reps: set.reps, weightKg: set.weightKg, date: s.date };
          }
        }
        if (set.weightKg === null || set.weightKg <= 0 || nonLoad) continue;
        const w = set.weightKg;
        if (set.side === 'left') point.left = maxOrNull(point.left, w);
        else if (set.side === 'right') point.right = maxOrNull(point.right, w);
        else point.top = maxOrNull(point.top, w);

        const record: LoadRecord = { weightKg: w, reps: set.reps, date: s.date, side: set.side };
        if (machine) {
          if (!st.bestMachineLoad || w > st.bestMachineLoad.weightKg) st.bestMachineLoad = record;
        } else {
          if (!st.bestLoad || w > st.bestLoad.weightKg) st.bestLoad = record;
          // 1RM estimado solo para peso libre bilateral con reps conocidas
          if (set.side === null && set.reps !== null) {
            const e1rm = estimateOneRepMax(w, set.reps);
            if (e1rm !== null && (!st.bestE1rm || e1rm > st.bestE1rm.value)) {
              st.bestE1rm = { value: e1rm, weightKg: w, reps: set.reps, date: s.date };
            }
          }
        }
      }
    }
  }

  return [...map.values()].sort((a, b) => b.sessions - a.sessions || (a.lastDate < b.lastDate ? 1 : -1));
}
