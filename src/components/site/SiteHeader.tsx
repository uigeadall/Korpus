import Link from 'next/link';
import { brand } from '@/config/brand';
import { SiteNav } from './SiteNav';

export function SiteHeader() {
  // Лентата отгоре е стъклена и без линия — отделя се с размазване.
  return (
    <header className="sticky top-0 z-20 bg-background/72 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-[1.0625rem] font-semibold">{brand.name}</span>
          <span className="hidden text-[13px] text-muted sm:inline">мебел по проект</span>
        </Link>

        <SiteNav />
      </div>
    </header>
  );
}
