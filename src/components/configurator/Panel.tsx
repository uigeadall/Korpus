'use client';

/**
 * Сгъваем панел. Вторичното (стая, отвори, подложка, материали) стои
 * затворено, за да не изтласква чертежа на четири екрана надолу.
 *
 * Носи се от `<details>`: отваря се и без JavaScript, четецът го обявява
 * сам и търсенето в страницата го разгъва.
 */
export function Panel({
  title,
  badge,
  open = false,
  children,
}: {
  title: string;
  /** Кратък знак отдясно — брой, състояние. */
  badge?: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 marker:content-none hover:bg-surface-sunken">
        <span
          aria-hidden
          className="font-mono text-xs text-muted transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        <h2 className="font-display text-base">{title}</h2>
        {badge !== undefined && <span className="dim ml-auto text-sm">{badge}</span>}
      </summary>
      <div>{children}</div>
    </details>
  );
}
