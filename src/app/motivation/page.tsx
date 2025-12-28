'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRarityColor, xpForNextLevel, MOTIVATIONAL_QUOTES } from '@/lib/gamification';

interface UserStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalDistance: number;
  totalBooksRead: number;
  totalPagesRead: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  progressPercent: number;
  requirement: { type: string; value: number };
}

interface Challenge {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  startDate: string;
  endDate: string;
  completed: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: 'to_read' | 'reading' | 'completed';
  coverUrl?: string;
}

export default function MotivationPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<{ achievements: Achievement[]; stats: { unlocked: number; total: number; percent: number } } | null>(null);
  const [challenges, setChallenges] = useState<{ active: Challenge[]; completed: Challenge[] } | null>(null);
  const [books, setBooks] = useState<{ books: Book[]; stats: { reading: number; completed: number; totalPages: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, achievementsRes, challengesRes, booksRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/achievements'),
        fetch('/api/challenges'),
        fetch('/api/books'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (achievementsRes.ok) setAchievements(await achievementsRes.json());
      if (challengesRes.ok) setChallenges(await challengesRes.json());
      if (booksRes.ok) setBooks(await booksRes.json());
    } catch (error) {
      console.error('Error loading motivation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChallenges = async () => {
    try {
      await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateWeekly: true }),
      });
      const res = await fetch('/api/challenges');
      if (res.ok) setChallenges(await res.json());
    } catch (error) {
      console.error('Error generating challenges:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const xpToNext = stats ? xpForNextLevel(stats.level) : 0;
  const xpInCurrentLevel = stats ? stats.totalXp - (stats.level > 1 ? xpForNextLevel(stats.level - 1) : 0) : 0;
  const xpProgress = xpToNext > 0 ? Math.min(100, (xpInCurrentLevel / (xpToNext - (stats && stats.level > 1 ? xpForNextLevel(stats.level - 1) : 0))) * 100) : 0;

  const recentUnlocked = achievements?.achievements.filter(a => a.unlocked).slice(-3).reverse() || [];
  const nextToUnlock = achievements?.achievements.filter(a => !a.unlocked).sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 3) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header con cita motivacional */}
      <div className="mb-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
        <p className="text-lg italic mb-2">"{quote.quote}"</p>
        <p className="text-sm opacity-80">- {quote.author}</p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nivel</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.level || 1}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{stats?.totalXp || 0} XP</span>
              <span>{xpToNext} XP</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Racha actual</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.currentStreak || 0} dias</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Record: {stats?.longestStreak || 0} dias
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-2xl">🏃</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Entrenamientos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalWorkouts || 0}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {stats?.totalDistance?.toFixed(0) || 0} km totales
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Libros leidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalBooksRead || 0}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {stats?.totalPagesRead || 0} paginas
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Retos activos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Retos de la semana</h2>
            {(!challenges?.active || challenges.active.length === 0) && (
              <button
                onClick={generateChallenges}
                className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline"
              >
                Generar retos
              </button>
            )}
          </div>
          <div className="p-4">
            {challenges?.active && challenges.active.length > 0 ? (
              <div className="space-y-4">
                {challenges.active.map((challenge) => {
                  const progress = Math.min(100, (challenge.current / challenge.target) * 100);
                  return (
                    <div key={challenge.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{challenge.title}</p>
                          <p className="text-sm text-gray-500">{challenge.description}</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-lg">
                          +{challenge.xpReward} XP
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {challenge.current}/{challenge.target}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">🎯</span>
                <p className="text-gray-500 dark:text-gray-400">No hay retos activos</p>
                <p className="text-sm text-gray-400 mt-1">Genera retos semanales para empezar</p>
              </div>
            )}
          </div>
        </div>

        {/* Logros */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Logros</h2>
            <Link href="/achievements" className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline">
              Ver todos ({achievements?.stats.unlocked || 0}/{achievements?.stats.total || 0})
            </Link>
          </div>
          <div className="p-4">
            {recentUnlocked.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Recientes</p>
                <div className="flex gap-2">
                  {recentUnlocked.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`flex-1 p-3 rounded-xl border-2 ${getRarityColor(achievement.rarity).replace('text-', 'border-').replace('500', '200')} bg-gray-50 dark:bg-gray-700/50`}
                    >
                      <div className="text-2xl mb-1">{achievement.icon}</div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{achievement.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Proximos a desbloquear</p>
              <div className="space-y-2">
                {nextToUnlock.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-xl opacity-50">{achievement.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{achievement.name}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-400 rounded-full"
                            style={{ width: `${achievement.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{achievement.progressPercent}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Libros en lectura */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lectura actual</h2>
          <Link href="/reading" className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline">
            Ver biblioteca
          </Link>
        </div>
        <div className="p-4">
          {books?.books.filter(b => b.status === 'reading').length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.books.filter(b => b.status === 'reading').map((book) => {
                const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
                return (
                  <div key={book.id} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="w-16 h-24 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-2xl">📖</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{book.title}</p>
                      <p className="text-sm text-gray-500 truncate">{book.author}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Pag. {book.currentPage}</span>
                          <span>{book.totalPages}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">📚</span>
              <p className="text-gray-500 dark:text-gray-400">No estas leyendo ningun libro</p>
              <Link href="/reading" className="inline-block mt-3 text-green-600 dark:text-green-400 text-sm font-medium hover:underline">
                Anadir libro
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/achievements" className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-4 text-white hover:from-yellow-600 hover:to-orange-700 transition-all">
          <span className="text-3xl mb-2 block">🏆</span>
          <p className="font-semibold">Logros</p>
          <p className="text-sm opacity-80">{achievements?.stats.unlocked || 0} desbloqueados</p>
        </Link>

        <Link href="/reading" className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white hover:from-purple-600 hover:to-indigo-700 transition-all">
          <span className="text-3xl mb-2 block">📚</span>
          <p className="font-semibold">Biblioteca</p>
          <p className="text-sm opacity-80">{books?.stats.completed || 0} libros leidos</p>
        </Link>

        <Link href="/calendar" className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white hover:from-green-600 hover:to-emerald-700 transition-all">
          <span className="text-3xl mb-2 block">🏃</span>
          <p className="font-semibold">Entrenar</p>
          <p className="text-sm opacity-80">Ir al calendario</p>
        </Link>

        <Link href="/coach" className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 text-white hover:from-blue-600 hover:to-cyan-700 transition-all">
          <span className="text-3xl mb-2 block">💬</span>
          <p className="font-semibold">Coach</p>
          <p className="text-sm opacity-80">Hablar con coach</p>
        </Link>
      </div>
    </div>
  );
}
