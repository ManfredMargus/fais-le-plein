import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fais le plein — Carburant le moins cher près de chez vous',
  description: 'Trouvez la station la moins chère autour de vous. Carte interactive, prix en temps réel, 10 000+ stations en France.',
  keywords: 'carburant, essence, diesel, prix, station service, moins cher, France',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fais le plein',
  },
  openGraph: {
    title: 'Fais le plein — Carburant le moins cher',
    description: 'Prix carburant en temps réel. Trouvez la station la moins chère autour de vous.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f97316',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
