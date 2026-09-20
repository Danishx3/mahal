import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/context/AuthContext';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { TopProgressBar } from '@/components/shared/TopProgressBar';
import { PwaRegister } from '@/components/shared/PwaRegister';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#064e3b',
};

export const metadata: Metadata = {
  title: "Mahallu & Village Management System | Kunjikkulam Juma Masjid",
  description:
    'Comprehensive digital governance, household registry, monthly dues tracking, and double-entry financial ledger for Mahallu Jamaath.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mahallu Portal',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
      { url: '/apple-touch-icon.png' },
      { url: '/icon-192x192.png', sizes: '192x192' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-200 selection:text-emerald-900"
        suppressHydrationWarning
      >
        <AuthProvider>
          <ToastProvider>
            <TopProgressBar />
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
            <PwaRegister />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
