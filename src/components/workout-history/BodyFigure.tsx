'use client';

import { MUSCLE_SHORT_LABELS, type MuscleId } from '@/lib/workout-history/muscleMap';
import { BODY_DETAILS, BODY_LINES, BODY_OUTLINE, BODY_SHAPES, BODY_VIEWBOX, type BodyView } from './bodyPaths';

/** Escala secuencial de un solo tono: 0 = sin series; 1–5 = de menos a más series registradas. */
export const LEVEL_COLORS = ['#3f3f46', '#0b4f3c', '#0a6b4f', '#0d8a63', '#17ab7b', '#4ade9f'] as const;
const SURFACE = '#27272a';
const OUTLINE = '#52525b';
const SEPARATOR = '#18181b';

const VIEW_LABELS: Record<BodyView, string> = { front: 'Vista anterior', back: 'Vista posterior' };

interface BodyFigureProps {
  view: BodyView;
  levels: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (id: MuscleId) => void;
}

/**
 * Figura anatómica en SVG. Es una ayuda visual para puntero y pantalla táctil; el teclado y los
 * lectores de pantalla usan la lista de grupos, que ofrece la misma selección y los mismos datos.
 */
export default function BodyFigure({ view, levels, selected, onSelect }: BodyFigureProps) {
  const groups = new Map<MuscleId, string[]>();
  for (const shape of BODY_SHAPES[view]) {
    const id = shape.muscle as MuscleId;
    const list = groups.get(id);
    if (list) list.push(shape.d);
    else groups.set(id, [shape.d]);
  }
  const mirror = `translate(${BODY_VIEWBOX.width},0) scale(-1,1)`;
  // El grupo seleccionado se pinta el último para que su contorno quede por encima.
  const ordered = [...groups.entries()].sort((a, b) => Number(a[0] === selected) - Number(b[0] === selected));

  return (
    <figure className="m-0 flex flex-col items-center gap-1.5 min-w-0">
      <svg
        viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
        className="w-full max-w-[250px] h-auto select-none"
        aria-hidden="true"
        focusable="false"
      >
        {[undefined, mirror].map((transform) => (
          <g key={transform ?? 'base'} transform={transform}>
            <path d={BODY_OUTLINE} fill={SURFACE} stroke={OUTLINE} strokeWidth={1} strokeLinejoin="round" />
            {BODY_DETAILS[view].map((d) => (
              <path key={d} d={d} fill="#303036" />
            ))}
          </g>
        ))}
        {ordered.map(([id, paths]) => {
          const active = id === selected;
          return (
            <g
              key={id}
              onClick={() => onSelect(id)}
              className="cursor-pointer transition-[filter] hover:brightness-125"
              fill={LEVEL_COLORS[levels[id]] ?? LEVEL_COLORS[0]}
              stroke={active ? '#fafafa' : SEPARATOR}
              strokeWidth={active ? 1.8 : 1.1}
              strokeLinejoin="round"
            >
              <title>{MUSCLE_SHORT_LABELS[id]}</title>
              {paths.map((d) => (
                <path key={d} d={d} />
              ))}
              {paths.map((d) => (
                <path key={`m-${d}`} d={d} transform={mirror} />
              ))}
            </g>
          );
        })}
        <g stroke={SEPARATOR} strokeWidth={0.9} fill="none" pointerEvents="none">
          {BODY_LINES[view].map((d) => (
            <path key={d} d={d} />
          ))}
          {BODY_LINES[view].map((d) => (
            <path key={`m-${d}`} d={d} transform={mirror} />
          ))}
        </g>
      </svg>
      <figcaption className="text-[11px] text-zinc-400 uppercase tracking-wider">{VIEW_LABELS[view]}</figcaption>
    </figure>
  );
}
