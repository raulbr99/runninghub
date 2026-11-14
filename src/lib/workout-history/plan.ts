// Plan Media Maratón Alicante 2027: calendario fijo de 14 semanas.
// Es contenido estático (no datos registrados). Las distancias, los intervalos y los esfuerzos
// reproducen el plan acordado; aquí no se definen ritmos objetivo.
// La fuerza (cinco sesiones, de lunes a viernes) se detalla en strengthPlan.ts.

import {
  DOUBLE_DAY_GAP_HOURS,
  REST_DAY,
  STRENGTH_SESSIONS,
  sessionSets,
  strengthPhaseOf,
  type StrengthSession,
  type StrengthSessionId,
} from './strengthPlan';

export const PLAN_ID = 'media-maraton-alicante-2027';
export const PLAN_NAME = 'Plan Media Maratón Alicante 2027';
export const PLAN_START = '2026-11-16';
export const RACE_DATE = '2027-02-21';
export const RACE_TIME = '09:30';
export const RACE_DISTANCE_KM = 21.1;

export const EFFORT_EASY = 'Esfuerzo conversacional · RPE 3–4/10';
export const EFFORT_VERY_EASY = 'Muy fácil · RPE 3/10 o menos';
export const EFFORT_CONTROLLED = 'Fácil (RPE 3–4/10) con tramos controlados a RPE 6/10, nunca sprint';
export const EFFORT_RACE = 'Salida conservadora, ritmo por esfuerzo; pausas andando planificadas si ayudan';

const DAY_MS = 86_400_000;
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ---------------------------------------------------------------------------
// Fechas locales YYYY-MM-DD (aritmética en UTC para evitar saltos por cambio de hora)

export function dateToUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function utcToDate(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
  return utcToDate(dateToUtc(date) + days * DAY_MS);
}

/** Días de `from` a `to` (positivo si `to` es posterior). */
export function diffDays(from: string, to: string): number {
  return Math.round((dateToUtc(to) - dateToUtc(from)) / DAY_MS);
}

/** Lunes de la semana de la fecha. */
export function mondayOf(date: string): string {
  const ms = dateToUtc(date);
  const dow = (new Date(ms).getUTCDay() + 6) % 7;
  return utcToDate(ms - dow * DAY_MS);
}

/** 0 = lunes … 6 = domingo */
export function weekdayIndex(date: string): number {
  return (new Date(dateToUtc(date)).getUTCDay() + 6) % 7;
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return utcToDate(dateToUtc(value)) === value;
}

/** "16–22 nov" o "30 nov–6 dic" */
export function formatRange(start: string, end: string): string {
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  if (sm === em) return `${sd}–${ed} ${MONTHS_SHORT[em - 1]}`;
  return `${sd} ${MONTHS_SHORT[sm - 1]}–${ed} ${MONTHS_SHORT[em - 1]}`;
}

// ---------------------------------------------------------------------------
// Modelo

export type PlanItemKind = 'run' | 'strength';
export type PlanItemRole = 'easy' | 'controlled' | 'long' | 'race' | 'strength';

export interface PlanItem {
  id: string;
  week: number;
  /** Fecha prevista en el plan (YYYY-MM-DD) */
  date: string;
  kind: PlanItemKind;
  role: PlanItemRole;
  title: string;
  /** Prescripción: distancia, intervalos o contenido de la sesión */
  prescription: string;
  effort: string;
  /** Solo carreras */
  distanceKm: number | null;
  /** Texto de los intervalos controlados, si los hay */
  intervals: string | null;
  note: string | null;
  /** Las sesiones opcionales no cuentan como no realizadas ni en el cumplimiento */
  optional: boolean;
  /** La carrera tiene fecha fija y no se puede reprogramar */
  fixedDate: boolean;
  /** Solo fuerza: sesión del plan de fuerza a la que corresponde */
  strengthSession: StrengthSessionId | null;
  /** Solo fuerza: coincide con una carrera prevista el mismo día */
  sameDayAsRun: boolean;
}

export interface PlanRestDay {
  date: string;
  title: string;
  detail: string;
}

export interface PlanWeek {
  number: number;
  start: string;
  end: string;
  rangeLabel: string;
  deload: boolean;
  race: boolean;
  note: string | null;
  /** Km de carrera previstos en la semana (incluye la carrera en la semana 14) */
  plannedRunKm: number;
  /** Km previstos entre semana (martes + jueves) */
  plannedMidweekKm: number;
  plannedSundayKm: number;
  /** Sábado: descanso completo. No es una sesión: ni se marca ni cuenta en el cumplimiento. */
  restDay: PlanRestDay;
  items: PlanItem[];
}

interface WeekSpec {
  tue: number;
  thu: number;
  thuIntervals?: string;
  thuVeryEasy?: boolean;
  sun: number;
  sunNote?: string;
  deload?: boolean;
  race?: boolean;
}

// Tabla semana a semana, tal cual figura en el plan acordado.
const WEEK_SPECS: WeekSpec[] = [
  { tue: 2.5, thu: 3, sun: 5 },
  { tue: 3, thu: 3.5, sun: 6 },
  { tue: 3.5, thu: 4, sun: 7 },
  { tue: 3.5, thu: 4, sun: 8 },
  { tue: 3, thu: 3.5, sun: 6.5, deload: true },
  { tue: 4, thu: 4, thuIntervals: '3 × 3 min controlado / 2 min suave', sun: 9 },
  { tue: 4, thu: 4.5, sun: 10 },
  { tue: 4.5, thu: 5, thuIntervals: '3 × 4 min controlado / 2 min suave', sun: 11 },
  { tue: 4, thu: 4.5, sun: 8, deload: true },
  { tue: 5, thu: 5, thuIntervals: '3 × 5 min controlado / 3 min suave', sun: 12 },
  { tue: 5, thu: 5.5, sun: 14 },
  { tue: 4.5, thu: 5, thuIntervals: '3 × 4 min controlado / 3 min suave', sun: 15, sunNote: 'Máximo del plan; solo si va cómodo' },
  { tue: 4, thu: 4, sun: 8, deload: true },
  { tue: 3, thu: 3, thuVeryEasy: true, sun: RACE_DISTANCE_KM, race: true },
];

export const PLAN_WEEK_COUNT = WEEK_SPECS.length;

function km(value: number): string {
  return `${String(value).replace('.', ',')} km`;
}

// Identificadores históricos de las sesiones de fuerza: lunes, miércoles y viernes conservan
// el suyo para que las marcas y reprogramaciones ya guardadas sigan valiendo.
const STRENGTH_ITEM_SUFFIX = ['lun-fuerza', 'mar-fuerza', 'mie-fuerza', 'jue-fuerza', 'vie-fuerza'];

function strengthItem(session: StrengthSession, spec: WeekSpec, number: number, start: string, prefix: string): PlanItem {
  const phase = strengthPhaseOf(number);
  const reduced = phase.kind === 'deload' || phase.kind === 'race';
  const sets = session.exercises.reduce((acc, e) => acc + (reduced ? Math.max(1, e.sets - 1) : e.sets), 0);
  const raceWeek = spec.race === true;
  // Semana de carrera: jueves y viernes pasan a ser opcionales y el viernes va sin pierna.
  const optional = raceWeek && session.weekday >= 3;
  const noLegs = raceWeek && session.id === 'pierna';
  const effort = session.runDay || reduced ? 'RIR 4; sin llegar al fallo' : 'RIR 3; sin llegar al fallo';

  const notes: string[] = [];
  if (session.runDay) {
    notes.push(`Mismo día que la carrera: sepáralas al menos ${DOUBLE_DAY_GAP_HOURS} horas. Si solo cabe una, la carrera.`);
  }
  if (noLegs) notes.push('Semana de carrera: solo los ejercicios de torso, o descanso. Nada de pierna a dos días de la media maratón.');
  else if (optional) notes.push('Semana de carrera: opcional. Ante la duda, descansa.');
  else if (session.id === 'pierna') {
    notes.push('Si la tirada del domingo anterior dejó fatiga o la rodilla está sensible, haz solo el torso de esta sesión.');
  }
  if (phase.kind === 'deload') notes.push('Semana de descarga: una serie menos por ejercicio, misma carga.');

  return {
    id: `${prefix}-${STRENGTH_ITEM_SUFFIX[session.weekday]}`,
    week: number,
    date: addDays(start, session.weekday),
    kind: 'strength',
    role: 'strength',
    title: `Fuerza ${session.code} · ${session.name}${optional ? ' (opcional)' : ''}`,
    prescription: noLegs
      ? `${session.exercises.filter((e) => !e.lowerBody).length} ejercicios de torso · unos 15 min · sin pierna`
      : `${session.exercises.length} ejercicios · ${sets} series${reduced ? ' (dosis reducida)' : ''} · ${session.duration}`,
    effort,
    distanceKm: null,
    intervals: null,
    note: notes.length > 0 ? notes.join(' ') : null,
    optional,
    fixedDate: false,
    strengthSession: session.id,
    sameDayAsRun: session.runDay,
  };
}

function buildWeek(spec: WeekSpec, index: number): PlanWeek {
  const number = index + 1;
  const start = addDays(PLAN_START, index * 7);
  const end = addDays(start, 6);
  const prefix = `w${String(number).padStart(2, '0')}`;
  const base = {
    week: number,
    optional: false,
    fixedDate: false,
    intervals: null,
    note: null,
    strengthSession: null,
    sameDayAsRun: false,
  };

  const runs: PlanItem[] = [
    {
      ...base,
      id: `${prefix}-mar-carrera`,
      date: addDays(start, 1),
      kind: 'run',
      role: 'easy',
      title: 'Rodaje fácil',
      prescription: `${km(spec.tue)} fácil`,
      effort: EFFORT_EASY,
      distanceKm: spec.tue,
    },
    {
      ...base,
      id: `${prefix}-jue-carrera`,
      date: addDays(start, 3),
      kind: 'run',
      role: spec.thuIntervals ? 'controlled' : 'easy',
      title: spec.thuIntervals ? 'Rodaje con tramos controlados' : spec.thuVeryEasy ? 'Rodaje muy fácil' : 'Rodaje fácil',
      prescription: spec.thuIntervals
        ? `${km(spec.thu)} con ${spec.thuIntervals}`
        : `${km(spec.thu)} ${spec.thuVeryEasy ? 'muy fácil' : 'fácil'}`,
      effort: spec.thuIntervals ? EFFORT_CONTROLLED : spec.thuVeryEasy ? EFFORT_VERY_EASY : EFFORT_EASY,
      distanceKm: spec.thu,
      intervals: spec.thuIntervals ?? null,
    },
    spec.race
      ? {
          ...base,
          id: `${prefix}-dom-carrera`,
          date: addDays(start, 6),
          kind: 'run',
          role: 'race',
          title: 'Media Maratón de Alicante',
          prescription: `Carrera: ${km(spec.sun)} · salida ${RACE_TIME}`,
          effort: EFFORT_RACE,
          distanceKm: spec.sun,
          fixedDate: true,
        }
      : {
          ...base,
          id: `${prefix}-dom-carrera`,
          date: addDays(start, 6),
          kind: 'run',
          role: 'long',
          title: spec.deload ? 'Tirada larga (descarga)' : 'Tirada larga',
          prescription: `${km(spec.sun)}${spec.deload ? ' · descarga' : ''}`,
          effort: EFFORT_EASY,
          distanceKm: spec.sun,
          note: spec.sunNote ?? null,
        },
  ];
  const strength = STRENGTH_SESSIONS.map((session) => strengthItem(session, spec, number, start, prefix));
  // Orden cronológico; en los días dobles la carrera va primero porque es la prioridad.
  const items = [...runs, ...strength].sort(
    (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || Number(a.kind === 'strength') - Number(b.kind === 'strength')
  );

  return {
    number,
    start,
    end,
    rangeLabel: formatRange(start, end),
    deload: spec.deload === true,
    race: spec.race === true,
    note: spec.sunNote ?? null,
    plannedRunKm: Math.round((spec.tue + spec.thu + spec.sun) * 10) / 10,
    plannedMidweekKm: Math.round((spec.tue + spec.thu) * 10) / 10,
    plannedSundayKm: spec.sun,
    restDay: { date: addDays(start, 5), title: REST_DAY.title, detail: REST_DAY.detail },
    items,
  };
}

export const PLAN_WEEKS: PlanWeek[] = WEEK_SPECS.map(buildWeek);
export const PLAN_ITEMS: PlanItem[] = PLAN_WEEKS.flatMap((w) => w.items);
export const PLAN_ITEM_BY_ID: ReadonlyMap<string, PlanItem> = new Map(PLAN_ITEMS.map((i) => [i.id, i]));

/** Semana del plan que contiene la fecha, o null si queda fuera del plan. */
export function planWeekOf(date: string): PlanWeek | null {
  if (date < PLAN_START || date > RACE_DATE) return null;
  return PLAN_WEEKS[Math.floor(diffDays(PLAN_START, date) / 7)] ?? null;
}

// ---------------------------------------------------------------------------
// Textos fijos del plan

export interface StrengthSlot {
  day: string;
  title: string;
  detail: string;
  optional: boolean;
  /** Coincide con una carrera el mismo día */
  runDay: boolean;
}

export const STRENGTH_SCHEDULE: StrengthSlot[] = [
  ...STRENGTH_SESSIONS.map((session) => ({
    day: session.day,
    title: `${session.code} · ${session.name}`,
    detail: `${session.duration} · ${sessionSets(session)} series · ${session.runDay ? 'RIR 4' : 'RIR 3'}.${
      session.runDay ? ` Separada de la carrera al menos ${DOUBLE_DAY_GAP_HOURS} h.` : ''
    }`,
    optional: false,
    runDay: session.runDay,
  })),
  { day: REST_DAY.day, title: REST_DAY.title, detail: REST_DAY.detail, optional: false, runDay: false },
];

export const GUARDRAILS: Array<{ title: string; text: string }> = [
  {
    title: 'Rodilla',
    text: 'Si aparece dolor de rodilla por encima de 3/10, cambia la zancada o al día siguiente está peor: para la carrera y sustitúyela por paseo o bici suave. No avances de semana hasta estar sin síntomas.',
  },
  {
    title: 'Semana perdida o demasiado exigente',
    text: 'Repite la semana o baja el volumen antes de avanzar. Nunca recuperes kilómetros de golpe.',
  },
  {
    title: 'Impacto progresivo',
    text: 'No aumentes distancia e intensidad a la vez. Terreno llano y cómodo, sobre todo en la tirada larga. Caminar en cuestas o hacer pausas breves está permitido.',
  },
  {
    title: 'Antes y después',
    text: '5–8 min caminando o al trote muy suave. Si hace falta, empieza con 3 min corriendo / 1 min andando y alarga los tramos solo si no hay dolor durante la salida ni empeora al día siguiente.',
  },
  {
    title: 'Fuerza al servicio de la carrera',
    text: 'Si la carga total afecta al sueño, la energía o las carreras, quita primero las sesiones cortas de martes y jueves. Si la tirada del domingo deja fatiga, quita las piernas del viernes esa semana. No hagas ejercicios que provoquen dolor de rodilla y no lleves ninguna serie al fallo.',
  },
  {
    title: 'Días con carrera y fuerza',
    text: `Martes y jueves, separa la carrera y la fuerza al menos ${DOUBLE_DAY_GAP_HOURS} horas. El sábado es descanso completo: no se usa para recuperar sesiones.`,
  },
];
