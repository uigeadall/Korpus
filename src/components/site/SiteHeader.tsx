import Link from 'next/link';
import { brand } from '@/config/brand';
import { SiteNav } from './SiteNav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-lg tracking-tight">{brand.name}</span>
          <span className="dim hidden text-[10px] uppercase tracking-[0.2em] sm:inline">
            мебел по проект
          </span>
        </Link>

        <SiteNav />
      </div>
    </header>
  );
}
