'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: 'to_read' | 'reading' | 'completed';
  category?: string;
  coverUrl?: string;
  startedAt?: string;
  finishedAt?: string;
}

interface BooksData {
  books: Book[];
  byStatus: {
    reading: Book[];
    to_read: Book[];
    completed: Book[];
  };
  stats: {
    total: number;
    reading: number;
    toRead: number;
    completed: number;
    totalPages: number;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  reading: { label: 'Leyendo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  to_read: { label: 'Por leer', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export default function ReadingPage() {
  const [data, setData] = useState<BooksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reading' | 'to_read' | 'completed'>('reading');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState<Book | null>(null);
  const [newBook, setNewBook] = useState({ title: '', author: '', totalPages: 0, category: '' });
  const [updatePage, setUpdatePage] = useState(0);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBook = async () => {
    if (!newBook.title || !newBook.author || newBook.totalPages <= 0) return;

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewBook({ title: '', author: '', totalPages: 0, category: '' });
        loadBooks();
      }
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const updateBookProgress = async () => {
    if (!showUpdateModal) return;

    try {
      const res = await fetch('/api/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: showUpdateModal.id, currentPage: updatePage }),
      });
      if (res.ok) {
        setShowUpdateModal(null);
        loadBooks();
      }
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm('Eliminar este libro?')) return;

    try {
      const res = await fetch(`/api/books?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadBooks();
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const startReading = async (book: Book) => {
    try {
      await fetch('/api/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: book.id, status: 'reading', currentPage: 1 }),
      });
      loadBooks();
    } catch (error) {
      console.error('Error starting book:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentBooks = data?.byStatus[activeTab] || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/motivation" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block">
            ← Volver a motivacion
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Mi Biblioteca</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
        >
          + Anadir libro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.total || 0}</p>
          <p className="text-sm text-gray-500">Total libros</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data?.stats.reading || 0}</p>
          <p className="text-sm text-gray-500">Leyendo</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data?.stats.completed || 0}</p>
          <p className="text-sm text-gray-500">Completados</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data?.stats.totalPages || 0}</p>
          <p className="text-sm text-gray-500">Paginas leidas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['reading', 'to_read', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {statusLabels[tab].label} ({data?.byStatus[tab].length || 0})
          </button>
        ))}
      </div>

      {/* Books grid */}
      {currentBooks.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentBooks.map((book) => {
            const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
            return (
              <div key={book.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
                <div className="aspect-[3/4] bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 flex items-center justify-center relative">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">📖</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {book.status === 'to_read' && (
                      <button
                        onClick={() => startReading(book)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Empezar
                      </button>
                    )}
                    {book.status === 'reading' && (
                      <button
                        onClick={() => { setShowUpdateModal(book); setUpdatePage(book.currentPage); }}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                      >
                        Actualizar
                      </button>
                    )}
                    <button
                      onClick={() => deleteBook(book.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{book.title}</p>
                  <p className="text-sm text-gray-500 truncate">{book.author}</p>

                  {book.status === 'reading' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Pag. {book.currentPage}</span>
                        <span>{book.totalPages}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-purple-600 dark:text-purple-400 mt-1">{progress}%</p>
                    </div>
                  )}

                  {book.status === 'completed' && (
                    <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                      <span>✓</span>
                      <span className="text-sm">{book.totalPages} paginas</span>
                    </div>
                  )}

                  {book.status === 'to_read' && (
                    <p className="mt-3 text-sm text-gray-400">{book.totalPages} paginas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">📚</span>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No hay libros en esta categoria</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-purple-600 dark:text-purple-400 font-medium hover:underline"
          >
            Anadir tu primer libro
          </button>
        </div>
      )}

      {/* Modal para anadir libro */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Anadir libro</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titulo</label>
                <input
                  type="text"
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Titulo del libro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autor</label>
                <input
                  type="text"
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Autor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total de paginas</label>
                <input
                  type="number"
                  value={newBook.totalPages || ''}
                  onChange={(e) => setNewBook({ ...newBook, totalPages: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Numero de paginas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria (opcional)</label>
                <select
                  value={newBook.category}
                  onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="running">Running</option>
                  <option value="nutrition">Nutricion</option>
                  <option value="mindset">Mentalidad</option>
                  <option value="fiction">Ficcion</option>
                  <option value="business">Negocios</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={addBook}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
              >
                Anadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para actualizar progreso */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Actualizar progreso</h2>
            <p className="text-gray-500 mb-4">{showUpdateModal.title}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pagina actual (de {showUpdateModal.totalPages})
              </label>
              <input
                type="number"
                value={updatePage}
                onChange={(e) => setUpdatePage(Math.min(showUpdateModal.totalPages, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                min={0}
                max={showUpdateModal.totalPages}
              />
            </div>

            <div className="mb-4">
              <input
                type="range"
                value={updatePage}
                onChange={(e) => setUpdatePage(parseInt(e.target.value))}
                min={0}
                max={showUpdateModal.totalPages}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>{Math.round((updatePage / showUpdateModal.totalPages) * 100)}%</span>
                <span>{showUpdateModal.totalPages}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdateModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={updateBookProgress}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
