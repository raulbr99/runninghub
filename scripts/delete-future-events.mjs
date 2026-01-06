import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL)

const today = new Date().toISOString().split('T')[0]
console.log(`Borrando eventos a partir de: ${today}`)

const result = await sql`
  DELETE FROM running_events
  WHERE date >= ${today}
  RETURNING id, date, title, type
`

console.log(`Eventos eliminados: ${result.length}`)
result.forEach((e) => {
  console.log(`  - ${e.date}: ${e.title || e.type}`)
})
