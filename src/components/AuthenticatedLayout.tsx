'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import ChatPopup from './ChatPopup';

const PUBLIC_PATHS = ['/login'];

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  // En rutas públicas, solo mostrar el contenido
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Mientras carga, mostrar spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Si está autenticado, mostrar layout completo
  if (isAuthenticated) {
    return (
      <>
        <Sidebar />
        <main className="md:ml-64 min-h-screen">
          {children}
        </main>
        <ChatPopup />
      </>
    );
  }

  // Si no está autenticado, redirigir al login (el middleware también lo hace)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  );
}
