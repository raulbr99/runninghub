This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Historial de entrenos (`/historial`)

Página para consultar entrenamientos de fuerza y cardio: resumen, historial con búsqueda y filtros, récords y progresión por ejercicio.

- **Solo local y privado:** los datos se guardan únicamente en el `localStorage` del navegador (clave `runninghub.workoutHistory.v1`). No hay endpoint de API, no se escribe en la base de datos y no se envía nada a ningún servidor. Otro navegador o dispositivo no verá los mismos datos.
- **Importar:** botón «Importar JSON» con el formato `{ "version": 1, "sessions": [ ... ] }` (la página muestra los campos y un ejemplo). Antes de guardar se enseña un resumen con sesiones nuevas, idénticas, repetidas, en conflicto y con errores. Las sesiones se emparejan por `id` o, si no hay, por fecha + título; reimportar el mismo archivo no duplica nada y los conflictos nunca se sobrescriben sin elegirlo.
- **Exportar:** «Copia JSON» descarga una copia completa que se puede volver a importar; «CSV» exporta las filas del historial (las filtradas si hay filtros activos).
- **Métricas honestas:** los datos que faltan se muestran como «no registrado», no como 0. El tonelaje es una estimación (reps × kg) solo de peso libre; las cargas de máquina/polea se muestran aparte y las series unilaterales se tratan por lado.

No incluyas datos personales de entrenamiento en el repositorio: guarda tus archivos de importación fuera de él.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
