// Plan de fuerza semanal que acompaña al plan de media maratón: cinco sesiones distintas
// (lunes a viernes) alrededor de las tres carreras (martes, jueves y domingo).
// Es contenido estático: no son series registradas y nunca cuenta como volumen realizado.
// No fija cargas: la carga de partida es la del último registro propio que dejó margen.

export type StrengthSessionId = 'empuje' | 'brazos' | 'tiron' | 'core' | 'pierna';

export interface StrengthExercise {
  name: string;
  /** Alternativa equivalente si el aparato está ocupado o el gesto molesta */
  alternative: string | null;
  /** Grupo principal, con los mismos nombres que el mapa de músculos */
  target: string;
  /** Series de trabajo en una semana normal (sin contar aproximaciones) */
  sets: number;
  reps: string;
  rest: string;
  /** Repeticiones en reserva al terminar cada serie */
  rir: string;
  note: string | null;
  /** Trabajo de pierna: se quita primero si hay fatiga o molestia de rodilla */
  lowerBody: boolean;
}

export interface StrengthSession {
  id: StrengthSessionId;
  /** 0 = lunes … 4 = viernes */
  weekday: number;
  day: string;
  code: string;
  name: string;
  focus: string;
  duration: string;
  /** Coincide con una carrera el mismo día */
  runDay: boolean;
  /** Regla de colocación en la semana */
  placement: string;
  exercises: StrengthExercise[];
}

const ex = (
  name: string,
  target: string,
  sets: number,
  reps: string,
  rest: string,
  rir: string,
  extra: { alternative?: string; note?: string; lowerBody?: boolean } = {}
): StrengthExercise => ({
  name,
  target,
  sets,
  reps,
  rest,
  rir,
  alternative: extra.alternative ?? null,
  note: extra.note ?? null,
  lowerBody: extra.lowerBody === true,
});

/** Horas mínimas recomendadas entre la carrera y la fuerza del mismo día. */
export const DOUBLE_DAY_GAP_HOURS = 6;

export const STRENGTH_SESSIONS: StrengthSession[] = [
  {
    id: 'empuje',
    weekday: 0,
    day: 'Lunes',
    code: 'A',
    name: 'Empuje: pecho, hombro y tríceps',
    focus: 'Sesión principal de empuje, con un bloque corto de core antirrotación.',
    duration: '35–45 min',
    runDay: false,
    placement: 'El día después de la tirada larga: todo el trabajo es de torso y sentado o apoyado, sin carga en las piernas.',
    exercises: [
      ex('Press inclinado en máquina o con mancuernas', 'Pecho', 3, '8–10', '2 min', '3', {
        note: 'Ejercicio principal del día: 1–2 series de aproximación antes.',
      }),
      ex('Press de hombros en máquina', 'Hombro', 2, '10–12', '90 s', '3', { alternative: 'Press de hombros sentado con mancuernas' }),
      ex('Aperturas de pecho en polea', 'Pecho', 2, '12–15', '60–75 s', '3'),
      ex('Elevación lateral en polea', 'Hombro', 2, '12–15', '60 s', '3', { alternative: 'Elevaciones laterales con mancuernas' }),
      ex('Extensión de tríceps con cuerda', 'Tríceps', 2, '12–15', '60 s', '3'),
      ex('Pallof press', 'Core', 2, '10 por lado', '45–60 s', '3–4'),
    ],
  },
  {
    id: 'brazos',
    weekday: 1,
    day: 'Martes',
    code: 'B',
    name: 'Accesorios de brazo y hombro posterior',
    focus: 'Sesión corta y ligera de brazos. Nada que deje fatiga para el jueves.',
    duration: '20–25 min',
    runDay: true,
    placement: `Día de rodaje: sepárala de la carrera al menos ${DOUBLE_DAY_GAP_HOURS} horas. Si solo cabe una de las dos, se hace la carrera.`,
    exercises: [
      ex('Face pull con cuerda', 'Hombro', 2, '15', '60 s', '4'),
      ex('Curl de bíceps en polea baja', 'Bíceps', 2, '12', '60 s', '4', { alternative: 'Curl de bíceps con mancuernas' }),
      ex('Curl martillo', 'Bíceps', 2, '12', '60 s', '4'),
      ex('Extensión de tríceps en máquina', 'Tríceps', 2, '12–15', '60 s', '4'),
    ],
  },
  {
    id: 'tiron',
    weekday: 2,
    day: 'Miércoles',
    code: 'C',
    name: 'Tirón: espalda y bíceps',
    focus: 'Sesión principal de tirón, con apoyo de pecho para no cargar la zona lumbar.',
    duration: '35–45 min',
    runDay: false,
    placement: 'Entre los dos rodajes: torso solamente, para llegar al jueves con las piernas frescas.',
    exercises: [
      ex('Jalón al pecho con agarre neutro', 'Espalda', 3, '10–12', '2 min', '3', {
        note: 'Ejercicio principal del día: 1–2 series de aproximación antes.',
      }),
      ex('Remo con pecho apoyado', 'Espalda', 3, '10–12', '90 s–2 min', '3', { alternative: 'Remo sentado en máquina' }),
      ex('Dominadas asistidas', 'Espalda', 2, '6–10', '2 min', '3', {
        alternative: 'Jalón al pecho con agarre ancho',
        note: 'Ajusta la asistencia para acabar con margen; no se busca la última repetición.',
      }),
      ex('Pájaros en peck-deck', 'Hombro', 2, '12–15', '60 s', '3'),
      ex('Curl predicador con barra EZ', 'Bíceps', 2, '10–12', '60–75 s', '3'),
      ex('Dead bug', 'Core', 2, '8 por lado', '45 s', '3–4', { alternative: 'Plancha frontal, 30–40 s' }),
    ],
  },
  {
    id: 'core',
    weekday: 3,
    day: 'Jueves',
    code: 'D',
    name: 'Core y estabilidad de cadera',
    focus: 'Sesión corta de control de tronco y cadera, pensada para sostener la zancada sin cargar la rodilla.',
    duration: '20–25 min',
    runDay: true,
    placement: `Día de rodaje: sepárala de la carrera al menos ${DOUBLE_DAY_GAP_HOURS} horas. Si solo cabe una de las dos, se hace la carrera.`,
    exercises: [
      ex('Pallof press', 'Core', 2, '10 por lado', '45–60 s', '4'),
      ex('Plancha lateral', 'Core', 2, '20–30 s por lado', '45 s', '4', {
        note: 'Con las rodillas apoyadas si la versión completa no sale estable.',
      }),
      ex('Abducción de cadera en máquina', 'Glúteo', 2, '15', '60 s', '4', {
        note: 'Carga ligera y recorrido cómodo; es activación, no trabajo pesado.',
        lowerBody: true,
      }),
      ex('Elevaciones laterales con mancuernas', 'Hombro', 2, '12–15', '60 s', '4'),
    ],
  },
  {
    id: 'pierna',
    weekday: 4,
    day: 'Viernes',
    code: 'E',
    name: 'Pierna de baja fatiga + torso',
    focus: 'Pierna en máquinas con recorrido controlado y dosis mínima, más dos básicos de torso.',
    duration: '35–45 min',
    runDay: false,
    placement:
      'Dos días antes de la tirada larga: solo dos series por ejercicio de pierna, lejos del fallo y sin ejercicios que dejen agujetas (nada de zancadas, saltos ni peso muerto pesado).',
    exercises: [
      ex('Prensa', 'Cuádriceps', 2, '10–12', '2 min', '3–4', {
        note: 'Solo el recorrido que la rodilla tolera sin dolor; bajada lenta y sin rebote.',
        lowerBody: true,
      }),
      ex('Curl femoral sentado', 'Isquiotibiales', 2, '10–12', '90 s', '3', { lowerBody: true }),
      ex('Hip thrust en máquina', 'Glúteo', 2, '8–10', '90 s', '3', { lowerBody: true }),
      ex('Gemelos de pie', 'Gemelos', 2, '12–15', '60 s', '3', {
        note: 'Subida y bajada controladas, sin rebotar abajo.',
        lowerBody: true,
      }),
      ex('Press de pecho en máquina', 'Pecho', 2, '10–12', '90 s', '3', { alternative: 'Press banca con barra, sin apurar' }),
      ex('Remo sentado', 'Espalda', 2, '10–12', '90 s', '3'),
    ],
  },
];

export const STRENGTH_SESSION_BY_ID: ReadonlyMap<StrengthSessionId, StrengthSession> = new Map(
  STRENGTH_SESSIONS.map((s) => [s.id, s])
);

export const REST_DAY = {
  day: 'Sábado',
  title: 'Descanso completo',
  detail: 'Sin fuerza y sin carrera. Como mucho, un paseo suave o 10 min de movilidad, para llegar fresco a la tirada larga del domingo.',
} as const;

export function sessionSets(session: StrengthSession): number {
  return session.exercises.reduce((acc, e) => acc + e.sets, 0);
}

export function sessionLowerBodySets(session: StrengthSession): number {
  return session.exercises.reduce((acc, e) => acc + (e.lowerBody ? e.sets : 0), 0);
}

export interface PlannedGroupVolume {
  target: string;
  sets: number;
}

/** Series directas previstas por grupo principal en una semana normal (plan, no registro). */
export function plannedWeeklyVolume(): PlannedGroupVolume[] {
  const totals = new Map<string, number>();
  for (const session of STRENGTH_SESSIONS) {
    for (const e of session.exercises) totals.set(e.target, (totals.get(e.target) ?? 0) + e.sets);
  }
  return [...totals.entries()]
    .map(([target, sets]) => ({ target, sets }))
    .sort((a, b) => b.sets - a.sets || a.target.localeCompare(b.target, 'es'));
}

export const WEEKLY_STRENGTH_SETS = STRENGTH_SESSIONS.reduce((acc, s) => acc + sessionSets(s), 0);

// ---------------------------------------------------------------------------
// Fases: cómo cambia la dosis de fuerza a lo largo de las 14 semanas

export type StrengthPhaseKind = 'base' | 'build' | 'hold' | 'deload' | 'race';

export interface StrengthPhase {
  kind: StrengthPhaseKind;
  label: string;
  /** Texto corto para la tarjeta de cada sesión */
  dose: string;
}

const PHASES: Record<StrengthPhaseKind, StrengthPhase> = {
  base: {
    kind: 'base',
    label: 'Base',
    dose: 'Series y repeticiones tal como figuran, con la carga de tu último registro que dejara margen. RIR 3 (RIR 4 en los días de carrera).',
  },
  build: {
    kind: 'build',
    label: 'Progresión',
    dose: 'Sube la carga solo en los ejercicios que cumplan la regla de progresión. Como mucho, una serie más en los dos ejercicios principales de torso; en pierna no se añaden series.',
  },
  hold: {
    kind: 'hold',
    label: 'Mantenimiento',
    dose: 'Semanas de más kilómetros: mismas series y cargas que ya domines, sin añadir nada. La prioridad es llegar bien a las tiradas largas.',
  },
  deload: {
    kind: 'deload',
    label: 'Descarga',
    dose: 'Una serie menos en cada ejercicio (mínimo una) con la misma carga y RIR 4. No se prueban cargas nuevas.',
  },
  race: {
    kind: 'race',
    label: 'Semana de carrera',
    dose: 'Una serie menos en cada ejercicio, RIR 4 y nada nuevo. Jueves y viernes son opcionales y el viernes va sin pierna.',
  },
};

/** Fase de fuerza de cada semana del plan (1–14), alineada con las descargas de carrera. */
export function strengthPhaseOf(week: number): StrengthPhase {
  if (week >= 14) return PHASES.race;
  if (week === 5 || week === 9 || week === 13) return PHASES.deload;
  if (week <= 4) return PHASES.base;
  if (week <= 8) return PHASES.build;
  return PHASES.hold;
}

export const STRENGTH_PHASE_TABLE: Array<{ weeks: string; phase: StrengthPhase }> = [
  { weeks: 'Semanas 1–4', phase: PHASES.base },
  { weeks: 'Semanas 6–8', phase: PHASES.build },
  { weeks: 'Semanas 10–12', phase: PHASES.hold },
  { weeks: 'Semanas 5, 9 y 13', phase: PHASES.deload },
  { weeks: 'Semana 14', phase: PHASES.race },
];

export const STRENGTH_PRINCIPLES: Array<{ title: string; text: string }> = [
  {
    title: 'Nunca al fallo',
    text: 'Cada serie termina con unas 3 repeticiones en reserva (RIR 3); en las sesiones de martes y jueves, con 4. Si la última repetición se frena o cambia la técnica, la serie acaba ahí.',
  },
  {
    title: 'Rodilla: recorrido controlado y sin dolor',
    text: 'Máquinas siempre que se pueda, bajadas lentas y solo el recorrido que no molesta. Si un ejercicio provoca dolor de rodilla, se cambia por su alternativa o se quita ese día; no se aguanta.',
  },
  {
    title: 'Dobles de martes y jueves',
    text: `Carrera y fuerza separadas al menos ${DOUBLE_DAY_GAP_HOURS} horas, con una comida entre medias. La carrera manda: la fuerza de esos días es corta, ligera y sin trabajo que canse las piernas.`,
  },
  {
    title: 'Viernes al servicio del domingo',
    text: 'La pierna del viernes es de dosis mínima. Si la tirada larga anterior dejó fatiga o la rodilla está sensible, se hace solo el torso de esa sesión.',
  },
  {
    title: 'Sábado, descanso completo',
    text: 'Ni fuerza ni carrera. Las sesiones que no se hayan hecho no se recuperan el sábado.',
  },
  {
    title: 'La fuerza no añade carrera',
    text: 'Este plan no cambia los kilómetros ni la intensidad de los rodajes: las tres carreras siguen exactamente como estaban.',
  },
];

export const STRENGTH_PROGRESSION: Array<{ title: string; text: string }> = [
  {
    title: 'Carga de partida',
    text: 'Empieza cada ejercicio con la carga de tu último registro que te dejara claramente 3 repeticiones en reserva. Si dudas entre dos cargas, la más baja.',
  },
  {
    title: 'Cuándo subir',
    text: 'Cuando completes todas las series en la parte alta del rango de repeticiones con RIR 3 o más en dos sesiones seguidas, sube el menor salto disponible (una placa o 1–2,5 kg) y vuelve a la parte baja del rango.',
  },
  {
    title: 'Solo si la recuperación acompaña',
    text: 'Se progresa únicamente si duermes bien, los rodajes salen a su esfuerzo habitual y la rodilla no ha dado señales esa semana. Si falla alguna de las tres, se repite la carga.',
  },
  {
    title: 'Volumen',
    text: 'El número de series no sube en las cuatro primeras semanas. Después, como máximo una serie más en los dos ejercicios principales de torso (lunes y miércoles). La pierna se queda en dos series por ejercicio todo el plan.',
  },
  {
    title: 'Qué se quita primero',
    text: 'Si la carga total afecta al sueño, la energía o las carreras: primero las sesiones cortas de martes y jueves, después la pierna del viernes. Las carreras son lo último que se toca.',
  },
];
