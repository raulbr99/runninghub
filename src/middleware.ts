import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Rutas que no requieren autenticación
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/strava/webhook', // Webhook de Strava debe ser público
  '/manifest.json',
  '/icons',
  '/sw.js',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Permitir rutas públicas
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Si no hay sesión y no es ruta pública, redirigir a login
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
