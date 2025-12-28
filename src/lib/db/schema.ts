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

// Eventos de running
export const runningEvents = pgTable('running_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  category: text('category').default('running').notNull(), // 'running' | 'personal'
  type: text('type').notNull(), // running: 'easy' | 'tempo' | 'intervals' | 'long' | 'rest' | 'race' | 'strength'
  title: text('title'),
  time: text('time'), // "14:30"
  distance: real('distance'), // km
  duration: integer('duration'), // minutos
  pace: text('pace'), // "5:30"
  notes: text('notes'),
  heartRate: integer('heart_rate'),
  feeling: integer('feeling'), // 1-5
  completed: integer('completed').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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

// Types para TypeScript
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type RunningEvent = typeof runningEvents.$inferSelect;
export type NewRunningEvent = typeof runningEvents.$inferInsert;
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
