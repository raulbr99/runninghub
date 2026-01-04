'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRarityColor } from '@/lib/gamification';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  category: string;
  unlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  progressPercent: number;
  requirement: { type: string; value: number };
}

interface AchievementsData {
  achievements: Achievement[];
  byCategory: {
    running: Achievement[];
    consistency: Achievement[];
    reading: Achievement[];
    milestone: Achievement[];
  };
  stats: {
    unlocked: number;
    total: number;
    percent: number;
  };
}

const categoryIcons: Record<string, React.ReactNode> = {
  running: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  ),
  consistency: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  ),
  reading: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  milestone: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  ),
};

const categoryLabels: Record<string, string> = {
  running: 'Running',
  consistency: 'Constancia',
  reading: 'Lectura',
  milestone: 'Hitos',
};

const rarityLabels: Record<string, string> = {
  common: 'Comun',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Legendario',
};

const rarityStyles: Record<string, { border: string; badge: string; progress: string }> = {
  common: { border: 'border-zinc-600', badge: 'bg-zinc-700 text-zinc-300', progress: 'bg-zinc-500' },
  rare: { border: 'border-blue-500', badge: 'bg-blue-500/20 text-blue-400', progress: 'bg-blue-500' },
  epic: { border: 'border-purple-500', badge: 'bg-purple-500/20 text-purple-400', progress: 'bg-purple-500' },
  legendary: { border: 'border-amber-500', badge: 'bg-amber-500/20 text-amber-400', progress: 'bg-amber-500' },
};

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUnlocked, setShowUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const res = await fetch('/api/achievements');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredAchievements = data?.achievements.filter(a => {
    if (selectedCategory && a.category !== selectedCategory) return false;
    if (showUnlocked === true && !a.unlocked) return false;
    if (showUnlocked === false && a.unlocked) return false;
    return true;
  }) || [];

  const categories = Object.keys(categoryLabels);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/profile" className="text-xs text-zinc-500 hover:text-zinc-300 mb-3 inline-flex items-center gap-1 uppercase tracking-wider">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Perfil
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.927 0" />
            </svg>
          </div>
          <h1 className="text-xl font-light text-zinc-100 uppercase tracking-wider">Logros</h1>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-mono text-zinc-100">
              {data?.stats.unlocked || 0}<span className="text-zinc-500 text-lg">/{data?.stats.total || 0}</span>
            </p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">desbloqueados</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono text-emerald-400">
              {data?.stats.percent || 0}%
            </p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">completado</p>
          </div>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${data?.stats.percent || 0}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {categories.map((cat) => {
            const catData = data?.byCategory[cat as keyof typeof data.byCategory] || [];
            const catUnlocked = catData.filter(a => a.unlocked).length;
            return (
              <div key={cat} className="text-center bg-zinc-800/50 rounded-lg py-2">
                <div className="flex justify-center text-zinc-400 mb-1">
                  {categoryIcons[cat]}
                </div>
                <p className="text-xs font-mono text-zinc-300">
                  {catUnlocked}<span className="text-zinc-600">/{catData.length}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase tracking-wider ${
            selectedCategory === null
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
            }`}
          >
            {categoryIcons[cat]}
            {categoryLabels[cat]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowUnlocked(showUnlocked === true ? null : true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase tracking-wider ${
            showUnlocked === true
              ? 'bg-amber-600 text-white'
              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
          }`}
        >
          Desbloqueados
        </button>
        <button
          onClick={() => setShowUnlocked(showUnlocked === false ? null : false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase tracking-wider ${
            showUnlocked === false
              ? 'bg-zinc-600 text-white'
              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
          }`}
        >
          Bloqueados
        </button>
      </div>

      {/* Achievements grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const styles = rarityStyles[achievement.rarity] || rarityStyles.common;
          return (
            <div
              key={achievement.id}
              className={`relative bg-zinc-900/50 rounded-xl p-4 border-2 transition-all ${
                achievement.unlocked
                  ? `${styles.border} shadow-lg`
                  : 'border-zinc-800/50 opacity-60'
              }`}
            >
              {/* Rarity badge */}
              <span className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                achievement.unlocked ? styles.badge : 'text-zinc-500 bg-zinc-800'
              }`}>
                {rarityLabels[achievement.rarity]}
              </span>

              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-amber-900/50 to-orange-900/50 border border-amber-700/50'
                    : 'bg-zinc-800 border border-zinc-700 grayscale'
                }`}>
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${achievement.unlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                    {achievement.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                    {achievement.description}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {achievement.unlocked ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Desbloqueado
                    </span>
                    <span className="text-xs font-mono text-amber-400">
                      +{achievement.xpReward} XP
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1 font-mono">
                      <span>{achievement.currentProgress} / {achievement.requirement.value}</span>
                      <span>{achievement.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-600 rounded-full transition-all"
                        style={{ width: `${achievement.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-zinc-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.927 0" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">No hay logros con estos filtros</p>
        </div>
      )}
    </div>
  );
}
