import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// GET: Run database migrations
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Add event_data column if it doesn't exist
    await sql`
      ALTER TABLE running_events
      ADD COLUMN IF NOT EXISTS event_data jsonb
    `;

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
