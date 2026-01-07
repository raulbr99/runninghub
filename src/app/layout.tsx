import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "RunningHub",
  description: "Centro de control para corredores",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RunningHub",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className="font-sans antialiased bg-zinc-950 text-zinc-100"
      >
        <SessionProvider>
          <AuthenticatedLayout>
            {children}
          </AuthenticatedLayout>
          <ServiceWorkerRegister />
        </SessionProvider>
      </body>
    </html>
  );
}
