// Plan Media Maratón Alicante 2027: calendario fijo de 14 semanas.
// Es contenido estático (no datos registrados). Las distancias, los intervalos y los esfuerzos
// reproducen el plan acordado; aquí no se definen ritmos objetivo.

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
export type PlanItemRole = 'easy' | 'controlled' | 'long' | 'race' | 'torso-core' | 'torso-light' | 'full-body';

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

function buildWeek(spec: WeekSpec, index: number): PlanWeek {
  const number = index + 1;
  const start = addDays(PLAN_START, index * 7);
  const end = addDays(start, 6);
  const prefix = `w${String(number).padStart(2, '0')}`;
  const base = { week: number, optional: false, fixedDate: false, intervals: null, note: null };

  const items: PlanItem[] = [
    {
      ...base,
      id: `${prefix}-lun-fuerza`,
      date: start,
      kind: 'strength',
      role: 'torso-core',
      title: 'Fuerza · Torso + core',
      prescription: 'Torso + core, hasta 1 h. Ejercicios de torso habituales con el volumen justo.',
      effort: 'Técnica antes que carga; sin llegar al fallo',
      distanceKm: null,
    },
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
      id: `${prefix}-mie-fuerza`,
      date: addDays(start, 2),
      kind: 'strength',
      role: 'torso-light',
      title: 'Fuerza · Torso breve (opcional)',
      prescription: 'Torso ligero, 25–30 min, 2 series por ejercicio. Sin trabajo de pierna.',
      effort: 'RIR 3–4',
      distanceKm: null,
      optional: true,
      note: 'Es la primera sesión que se quita si la carga total afecta al sueño, la energía o las carreras.',
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
    {
      ...base,
      id: `${prefix}-vie-fuerza`,
      date: addDays(start, 4),
      kind: 'strength',
      role: 'full-body',
      title: 'Fuerza · General con pierna moderada',
      prescription: 'Fuerza general, hasta 1 h. Piernas con dosis moderada: 2–3 series por ejercicio.',
      effort: 'RIR 3; sin llegar al fallo',
      distanceKm: null,
      note: spec.race
        ? 'Semana de carrera: el plan no detalla un ajuste de fuerza. Aplica la regla general: ante la duda, quita las piernas.'
        : 'Si la tirada del domingo anterior dejó fatiga, quita las piernas esta semana.',
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
}

export const STRENGTH_SCHEDULE: StrengthSlot[] = [
  { day: 'Lunes', title: 'Torso + core', detail: 'Sesión principal de torso, hasta 1 h.', optional: false },
  {
    day: 'Miércoles',
    title: 'Torso breve y ligero',
    detail: '25–30 min, 2 series por ejercicio, RIR 3–4. Sin trabajo de pierna.',
    optional: true,
  },
  {
    day: 'Viernes',
    title: 'Fuerza general, pierna moderada',
    detail: 'Hasta 1 h. Piernas conservadoras: RIR 3, 2–3 series por ejercicio, sin llegar al fallo.',
    optional: false,
  },
  { day: 'Sábado', title: 'Descanso / movilidad', detail: 'Sin carga antes de la tirada larga del domingo.', optional: false },
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
    text: 'Si la carga total afecta al sueño, la energía o las carreras, quita primero la sesión del miércoles. Si la tirada del domingo deja fatiga, quita las piernas del viernes esa semana. No hagas ejercicios que provoquen dolor de rodilla.',
  },
];
