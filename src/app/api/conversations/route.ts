import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await requireAuth();
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading conversations:', error);
    return NextResponse.json({ error: 'Error loading conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { title, model } = await request.json();
    const [conversation] = await db.insert(conversations).values({ userId, title, model }).returning();
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Error creating conversation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Error deleting conversation' }, { status: 500 });
  }
}
