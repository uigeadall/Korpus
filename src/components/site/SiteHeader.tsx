import Link from 'next/link';
import { brand } from '@/config/brand';
import { SiteNav } from './SiteNav';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader() {
  // Стъклена лента с косъм линия отдолу: вижда се докъде стига менюто,
  // без да тежи. Само размазване оставяше ръба да се лута.
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span className="font-display text-base font-semibold tracking-tight">{brand.name}</span>
          <span className="hidden text-[11px] tracking-widest text-muted uppercase sm:inline">
            мебел по проект
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-1">
          <SiteNav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
