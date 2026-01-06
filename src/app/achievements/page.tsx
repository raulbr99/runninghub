'use client';

import { useState, useEffect } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  progress: number;
  total: number;
  percentage: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

interface Challenge {
  id: string;
  type: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  xpReward: number;
  startDate: string;
  endDate: string;
  completed: number;
}

interface Stats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalDistance: number;
  totalTime: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'distance', label: 'Distancia' },
  { id: 'workouts', label: 'Entrenos' },
  { id: 'streak', label: 'Rachas' },
  { id: 'single_run', label: 'Tiradas' },
  { id: 'elevation', label: 'Desnivel' },
  { id: 'time', label: 'Tiempo' },
  { id: 'special', label: 'Especiales' },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showUnlocked, setShowUnlocked] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/achievements');
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements);
        setChallenges(data.challenges);
        setStats(data.stats);
        setUnlockedCount(data.unlockedCount);
        setTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = () => {
    if (!stats) return 0;
    const xpForCurrentLevel = (stats.level - 1) * 500;
    const xpForNextLevel = stats.level * 500;
    const progress = stats.totalXp - xpForCurrentLevel;
    const needed = xpForNextLevel - xpForCurrentLevel;
    return Math.min((progress / needed) * 100, 100);
  };

  const filteredAchievements = achievements.filter((a) => {
    if (filter !== 'all' && a.category !== filter) return false;
    if (showUnlocked === 'unlocked' && !a.isUnlocked) return false;
    if (showUnlocked === 'locked' && a.isUnlocked) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight mb-2">Logros y Badges</h1>
        <p className="text-sm text-zinc-500">Desbloquea logros completando retos y objetivos</p>
      </div>

      {/* Stats del usuario */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-4 border border-purple-500/30">
            <p className="text-xs text-purple-400 uppercase tracking-wider mb-2">Nivel</p>
            <p className="text-4xl font-bold text-purple-400">{stats.level}</p>
            <div className="mt-2">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${getLevelProgress()}%` }} />
              </div>
              <p className="text-xs text-zinc-500 mt-1">{stats.totalXp} XP total</p>
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Racha Actual</p>
            <p className="text-3xl font-mono text-amber-400">{stats.currentStreak}</p>
            <p className="text-xs text-zinc-600 mt-1">dias seguidos</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Logros</p>
            <p className="text-3xl font-mono text-emerald-400">{unlockedCount}/{totalCount}</p>
            <p className="text-xs text-zinc-600 mt-1">desbloqueados</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Km Totales</p>
            <p className="text-3xl font-mono text-zinc-100">{Math.round(stats.totalDistance)}</p>
            <p className="text-xs text-zinc-600 mt-1">kilometros</p>
          </div>
        </div>
      )}

      {/* Retos activos */}
      {challenges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Retos Activos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge) => {
              const progress = Math.min((challenge.current / challenge.target) * 100, 100);
              const daysLeft = Math.ceil((new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={challenge.id} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-medium text-zinc-100">{challenge.title}</h3>
                    <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">{daysLeft}d</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{challenge.description}</p>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">{challenge.current}/{challenge.target}</span>
                    <span className="text-purple-400">+{challenge.xpReward} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === cat.id ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'}`}
          >
            {cat.label}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setShowUnlocked(f)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${showUnlocked === f ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800/30 text-zinc-500 hover:bg-zinc-800'}`}
            >
              {f === 'all' ? 'Todos' : f === 'unlocked' ? 'Desbloqueados' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de logros */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative rounded-xl border p-4 transition-all ${
              achievement.isUnlocked
                ? 'bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/30'
                : 'bg-zinc-900/30 border-zinc-800/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`text-3xl ${achievement.isUnlocked ? '' : 'grayscale opacity-50'}`}>
                {achievement.icon}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium truncate ${achievement.isUnlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                  {achievement.name}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">{achievement.description}</p>
              </div>
            </div>

            {!achievement.isUnlocked && (
              <div className="mt-3">
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-600 rounded-full transition-all" style={{ width: `${achievement.percentage}%` }} />
                </div>
                <p className="text-xs text-zinc-600 mt-1">{Math.round(achievement.progress)}/{achievement.total}</p>
              </div>
            )}

            {achievement.isUnlocked && (
              <div className="absolute top-2 right-2">
                <span className="text-emerald-400 text-lg">&#10003;</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400">No hay logros en esta categoria</p>
        </div>
      )}
    </div>
  );
}
