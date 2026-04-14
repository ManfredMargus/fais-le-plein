import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PleinOptimal — Carburant le moins cher près de chez vous',
  description: 'Trouvez la station la moins chère autour de vous. Carte interactive, prix en temps réel, 10 000+ stations en France.',
  keywords: 'carburant, essence, diesel, prix, station service, moins cher, France',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
