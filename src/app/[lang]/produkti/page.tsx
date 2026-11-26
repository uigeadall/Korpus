import type { Metadata } from 'next';
import Link from '@/i18n/Link';
import { Card, Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { produkti } from '@/content/products';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  const t = STRANICI[await getEzik()].produkti;
  return { title: t.zaglavieStr, description: t.opisanie };
}

export default async function ProductsPage() {
  const ezik = await getEzik();
  const t = STRANICI[ezik].produkti;

  return (
    <Shell>
      <PageHeader eyebrow={t.zaglavieStr} title={t.zaglavie} lead={t.vavedenie} />

      <Section caption={t.liniite}>
        <div className="grid gap-8 sm:grid-cols-2">
          {produkti(ezik).map((p) => (
            <Card key={p.title} title={p.title} tag={p.soon ? t.skoro : t.osnovna}>
              <p>{p.lead}</p>
              <ul className="mt-3 space-y-1">
                {p.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="dim">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {p.note && <p className="mt-3 text-xs">{p.note}</p>}
              {p.slug && (
                <Link
                  href={`/produkti/${p.slug}`}
                  className="mt-4 inline-block text-sm underline underline-offset-2 hover:text-accent"
                >
                  {t.poveche}
                </Link>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <section className="py-12">
        <Cta href="/proekt">{STRANICI[ezik].obshto.napraviProekt}</Cta>
      </section>
    </Shell>
  );
}
