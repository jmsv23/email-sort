import type { Metadata } from 'next';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
