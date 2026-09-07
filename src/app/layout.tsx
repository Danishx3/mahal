import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/context/AuthContext';
import { Navbar } from '@/components/shared/Navbar';
import { TopProgressBar } from '@/components/shared/TopProgressBar';

export const metadata: Metadata = {
  title: "Mahallu & Village Management System | Al-Huda Jama'ath",
  description:
    'Comprehensive digital governance, household registry, monthly dues tracking, and double-entry financial ledger for Mahallu Jamaath.',
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
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
