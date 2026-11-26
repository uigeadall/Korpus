/**
 * Една правна страница: заглавие, маркировка за чернова и текстът по
 * абзаци от `i18n/tekstove/pravni.ts`. Трите страници се различават само
 * по текста, затова се рисуват от едно място.
 */

import { Fragment } from 'react';
import { Bogat, DraftNotice, PageHeader, Prose, Section, Shell } from './ui';
import { imeNaMarkata, legal } from '@/config/brand';
import { getEzik } from '@/i18n/server';
import { PRAVNI } from '@/i18n/tekstove/pravni';
import { SAIT } from '@/i18n/tekstove/sait';

export async function PravnaStranica({
  koya,
}: {
  koya: 'poveritelnost' | 'usloviya' | 'biskvitki';
}) {
  const ezik = await getEzik();
  const vsichki = PRAVNI[ezik];
  const t = vsichki[koya];
  const bloka = t.bloka({
    ime: imeNaMarkata(ezik),
    meseci: legal.inquiryRetentionMonths,
    godini: legal.warrantyYears,
  });

  return (
    <Shell>
      <PageHeader eyebrow={SAIT[ezik].futar.pravni} title={t.zaglavie} lead={t.vavedenie} />

      <Section>
        <DraftNotice />
        {vsichki.vazhiBalgarskiyat && (
          <p className="mb-8 max-w-[62ch] text-xs leading-relaxed text-muted">
            {vsichki.vazhiBalgarskiyat}
          </p>
        )}
        <Prose>
          {bloka.map((b, i) => (
            <Fragment key={i}>
              {'h' in b && <h2>{b.h}</h2>}
              {'p' in b && (
                <p>
                  <Bogat text={b.p} />
                </p>
              )}
              {'ul' in b && (
                <ul>
                  {b.ul.map((li) => (
                    <li key={li}>
                      <Bogat text={li} />
                    </li>
                  ))}
                </ul>
              )}
            </Fragment>
          ))}
        </Prose>
      </Section>
    </Shell>
  );
}
