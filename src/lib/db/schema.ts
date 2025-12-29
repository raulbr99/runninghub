import { pgTable, text, timestamp, uuid, jsonb, date, real, integer } from 'drizzle-orm/pg-core';

// Conversaciones de chat
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('Nueva conversacion'),
  model: text('model').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Mensajes de cada conversacion
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Perfil de corredor (memoria persistente)
export const runnerProfile = pgTable('runner_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Datos personales
  name: text('name'),
  age: integer('age'),
  weight: real('weight'), // kg
  height: integer('height'), // cm
  // Experiencia
  yearsRunning: integer('years_running'),
  weeklyKm: real('weekly_km'), // km/semana habitual
  // Marcas personales
  pb5k: text('pb_5k'), // formato "20:30"
  pb10k: text('pb_10k'),
  pbHalfMarathon: text('pb_half_marathon'),
  pbMarathon: text('pb_marathon'),
  // Objetivos
  currentGoal: text('current_goal'),
  targetRace: text('target_race'),
  targetDate: date('target_date'),
  targetTime: text('target_time'),
  // Salud y limitaciones
  injuries: text('injuries'),
  healthNotes: text('health_notes'),
  // Preferencias
  preferredTerrain: text('preferred_terrain'),
  availableDays: text('available_days'),
  maxTimePerSession: integer('max_time_per_session'),
  // Notas del coach AI
  coachNotes: text('coach_notes'),
  additionalInfo: jsonb('additional_info').$type<Record<string, unknown>>(),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tipos de eventos del calendario
export type EventCategory = 'running' | 'strength' | 'cycling' | 'swimming' | 'other_sport' | 'personal' | 'rest';

export type RunningType = 'easy' | 'tempo' | 'intervals' | 'fartlek' | 'long' | 'recovery' | 'race' | 'trail';
export type StrengthType = 'upper' | 'lower' | 'full_body' | 'core' | 'functional';
export type CyclingType = 'road' | 'mtb' | 'indoor' | 'gravel';
export type SwimmingType = 'pool' | 'open_water';
export type OtherSportType = 'hiking' | 'yoga' | 'stretching' | 'crossfit' | 'paddle' | 'football' | 'basketball' | 'tennis' | 'other';
export type PersonalType = 'family' | 'social' | 'work' | 'medical' | 'travel' | 'birthday' | 'other';
export type RestType = 'active_recovery' | 'complete_rest' | 'injury';

// Datos especificos por categoria
export interface StrengthExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number; // kg
}

export interface EventData {
  // Running
  pace?: string; // "5:30"
  cadence?: number;
  // Strength
  exercises?: StrengthExercise[];
  muscleGroups?: string[];
  // Cycling
  avgSpeed?: number; // km/h
  power?: number; // watts
  // Swimming
  laps?: number;
  poolLength?: number; // 25 o 50
  strokeType?: string;
  // Other sport
  intensity?: 'low' | 'medium' | 'high';
  // Personal
  location?: string;
  allDay?: boolean;
  // Rest
  reason?: string;
}

// Eventos del calendario (antes running_events)
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  // Categoria y tipo
  category: text('category').default('running').notNull(), // running | strength | cycling | swimming | other_sport | personal | rest
  type: text('type').notNull(), // depende de la categoria
  // Campos comunes
  title: text('title'),
  time: text('time'), // "14:30"
  duration: integer('duration'), // minutos
  distance: real('distance'), // km (running, cycling, swimming en metros)
  notes: text('notes'),
  feeling: integer('feeling'), // 1-5
  completed: integer('completed').default(0),
  // Datos especificos por categoria (JSON)
  eventData: jsonb('event_data').$type<EventData>(),
  // Metricas de cardio (running, cycling, swimming)
  heartRate: integer('heart_rate'),
  elevationGain: real('elevation_gain'), // metros
  calories: integer('calories'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Campos de Strava - Basicos
  stravaId: text('strava_id'),
  movingTime: integer('moving_time'), // segundos
  elapsedTime: integer('elapsed_time'), // segundos
  sportType: text('sport_type'),
  workoutType: integer('workout_type'),
  description: text('description'),
  // Velocidad y ritmo
  averageSpeed: real('average_speed'), // m/s
  maxSpeed: real('max_speed'), // m/s
  // Elevacion detallada
  elevHigh: real('elev_high'), // metros
  elevLow: real('elev_low'), // metros
  // Frecuencia cardiaca
  maxHeartRate: integer('max_heart_rate'),
  hasHeartrate: integer('has_heartrate'),
  // Cadencia
  averageCadence: real('average_cadence'),
  // Potencia
  averageWatts: real('average_watts'),
  maxWatts: integer('max_watts'),
  weightedAverageWatts: real('weighted_average_watts'), // NP
  deviceWatts: integer('device_watts'),
  kilojoules: real('kilojoules'),
  // Esfuerzo
  sufferScore: integer('suffer_score'),
  // Temperatura
  averageTemp: real('average_temp'),
  // Ubicacion y mapa
  startLat: real('start_lat'),
  startLng: real('start_lng'),
  endLat: real('end_lat'),
  endLng: real('end_lng'),
  mapPolyline: text('map_polyline'),
  timezone: text('timezone'),
  // Equipamiento
  gearId: text('gear_id'),
  gearName: text('gear_name'),
  // Dispositivo
  deviceName: text('device_name'),
  // Social
  kudosCount: integer('kudos_count'),
  commentCount: integer('comment_count'),
  achievementCount: integer('achievement_count'),
  prCount: integer('pr_count'),
  // Datos detallados (JSON)
  splitsMetric: jsonb('splits_metric').$type<Array<{
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    pace_zone: number;
  }>>(),
  lapsData: jsonb('laps_data').$type<Array<{
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    start_index: number;
    end_index: number;
    total_elevation_gain: number;
    average_speed: number;
    max_speed: number;
    average_cadence?: number;
    average_watts?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    lap_index: number;
  }>>(),
  segmentEfforts: jsonb('segment_efforts').$type<Array<{
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    average_cadence?: number;
    average_watts?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    segment: {
      name: string;
      distance: number;
      average_grade: number;
      maximum_grade: number;
      elevation_high: number;
      elevation_low: number;
      city: string;
      state: string;
      country: string;
      climb_category: number;
    };
    kom_rank?: number;
    pr_rank?: number;
  }>>(),
});

// Alias para compatibilidad con codigo existente
export const runningEvents = calendarEvents;

// Registro de peso
export const weightEntries = pgTable('weight_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  weight: real('weight').notNull(), // kg
  bodyFat: real('body_fat'), // porcentaje
  muscleMass: real('muscle_mass'), // kg
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Registro de comidas
export const nutritionEntries = pgTable('nutrition_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  mealType: text('meal_type').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: text('description').notNull(),
  calories: integer('calories'),
  protein: real('protein'), // gramos
  carbs: real('carbs'), // gramos
  fats: real('fats'), // gramos
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Objetivos nutricionales
export const nutritionGoals = pgTable('nutrition_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  calories: integer('calories'),
  protein: real('protein'),
  carbs: real('carbs'),
  fats: real('fats'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Configuracion de la app
export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  selectedModel: text('selected_model').default('openai/gpt-4o').notNull(),
  selectedModels: jsonb('selected_models').$type<string[]>().default(['openai/gpt-4o']).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tokens de Strava
export const stravaTokens = pgTable('strava_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  athleteId: text('athlete_id').notNull().unique(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at').notNull(),
  athleteName: text('athlete_name'),
  athleteProfile: text('athlete_profile'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// SISTEMA DE MOTIVACIÓN
// ==========================================

// Estadísticas del usuario (XP, nivel, rachas)
export const userStats = pgTable('user_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  totalXp: integer('total_xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  // Rachas
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActivityDate: date('last_activity_date'),
  // Totales
  totalWorkouts: integer('total_workouts').default(0).notNull(),
  totalDistance: real('total_distance').default(0).notNull(), // km
  totalTime: integer('total_time').default(0).notNull(), // minutos
  totalBooksRead: integer('total_books_read').default(0).notNull(),
  totalPagesRead: integer('total_pages_read').default(0).notNull(),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Logros/Badges desbloqueados
export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  achievementId: text('achievement_id').notNull(), // ID único del logro
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
  progress: integer('progress').default(0), // Progreso actual hacia el logro
});

// Retos activos
export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'weekly_distance' | 'weekly_workouts' | 'read_pages' | 'streak'
  title: text('title').notNull(),
  description: text('description'),
  target: integer('target').notNull(), // Meta a alcanzar
  current: integer('current').default(0).notNull(), // Progreso actual
  xpReward: integer('xp_reward').default(100).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  completed: integer('completed').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Lista de libros
export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  author: text('author'),
  totalPages: integer('total_pages'),
  currentPage: integer('current_page').default(0).notNull(),
  status: text('status').default('to_read').notNull(), // 'to_read' | 'reading' | 'completed'
  category: text('category'), // 'running' | 'nutrition' | 'mindset' | 'other'
  rating: integer('rating'), // 1-5
  notes: text('notes'),
  startedAt: date('started_at'),
  finishedAt: date('finished_at'),
  coverUrl: text('cover_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Registro de lectura diaria
export const readingLog = pgTable('reading_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  pagesRead: integer('pages_read').notNull(),
  minutesRead: integer('minutes_read'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Hábitos diarios
export const dailyHabits = pgTable('daily_habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  // Hábitos de entrenamiento
  didWorkout: integer('did_workout').default(0).notNull(),
  workoutXp: integer('workout_xp').default(0).notNull(),
  // Hábitos de lectura
  didRead: integer('did_read').default(0).notNull(),
  readingXp: integer('reading_xp').default(0).notNull(),
  // Hábitos de nutrición
  loggedMeals: integer('logged_meals').default(0).notNull(),
  nutritionXp: integer('nutrition_xp').default(0).notNull(),
  // Hábitos de peso
  loggedWeight: integer('logged_weight').default(0).notNull(),
  weightXp: integer('weight_xp').default(0).notNull(),
  // Total del día
  totalXp: integer('total_xp').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Hábitos personalizables
export const customHabits = pgTable('custom_habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').default('⭐').notNull(), // emoji
  color: text('color').default('#6366f1').notNull(), // hex color
  // Frecuencia
  frequency: text('frequency').default('daily').notNull(), // 'daily' | 'weekly' | 'specific_days'
  specificDays: jsonb('specific_days').$type<number[]>(), // [0,1,2,3,4,5,6] para días específicos (0=domingo)
  // Tipo de tracking
  trackingType: text('tracking_type').default('boolean').notNull(), // 'boolean' | 'quantity' | 'duration'
  targetValue: integer('target_value'), // meta diaria (ej: 8 vasos, 30 minutos)
  unit: text('unit'), // 'vasos', 'minutos', 'páginas', etc.
  // Gamificación
  xpReward: integer('xp_reward').default(10).notNull(),
  // Estado
  isActive: integer('is_active').default(1).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Registro de hábitos completados
export const habitLogs = pgTable('habit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').references(() => customHabits.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  completed: integer('completed').default(1).notNull(),
  value: real('value'), // valor actual (para quantity/duration)
  notes: text('notes'),
  xpEarned: integer('xp_earned').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Frases motivacionales personalizadas
export const motivationalQuotes = pgTable('motivational_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  quote: text('quote').notNull(),
  author: text('author'),
  category: text('category'), // 'training' | 'consistency' | 'achievement' | 'reading'
  shownAt: timestamp('shown_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types para TypeScript
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
// Alias para compatibilidad
export type RunningEvent = CalendarEvent;
export type NewRunningEvent = NewCalendarEvent;
export type RunnerProfile = typeof runnerProfile.$inferSelect;
export type NewRunnerProfile = typeof runnerProfile.$inferInsert;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type NewWeightEntry = typeof weightEntries.$inferInsert;
export type NutritionEntry = typeof nutritionEntries.$inferSelect;
export type NewNutritionEntry = typeof nutritionEntries.$inferInsert;
export type NutritionGoals = typeof nutritionGoals.$inferSelect;
export type NewNutritionGoals = typeof nutritionGoals.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;
export type StravaToken = typeof stravaTokens.$inferSelect;
export type NewStravaToken = typeof stravaTokens.$inferInsert;
export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type ReadingLog = typeof readingLog.$inferSelect;
export type NewReadingLog = typeof readingLog.$inferInsert;
export type DailyHabit = typeof dailyHabits.$inferSelect;
export type NewDailyHabit = typeof dailyHabits.$inferInsert;
export type MotivationalQuote = typeof motivationalQuotes.$inferSelect;
export type NewMotivationalQuote = typeof motivationalQuotes.$inferInsert;
export type CustomHabit = typeof customHabits.$inferSelect;
export type NewCustomHabit = typeof customHabits.$inferInsert;
export type HabitLog = typeof habitLogs.$inferSelect;
export type NewHabitLog = typeof habitLogs.$inferInsert;
