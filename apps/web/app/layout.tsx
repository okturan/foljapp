import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'foljapp — Albanian verbal system reference',
  description:
    'A comprehensive Albanian verb conjugation reference. Educational, reference-quality, academically rich.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-stone-900 antialiased">{children}</body>
    </html>
  );
}
