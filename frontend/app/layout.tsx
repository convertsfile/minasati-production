import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from './components/ThemeProvider';
import BlockedUserCheck from './components/BlockedUserCheck';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <BlockedUserCheck>
            {children}
          </BlockedUserCheck>
        </ThemeProvider>
      </body>
    </html>
  );
}
