import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { role, content } = await request.json();
    const [message] = await db.insert(messages).values({ conversationId: id, role, content }).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Error saving message' }, { status: 500 });
  }
}
