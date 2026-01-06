import { db } from '@/lib/db';
import { races, racePhotos } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const allRaces = await db.select().from(races).orderBy(desc(races.date));

    // Get photos for each race
    const photosMap = new Map<string, typeof racePhotos.$inferSelect[]>();

    for (const race of allRaces) {
      const photos = await db
        .select()
        .from(racePhotos)
        .where(eq(racePhotos.raceId, race.id))
        .orderBy(racePhotos.sortOrder);
      if (photos.length > 0) {
        photosMap.set(race.id, photos);
      }
    }

    return NextResponse.json({
      races: allRaces,
      photos: Object.fromEntries(photosMap),
    });
  } catch (error) {
    console.error('Error fetching races:', error);
    return NextResponse.json({ error: 'Error fetching races' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [newRace] = await db
      .insert(races)
      .values({
        name: body.name,
        date: body.date,
        distance: body.distance,
        distanceType: body.distanceType,
        location: body.location,
        country: body.country,
        finishTime: body.finishTime,
        position: body.position,
        categoryPosition: body.categoryPosition,
        totalParticipants: body.totalParticipants,
        category: body.category,
        avgPace: body.avgPace,
        avgHeartRate: body.avgHeartRate,
        elevationGain: body.elevationGain,
        dorsalNumber: body.dorsalNumber,
        cost: body.cost,
        website: body.website,
        notes: body.notes,
        status: body.status || 'upcoming',
      })
      .returning();

    return NextResponse.json(newRace);
  } catch (error) {
    console.error('Error creating race:', error);
    return NextResponse.json({ error: 'Error creating race' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const [updated] = await db
      .update(races)
      .set({
        name: body.name,
        date: body.date,
        distance: body.distance,
        distanceType: body.distanceType,
        location: body.location,
        country: body.country,
        finishTime: body.finishTime,
        position: body.position,
        categoryPosition: body.categoryPosition,
        totalParticipants: body.totalParticipants,
        category: body.category,
        avgPace: body.avgPace,
        avgHeartRate: body.avgHeartRate,
        elevationGain: body.elevationGain,
        dorsalNumber: body.dorsalNumber,
        cost: body.cost,
        website: body.website,
        notes: body.notes,
        status: body.status,
        updatedAt: new Date(),
      })
      .where(eq(races.id, body.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating race:', error);
    return NextResponse.json({ error: 'Error updating race' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await db.delete(races).where(eq(races.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting race:', error);
    return NextResponse.json({ error: 'Error deleting race' }, { status: 500 });
  }
}
