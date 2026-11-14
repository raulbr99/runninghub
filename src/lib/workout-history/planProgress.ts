// Cruce del plan con el historial registrado y con las marcas manuales.
// Regla general: lo registrado en el historial siempre prevalece; las marcas manuales solo
// cubren sesiones sin registro. Lo que no consta no se da por hecho ni por fallado antes de tiempo.

import { normalizeText } from './merge';
import {
  PLAN_START,
  PLAN_WEEKS,
  RACE_DATE,
  addDays,
  formatRange,
  mondayOf,
  planWeekOf,
  type PlanItem,
  type PlanWeek,
} from './plan';
import type { ManualDone, PlanState } from './planState';
import type { WorkoutSession } from './types';

// ---------------------------------------------------------------------------
// Clasificación de sesiones registradas

const RUN_CATEGORY = /^(carrera|correr|run|running|trail)/;
const RECOVERY_CATEGORY = /^(recovery|recuperacion|movilidad)/;

/** Carrera a pie: sesión de cardio cuya categoría es «Carrera» (o equivalente). */
export function isRunSession(s: WorkoutSession): boolean {
  return s.type === 'cardio' && s.category !== null && RUN_CATEGORY.test(normalizeText(s.category));
}

/** Sesión de fuerza, sin contar las de recuperación o movilidad. */
export function isStrengthSession(s: WorkoutSession): boolean {
  return s.type === 'strength' && !(s.category !== null && RECOVERY_CATEGORY.test(normalizeText(s.category)));
}

// ---------------------------------------------------------------------------
// Estado de cada sesión del plan

export type ItemStatus = 'done' | 'today' | 'upcoming' | 'missed' | 'optional-unused';

export interface ItemProgress {
  item: PlanItem;
  /** Fecha vigente: la reprogramada si existe, si no la prevista */
  effectiveDate: string;
  rescheduled: boolean;
  status: ItemStatus;
  source: 'history' | 'manual' | null;
  /** Sesión del historial emparejada */
  session: WorkoutSession | null;
  /** La sesión emparejada se hizo otro día de la misma semana */
  offDate: boolean;
  /** Marca manual guardada (puede coexistir con un registro del historial) */
  manual: ManualDone | null;
}

export type WeekPhase = 'upcoming' | 'current' | 'finished';

export interface WeekProgress {
  week: PlanWeek;
  phase: WeekPhase;
  items: ItemProgress[];
  requiredTotal: number;
  requiredDone: number;
  missed: number;
  optionalDone: number;
}

export interface AdherenceTotals {
  /** Sesiones obligatorias ya vencidas (su fecha pasó) o hechas */
  due: number;
  done: number;
  missed: number;
  rescheduledPending: number;
  optionalDone: number;
  manualDone: number;
  runDue: number;
  runDone: number;
  strengthDue: number;
  strengthDone: number;
  /** null mientras no haya ninguna sesión vencida ni hecha */
  rate: number | null;
}

export interface PlanProgress {
  today: string;
  weeks: WeekProgress[];
  byId: Map<string, ItemProgress>;
  /** Semana del plan en curso, o null antes de empezar / después de la carrera */
  currentWeek: number | null;
  totals: AdherenceTotals;
  /** Sesiones registradas dentro del plan que no corresponden a ninguna sesión prevista */
  extras: WorkoutSession[];
}

function matchesKind(item: PlanItem, s: WorkoutSession): boolean {
  return item.kind === 'run' ? isRunSession(s) : isStrengthSession(s);
}

export function computePlanProgress(sessions: WorkoutSession[], state: PlanState, today: string): PlanProgress {
  const inPlan = sessions
    .filter((s) => s.date >= PLAN_START && s.date <= RACE_DATE)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (b.distanceKm ?? 0) - (a.distanceKm ?? 0)));
  const used = new Set<string>();
  const matched = new Map<string, { session: WorkoutSession; offDate: boolean }>();

  const effectiveDate = (item: PlanItem): string => {
    const moved = state.items[item.id]?.rescheduledTo;
    return moved && !item.fixedDate ? moved : item.date;
  };

  // 1) Coincidencia exacta de fecha y tipo.
  for (const week of PLAN_WEEKS) {
    for (const item of week.items) {
      const date = effectiveDate(item);
      const session = inPlan.find((s) => !used.has(s.id) && s.date === date && matchesKind(item, s));
      if (session) {
        used.add(session.id);
        matched.set(item.id, { session, offDate: false });
      }
    }
  }

  // 2) Misma semana, otro día: las sesiones sobrantes cubren, por orden cronológico, las previstas
  //    que siguen sin registro (primero las obligatorias). No aplica a la carrera, ni a sesiones
  //    reprogramadas o marcadas a mano, cuya fecha ya decidió la persona.
  for (const week of PLAN_WEEKS) {
    const pending = week.items
      .filter((item) => {
        const entry = state.items[item.id];
        return !matched.has(item.id) && !item.fixedDate && !entry?.rescheduledTo && !entry?.done;
      })
      .sort((a, b) => Number(a.optional) - Number(b.optional) || (a.date < b.date ? -1 : 1));
    for (const item of pending) {
      const session = inPlan.find(
        (s) => !used.has(s.id) && s.date >= week.start && s.date <= week.end && matchesKind(item, s)
      );
      if (session) {
        used.add(session.id);
        matched.set(item.id, { session, offDate: true });
      }
    }
  }

  const byId = new Map<string, ItemProgress>();
  const totals: AdherenceTotals = {
    due: 0,
    done: 0,
    missed: 0,
    rescheduledPending: 0,
    optionalDone: 0,
    manualDone: 0,
    runDue: 0,
    runDone: 0,
    strengthDue: 0,
    strengthDone: 0,
    rate: null,
  };

  const weeks: WeekProgress[] = PLAN_WEEKS.map((week) => {
    const items = week.items.map((item): ItemProgress => {
      const entry = state.items[item.id];
      const date = effectiveDate(item);
      const match = matched.get(item.id);
      const manual = entry?.done ?? null;
      let status: ItemStatus;
      let source: ItemProgress['source'] = null;
      if (match) {
        status = 'done';
        source = 'history';
      } else if (manual) {
        status = 'done';
        source = 'manual';
      } else if (date > today) status = 'upcoming';
      else if (date === today) status = 'today';
      else status = item.optional ? 'optional-unused' : 'missed';

      const progress: ItemProgress = {
        item,
        effectiveDate: date,
        rescheduled: date !== item.date,
        status,
        source,
        session: match?.session ?? null,
        offDate: match?.offDate ?? false,
        manual,
      };
      byId.set(item.id, progress);

      if (item.optional) {
        if (status === 'done') totals.optionalDone += 1;
      } else if (status === 'done' || status === 'missed') {
        totals.due += 1;
        if (item.kind === 'run') totals.runDue += 1;
        else totals.strengthDue += 1;
        if (status === 'done') {
          totals.done += 1;
          if (item.kind === 'run') totals.runDone += 1;
          else totals.strengthDone += 1;
        } else {
          totals.missed += 1;
        }
      }
      if (source === 'manual') totals.manualDone += 1;
      if (progress.rescheduled && status !== 'done') totals.rescheduledPending += 1;
      return progress;
    });

    const required = items.filter((p) => !p.item.optional);
    return {
      week,
      phase: today < week.start ? 'upcoming' : today > week.end ? 'finished' : 'current',
      items,
      requiredTotal: required.length,
      requiredDone: required.filter((p) => p.status === 'done').length,
      missed: required.filter((p) => p.status === 'missed').length,
      optionalDone: items.filter((p) => p.item.optional && p.status === 'done').length,
    };
  });

  totals.rate = totals.due > 0 ? totals.done / totals.due : null;

  return {
    today,
    weeks,
    byId,
    currentWeek: planWeekOf(today)?.number ?? null,
    totals,
    extras: inPlan.filter((s) => !used.has(s.id)),
  };
}

// ---------------------------------------------------------------------------
// Avisos de carga de carrera (umbrales fijos y visibles)

export const LOAD_THRESHOLDS = {
  /** Subida frente a la semana de referencia */
  weekRisePct: 30,
  weekRiseMinKm: 3,
  /** Subida frente a la media de las 4 semanas previas */
  baselineRisePct: 50,
  baselineWeeks: 4,
  baselineMinWeeks: 3,
  /** Exceso frente a lo previsto en el plan */
  planOverPct: 20,
  planOverMinKm: 1,
} as const;

export type LoadFlagKind = 'week-rise' | 'baseline-rise' | 'over-plan';

export interface LoadFlag {
  kind: LoadFlagKind;
  text: string;
}

export interface LoadWeek {
  weekStart: string;
  rangeLabel: string;
  planWeek: PlanWeek | null;
  inProgress: boolean;
  runs: number;
  runsWithDistance: number;
  /** Km registrados; null si no hay ninguna carrera con distancia */
  km: number | null;
  /** Hay carreras sin distancia o marcadas a mano sin registro: el total es un mínimo */
  partialData: boolean;
  manualRuns: number;
  longestKm: number | null;
  plannedKm: number | null;
  /** Semana contra la que se compara y sus km */
  reference: { weekStart: string; km: number; skippedDeload: boolean } | null;
  changePct: number | null;
  baselineKm: number | null;
  flags: LoadFlag[];
}

function fmtKm(value: number): string {
  return `${(Math.round(value * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
}

/**
 * Resumen semanal de km de carrera registrados, de más reciente a más antigua, con avisos solo
 * cuando se supera un umbral. Las semanas sin registros no se tratan como 0 km: simplemente no
 * sirven de referencia.
 */
export function runLoadWeeks(
  sessions: WorkoutSession[],
  progress: PlanProgress,
  today: string,
  count = 8
): LoadWeek[] {
  const T = LOAD_THRESHOLDS;
  const lastWeek = mondayOf(today);
  const total = count + T.baselineWeeks + 2;
  const starts: string[] = [];
  for (let i = total - 1; i >= 0; i -= 1) starts.push(addDays(lastWeek, -7 * i));
  const index = new Map(starts.map((start, i) => [start, i]));

  const weeks: LoadWeek[] = starts.map((start) => {
    const planWeek = planWeekOf(start);
    return {
      weekStart: start,
      rangeLabel: formatRange(start, addDays(start, 6)),
      planWeek,
      inProgress: start === lastWeek,
      runs: 0,
      runsWithDistance: 0,
      km: null,
      partialData: false,
      manualRuns: 0,
      longestKm: null,
      plannedKm: planWeek ? planWeek.plannedRunKm : null,
      reference: null,
      changePct: null,
      baselineKm: null,
      flags: [],
    };
  });

  for (const s of sessions) {
    if (!isRunSession(s) || s.date > today) continue;
    const i = index.get(mondayOf(s.date));
    if (i === undefined) continue;
    const w = weeks[i];
    w.runs += 1;
    if (s.distanceKm === null) {
      w.partialData = true;
    } else {
      w.runsWithDistance += 1;
      w.km = (w.km ?? 0) + s.distanceKm;
      if (w.longestKm === null || s.distanceKm > w.longestKm) w.longestKm = s.distanceKm;
    }
  }
  for (const p of progress.byId.values()) {
    if (p.item.kind !== 'run' || p.source !== 'manual' || !p.manual) continue;
    const i = index.get(mondayOf(p.manual.date));
    if (i === undefined) continue;
    weeks[i].manualRuns += 1;
    weeks[i].partialData = true;
  }

  const usable = (w: LoadWeek | undefined): w is LoadWeek & { km: number } =>
    w !== undefined && w.km !== null && !w.partialData;

  weeks.forEach((w, i) => {
    if (w.km === null) return;
    const km = w.km;

    // Referencia: la semana anterior; si fue de descarga en el plan, la previa a la descarga.
    let ref = weeks[i - 1];
    let skippedDeload = false;
    if (ref?.planWeek?.deload && i >= 2) {
      ref = weeks[i - 2];
      skippedDeload = true;
    }
    if (usable(ref) && ref.km > 0) {
      w.reference = { weekStart: ref.weekStart, km: ref.km, skippedDeload };
      w.changePct = ((km - ref.km) / ref.km) * 100;
      if (w.changePct > T.weekRisePct && km - ref.km >= T.weekRiseMinKm) {
        w.flags.push({
          kind: 'week-rise',
          text: `Subida del ${Math.round(w.changePct)} % frente a la semana de referencia (${fmtKm(ref.km)} → ${fmtKm(km)}).`,
        });
      }
    }

    const previous = weeks.slice(Math.max(0, i - T.baselineWeeks), i).filter(usable);
    if (i >= T.baselineWeeks && previous.length >= T.baselineMinWeeks) {
      const mean = previous.reduce((acc, p) => acc + p.km, 0) / previous.length;
      w.baselineKm = mean;
      if (mean > 0 && km > mean * (1 + T.baselineRisePct / 100)) {
        w.flags.push({
          kind: 'baseline-rise',
          text: `${Math.round(((km - mean) / mean) * 100)} % por encima de la media de las semanas previas con registro (${fmtKm(mean)}).`,
        });
      }
    }

    if (w.plannedKm !== null && km > w.plannedKm * (1 + T.planOverPct / 100) && km - w.plannedKm >= T.planOverMinKm) {
      w.flags.push({
        kind: 'over-plan',
        text: `${fmtKm(km)} registrados frente a ${fmtKm(w.plannedKm)} previstos en el plan.`,
      });
    }
  });

  return weeks.slice(-count).reverse();
}
