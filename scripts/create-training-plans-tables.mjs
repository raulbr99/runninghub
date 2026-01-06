import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL)

console.log('Creando tablas de planes de entrenamiento...')

// Crear tabla training_plans
await sql`
  CREATE TABLE IF NOT EXISTS training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    race_type TEXT NOT NULL,
    race_date DATE,
    level TEXT NOT NULL,
    total_weeks INTEGER NOT NULL,
    total_km REAL,
    phases JSONB,
    status TEXT NOT NULL DEFAULT 'draft',
    added_to_calendar INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`
console.log('✓ Tabla training_plans creada')

// Crear tabla training_plan_events
await sql`
  CREATE TABLE IF NOT EXISTS training_plan_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    distance REAL,
    duration INTEGER,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`
console.log('✓ Tabla training_plan_events creada')

console.log('¡Tablas creadas exitosamente!')
