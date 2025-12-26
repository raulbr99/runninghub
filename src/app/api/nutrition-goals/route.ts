import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nutritionGoals } from '@/lib/db/schema';

export async function GET() {
  try {
    const goals = await db.select().from(nutritionGoals).limit(1);
    if (goals.length === 0) {
      return NextResponse.json({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
    }
    return NextResponse.json(goals[0]);
  } catch (error) {
    console.error('Error loading nutrition goals:', error);
    return NextResponse.json({ error: 'Error loading nutrition goals' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const existing = await db.select().from(nutritionGoals).limit(1);

    const goalData = {
      calories: data.calories || null,
      protein: data.protein || null,
      carbs: data.carbs || null,
      fats: data.fats || null,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      const [goals] = await db.insert(nutritionGoals).values(goalData).returning();
      return NextResponse.json(goals);
    } else {
      const [goals] = await db.update(nutritionGoals).set(goalData).returning();
      return NextResponse.json(goals);
    }
  } catch (error) {
    console.error('Error updating nutrition goals:', error);
    return NextResponse.json({ error: 'Error updating nutrition goals' }, { status: 500 });
  }
}
