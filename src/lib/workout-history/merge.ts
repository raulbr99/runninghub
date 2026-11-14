import type { WorkoutSession } from './types';
import type { SessionDraft } from './validate';

export type ConflictStrategy = 'keep-existing' | 'replace' | 'keep-both';

export type MergeAction =
  | { kind: 'new'; incoming: SessionDraft }
  | { kind: 'identical'; incoming: SessionDraft; existingId: string }
  | { kind: 'duplicate-in-file'; incoming: SessionDraft }
  | { kind: 'conflict'; incoming: SessionDraft; existing: WorkoutSession; matchedBy: 'id' | 'date-title' };

export interface MergePlan {
  actions: MergeAction[];
  newCount: number;
  identicalCount: number;
  duplicateCount: number;
  conflictCount: number;
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function matchKey(session: Pick<WorkoutSession, 'date' | 'title'>): string {
  return `${session.date}|${normalizeText(session.title)}`;
}

/** Representación canónica del contenido (sin id) para detectar registros idénticos. */
export function contentKey(session: Omit<WorkoutSession, 'id'>): string {
  return JSON.stringify([
    session.date,
    session.type,
    session.category,
    session.title,
    session.partial,
    session.incomplete,
    session.durationMin,
    session.distanceKm,
    session.notes,
    session.exercises.map((e) => [
      e.name,
      e.muscleGroup,
      e.equipment,
      e.notes,
      e.sets.map((s) => [s.reps, s.weightKg, s.side]),
    ]),
  ]);
}

/**
 * Empareja cada sesión importada con las existentes:
 * 1) por id, 2) por fecha + título (sin distinguir mayúsculas/acentos).
 * Nunca sobrescribe nada: solo devuelve el plan, que el usuario confirma.
 */
export function planMerge(existing: WorkoutSession[], incoming: SessionDraft[]): MergePlan {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const byKey = new Map<string, WorkoutSession[]>();
  for (const s of existing) {
    const key = matchKey(s);
    const list = byKey.get(key);
    if (list) list.push(s);
    else byKey.set(key, [s]);
  }
  const existingContent = new Map(existing.map((s) => [s.id, contentKey(s)]));
  const claimed = new Set<string>();
  const seenInFile = new Set<string>();
  const actions: MergeAction[] = [];

  for (const draft of incoming) {
    const content = contentKey(draft);

    // Mismo contenido y mismo id (o sin id) repetido dentro del archivo: se importa una vez.
    const fileKey = `${draft.id ?? ''}|${content}`;
    if (seenInFile.has(fileKey)) {
      actions.push({ kind: 'duplicate-in-file', incoming: draft });
      continue;
    }
    seenInFile.add(fileKey);

    if (draft.id !== null) {
      const match = byId.get(draft.id);
      if (match && !claimed.has(match.id)) {
        claimed.add(match.id);
        if (existingContent.get(match.id) === content) {
          actions.push({ kind: 'identical', incoming: draft, existingId: match.id });
        } else {
          actions.push({ kind: 'conflict', incoming: draft, existing: match, matchedBy: 'id' });
        }
        continue;
      }
    }

    const candidates = (byKey.get(matchKey(draft)) ?? []).filter((s) => !claimed.has(s.id));
    const same = candidates.find((s) => existingContent.get(s.id) === content);
    if (same) {
      claimed.add(same.id);
      actions.push({ kind: 'identical', incoming: draft, existingId: same.id });
      continue;
    }
    if (candidates.length > 0) {
      const target = candidates[0];
      claimed.add(target.id);
      actions.push({ kind: 'conflict', incoming: draft, existing: target, matchedBy: 'date-title' });
      continue;
    }
    actions.push({ kind: 'new', incoming: draft });
  }

  return {
    actions,
    newCount: actions.filter((a) => a.kind === 'new').length,
    identicalCount: actions.filter((a) => a.kind === 'identical').length,
    duplicateCount: actions.filter((a) => a.kind === 'duplicate-in-file').length,
    conflictCount: actions.filter((a) => a.kind === 'conflict').length,
  };
}

export interface MergeResult {
  sessions: WorkoutSession[];
  added: number;
  replaced: number;
  keptExisting: number;
}

/** Aplica el plan. Los registros existentes solo cambian si el usuario elige "replace". */
export function applyMerge(
  existing: WorkoutSession[],
  plan: MergePlan,
  strategy: ConflictStrategy,
  generateId: () => string
): MergeResult {
  const usedIds = new Set(existing.map((s) => s.id));
  const freshId = (preferred: string | null): string => {
    if (preferred !== null && !usedIds.has(preferred)) {
      usedIds.add(preferred);
      return preferred;
    }
    let id = generateId();
    while (usedIds.has(id)) id = generateId();
    usedIds.add(id);
    return id;
  };

  const replacements = new Map<string, WorkoutSession>();
  const additions: WorkoutSession[] = [];
  let keptExisting = 0;

  for (const action of plan.actions) {
    if (action.kind === 'new') {
      additions.push({ ...action.incoming, id: freshId(action.incoming.id) });
    } else if (action.kind === 'conflict') {
      if (strategy === 'replace') {
        const preferredId =
          action.incoming.id !== null && (action.incoming.id === action.existing.id || !usedIds.has(action.incoming.id))
            ? action.incoming.id
            : action.existing.id;
        if (preferredId !== action.existing.id) {
          usedIds.delete(action.existing.id);
          usedIds.add(preferredId);
        }
        replacements.set(action.existing.id, { ...action.incoming, id: preferredId });
      } else if (strategy === 'keep-both') {
        additions.push({ ...action.incoming, id: freshId(action.incoming.id) });
      } else {
        keptExisting += 1;
      }
    }
  }

  const sessions = existing.map((s) => replacements.get(s.id) ?? s).concat(additions);
  return { sessions, added: additions.length, replaced: replacements.size, keptExisting };
}
