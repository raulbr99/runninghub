// Ayuda del formato de importación. El ejemplo es ficticio y genérico.

const EXAMPLE = `{
  "version": 1,
  "sessions": [
    {
      "id": "ejemplo-1",
      "date": "2026-01-15",
      "type": "strength",
      "category": "Pierna",
      "title": "Pierna A",
      "durationMin": 55,
      "partial": false,
      "incomplete": false,
      "notes": "Opcional",
      "exercises": [
        {
          "name": "Sentadilla",
          "muscleGroup": "Pierna",
          "equipment": "barbell",
          "sets": [
            { "reps": 8, "weightKg": 60 },
            { "reps": 8, "weightKg": 60 }
          ]
        },
        {
          "name": "Zancada",
          "muscleGroup": "Pierna",
          "equipment": "dumbbell",
          "sets": [
            { "reps": 10, "weightKg": 12, "side": "left" },
            { "reps": 10, "weightKg": 12, "side": "right" }
          ]
        }
      ]
    },
    {
      "date": "2026-01-17",
      "type": "cardio",
      "category": "Carrera",
      "title": "Rodaje suave",
      "distanceKm": 8.2,
      "durationMin": 48
    }
  ]
}`;

const FIELDS: Array<[string, string]> = [
  ['date *', 'AAAA-MM-DD'],
  ['type *', '"strength" (fuerza) o "cardio"'],
  ['title *', 'Título de la sesión'],
  ['id', 'Opcional. Si falta, se empareja por fecha + título'],
  ['category', 'Texto libre: Pierna, Carrera, Bici…'],
  ['durationMin, distanceKm', 'Opcionales. Si faltan se muestran como «no registrado», nunca como 0'],
  ['partial', 'true si la sesión no se terminó entera'],
  ['incomplete', 'true si al registro le faltan datos'],
  ['status', 'Alternativa: "completed", "partial" o "incomplete"'],
  ['exercises[].name *', 'Nombre del ejercicio'],
  ['exercises[].muscleGroup', 'Para las tendencias por grupo muscular'],
  [
    'exercises[].equipment',
    'barbell, dumbbell, kettlebell, machine, cable, bodyweight, band u other',
  ],
  ['sets[].reps, sets[].weightKg', 'Opcionales por serie (null o ausente = sin dato)'],
  ['sets[].side', '"left" o "right" para series unilaterales'],
];

export default function FormatHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <details className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm" open={defaultOpen}>
      <summary className="cursor-pointer text-zinc-300">Formato del archivo JSON de importación</summary>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <dl className="space-y-1.5 text-xs">
          {FIELDS.map(([field, desc]) => (
            <div key={field} className="grid grid-cols-[minmax(0,11rem)_1fr] gap-2">
              <dt className="font-mono text-emerald-300/90 break-words">{field}</dt>
              <dd className="text-zinc-400">{desc}</dd>
            </div>
          ))}
          <p className="pt-1 text-zinc-500">* obligatorio. Los campos desconocidos se ignoran con un aviso.</p>
        </dl>
        <pre className="overflow-x-auto rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[11px] leading-relaxed text-zinc-300">
          <code>{EXAMPLE}</code>
        </pre>
      </div>
    </details>
  );
}
