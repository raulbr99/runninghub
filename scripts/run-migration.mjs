import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

console.log('Connecting to database...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  console.log('Running migration...');
  try {
    // Create custom_habits table
    console.log('Creating custom_habits table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "custom_habits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "icon" text DEFAULT '⭐' NOT NULL,
        "color" text DEFAULT '#6366f1' NOT NULL,
        "frequency" text DEFAULT 'daily' NOT NULL,
        "specific_days" jsonb,
        "tracking_type" text DEFAULT 'boolean' NOT NULL,
        "target_value" integer,
        "unit" text,
        "xp_reward" integer DEFAULT 10 NOT NULL,
        "is_active" integer DEFAULT 1 NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log('custom_habits table created!');

    // Create habit_logs table
    console.log('Creating habit_logs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "habit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "habit_id" uuid NOT NULL REFERENCES "custom_habits"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "completed" integer DEFAULT 1 NOT NULL,
        "value" real,
        "notes" text,
        "xp_earned" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log('habit_logs table created!');

    // Verify tables exist
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('custom_habits', 'habit_logs')
    `;
    console.log('Tables found:', tables.map(t => t.table_name));

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();
