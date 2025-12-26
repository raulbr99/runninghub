import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    return NextResponse.json({ ...conversation, messages: msgs });
  } catch (error) {
    console.error('Error loading conversation:', error);
    return NextResponse.json({ error: 'Error loading conversation' }, { status: 500 });
  }
}
