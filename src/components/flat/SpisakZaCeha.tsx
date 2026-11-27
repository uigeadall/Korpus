'use client';

/**
 * Един списък за цеха от цялото жилище.
 *
 * Досега шест обзаведени стаи даваха шест PDF-а и шест XLSX-а — цехът
 * получаваше шест пратки за една поръчка. Тук те стават един файл, с
 * позиции през цялото жилище и с общ разкрой.
 *
 * Жилището пътува като запис, не като шест проекта: същото, което се
 * копира в линк. Сметката е на сървъра, със същите правила, с които се
 * реже — браузърът само казва „искам" и сваля.
 *
 * Самите файлове са на български: те отиват в цеха, не при клиента, и
 * там се чете един език. Преведено е това, което стои на екрана.
 */

import { useState } from 'react';
import { downloadResponse } from '@/components/configurator/iznasyane';
import { useT } from '@/i18n/client';
import { JILISHTE } from '@/i18n/tekstove/jilishte';
import { type Flat, progressOf } from '@/lib/flat';
import { encodeFlat } from '@/lib/flat-share';

type Vid = 'pdf' | 'xlsx';

const VRATA: Record<Vid, { path: string; name: string }> = {
  pdf: { path: '/api/export/flat-pdf', name: 'korpus-jilishte.pdf' },
  xlsx: { path: '/api/export/flat-xlsx', name: 'korpus-jilishte.xlsx' },
};

export function SpisakZaCeha({ flat }: { flat: Flat }) {
  const t = useT(JILISHTE).spisak;
  const [busy, setBusy] = useState<Vid | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = progressOf(flat);
  const nothing = progress.done === 0;

  const svali = async (vid: Vid) => {
    setBusy(vid);
    setError(null);
    try {
      const response = await fetch(VRATA[vid].path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ flat: encodeFlat(flat) }),
      });

      if (!response.ok) {
        /*
         * Вратата казва какво ѝ е и съобщението ѝ е писано за човек —
         * предава се както е, вместо да се заменя с „нещо се обърка".
         */
        const said = await response
          .json()
          .then((b: { error?: string }) => b.error)
          .catch(() => null);
        throw new Error(said ?? t.greshka(response.status));
      }

      await downloadResponse(response, VRATA[vid].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.ne);
    } finally {
      setBusy(null);
    }
  };

  const BUTON: Record<Vid, { label: string; hint: string }> = {
    pdf: { label: t.pdf, hint: t.pdfPod },
    xlsx: { label: t.xlsx, hint: t.xlsxPod },
  };

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">{t.zaglavie}</h2>
      <p className="mt-1 text-xs text-muted">
        {nothing ? t.nishto : progress.done === 1 ? t.edna : t.mnogo(progress.done)}
      </p>

      <div className="mt-3 space-y-2">
        {(['pdf', 'xlsx'] as const).map((vid) => (
          <div key={vid}>
            <button
              type="button"
              onClick={() => svali(vid)}
              disabled={nothing || busy !== null}
              className="btn btn-quiet w-full text-[13px] disabled:opacity-50"
            >
              {busy === vid ? t.chaka : BUTON[vid].label}
            </button>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{BUTON[vid].hint}</p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      {/*
        Същият текст, който стои и във файла. Числата в него са работни,
        докато каталогът не се провери — това не бива да се премълчава
        точно пред човека, който ще ги даде на цеха.
      */}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">{t.neEOferta}</p>
    </section>
  );
}
