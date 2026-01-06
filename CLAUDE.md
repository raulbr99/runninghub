# RunningHub - Instrucciones para Claude

## Stack
- Next.js 16, React 19, TypeScript estricto
- Drizzle ORM + Neon Postgres (serverless)
- Tailwind CSS 4
- Recharts para gráficos
- Leaflet + React Leaflet para mapas
- OpenRouter para AI (Coach)

## Comandos
- `npm run dev` - servidor de desarrollo
- `npm run build` - verificar que compila (SIEMPRE correr después de cambios)
- `npm run lint` - verificar errores de ESLint
- `npx drizzle-kit push` - sincronizar schema con DB
- `npx drizzle-kit studio` - UI para ver la DB

## Estructura
- `src/app/` - páginas y API routes (App Router)
- `src/app/api/` - endpoints de la API
- `src/components/` - componentes React
- `src/lib/` - utilidades y configuración DB
- `drizzle/` - migraciones de DB

## Convenciones
- Componentes en PascalCase
- APIs REST en src/app/api/[recurso]/route.ts
- NO usar `any` en TypeScript
- Usar async/await, no .then()
- Validar inputs en APIs antes de usarlos

## Integraciones
- Strava: OAuth en /api/strava/auth, webhook en /api/strava/webhook
- Coach AI: usa OpenRouter, endpoint en /api/chat

## Verificación
- Siempre correr `npm run build` después de cambios significativos
- Verificar que no hay errores de TypeScript antes de commitear

## Errores comunes a evitar
- No olvidar WHERE clause en UPDATE/DELETE queries
- Manejar null/undefined en datos de usuario
- Verificar que las foreign keys existen antes de INSERT
