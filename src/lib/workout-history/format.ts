import { TYPE_LABELS, type WorkoutSession } from './types';
import { buildHistoryFile } from './storage';
import { sessionTonnage } from './analytics';

export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
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
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function parts(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

/** "14 nov 2026" */
export function formatDate(date: string): string {
  const { y, m, d } = parts(date);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "sáb 14 nov" */
export function formatDateShort(date: string): string {
  const { y, m, d } = parts(date);
  const weekday = WEEKDAYS_SHORT[new Date(y, m - 1, d).getDay()];
  return `${weekday} ${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "noviembre 2026" para "2026-11" */
export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

const numberFormats = new Map<number, Intl.NumberFormat>();
export function formatNumber(value: number, maxDecimals = 0): string {
  let fmt = numberFormats.get(maxDecimals);
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: maxDecimals });
    numberFormats.set(maxDecimals, fmt);
  }
  return fmt.format(value);
}

/** 65 -> "1 h 05 min"; 45 -> "45 min" */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`;
}

/** Ritmo min/km a partir de minutos y km. */
export function formatPace(durationMin: number, distanceKm: number): string | null {
  if (distanceKm <= 0 || durationMin <= 0) return null;
  const pace = durationMin / distanceKm;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  if (s === 60) return `${m + 1}:00 /km`;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJsonBackup(sessions: WorkoutSession[]) {
  const file = buildHistoryFile(sessions, true);
  downloadBlob(JSON.stringify(file, null, 2), `runninghub-historial-${todayLocal()}.json`, 'application/json');
}

export function downloadRawText(raw: string) {
  downloadBlob(raw, `runninghub-historial-sin-procesar-${todayLocal()}.json`, 'application/json');
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value).replace('.', ',');
  // Evita que hojas de cálculo interpreten texto como fórmula.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV (separador ";" y BOM UTF-8 para que Excel en español lo abra bien). */
export function downloadSessionsCsv(sessions: WorkoutSession[]) {
  const header = [
    'fecha',
    'tipo',
    'categoria',
    'titulo',
    'parcial',
    'datos_incompletos',
    'duracion_min',
    'distancia_km',
    'ejercicios',
    'series',
    'tonelaje_estimado_peso_libre_kg',
    'carga_maquina_kg_no_comparable',
    'notas',
  ];
  const rows = sessions.map((s) => {
    const sets = s.exercises.reduce((acc, e) => acc + e.sets.length, 0);
    const t = sessionTonnage(s);
    return [
      s.date,
      TYPE_LABELS[s.type],
      s.category,
      s.title,
      s.partial ? 'sí' : 'no',
      s.incomplete ? 'sí' : 'no',
      s.durationMin,
      s.distanceKm,
      s.exercises.map((e) => e.name).join(' | ') || null,
      s.exercises.length > 0 ? sets : null,
      t.freeSets > 0 ? Math.round(t.freeKg) : null,
      t.machineSets > 0 ? Math.round(t.machineKg) : null,
      s.notes,
    ]
      .map(csvCell)
      .join(';');
  });
  const csv = '﻿' + [header.join(';'), ...rows].join('\r\n');
  downloadBlob(csv, `runninghub-historial-${todayLocal()}.csv`, 'text/csv;charset=utf-8');
}
