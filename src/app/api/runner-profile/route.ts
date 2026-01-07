import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await requireAuth();
    const profiles = await db.select().from(runnerProfile).where(eq(runnerProfile.userId, userId)).limit(1);
    if (profiles.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(profiles[0]);
  } catch (error) {
    console.error('Error loading profile:', error);
    return NextResponse.json({ error: 'Error loading profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const data = await request.json();
    const profiles = await db.select().from(runnerProfile).where(eq(runnerProfile.userId, userId)).limit(1);

    const updateData = { ...data, userId, updatedAt: new Date() };

    if (profiles.length === 0) {
      const [profile] = await db.insert(runnerProfile).values(updateData).returning();
      return NextResponse.json(profile);
    } else {
      const [profile] = await db.update(runnerProfile).set(updateData).where(eq(runnerProfile.id, profiles[0].id)).returning();
      return NextResponse.json(profile);
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Error updating profile' }, { status: 500 });
  }
}
