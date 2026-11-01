import Link from 'next/link';
import { brand } from '@/config/brand';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{brand.tagline}</p>
      <h1 className="font-display mt-3 max-w-3xl text-3xl leading-tight sm:text-5xl">
        Кухни и гардероби, направени по мярка на жилището — не по каталог.
      </h1>
      <p className="mt-5 max-w-xl text-muted">
        Измерване, проект, производство и монтаж. А преди всичко това — може сами да нареждате
        кухнята си и да видите чертежа ѝ.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/konfigurator"
          className="border border-accent bg-accent px-5 py-3 text-sm text-accent-contrast transition-opacity hover:opacity-90"
        >
          Отвори конфигуратора
        </Link>
        <Link
          href="/kontakt"
          className="border border-border px-5 py-3 text-sm transition-colors hover:border-accent hover:text-accent"
        >
          Запитване
        </Link>
      </div>
      <p className="mt-12 border-t border-border pt-4 text-xs text-muted">
        Страницата е в разработка: текстовете и снимките следват.
      </p>
    </main>
  );
}
