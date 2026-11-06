import './globals.css';
import type { Metadata, Viewport } from 'next';
import React from 'react';
import { RegisterSW } from '../components/RegisterSW';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Road to Baki',
  description: "Entraîne-toi comme un combattant : séances guidées, démos 3D, nutrition et jeûne.",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Road to Baki', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0b0c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Oswald:wght@500;600;700&family=Noto+Serif+JP:wght@900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
