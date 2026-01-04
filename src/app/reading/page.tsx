'use client';

import { useState, useEffect } from 'react';

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

const statusLabels: Record<string, { label: string }> = {
  reading: { label: 'Leyendo' },
  to_read: { label: 'Por leer' },
  completed: { label: 'Completados' },
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentBooks = data?.byStatus[activeTab] || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Biblioteca</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Anadir
          </button>
        </div>
        <p className="text-sm text-zinc-500">Registra y sigue tu progreso de lectura</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-mono text-zinc-100">{data?.stats.total || 0}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Leyendo</p>
          <p className="text-2xl font-mono text-blue-400">{data?.stats.reading || 0}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Completados</p>
          <p className="text-2xl font-mono text-emerald-400">{data?.stats.completed || 0}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Paginas</p>
          <p className="text-2xl font-mono text-zinc-100">{data?.stats.totalPages || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
        {(['reading', 'to_read', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-colors uppercase tracking-wider ${
              activeTab === tab
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
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
              <div key={book.id} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden group">
                <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-16 h-16 text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  )}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {book.status === 'to_read' && (
                      <button
                        onClick={() => startReading(book)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500"
                      >
                        Empezar
                      </button>
                    )}
                    {book.status === 'reading' && (
                      <button
                        onClick={() => { setShowUpdateModal(book); setUpdatePage(book.currentPage); }}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-500"
                      >
                        Actualizar
                      </button>
                    )}
                    <button
                      onClick={() => deleteBook(book.id)}
                      className="px-3 py-1.5 bg-red-600/80 text-white rounded-lg text-xs font-medium hover:bg-red-500"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-medium text-sm text-zinc-100 truncate">{book.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{book.author}</p>

                  {book.status === 'reading' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1 font-mono">
                        <span>Pag. {book.currentPage}</span>
                        <span>{book.totalPages}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-emerald-400 mt-1 font-mono">{progress}%</p>
                    </div>
                  )}

                  {book.status === 'completed' && (
                    <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span className="font-mono">{book.totalPages} pags</span>
                    </div>
                  )}

                  {book.status === 'to_read' && (
                    <p className="mt-3 text-xs text-zinc-600 font-mono">{book.totalPages} pags</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-zinc-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm mb-4">No hay libros en esta categoria</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-emerald-400 text-sm font-medium hover:text-emerald-300"
          >
            Anadir tu primer libro
          </button>
        </div>
      )}

      {/* Modal para anadir libro */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md border border-zinc-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-light text-zinc-100 uppercase tracking-wider">Anadir libro</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Titulo *</label>
                  <input
                    type="text"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Titulo del libro"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Autor *</label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Autor"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Total paginas *</label>
                  <input
                    type="number"
                    value={newBook.totalPages || ''}
                    onChange={(e) => setNewBook({ ...newBook, totalPages: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 placeholder-zinc-600 font-mono focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Numero de paginas"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Categoria</label>
                  <select
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
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
                  className="flex-1 px-4 py-2 border border-zinc-700 rounded-lg text-zinc-400 text-sm hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={addBook}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm"
                >
                  Anadir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para actualizar progreso */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md border border-zinc-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-light text-zinc-100 uppercase tracking-wider">Actualizar progreso</h3>
                <button onClick={() => setShowUpdateModal(null)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-zinc-400 text-sm mb-4">{showUpdateModal.title}</p>

              <div className="mb-4">
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Pagina actual (de {showUpdateModal.totalPages})
                </label>
                <input
                  type="number"
                  value={updatePage}
                  onChange={(e) => setUpdatePage(Math.min(showUpdateModal.totalPages, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full p-3 border border-zinc-700/50 rounded-lg bg-zinc-800/50 text-zinc-100 font-mono focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  min={0}
                  max={showUpdateModal.totalPages}
                />
              </div>

              <div className="mb-6">
                <input
                  type="range"
                  value={updatePage}
                  onChange={(e) => setUpdatePage(parseInt(e.target.value))}
                  min={0}
                  max={showUpdateModal.totalPages}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1 font-mono">
                  <span>0</span>
                  <span className="text-emerald-400">{Math.round((updatePage / showUpdateModal.totalPages) * 100)}%</span>
                  <span>{showUpdateModal.totalPages}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpdateModal(null)}
                  className="flex-1 px-4 py-2 border border-zinc-700 rounded-lg text-zinc-400 text-sm hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={updateBookProgress}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
