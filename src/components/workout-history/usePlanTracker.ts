'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { todayLocal } from '@/lib/workout-history/format';
import { computePlanProgress, type PlanProgress } from '@/lib/workout-history/planProgress';
import {
  emptyPlanState,
  getPlanStateServerSnapshot,
  getPlanStateSnapshot,
  markItemDone,
  rescheduleItem,
  subscribePlanState,
  unmarkItemDone,
  type PlanState,
  type PlanStateSnapshot,
} from '@/lib/workout-history/planState';
import type { WorkoutSession } from '@/lib/workout-history/types';

const EMPTY_STATE = emptyPlanState();

export interface PlanTracker {
  today: string;
  snapshot: PlanStateSnapshot;
  state: PlanState;
  progress: PlanProgress;
  /** false si las marcas guardadas no se pueden leer: no se permite editar para no sobrescribirlas */
  editable: boolean;
  error: string | null;
  clearError: () => void;
  markDone: (id: string, date: string) => void;
  unmarkDone: (id: string) => void;
  reschedule: (id: string, date: string | null) => boolean;
  /** Ejecuta una operación de guardado y recoge su error, si lo hay. */
  run: (action: () => void) => boolean;
}

/** Estado del plan (marcas locales + cruce con el historial) compartido por las pestañas Plan y Calendario. */
export function usePlanTracker(sessions: WorkoutSession[]): PlanTracker {
  const snapshot = useSyncExternalStore(subscribePlanState, getPlanStateSnapshot, getPlanStateServerSnapshot);
  const [today] = useState(todayLocal);
  const [error, setError] = useState<string | null>(null);
  const state = snapshot.status === 'ready' ? snapshot.state : EMPTY_STATE;
  const progress = useMemo(() => computePlanProgress(sessions, state, today), [sessions, state, today]);

  const run = useCallback((action: () => void): boolean => {
    try {
      action();
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
      return false;
    }
  }, []);

  const markDone = useCallback((id: string, date: string) => void run(() => markItemDone(id, date)), [run]);
  const unmarkDone = useCallback((id: string) => void run(() => unmarkItemDone(id)), [run]);
  const reschedule = useCallback((id: string, date: string | null) => run(() => rescheduleItem(id, date)), [run]);
  const clearError = useCallback(() => setError(null), []);

  return {
    today,
    snapshot,
    state,
    progress,
    editable: snapshot.status === 'ready',
    error,
    clearError,
    markDone,
    unmarkDone,
    reschedule,
    run,
  };
}
