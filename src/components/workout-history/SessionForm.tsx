'use client';

import { useMemo, useState } from 'react';
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_VALUES,
  SIDE_LABELS,
  TYPE_LABELS,
  type Equipment,
  type ExerciseEntry,
  type SessionType,
  type Side,
  type WorkoutSession,
} from '@/lib/workout-history/types';
import { generateId, todayLocal } from '@/lib/workout-history/format';
import { Dialog, ICONS, Icon, buttonPrimary, buttonSecondary, inputClass, labelClass } from './ui';

interface SetDraft {
  key: string;
  reps: string;
  weight: string;
  side: '' | Side;
}

interface ExerciseDraft {
  key: string;
  name: string;
  muscleGroup: string;
  equipment: '' | Equipment;
  notes: string;
  sets: SetDraft[];
}

interface FormState {
  date: string;
  type: SessionType;
  category: string;
  title: string;
  partial: boolean;
  incomplete: boolean;
  duration: string;
  distance: string;
  notes: string;
  exercises: ExerciseDraft[];
}

const DEFAULT_GROUPS = ['Pierna', 'Glúteo', 'Pecho', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Core', 'Cuerpo completo'];
const DEFAULT_CATEGORIES: Record<SessionType, string[]> = {
  strength: ['Pierna', 'Torso', 'Empuje', 'Tirón', 'Cuerpo completo', 'Core'],
  cardio: ['Carrera', 'Bici', 'Natación', 'Elíptica', 'Remo', 'Caminata'],
};

const emptySet = (from?: SetDraft): SetDraft => ({
  key: generateId(),
  reps: from?.reps ?? '',
  weight: from?.weight ?? '',
  side: from?.side ?? '',
});

const emptyExercise = (): ExerciseDraft => ({
  key: generateId(),
  name: '',
  muscleGroup: '',
  equipment: '',
  notes: '',
  sets: [emptySet()],
});

function toDraft(session: WorkoutSession | null): FormState {
  if (!session) {
    return {
      date: todayLocal(),
      type: 'strength',
      category: '',
      title: '',
      partial: false,
      incomplete: false,
      duration: '',
      distance: '',
      notes: '',
      exercises: [emptyExercise()],
    };
  }
  const num = (v: number | null) => (v === null ? '' : String(v));
  return {
    date: session.date,
    type: session.type,
    category: session.category ?? '',
    title: session.title,
    partial: session.partial,
    incomplete: session.incomplete,
    duration: num(session.durationMin),
    distance: num(session.distanceKm),
    notes: session.notes ?? '',
    exercises: session.exercises.map((e) => ({
      key: generateId(),
      name: e.name,
      muscleGroup: e.muscleGroup ?? '',
      equipment: e.equipment ?? '',
      notes: e.notes ?? '',
      sets: e.sets.map((s) => ({ key: generateId(), reps: num(s.reps), weight: num(s.weightKg), side: s.side ?? '' })),
    })),
  };
}

function parseNumber(value: string, opts: { integer?: boolean; max: number }): number | null | 'invalid' {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) return 'invalid';
  const n = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > opts.max) return 'invalid';
  if (opts.integer && !Number.isInteger(n)) return 'invalid';
  return n;
}

function buildSession(form: FormState, id: string): { session: WorkoutSession | null; errors: string[] } {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.push('Indica una fecha válida.');
  const title = form.title.trim();
  if (!title) errors.push('Pon un título a la sesión (p. ej. "Pierna A" o "Rodaje suave").');
  const duration = parseNumber(form.duration, { max: 1440 });
  if (duration === 'invalid') errors.push('La duración debe ser un número de minutos (0–1440).');
  const distance = parseNumber(form.distance, { max: 1000 });
  if (distance === 'invalid') errors.push('La distancia debe ser un número de km (0–1000).');

  const exercises: ExerciseEntry[] = [];
  form.exercises.forEach((ex, i) => {
    const name = ex.name.trim();
    const hasData =
      name !== '' || ex.notes.trim() !== '' || ex.sets.some((s) => s.reps.trim() !== '' || s.weight.trim() !== '');
    if (!hasData) return; // ejercicio en blanco: se ignora
    if (!name) {
      errors.push(`El ejercicio ${i + 1} necesita un nombre.`);
      return;
    }
    const sets = ex.sets.map((s, j) => {
      const reps = parseNumber(s.reps, { integer: true, max: 1000 });
      const weight = parseNumber(s.weight, { max: 1000 });
      if (reps === 'invalid') errors.push(`${name}, serie ${j + 1}: las repeticiones deben ser un número entero.`);
      if (weight === 'invalid') errors.push(`${name}, serie ${j + 1}: el peso debe ser un número de kg.`);
      return {
        reps: reps === 'invalid' ? null : reps,
        weightKg: weight === 'invalid' ? null : weight,
        side: s.side === '' ? null : s.side,
      };
    });
    exercises.push({
      name,
      muscleGroup: ex.muscleGroup.trim() || null,
      equipment: ex.equipment === '' ? null : ex.equipment,
      notes: ex.notes.trim() || null,
      sets,
    });
  });

  if (errors.length > 0) return { session: null, errors };
  return {
    session: {
      id,
      date: form.date,
      type: form.type,
      category: form.category.trim() || null,
      title,
      partial: form.partial,
      incomplete: form.incomplete,
      durationMin: duration as number | null,
      distanceKm: distance as number | null,
      notes: form.notes.trim() || null,
      exercises,
    },
    errors: [],
  };
}

interface SessionFormProps {
  open: boolean;
  initial: WorkoutSession | null;
  allSessions: WorkoutSession[];
  onCancel: () => void;
  onSave: (session: WorkoutSession) => void;
}

export default function SessionForm(props: SessionFormProps) {
  // El contenido se monta de nuevo cada vez que se abre, con su propio estado inicial.
  return (
    <SessionFormDialog
      key={props.open ? (props.initial?.id ?? 'new') : 'closed'}
      {...props}
    />
  );
}

function SessionFormDialog({ open, initial, allSessions, onCancel, onSave }: SessionFormProps) {
  const [form, setForm] = useState<FormState>(() => toDraft(initial));
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const suggestions = useMemo(() => {
    const names = new Set<string>();
    const groups = new Set<string>(DEFAULT_GROUPS);
    const categories = new Set<string>([...DEFAULT_CATEGORIES.strength, ...DEFAULT_CATEGORIES.cardio]);
    for (const s of allSessions) {
      if (s.category) categories.add(s.category);
      for (const e of s.exercises) {
        names.add(e.name);
        if (e.muscleGroup) groups.add(e.muscleGroup);
      }
    }
    const sort = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, 'es'));
    return { names: sort(names), groups: sort(groups), categories: sort(categories) };
  }, [allSessions]);

  // Rellena grupo y equipo a partir del último uso del mismo ejercicio.
  const lastUse = useMemo(() => {
    const map = new Map<string, ExerciseEntry>();
    for (const s of allSessions) {
      for (const e of s.exercises) {
        const key = e.name.trim().toLowerCase();
        if (!map.has(key)) map.set(key, e);
      }
    }
    return map;
  }, [allSessions]);

  const update = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const updateExercise = (key: string, patch: Partial<ExerciseDraft>) => {
    setForm((f) => ({ ...f, exercises: f.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)) }));
    setDirty(true);
  };

  const updateSet = (exKey: string, setKey: string, patch: Partial<SetDraft>) => {
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((e) =>
        e.key === exKey ? { ...e, sets: e.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) } : e
      ),
    }));
    setDirty(true);
  };

  const confirmDiscard = () => !dirty || window.confirm('¿Descartar los cambios sin guardar?');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const { session, errors: errs } = buildSession(form, initial?.id ?? generateId());
    if (!session) {
      setErrors(errs);
      return;
    }
    onSave(session);
  };

  const formId = 'workout-session-form';

  return (
    <Dialog
      open={open}
      size="lg"
      title={initial ? 'Editar entrenamiento' : 'Añadir entrenamiento'}
      onClose={onCancel}
      onRequestClose={confirmDiscard}
      footer={
        <>
          <button type="button" className={buttonSecondary} onClick={() => confirmDiscard() && onCancel()}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={buttonPrimary}>
            Guardar en este navegador
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
        {errors.length > 0 && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <p className="font-medium mb-1">Revisa estos campos:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <fieldset className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <legend className="sr-only">Datos de la sesión</legend>
          <div className="col-span-1">
            <label htmlFor="wf-date" className={labelClass}>
              Fecha *
            </label>
            <input
              id="wf-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => update({ date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="col-span-1">
            <span className={labelClass} id="wf-type-label">
              Tipo *
            </span>
            <div role="radiogroup" aria-labelledby="wf-type-label" className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/60">
              {(['strength', 'cardio'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={form.type === t}
                  onClick={() => update({ type: t })}
                  className={`py-1 rounded-md text-sm transition-colors ${
                    form.type === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label htmlFor="wf-category" className={labelClass}>
              Categoría
            </label>
            <input
              id="wf-category"
              list="wf-categories"
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className={inputClass}
              placeholder={form.type === 'strength' ? 'Pierna, Torso…' : 'Carrera, Bici…'}
            />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label htmlFor="wf-title" className={labelClass}>
              Título *
            </label>
            <input
              id="wf-title"
              required
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              className={inputClass}
              placeholder={form.type === 'strength' ? 'Pierna A' : 'Rodaje suave'}
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="wf-duration" className={labelClass}>
              Duración (min)
            </label>
            <input
              id="wf-duration"
              inputMode="decimal"
              value={form.duration}
              onChange={(e) => update({ duration: e.target.value })}
              className={`${inputClass} font-mono`}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label htmlFor="wf-distance" className={labelClass}>
              Distancia (km)
            </label>
            <input
              id="wf-distance"
              inputMode="decimal"
              value={form.distance}
              onChange={(e) => update({ distance: e.target.value })}
              className={`${inputClass} font-mono`}
              placeholder="Opcional"
            />
          </div>
          <div className="col-span-2 flex flex-col justify-end gap-1.5">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.partial}
                onChange={(e) => update({ partial: e.target.checked })}
                className="w-4 h-4 accent-amber-500"
              />
              Sesión parcial <span className="text-zinc-500 text-xs">(no se terminó entera)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.incomplete}
                onChange={(e) => update({ incomplete: e.target.checked })}
                className="w-4 h-4 accent-orange-500"
              />
              Datos incompletos <span className="text-zinc-500 text-xs">(faltan pesos, series…)</span>
            </label>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label htmlFor="wf-notes" className={labelClass}>
              Notas
            </label>
            <textarea
              id="wf-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
              className={inputClass}
            />
          </div>
        </fieldset>

        <section aria-labelledby="wf-exercises-title" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 id="wf-exercises-title" className="text-xs text-zinc-300 uppercase tracking-wider">
              Ejercicios {form.type === 'cardio' && <span className="text-zinc-500 normal-case">(opcional)</span>}
            </h3>
            <button
              type="button"
              className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              onClick={() => update({ exercises: [...form.exercises, emptyExercise()] })}
            >
              <Icon path={ICONS.plus} className="w-3.5 h-3.5" /> Añadir ejercicio
            </button>
          </div>

          {form.exercises.length === 0 && (
            <p className="text-sm text-zinc-500">Sin ejercicios. Añade uno si quieres registrar series.</p>
          )}

          {form.exercises.map((ex, exIndex) => (
            <fieldset key={ex.key} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 space-y-3">
              <legend className="sr-only">Ejercicio {exIndex + 1}</legend>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="col-span-2 sm:col-span-3">
                  <label htmlFor={`${ex.key}-name`} className={labelClass}>
                    Ejercicio {exIndex + 1}
                  </label>
                  <input
                    id={`${ex.key}-name`}
                    list="wf-exercise-names"
                    value={ex.name}
                    onChange={(e) => updateExercise(ex.key, { name: e.target.value })}
                    onBlur={() => {
                      const prev = lastUse.get(ex.name.trim().toLowerCase());
                      if (prev && !ex.muscleGroup && !ex.equipment) {
                        updateExercise(ex.key, {
                          muscleGroup: prev.muscleGroup ?? '',
                          equipment: prev.equipment ?? '',
                        });
                      }
                    }}
                    className={inputClass}
                    placeholder="Sentadilla"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label htmlFor={`${ex.key}-group`} className={labelClass}>
                    Grupo muscular
                  </label>
                  <input
                    id={`${ex.key}-group`}
                    list="wf-groups"
                    value={ex.muscleGroup}
                    onChange={(e) => updateExercise(ex.key, { muscleGroup: e.target.value })}
                    className={inputClass}
                    placeholder="Pierna"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor={`${ex.key}-equipment`} className={labelClass}>
                    Equipo
                  </label>
                  <select
                    id={`${ex.key}-equipment`}
                    value={ex.equipment}
                    onChange={(e) => updateExercise(ex.key, { equipment: e.target.value as '' | Equipment })}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {EQUIPMENT_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {EQUIPMENT_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-[2rem_1fr_1fr_5.5rem_2rem] gap-2 text-[10px] text-zinc-500 uppercase tracking-wider px-0.5 mb-1">
                  <span>#</span>
                  <span>Reps</span>
                  <span>Kg</span>
                  <span>Lado</span>
                  <span className="sr-only">Quitar</span>
                </div>
                <div className="space-y-1.5">
                  {ex.sets.map((set, setIndex) => (
                    <div key={set.key} className="grid grid-cols-[2rem_1fr_1fr_5.5rem_2rem] gap-2 items-center">
                      <span className="text-xs text-zinc-500 font-mono text-center">{setIndex + 1}</span>
                      <input
                        aria-label={`${ex.name || `Ejercicio ${exIndex + 1}`}, serie ${setIndex + 1}: repeticiones`}
                        inputMode="numeric"
                        value={set.reps}
                        onChange={(e) => updateSet(ex.key, set.key, { reps: e.target.value })}
                        className={`${inputClass} font-mono py-1.5`}
                        placeholder="?"
                      />
                      <input
                        aria-label={`${ex.name || `Ejercicio ${exIndex + 1}`}, serie ${setIndex + 1}: kg`}
                        inputMode="decimal"
                        value={set.weight}
                        onChange={(e) => updateSet(ex.key, set.key, { weight: e.target.value })}
                        className={`${inputClass} font-mono py-1.5`}
                        placeholder="?"
                      />
                      <select
                        aria-label={`${ex.name || `Ejercicio ${exIndex + 1}`}, serie ${setIndex + 1}: lado`}
                        value={set.side}
                        onChange={(e) => updateSet(ex.key, set.key, { side: e.target.value as '' | Side })}
                        className={`${inputClass} py-1.5 px-2`}
                      >
                        <option value="">Ambos</option>
                        <option value="left">{SIDE_LABELS.left}</option>
                        <option value="right">{SIDE_LABELS.right}</option>
                      </select>
                      <button
                        type="button"
                        aria-label={`Quitar serie ${setIndex + 1}`}
                        onClick={() => updateExercise(ex.key, { sets: ex.sets.filter((s) => s.key !== set.key) })}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Icon path={ICONS.close} className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                    onClick={() => updateExercise(ex.key, { sets: [...ex.sets, emptySet(ex.sets[ex.sets.length - 1])] })}
                  >
                    <Icon path={ICONS.plus} className="w-3.5 h-3.5" /> Serie
                    {ex.sets.length > 0 && <span className="text-zinc-500">(copia la anterior)</span>}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-zinc-500 hover:text-red-400"
                    onClick={() => update({ exercises: form.exercises.filter((e) => e.key !== ex.key) })}
                  >
                    Quitar ejercicio
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor={`${ex.key}-notes`} className="sr-only">
                  Notas del ejercicio
                </label>
                <input
                  id={`${ex.key}-notes`}
                  value={ex.notes}
                  onChange={(e) => updateExercise(ex.key, { notes: e.target.value })}
                  className={`${inputClass} py-1.5 text-xs`}
                  placeholder="Notas del ejercicio (opcional)"
                />
              </div>
            </fieldset>
          ))}

          <p className="text-xs text-zinc-500">
            Deja vacío lo que no sepas: se guardará como «sin datos», nunca como 0. Usa «Izq./Der.» para series
            unilaterales. Con máquina o polea, los kg se guardan tal cual pero no se comparan con peso libre.
          </p>
        </section>

        <datalist id="wf-exercise-names">
          {suggestions.names.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <datalist id="wf-groups">
          {suggestions.groups.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <datalist id="wf-categories">
          {suggestions.categories.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </form>
    </Dialog>
  );
}
