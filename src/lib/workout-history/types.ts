// Modelo de datos del historial de entrenamientos local.
// Todo se guarda solo en localStorage del navegador; nunca se envía al servidor.

export const HISTORY_SCHEMA_VERSION = 1;
export const HISTORY_STORAGE_KEY = 'runninghub.workoutHistory.v1';

export type SessionType = 'strength' | 'cardio';

export const EQUIPMENT_VALUES = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'bodyweight',
  'band',
  'other',
] as const;

export type Equipment = (typeof EQUIPMENT_VALUES)[number];

export const SIDE_VALUES = ['left', 'right'] as const;
export type Side = (typeof SIDE_VALUES)[number];

export interface ExerciseSet {
  /** Repeticiones realizadas. null = no registrado. */
  reps: number | null;
  /** Carga en kg tal como se anotó. null = no registrado; 0 = sin carga externa. */
  weightKg: number | null;
  /** Solo para trabajo unilateral: lado del cuerpo. null = bilateral / no indicado. */
  side: Side | null;
}

export interface ExerciseEntry {
  name: string;
  muscleGroup: string | null;
  equipment: Equipment | null;
  notes: string | null;
  sets: ExerciseSet[];
}

export interface WorkoutSession {
  id: string;
  /** Fecha local YYYY-MM-DD */
  date: string;
  type: SessionType;
  /** Categoría libre, p. ej. "Pierna", "Carrera", "Bici" */
  category: string | null;
  title: string;
  /** La sesión no se completó entera */
  partial: boolean;
  /** Al registro le faltan datos (series, pesos, tiempos…) */
  incomplete: boolean;
  durationMin: number | null;
  distanceKm: number | null;
  notes: string | null;
  exercises: ExerciseEntry[];
}

export interface HistoryFile {
  version: typeof HISTORY_SCHEMA_VERSION;
  exportedAt?: string;
  sessions: WorkoutSession[];
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  kettlebell: 'Kettlebell',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  band: 'Banda',
  other: 'Otro',
};

export const SIDE_LABELS: Record<Side, string> = {
  left: 'Izq.',
  right: 'Der.',
};

export const TYPE_LABELS: Record<SessionType, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
};

/** Cargas de máquina o polea: kg indicados por el aparato, no comparables entre aparatos. */
export function isMachineLoad(equipment: Equipment | null): boolean {
  return equipment === 'machine' || equipment === 'cable';
}

/** Equipos cuyos kg anotados no permiten calcular tonelaje real. */
export function isNonTonnageEquipment(equipment: Equipment | null): boolean {
  return equipment === 'bodyweight' || equipment === 'band';
}
