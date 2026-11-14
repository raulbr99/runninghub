// Figura anatómica propia (vista anterior y posterior), dibujada como media figura que se
// refleja sobre el eje central (x = 100). Coordenadas en un lienzo de 200 × 420.

export type BodyView = 'front' | 'back';

export const BODY_VIEWBOX = { width: 200, height: 420 } as const;

/** Contorno de media figura. Trazo abierto: el relleno se cierra solo sobre el eje central y no deja línea en medio. */
export const BODY_OUTLINE =
  'M100,6 C110,6 117,14 117,26 C117,36 114,44 109,49 L109,58 C116,63 128,66 138,69 C148,71 156,79 157,92 ' +
  'C158,108 158,124 157,138 C159,150 161,160 160,172 C159,188 156,202 153,214 C155,222 155,234 151,242 ' +
  'C148,247 143,246 142,240 C141,232 142,222 143,214 C141,200 139,184 138,170 C137,160 137,152 136,144 ' +
  'C136,130 135,118 134,108 C133,124 130,140 129,154 C128,166 131,180 135,194 C139,210 140,232 137,254 ' +
  'C135,272 132,286 131,298 C131,306 133,312 133,320 C134,336 131,354 127,372 C125,382 124,390 124,396 ' +
  'C126,402 130,408 128,412 L108,412 C106,406 108,398 109,392 C108,372 106,350 107,330 C108,320 109,312 108,304 ' +
  'C106,280 104,250 101,222 L100,220';

export interface BodyShape {
  /** Grupo del mapa al que pertenece la forma */
  muscle: string;
  d: string;
}

const DELTOID =
  'M135,72 C145,71 154,78 155.5,91 C156,99 154,106 150,111 C146,104 140,96 134.5,90 C132.5,83 132.5,76 135,72 Z';
const UPPER_ARM =
  'M137,110 C142,113 148,113 153,110 C156,120 156,132 154,142 C150,146 142,146 138,142 C136,132 136,120 137,110 Z';
const FOREARM =
  'M138,148 C143,151 151,151 157,147 C160,160 158,180 154,206 C151,209 146,209 144,206 C141,188 138,166 138,148 Z';

export const BODY_SHAPES: Record<BodyView, BodyShape[]> = {
  front: [
    { muscle: 'pecho', d: 'M101.5,84 C110,80 122,80 130,87 C133,93 133,102 130,109 C123,116 110,117 101.5,113 Z' },
    { muscle: 'hombro', d: DELTOID },
    { muscle: 'biceps', d: UPPER_ARM },
    { muscle: 'antebrazo', d: FOREARM },
    { muscle: 'core', d: 'M101.5,117 C108,120 116,119 121,116 C122,134 121,156 119,178 C114,192 107,200 101.5,204 Z' },
    {
      muscle: 'core',
      d: 'M123,115 C127,113 131,110 133,107 C132,124 129,140 128,154 C127,166 130,180 133,190 C128,190 124,186 121,180 C123,158 124,136 123,115 Z',
    },
    {
      muscle: 'cuadriceps',
      d: 'M112,214 C120,206 129,200 135,197 C139,214 139,236 136,256 C134,272 131,284 129,294 C123,299 115,298 111,293 C109,270 108,240 112,214 Z',
    },
    { muscle: 'aductores', d: 'M101.5,208 C105,210 109,212 111,214 C108,232 107,250 108,266 C105,254 103,238 101.5,224 Z' },
  ],
  back: [
    { muscle: 'espalda', d: 'M101.5,56 C104,60 108,62 110,63 C120,66 130,68 137,71 C130,80 118,86 110,92 C106,100 103,112 101.5,124 Z' },
    { muscle: 'espalda', d: 'M111,94 C118,88 126,83 133,80 C133,86 134,92 134,96 C124,98 114,104 108,112 C108,105 109,99 111,94 Z' },
    { muscle: 'espalda', d: 'M134,98 C135,116 132,138 127,156 C120,164 110,168 101.5,168 L101.5,130 C106,112 118,100 134,98 Z' },
    { muscle: 'hombro', d: DELTOID },
    { muscle: 'triceps', d: UPPER_ARM },
    { muscle: 'antebrazo', d: FOREARM },
    { muscle: 'lumbar', d: 'M101.5,171 C110,171 120,168 126,160 C127,170 130,182 133,190 C122,194 110,196 101.5,196 Z' },
    { muscle: 'gluteo', d: 'M101.5,199 C112,199 124,197 134,193 C139,206 140,224 137,236 C128,244 112,246 101.5,240 Z' },
    {
      muscle: 'isquios',
      d: 'M103,246 C113,250 127,248 137,241 C138,258 135,278 131,296 C125,301 115,301 110,297 C107,280 104,262 103,246 Z',
    },
    { muscle: 'gemelos', d: 'M108,306 C114,301 126,301 132,306 C135,322 133,340 128,358 C124,364 116,364 112,358 C108,340 106,322 108,306 Z' },
  ],
};

/** Detalle anatómico sin datos asociados (no seleccionable): rótula, tibial, líneas del abdomen. */
export const BODY_DETAILS: Record<BodyView, string[]> = {
  front: [
    'M112,300 C116,297 124,297 128,300 C129,305 127,310 120,311 C114,310 111,305 112,300 Z',
    'M111,316 C116,313 126,313 131,316 C133,332 130,352 126,372 L112,372 C109,352 109,332 111,316 Z',
  ],
  back: [],
};

/** Líneas finas de definición, dibujadas encima de las formas. */
export const BODY_LINES: Record<BodyView, string[]> = {
  front: ['M101.5,138 L120.5,136', 'M101.5,158 L120,156', 'M101.5,178 L118.5,177'],
  back: [],
};
