import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/context/AuthContext';
import { LanguageProvider } from '@/lib/context/LanguageContext';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { TopProgressBar } from '@/components/shared/TopProgressBar';
import { PwaRegister } from '@/components/shared/PwaRegister';
import { PushNotificationPrompt } from '@/components/shared/PushNotificationPrompt';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#064e3b',
};

export const metadata: Metadata = {
  title: "കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല് പോർട്ടൽ | Mahallu Management Portal",
  description:
    'കുഞ്ഞിക്കുളം ജുമാ മസ്ജിദ് മഹല്ല് ജമാഅത്ത് കുടുംബ രജിസ്ട്രി, മാസവരി വരവ്-ചിലവ് കണക്കുകൾ, വിവാഹ സർട്ടിഫിക്കറ്റ് സേവനങ്ങൾ.',
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
    <html lang="ml" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@300;400;500;600;700;800&family=Noto+Sans+Malayalam:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-200 selection:text-emerald-900"
        suppressHydrationWarning
      >
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <TopProgressBar />
              <Navbar />
              <main className="flex-1 flex flex-col">{children}</main>
              <Footer />
              <PwaRegister />
              <PushNotificationPrompt />
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
