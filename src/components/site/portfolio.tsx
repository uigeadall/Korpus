/**
 * Частите на портфолиото: кадър, каре в галерията и маркировката на
 * примерния запис. Кадър без файл се показва като честен заместител —
 * никога чужда снимка (SPEC 10).
 */

import Image from 'next/image';
import Link from '@/i18n/Link';
import {
  SCOPE_LABELS_PO_EZIK,
  formatCompleted,
  naEzik,
  type Project,
  type ProjectFact,
  type ProjectImage,
} from '@/content/portfolio';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function ProjectPhoto({
  image,
  priority = false,
}: {
  image: ProjectImage;
  priority?: boolean;
}) {
  const t = STRANICI[await getEzik()].portfolio;
  return (
    <figure>
      <div className="paper-grid relative flex aspect-[4/3] items-center justify-center overflow-hidden border border-border">
        {image.src ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <span className="px-4 text-center text-sm text-muted">
            {image.alt} — {t.predstoiZasnemane}
          </span>
        )}
      </div>
      {image.caption && (
        <figcaption className="mt-2 text-xs text-muted">{image.caption}</figcaption>
      )}
    </figure>
  );
}

/** Каре в галерията: първият кадър, видът обзавеждане, място и месец. */
export async function ProjectCard({ project: osnova }: { project: Project }) {
  const ezik = await getEzik();
  const t = STRANICI[ezik].portfolio;
  const project = naEzik(osnova, ezik);
  const obhvat = SCOPE_LABELS_PO_EZIK[ezik][project.scope];
  return (
    <article>
      <Link
        href={`/portfolio/${project.slug}`}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="paper-grid relative flex aspect-[4/3] items-center justify-center overflow-hidden border border-border transition-colors group-hover:bg-border">
          {project.images[0]?.src ? (
            <Image
              src={project.images[0].src}
              alt={project.images[0].alt}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <span className="px-4 text-center text-sm text-muted">
              {obhvat} — {t.predstoiZasnemane}
            </span>
          )}
        </div>
        <h3 className="font-display mt-3 text-base transition-colors group-hover:text-accent">
          {project.title}
        </h3>
      </Link>
      <p className="mt-1 text-xs text-muted">
        {obhvat} · {project.city} ·{' '}
        <span className="dim">{formatCompleted(project.completed, ezik)}</span>
      </p>
    </article>
  );
}

/** Таблица „етикет — стойност" за параметри и материали. */
export function FactList({ facts }: { facts: ProjectFact[] }) {
  return (
    <dl className="divide-y divide-border border-t border-border text-sm">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-wrap gap-x-4 gap-y-1 py-3">
          <dt className="min-w-[10rem] text-muted">{fact.label}</dt>
          <dd className="flex-1">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Видима маркировка, че записът е мостра, а не наш обект. */
export async function ExampleNotice() {
  const t = STRANICI[await getEzik()].portfolio;
  return (
    <p className="mb-8 well px-4 py-3 text-xs leading-relaxed text-muted">
      <strong className="text-foreground">{t.primerZaglavie}</strong> {t.primerText}
    </p>
  );
}
