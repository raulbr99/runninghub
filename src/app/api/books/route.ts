import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books, readingLog, userStats } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { XP_REWARDS } from '@/lib/gamification';

// GET - Obtener todos los libros
export async function GET() {
  try {
    const allBooks = await db
      .select()
      .from(books)
      .orderBy(desc(books.updatedAt));

    // Agrupar por estado
    const byStatus = {
      reading: allBooks.filter(b => b.status === 'reading'),
      to_read: allBooks.filter(b => b.status === 'to_read'),
      completed: allBooks.filter(b => b.status === 'completed'),
    };

    // Stats
    const stats = {
      total: allBooks.length,
      reading: byStatus.reading.length,
      toRead: byStatus.to_read.length,
      completed: byStatus.completed.length,
      totalPages: allBooks.reduce((sum, b) => sum + (b.currentPage || 0), 0),
    };

    return NextResponse.json({
      books: allBooks,
      byStatus,
      stats,
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

// POST - Añadir nuevo libro
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const newBook = await db.insert(books).values({
      title: data.title,
      author: data.author,
      totalPages: data.totalPages,
      category: data.category,
      coverUrl: data.coverUrl,
      status: data.status || 'to_read',
      currentPage: 0,
    }).returning();

    return NextResponse.json(newBook[0]);
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}

// PUT - Actualizar libro (progreso, estado, etc.)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
    }

    // Si se están actualizando páginas, calcular XP
    if (updateData.currentPage !== undefined) {
      const [existingBook] = await db.select().from(books).where(eq(books.id, id));
      if (existingBook) {
        const pagesRead = updateData.currentPage - existingBook.currentPage;
        if (pagesRead > 0) {
          // Log de lectura
          const today = new Date().toISOString().split('T')[0];
          await db.insert(readingLog).values({
            bookId: id,
            date: today,
            pagesRead,
          });

          // Calcular XP
          const xp = Math.floor(pagesRead / 10) * XP_REWARDS.pages_read_10;
          if (xp > 0) {
            await db
              .update(userStats)
              .set({
                totalXp: sql`${userStats.totalXp} + ${xp}`,
                totalPagesRead: sql`${userStats.totalPagesRead} + ${pagesRead}`,
                updatedAt: new Date(),
              });
          }
        }

        // Si el libro se completó
        if (updateData.currentPage >= (existingBook.totalPages || 0) && existingBook.status !== 'completed') {
          updateData.status = 'completed';
          updateData.finishedAt = new Date().toISOString().split('T')[0];

          // XP por completar libro
          await db
            .update(userStats)
            .set({
              totalXp: sql`${userStats.totalXp} + ${XP_REWARDS.book_completed}`,
              totalBooksRead: sql`${userStats.totalBooksRead} + 1`,
              updatedAt: new Date(),
            });
        }

        // Si empieza a leer
        if (existingBook.status === 'to_read' && updateData.currentPage > 0) {
          updateData.status = 'reading';
          updateData.startedAt = new Date().toISOString().split('T')[0];
        }
      }
    }

    const updated = await db
      .update(books)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(books.id, id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

// DELETE - Eliminar libro
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
    }

    await db.delete(books).where(eq(books.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
