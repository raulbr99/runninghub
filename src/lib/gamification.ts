// Sistema de Gamificación - Logros, XP y Niveles

// ==========================================
// SISTEMA DE XP
// ==========================================

export const XP_REWARDS = {
  // Entrenamientos
  workout_completed: 50,
  workout_long_run: 100, // >15km
  workout_interval: 75,
  workout_race: 150,

  // Distancia
  distance_5k: 25,
  distance_10k: 50,
  distance_half: 100,
  distance_marathon: 200,

  // Lectura
  pages_read_10: 10,
  pages_read_50: 50,
  book_completed: 100,

  // Nutrición
  meal_logged: 5,
  all_meals_logged: 25,

  // Peso
  weight_logged: 10,

  // Rachas
  streak_3_days: 50,
  streak_7_days: 100,
  streak_14_days: 200,
  streak_30_days: 500,
  streak_100_days: 1000,

  // Retos completados
  challenge_completed: 100,
} as const;

// Calcular nivel basado en XP total
export function calculateLevel(totalXp: number): number {
  // Fórmula: cada nivel requiere más XP que el anterior
  // Nivel 1: 0-100, Nivel 2: 100-250, Nivel 3: 250-500, etc.
  if (totalXp < 100) return 1;
  if (totalXp < 250) return 2;
  if (totalXp < 500) return 3;
  if (totalXp < 1000) return 4;
  if (totalXp < 2000) return 5;
  if (totalXp < 3500) return 6;
  if (totalXp < 5500) return 7;
  if (totalXp < 8000) return 8;
  if (totalXp < 11000) return 9;
  if (totalXp < 15000) return 10;
  if (totalXp < 20000) return 11;
  if (totalXp < 27000) return 12;
  if (totalXp < 35000) return 13;
  if (totalXp < 45000) return 14;
  if (totalXp < 60000) return 15;
  return Math.floor(15 + (totalXp - 60000) / 10000);
}

// XP necesario para el siguiente nivel
export function xpForNextLevel(level: number): number {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000, 20000, 27000, 35000, 45000, 60000];
  if (level < thresholds.length) {
    return thresholds[level];
  }
  return 60000 + (level - 15) * 10000;
}

// ==========================================
// DEFINICIÓN DE LOGROS
// ==========================================

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'running' | 'reading' | 'consistency' | 'nutrition' | 'milestone';
  requirement: {
    type: string;
    value: number;
  };
  xpReward: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // === RUNNING ===
  {
    id: 'first_run',
    name: 'Primer Paso',
    description: 'Completa tu primer entrenamiento',
    icon: '👟',
    category: 'running',
    requirement: { type: 'total_workouts', value: 1 },
    xpReward: 50,
    rarity: 'common',
  },
  {
    id: 'runs_10',
    name: 'En Marcha',
    description: 'Completa 10 entrenamientos',
    icon: '🏃',
    category: 'running',
    requirement: { type: 'total_workouts', value: 10 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    id: 'runs_50',
    name: 'Corredor Dedicado',
    description: 'Completa 50 entrenamientos',
    icon: '🏃‍♂️',
    category: 'running',
    requirement: { type: 'total_workouts', value: 50 },
    xpReward: 250,
    rarity: 'uncommon',
  },
  {
    id: 'runs_100',
    name: 'Centenario',
    description: 'Completa 100 entrenamientos',
    icon: '💯',
    category: 'running',
    requirement: { type: 'total_workouts', value: 100 },
    xpReward: 500,
    rarity: 'rare',
  },
  {
    id: 'runs_500',
    name: 'Veterano',
    description: 'Completa 500 entrenamientos',
    icon: '🎖️',
    category: 'running',
    requirement: { type: 'total_workouts', value: 500 },
    xpReward: 1000,
    rarity: 'epic',
  },
  {
    id: 'distance_100',
    name: 'Primeros 100km',
    description: 'Acumula 100km totales',
    icon: '📍',
    category: 'running',
    requirement: { type: 'total_distance', value: 100 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    id: 'distance_500',
    name: 'Medio Millar',
    description: 'Acumula 500km totales',
    icon: '🗺️',
    category: 'running',
    requirement: { type: 'total_distance', value: 500 },
    xpReward: 300,
    rarity: 'uncommon',
  },
  {
    id: 'distance_1000',
    name: 'Club de los 1000km',
    description: 'Acumula 1000km totales',
    icon: '🌍',
    category: 'running',
    requirement: { type: 'total_distance', value: 1000 },
    xpReward: 500,
    rarity: 'rare',
  },
  {
    id: 'distance_2500',
    name: 'Ultramaratonista Virtual',
    description: 'Acumula 2500km totales',
    icon: '🏔️',
    category: 'running',
    requirement: { type: 'total_distance', value: 2500 },
    xpReward: 1000,
    rarity: 'epic',
  },
  {
    id: 'distance_5000',
    name: 'Leyenda del Asfalto',
    description: 'Acumula 5000km totales',
    icon: '👑',
    category: 'running',
    requirement: { type: 'total_distance', value: 5000 },
    xpReward: 2000,
    rarity: 'legendary',
  },

  // === CONSISTENCY ===
  {
    id: 'streak_3',
    name: 'Buen Comienzo',
    description: 'Mantén una racha de 3 días',
    icon: '🔥',
    category: 'consistency',
    requirement: { type: 'streak', value: 3 },
    xpReward: 50,
    rarity: 'common',
  },
  {
    id: 'streak_7',
    name: 'Semana Perfecta',
    description: 'Mantén una racha de 7 días',
    icon: '🔥',
    category: 'consistency',
    requirement: { type: 'streak', value: 7 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    id: 'streak_14',
    name: 'Dos Semanas Fuerte',
    description: 'Mantén una racha de 14 días',
    icon: '💪',
    category: 'consistency',
    requirement: { type: 'streak', value: 14 },
    xpReward: 200,
    rarity: 'uncommon',
  },
  {
    id: 'streak_30',
    name: 'Mes Imparable',
    description: 'Mantén una racha de 30 días',
    icon: '⚡',
    category: 'consistency',
    requirement: { type: 'streak', value: 30 },
    xpReward: 500,
    rarity: 'rare',
  },
  {
    id: 'streak_100',
    name: 'Triple Dígito',
    description: 'Mantén una racha de 100 días',
    icon: '🌟',
    category: 'consistency',
    requirement: { type: 'streak', value: 100 },
    xpReward: 1000,
    rarity: 'epic',
  },
  {
    id: 'streak_365',
    name: 'Año Legendario',
    description: 'Mantén una racha de 365 días',
    icon: '🏆',
    category: 'consistency',
    requirement: { type: 'streak', value: 365 },
    xpReward: 5000,
    rarity: 'legendary',
  },

  // === READING ===
  {
    id: 'first_book',
    name: 'Lector Iniciado',
    description: 'Completa tu primer libro',
    icon: '📖',
    category: 'reading',
    requirement: { type: 'books_read', value: 1 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    id: 'books_5',
    name: 'Bibliófilo',
    description: 'Completa 5 libros',
    icon: '📚',
    category: 'reading',
    requirement: { type: 'books_read', value: 5 },
    xpReward: 250,
    rarity: 'uncommon',
  },
  {
    id: 'books_12',
    name: 'Lector del Año',
    description: 'Completa 12 libros (1 por mes)',
    icon: '🎓',
    category: 'reading',
    requirement: { type: 'books_read', value: 12 },
    xpReward: 500,
    rarity: 'rare',
  },
  {
    id: 'books_25',
    name: 'Devorador de Libros',
    description: 'Completa 25 libros',
    icon: '🦉',
    category: 'reading',
    requirement: { type: 'books_read', value: 25 },
    xpReward: 1000,
    rarity: 'epic',
  },
  {
    id: 'pages_1000',
    name: 'Mil Páginas',
    description: 'Lee 1000 páginas en total',
    icon: '📄',
    category: 'reading',
    requirement: { type: 'pages_read', value: 1000 },
    xpReward: 200,
    rarity: 'uncommon',
  },
  {
    id: 'pages_5000',
    name: 'Maratón de Lectura',
    description: 'Lee 5000 páginas en total',
    icon: '📕',
    category: 'reading',
    requirement: { type: 'pages_read', value: 5000 },
    xpReward: 500,
    rarity: 'rare',
  },

  // === MILESTONES ===
  {
    id: 'level_5',
    name: 'Nivel 5',
    description: 'Alcanza el nivel 5',
    icon: '⭐',
    category: 'milestone',
    requirement: { type: 'level', value: 5 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    id: 'level_10',
    name: 'Nivel 10',
    description: 'Alcanza el nivel 10',
    icon: '⭐⭐',
    category: 'milestone',
    requirement: { type: 'level', value: 10 },
    xpReward: 250,
    rarity: 'uncommon',
  },
  {
    id: 'level_15',
    name: 'Nivel 15',
    description: 'Alcanza el nivel 15',
    icon: '🌟',
    category: 'milestone',
    requirement: { type: 'level', value: 15 },
    xpReward: 500,
    rarity: 'rare',
  },
  {
    id: 'xp_10000',
    name: '10K XP',
    description: 'Acumula 10,000 XP',
    icon: '💎',
    category: 'milestone',
    requirement: { type: 'total_xp', value: 10000 },
    xpReward: 200,
    rarity: 'uncommon',
  },
  {
    id: 'xp_50000',
    name: '50K XP',
    description: 'Acumula 50,000 XP',
    icon: '💠',
    category: 'milestone',
    requirement: { type: 'total_xp', value: 50000 },
    xpReward: 500,
    rarity: 'rare',
  },
];

// Obtener color de rareza
export function getRarityColor(rarity: AchievementDefinition['rarity']): string {
  switch (rarity) {
    case 'common': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case 'uncommon': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'legendary': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  }
}

export function getRarityBorder(rarity: AchievementDefinition['rarity']): string {
  switch (rarity) {
    case 'common': return 'border-gray-300 dark:border-gray-600';
    case 'uncommon': return 'border-green-400 dark:border-green-600';
    case 'rare': return 'border-blue-400 dark:border-blue-600';
    case 'epic': return 'border-purple-400 dark:border-purple-600';
    case 'legendary': return 'border-amber-400 dark:border-amber-500';
  }
}

// ==========================================
// FRASES MOTIVACIONALES
// ==========================================

export const MOTIVATIONAL_QUOTES = [
  // Training
  { quote: "El dolor es temporal, el orgullo es para siempre.", author: "Desconocido", category: "training" },
  { quote: "No importa lo lento que vayas, siempre estarás adelantando a los que están en el sofá.", author: "Desconocido", category: "training" },
  { quote: "Correr es la mejor forma de meditación en movimiento.", author: "Desconocido", category: "training" },
  { quote: "El único mal entrenamiento es el que no hiciste.", author: "Desconocido", category: "training" },
  { quote: "Tu único límite eres tú mismo.", author: "Desconocido", category: "training" },
  { quote: "La disciplina es el puente entre tus metas y tus logros.", author: "Jim Rohn", category: "training" },

  // Consistency
  { quote: "La constancia vence lo que la dicha no alcanza.", author: "Proverbio", category: "consistency" },
  { quote: "Los pequeños pasos diarios llevan a grandes cambios.", author: "Desconocido", category: "consistency" },
  { quote: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier", category: "consistency" },
  { quote: "No tienes que ser extremo, solo constante.", author: "Desconocido", category: "consistency" },
  { quote: "La motivación te pone en marcha, el hábito te mantiene en movimiento.", author: "Jim Ryun", category: "consistency" },

  // Achievement
  { quote: "Cada logro comienza con la decisión de intentarlo.", author: "Desconocido", category: "achievement" },
  { quote: "Los récords están para romperse.", author: "Desconocido", category: "achievement" },
  { quote: "Hoy es un buen día para batir un récord personal.", author: "Desconocido", category: "achievement" },

  // Reading
  { quote: "Un lector vive mil vidas antes de morir.", author: "George R.R. Martin", category: "reading" },
  { quote: "La lectura es para la mente lo que el ejercicio es para el cuerpo.", author: "Joseph Addison", category: "reading" },
  { quote: "Los libros son un pasaporte a otros mundos.", author: "Desconocido", category: "reading" },
];

// Obtener frase aleatoria
export function getRandomQuote(category?: string): typeof MOTIVATIONAL_QUOTES[0] {
  const filtered = category
    ? MOTIVATIONAL_QUOTES.filter(q => q.category === category)
    : MOTIVATIONAL_QUOTES;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ==========================================
// RETOS SEMANALES PREDEFINIDOS
// ==========================================

export const CHALLENGE_TEMPLATES = [
  {
    type: 'weekly_distance',
    title: 'Semana de {target}km',
    description: 'Corre {target}km esta semana',
    targets: [15, 20, 25, 30, 40, 50],
    xpReward: 150,
  },
  {
    type: 'weekly_workouts',
    title: '{target} entrenamientos',
    description: 'Completa {target} entrenamientos esta semana',
    targets: [3, 4, 5, 6],
    xpReward: 100,
  },
  {
    type: 'weekly_pages',
    title: 'Leer {target} páginas',
    description: 'Lee {target} páginas esta semana',
    targets: [50, 75, 100, 150],
    xpReward: 75,
  },
  {
    type: 'daily_streak',
    title: 'Racha de {target} días',
    description: 'Mantén actividad durante {target} días seguidos',
    targets: [3, 5, 7],
    xpReward: 100,
  },
];
