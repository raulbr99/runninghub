import type { Metadata } from 'next';
import WorkoutHistoryDashboard from '@/components/workout-history/WorkoutHistoryDashboard';

export const metadata: Metadata = {
  title: 'Historial de entrenos · RunningHub',
  description: 'Historial local de entrenamientos de fuerza y cardio, guardado solo en este navegador.',
};

export default function HistorialPage() {
  return <WorkoutHistoryDashboard />;
}
