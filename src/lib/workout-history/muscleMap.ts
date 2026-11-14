// Cobertura de entrenamiento por grupo muscular, calculada solo con series de fuerza registradas.
// Mide cuántas series constan en el historial para cada grupo; no mide desarrollo, fuerza ni
// estado físico de ningún músculo. Las carreras, el plan y las series previstas no cuentan.

import { normalizeText } from './merge';
import { addDays, diffDays } from './plan';
import type { ExerciseEntry, WorkoutSession } from './types';

export const MUSCLE_IDS = [
  'pecho',
  'hombro',
  'biceps',
  'triceps',
  'antebrazo',
  'core',
  'espalda',
  'lumbar',
  'gluteo',
  'cuadriceps',
  'isquios',
  'aductores',
  'gemelos',
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  pecho: 'Pecho',
  hombro: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebrazo: 'Antebrazos',
  core: 'Core (abdomen y oblicuos)',
  espalda: 'Espalda (dorsal y zona alta)',
  lumbar: 'Lumbar',
  gluteo: 'Glúteos',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquiotibiales',
  aductores: 'Aductores',
  gemelos: 'Gemelos',
};

export const MUSCLE_SHORT_LABELS: Record<MuscleId, string> = {
  ...MUSCLE_LABELS,
  core: 'Core',
  espalda: 'Espalda',
};

/** Peso de una serie en la que el grupo figura como secundario. */
export const SECONDARY_WEIGHT = 0.5;

export const PERIOD_WEEKS = [4, 8, 12] as const;
export type PeriodWeeks = (typeof PERIOD_WEEKS)[number];

/** Por debajo de esto no se comparan grupos entre sí: no hay registro suficiente. */
export const MIN_SESSIONS_FOR_RANKING = 3;
export const MIN_SETS_FOR_RANKING = 12;

// ---------------------------------------------------------------------------
// Etiquetas de grupo → grupo del mapa

type TokenResolution = { kind: 'muscle'; id: MuscleId } | { kind: 'ignored' } | { kind: 'ambiguous' };

// Solo equivalencias directas. Las etiquetas genéricas («pierna», «torso», «brazo»…) no señalan
// un músculo concreto y se dejan sin atribuir en lugar de repartirlas a ojo.
const TOKEN_RULES: Array<[RegExp, TokenResolution]> = [
  [/^(pecho|pectoral(es)?|chest)$/, { kind: 'muscle', id: 'pecho' }],
  [/^(hombros?|deltoides?|shoulders?)$/, { kind: 'muscle', id: 'hombro' }],
  [/^(biceps|braquial)$/, { kind: 'muscle', id: 'biceps' }],
  [/^(triceps)$/, { kind: 'muscle', id: 'triceps' }],
  [/^(antebrazos?|forearms?|agarre)$/, { kind: 'muscle', id: 'antebrazo' }],
  [/^(core|abdomen|abdominal(es)?|abs|oblicuos?)$/, { kind: 'muscle', id: 'core' }],
  [/^(espalda|dorsal(es)?|lats?|trapecios?|romboides|espalda alta|back)$/, { kind: 'muscle', id: 'espalda' }],
  [/^(lumbar(es)?|espalda baja|erectores)$/, { kind: 'muscle', id: 'lumbar' }],
  [/^(gluteos?|glutes?|abductores?)$/, { kind: 'muscle', id: 'gluteo' }],
  [/^(cuadriceps|quads?)$/, { kind: 'muscle', id: 'cuadriceps' }],
  [/^(isquiotibiales|isquios?|femoral(es)?|hamstrings?)$/, { kind: 'muscle', id: 'isquios' }],
  [/^(aductores?)$/, { kind: 'muscle', id: 'aductores' }],
  [/^(gemelos?|pantorrillas?|soleo|calves)$/, { kind: 'muscle', id: 'gemelos' }],
  [/^(cardio|movilidad|estiramientos?|calentamiento|recuperacion)$/, { kind: 'ignored' }],
];

function resolveToken(token: string): TokenResolution {
  for (const [pattern, resolution] of TOKEN_RULES) if (pattern.test(token)) return resolution;
  return { kind: 'ambiguous' };
}

// Nombres de ejercicio inequívocos, usados solo cuando el registro no trae grupo muscular.
const NAME_RULES: Array<[RegExp, MuscleId]> = [
  [/curl femoral|curl de isquio/, 'isquios'],
  [/extension de cuadriceps|extension de rodilla|prensa|sentadilla|hack/, 'cuadriceps'],
  [/hip thrust|patada de gluteo|puente de gluteo/, 'gluteo'],
  [/gemelo/, 'gemelos'],
  [/press banca|press de pecho|press inclinado|aperturas de pecho/, 'pecho'],
  [/jalon|dominada|remo/, 'espalda'],
  [/press (de )?hombro|press militar|elevacion(es)? lateral(es)?/, 'hombro'],
  [/curl de biceps|curl predicador|curl martillo/, 'biceps'],
  [/extension de triceps|press frances|fondos de triceps/, 'triceps'],
  [/plancha|pallof|dead bug|crunch|abdominal/, 'core'],
];

export type AttributionSource = 'label' | 'name';

export interface ExerciseAttribution {
  /** Grupo principal (el primero de la etiqueta), o null si no se puede determinar */
  primary: MuscleId | null;
  /** Grupos secundarios: el resto de la etiqueta, sin repetir el principal */
  secondary: MuscleId[];
  source: AttributionSource | null;
  /** La etiqueta contiene algún término que no señala un músculo concreto */
  ambiguousTokens: string[];
  /** Trabajo que no es de fuerza (cardio, movilidad): no se cuenta ni se avisa */
  ignored: boolean;
}

/**
 * Reparte un ejercicio entre grupos del mapa. La etiqueta «pecho, tríceps, hombro» se lee como
 * principal + secundarios, en ese orden. Sin etiqueta, solo se usa el nombre si es inequívoco.
 */
export function attributeExercise(exercise: Pick<ExerciseEntry, 'name' | 'muscleGroup'>): ExerciseAttribution {
  const result: ExerciseAttribution = { primary: null, secondary: [], source: null, ambiguousTokens: [], ignored: false };
  const label = exercise.muscleGroup?.trim() ?? '';

  if (label) {
    const tokens = normalizeText(label)
      .split(/[,;/+&]|\s+y\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    let ignoredCount = 0;
    tokens.forEach((token, index) => {
      const resolution = resolveToken(token);
      if (resolution.kind === 'ignored') {
        ignoredCount += 1;
      } else if (resolution.kind === 'ambiguous') {
        result.ambiguousTokens.push(token);
      } else if (result.primary === null && index === 0) {
        result.primary = resolution.id;
      } else if (resolution.id !== result.primary && !result.secondary.includes(resolution.id)) {
        // Si el primer término era ambiguo, los demás se quedan como secundarios: no se asciende
        // ninguno a principal porque no consta cuál lo es.
        result.secondary.push(resolution.id);
      }
    });
    if (tokens.length > 0 && ignoredCount === tokens.length) {
      result.ignored = true;
      return result;
    }
    if (result.primary !== null || result.secondary.length > 0) result.source = 'label';
    return result;
  }

  const name = normalizeText(exercise.name);
  for (const [pattern, id] of NAME_RULES) {
    if (pattern.test(name)) {
      result.primary = id;
      result.source = 'name';
      break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Cobertura por periodo

export type CoverageStatus = 'most' | 'recorded' | 'least' | 'none' | 'insufficient';

export const COVERAGE_STATUS_LABELS: Record<CoverageStatus, string> = {
  most: 'Más trabajado en el registro',
  recorded: 'Con volumen registrado',
  least: 'Menor volumen registrado',
  none: 'Sin series registradas',
  insufficient: 'Datos insuficientes',
};

export interface MuscleExerciseShare {
  name: string;
  /** Series en las que el grupo es el principal */
  direct: number;
  /** Series en las que el grupo es secundario */
  indirect: number;
  inferredFromName: boolean;
}

export interface MuscleCoverage {
  id: MuscleId;
  label: string;
  direct: number;
  indirect: number;
  /** direct + SECONDARY_WEIGHT × indirect */
  weighted: number;
  weeklyWeighted: number;
  weeklyDirect: number;
  /** Sesiones distintas con alguna serie del grupo */
  sessions: number;
  lastDate: string | null;
  /** Series por semana del periodo, de la más antigua a la más reciente (ponderadas) */
  weekly: number[];
  /** 0 = sin series; 1–5 = tramo de intensidad relativo al grupo con más volumen del periodo */
  level: number;
  status: CoverageStatus;
  exercises: MuscleExerciseShare[];
}

export interface UnattributedExercise {
  name: string;
  label: string | null;
  sets: number;
}

export interface CoverageReport {
  weeks: PeriodWeeks;
  /** Primer y último día del periodo (ambos incluidos) */
  from: string;
  to: string;
  weekRanges: Array<{ start: string; end: string }>;
  muscles: MuscleCoverage[];
  byId: Record<MuscleId, MuscleCoverage>;
  /** Sesiones de fuerza del periodo con al menos una serie registrada */
  sessions: number;
  weeksWithRecords: number;
  totalSets: number;
  attributedSets: number;
  /** Series cuyo grupo principal no se pudo determinar */
  unattributedSets: number;
  unattributed: UnattributedExercise[];
  /** Series atribuidas por el nombre del ejercicio porque no tenían grupo */
  inferredSets: number;
  /** Series con algún término genérico en la etiqueta además de grupos reconocidos */
  partiallyAmbiguousSets: number;
  maxWeighted: number;
  /** false: hay tan poco registro que no se comparan grupos entre sí */
  rankable: boolean;
  /** Fecha de la primera sesión de fuerza con series en todo el historial */
  firstRecordDate: string | null;
}

function levelOf(weighted: number, max: number): number {
  if (weighted <= 0 || max <= 0) return 0;
  return Math.min(5, Math.max(1, Math.ceil((weighted / max) * 5)));
}

/**
 * Series de fuerza registradas por grupo en las últimas `weeks` semanas (periodo móvil que
 * termina hoy). Solo cuentan sesiones de tipo fuerza con fecha hasta hoy y series anotadas.
 */
export function computeMuscleCoverage(sessions: WorkoutSession[], today: string, weeks: PeriodWeeks): CoverageReport {
  const from = addDays(today, -(weeks * 7 - 1));
  const weekRanges = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(from, i * 7);
    return { start, end: addDays(start, 6) };
  });

  type Acc = {
    direct: number;
    indirect: number;
    sessionIds: Set<string>;
    lastDate: string | null;
    weekly: number[];
    exercises: Map<string, MuscleExerciseShare>;
  };
  const acc = new Map<MuscleId, Acc>(
    MUSCLE_IDS.map((id) => [
      id,
      { direct: 0, indirect: 0, sessionIds: new Set<string>(), lastDate: null, weekly: Array<number>(weeks).fill(0), exercises: new Map() },
    ])
  );
  const unattributed = new Map<string, UnattributedExercise>();
  const recordWeeks = new Set<number>();
  let sessionCount = 0;
  let totalSets = 0;
  let attributedSets = 0;
  let unattributedSets = 0;
  let inferredSets = 0;
  let partiallyAmbiguousSets = 0;
  let firstRecordDate: string | null = null;

  for (const session of sessions) {
    if (session.type !== 'strength' || session.date > today) continue;
    let sessionSetCount = 0;
    const inPeriod = session.date >= from;
    const weekIndex = inPeriod ? Math.floor(diffDays(from, session.date) / 7) : -1;

    for (const exercise of session.exercises) {
      const sets = exercise.sets.length;
      if (sets === 0) continue;
      const attribution = attributeExercise(exercise);
      if (attribution.ignored) continue;
      sessionSetCount += sets;
      if (!inPeriod) continue;

      totalSets += sets;
      const add = (id: MuscleId, kind: 'direct' | 'indirect') => {
        const entry = acc.get(id);
        if (!entry) return;
        entry[kind] += sets;
        entry.sessionIds.add(session.id);
        if (entry.lastDate === null || session.date > entry.lastDate) entry.lastDate = session.date;
        entry.weekly[weekIndex] += kind === 'direct' ? sets : sets * SECONDARY_WEIGHT;
        const key = normalizeText(exercise.name);
        const share = entry.exercises.get(key) ?? { name: exercise.name, direct: 0, indirect: 0, inferredFromName: false };
        share[kind] += sets;
        if (attribution.source === 'name') share.inferredFromName = true;
        entry.exercises.set(key, share);
      };

      if (attribution.primary !== null) {
        add(attribution.primary, 'direct');
        attributedSets += sets;
        if (attribution.source === 'name') inferredSets += sets;
        else if (attribution.ambiguousTokens.length > 0) partiallyAmbiguousSets += sets;
      } else {
        unattributedSets += sets;
        const key = `${normalizeText(exercise.name)}|${normalizeText(exercise.muscleGroup ?? '')}`;
        const current = unattributed.get(key);
        if (current) current.sets += sets;
        else unattributed.set(key, { name: exercise.name, label: exercise.muscleGroup, sets });
      }
      for (const id of attribution.secondary) add(id, 'indirect');
    }

    if (sessionSetCount > 0) {
      if (firstRecordDate === null || session.date < firstRecordDate) firstRecordDate = session.date;
      if (inPeriod) {
        sessionCount += 1;
        recordWeeks.add(weekIndex);
      }
    }
  }

  const rankable = sessionCount >= MIN_SESSIONS_FOR_RANKING && attributedSets >= MIN_SETS_FOR_RANKING;
  const weightedOf = (entry: Acc) => entry.direct + entry.indirect * SECONDARY_WEIGHT;
  const values = MUSCLE_IDS.map((id) => weightedOf(acc.get(id) as Acc));
  const maxWeighted = Math.max(0, ...values);
  const positives = values.filter((v) => v > 0);
  const minPositive = positives.length > 0 ? Math.min(...positives) : 0;
  // Solo se señalan extremos si hay diferencia real entre grupos con registro.
  const spread = positives.length >= 3 && maxWeighted > minPositive;

  const muscles = MUSCLE_IDS.map((id): MuscleCoverage => {
    const entry = acc.get(id) as Acc;
    const weighted = weightedOf(entry);
    let status: CoverageStatus;
    if (!rankable) status = weighted > 0 ? 'recorded' : 'insufficient';
    else if (weighted === 0) status = 'none';
    else if (spread && weighted === maxWeighted) status = 'most';
    else if (spread && weighted === minPositive) status = 'least';
    else status = 'recorded';
    return {
      id,
      label: MUSCLE_LABELS[id],
      direct: entry.direct,
      indirect: entry.indirect,
      weighted,
      weeklyWeighted: weighted / weeks,
      weeklyDirect: entry.direct / weeks,
      sessions: entry.sessionIds.size,
      lastDate: entry.lastDate,
      weekly: entry.weekly,
      level: levelOf(weighted, maxWeighted),
      status,
      exercises: [...entry.exercises.values()].sort(
        (a, b) => b.direct - a.direct || b.indirect - a.indirect || a.name.localeCompare(b.name, 'es')
      ),
    };
  });

  return {
    weeks,
    from,
    to: today,
    weekRanges,
    muscles,
    byId: Object.fromEntries(muscles.map((m) => [m.id, m])) as Record<MuscleId, MuscleCoverage>,
    sessions: sessionCount,
    weeksWithRecords: recordWeeks.size,
    totalSets,
    attributedSets,
    unattributedSets,
    unattributed: [...unattributed.values()].sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name, 'es')),
    inferredSets,
    partiallyAmbiguousSets,
    maxWeighted,
    rankable,
    firstRecordDate,
  };
}

/** Grupos ordenados de más a menos volumen ponderado; a igualdad, orden anatómico fijo. */
export function rankedMuscles(report: CoverageReport): MuscleCoverage[] {
  return [...report.muscles].sort(
    (a, b) => b.weighted - a.weighted || MUSCLE_IDS.indexOf(a.id) - MUSCLE_IDS.indexOf(b.id)
  );
}
