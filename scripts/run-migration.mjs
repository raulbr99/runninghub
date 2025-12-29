import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

const migrationSQL = readFileSync('./drizzle/add_habits_tables.sql', 'utf-8');

// Split by statement-breakpoint or semicolon to execute statements separately
const statements = migrationSQL
  .split(/;\s*(?=\n|$)/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function runMigration() {
  console.log('Running migration...');
  try {
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      await sql.query(statement);
    }
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();
