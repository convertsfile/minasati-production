// frontend/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from './components/ThemeProvider';
import AuthProvider from './components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'منصتنا | Minassati',
  description: 'منصتك التعليمية للتميز في التعلم العميق',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* ... (نفس إعدادات الخطوط الممتازة الخاصة بك) ... */}
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {/* 🚀 AuthProvider يقوم بتهيئة Zustand وجلب بيانات الطالب لمرة واحدة فقط */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}