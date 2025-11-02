import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import { CategoryFilterProvider } from '@/contexts/CategoryFilterContext';

export const metadata: Metadata = {
  title: 'Email Sort - AI-Powered Gmail Management',
  description: 'Automatically categorize, summarize, and manage your Gmail inbox with AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          <CategoryFilterProvider>
            {children}
          </CategoryFilterProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
