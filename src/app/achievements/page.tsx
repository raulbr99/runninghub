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

const categoryLabels: Record<string, { label: string; icon: string }> = {
  running: { label: 'Running', icon: '🏃' },
  consistency: { label: 'Constancia', icon: '🔥' },
  reading: { label: 'Lectura', icon: '📚' },
  milestone: { label: 'Hitos', icon: '⭐' },
};

const rarityLabels: Record<string, string> = {
  common: 'Comun',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Legendario',
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/motivation" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block">
            ← Volver a motivacion
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Logros</h1>
        </div>
      </div>

      {/* Progress bar general */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data?.stats.unlocked || 0} / {data?.stats.total || 0}
            </p>
            <p className="text-gray-500">logros desbloqueados</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {data?.stats.percent || 0}%
            </p>
          </div>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${data?.stats.percent || 0}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {categories.map((cat) => {
            const catData = data?.byCategory[cat as keyof typeof data.byCategory] || [];
            const catUnlocked = catData.filter(a => a.unlocked).length;
            return (
              <div key={cat} className="text-center">
                <span className="text-2xl">{categoryLabels[cat].icon}</span>
                <p className="text-xs text-gray-500 mt-1">
                  {catUnlocked}/{catData.length}
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
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {categoryLabels[cat].icon} {categoryLabels[cat].label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowUnlocked(showUnlocked === true ? null : true)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showUnlocked === true
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Desbloqueados
        </button>
        <button
          onClick={() => setShowUnlocked(showUnlocked === false ? null : false)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showUnlocked === false
              ? 'bg-gray-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Bloqueados
        </button>
      </div>

      {/* Achievements grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const rarityColorClass = getRarityColor(achievement.rarity);
          return (
            <div
              key={achievement.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 transition-all ${
                achievement.unlocked
                  ? `${rarityColorClass.replace('text-', 'border-')} shadow-lg`
                  : 'border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              {/* Rarity badge */}
              <span className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                achievement.unlocked
                  ? `${rarityColorClass} bg-opacity-20 ${rarityColorClass.replace('text-', 'bg-').replace('500', '100')} dark:bg-opacity-30`
                  : 'text-gray-400 bg-gray-100 dark:bg-gray-700'
              }`}>
                {rarityLabels[achievement.rarity]}
              </span>

              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30'
                    : 'bg-gray-100 dark:bg-gray-700 grayscale'
                }`}>
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${achievement.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {achievement.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {achievement.description}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {achievement.unlocked ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Desbloqueado
                    </span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      +{achievement.xpReward} XP
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{achievement.currentProgress} / {achievement.requirement.value}</span>
                      <span>{achievement.progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full transition-all"
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
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">🏆</span>
          <p className="text-gray-500 dark:text-gray-400">No hay logros con estos filtros</p>
        </div>
      )}
    </div>
  );
}
