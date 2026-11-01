import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geologica, JetBrains_Mono, Onest } from 'next/font/google';
import { brand } from '@/config/brand';
import './globals.css';

const geologica = Geologica({
  variable: '--font-geologica',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const onest = Onest({
  variable: '--font-onest',
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description:
    'Кухни, гардероби и обзавеждане по индивидуален проект: измерване, проект, производство и монтаж.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="bg"
      className={`${geologica.variable} ${onest.variable} ${jetbrains.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
