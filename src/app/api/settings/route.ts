import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_MODELS = ['openai/gpt-4o'];

export async function GET() {
  try {
    const settings = await db.select().from(appSettings).limit(1);
    if (settings.length === 0) {
      const [newSettings] = await db
        .insert(appSettings)
        .values({
          selectedModel: 'openai/gpt-4o',
          selectedModels: DEFAULT_MODELS,
        })
        .returning();
      return NextResponse.json(newSettings);
    }
    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json({
      selectedModel: 'openai/gpt-4o',
      selectedModels: DEFAULT_MODELS,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const existing = await db.select().from(appSettings).limit(1);

    const selectedModels = body.selectedModels || DEFAULT_MODELS;
    const selectedModel = body.selectedModel || selectedModels[0] || 'openai/gpt-4o';

    if (existing.length === 0) {
      const [newSettings] = await db
        .insert(appSettings)
        .values({
          selectedModel,
          selectedModels,
        })
        .returning();
      return NextResponse.json(newSettings);
    }

    const [updated] = await db
      .update(appSettings)
      .set({
        selectedModel,
        selectedModels,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, existing[0].id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Error al actualizar configuracion' }, { status: 500 });
  }
}
