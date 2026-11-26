import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { imeNaMarkata } from '@/config/brand';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SKRIPT } from '@/components/site/tema';
import { EzikProvider } from '@/i18n/client';
import { EZICI, HTML_LANG } from '@/i18n/ezik';
import { getEzik } from '@/i18n/server';
import { SAIT } from '@/i18n/tekstove/sait';
import '../globals.css';

/*
 * Един глас в две ширини: Inter Tight за заглавията, Inter за текста.
 * И двата са изрязани за кирилица и нямат характерни букви — тук не
 * шрифтът трябва да личи, а чертежът.
 */
const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
});

/** Трите езика се сглобяват предварително, както беше и с единия. */
export function generateStaticParams() {
  return EZICI.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const ezik = await getEzik();
  const t = SAIT[ezik];
  const ime = imeNaMarkata(ezik);
  return {
    title: {
      default: `${ime} — ${t.tagline}`,
      template: `%s · ${ime}`,
    },
    description: t.opisanie,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const ezik = await getEzik();
  const t = SAIT[ezik];

  return (
    <html
      lang={HTML_LANG[ezik]}
      className={`${interTight.variable} ${inter.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Темата се нанася преди първото рисуване — иначе страницата
            мига в системната и чак после скача в избраната. */}
        <script dangerouslySetInnerHTML={{ __html: SKRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <EzikProvider ezik={ezik}>
          {/* Първото нещо под Tab: прескача менюто и отива в съдържанието. */}
          <a
            href="#sadarzhanie"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-accent focus:bg-background focus:px-4 focus:py-2 focus:text-sm"
          >
            {t.kamSadarzhanieto}
          </a>
          <SiteHeader />
          {children}
          <SiteFooter />
        </EzikProvider>
      </body>
    </html>
  );
}
