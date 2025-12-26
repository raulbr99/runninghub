import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile } from '@/lib/db/schema';

export async function GET() {
  try {
    const profiles = await db.select().from(runnerProfile).limit(1);
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
    const data = await request.json();
    const profiles = await db.select().from(runnerProfile).limit(1);

    const updateData = { ...data, updatedAt: new Date() };

    if (profiles.length === 0) {
      const [profile] = await db.insert(runnerProfile).values(updateData).returning();
      return NextResponse.json(profile);
    } else {
      const [profile] = await db.update(runnerProfile).set(updateData).returning();
      return NextResponse.json(profile);
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Error updating profile' }, { status: 500 });
  }
}
