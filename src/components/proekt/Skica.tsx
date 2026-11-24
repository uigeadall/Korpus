'use client';

/**
 * Кадърът става снимка.
 *
 * Изпраща се това, което човек вижда, и описанието на стаята; връща се
 * същата стая, доправена от модела. Кадърът се прави тук, а не на
 * сървъра: сцената е SVG и платното я рисува там, където вече стои.
 *
 * Снимката НОСИ НАДПИС, че е впечатление. Моделът ще измисли дръжка и
 * ще премести контакт — това е добре за „ето как ще изглежда" и е лъжа
 * за „ето какво ще получиш". Фирма, която продава точност, не бива да
 * се подпише под картинка, която сама не е точна. Надписът не е
 * украса; той е единственото, което държи двете неща разделени.
 */

import { useState } from 'react';
import { type Kitchen, computeKitchen, kitchenRoom } from '@/lib/cabinet-rules';
import { describeProject } from '@/lib/opisanie';
import { renderScene } from '@/lib/render';
import { SKICA } from '@/lib/skica';
import { DEFAULT_CAMERA, sceneFor } from '@/lib/scene3d';
import { downloadBlob, imageName, svgToPng } from '@/components/configurator/iznasyane';

/**
 * Кога се нулира дневният лимит, в часа на човека. Cloudflare нулира в
 * 00:00 UTC — у нас това е 02:00 зиме и 03:00 лете.
 */
function resetTime(now = new Date()): string {
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  // Сглобено на ръка: браузърите форматират „bg-BG" различно, някои добавят „ч.".
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(reset.getHours())}:${two(reset.getMinutes())}`;
}

type Sastoyanie =
  | { vid: 'pokoj' }
  | { vid: 'chaka' }
  | { vid: 'gotova'; src: string }
  | { vid: 'greshka'; said: string };

export function Skica({
  kitchen,
  view,
}: {
  kitchen: Kitchen;
  view?: { yaw: number; pitch: number; distance: number };
}) {
  const [s, setS] = useState<Sastoyanie>({ vid: 'pokoj' });

  const napravi = async () => {
    setS({ vid: 'chaka' });
    try {
      const room = kitchenRoom(kitchen);
      const cam = { ...DEFAULT_CAMERA(room), ...view };
      const boxes = sceneFor(
        kitchen,
        room,
        computeKitchen(kitchen).placed,
        kitchen.materials.worktop,
        kitchen.materials.opening,
      );
      const rendered = renderScene(boxes, cam, kitchen, { width: SKICA.sendWidth, room });
      const png = await svgToPng(rendered);

      /*
       * Кадърът отива като base64. `FileReader` го прави наведнъж;
       * ръчното сглобяване през `btoa` чупи стека при голям файл.
       */
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ''));
        reader.onerror = () => reject(new Error('кадърът не се прочете'));
        reader.readAsDataURL(png);
      });

      const response = await fetch('/api/skica', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          prompt: describeProject(kitchen).promptEn,
          room: kitchen.roomKind ?? 'kitchen',
        }),
      });

      if (response.status === 503) {
        setS({ vid: 'greshka', said: 'Снимките още не са включени при нас.' });
        return;
      }
      if (response.status === 429) {
        const body = (await response.json().catch(() => ({}))) as { limit?: string };
        setS({
          vid: 'greshka',
          said:
            body.limit === 'day'
              ? `Безплатният дневен лимит на AI снимките е изчерпан. Опитайте след ${resetTime()} ч.`
              : 'Твърде много снимки наведнъж. Опитайте след малко.',
        });
        return;
      }
      if (!response.ok) throw new Error(String(response.status));

      const body = (await response.json()) as { image: string; mime: string };
      setS({ vid: 'gotova', src: `data:${body.mime};base64,${body.image}` });
    } catch {
      setS({ vid: 'greshka', said: 'Снимката не се получи. Опитайте пак след малко.' });
    }
  };

  const svali = async () => {
    if (s.vid !== 'gotova') return;
    const blob = await (await fetch(s.src)).blob();
    downloadBlob(blob, imageName(kitchen.roomKind ?? 'kitchen', 'snimka'));
  };

  return (
    <div className="space-y-3">
      {s.vid !== 'gotova' && (
        <p className="text-[13px] leading-relaxed text-muted">
          AI взима стаята точно както сте я наредили и я рисува като истинска снимка — със
          светлина, материали и отражения. Отнема до половин минута.
        </p>
      )}

      <button
        type="button"
        onClick={napravi}
        disabled={s.vid === 'chaka'}
        aria-busy={s.vid === 'chaka'}
        className="btn btn-primary w-full py-3 disabled:opacity-50"
      >
        {s.vid === 'chaka'
          ? 'AI рисува стаята…'
          : s.vid === 'gotova'
            ? 'Генерирайте отново'
            : 'Генерирайте с AI'}
      </button>

      {s.vid === 'greshka' && (
        <p role="alert" className="text-sm text-danger">
          {s.said}
        </p>
      )}

      {s.vid === 'gotova' && (
        <figure className="m-0 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.src}
            alt="Снимка на стаята, направена по проекта от модел. Впечатление, не чертеж."
            className="w-full rounded-[7px] border border-border"
          />
          <figcaption className="text-[13px] leading-relaxed text-muted">
            <strong className="text-foreground">Това е впечатление, не чертеж.</strong> Моделът
            рисува по вашия проект, но измисля подробности — дръжка, контакт, отражение. Това,
            което отива в цеха, е PDF-ът с размерите.
          </figcaption>
          <button type="button" onClick={svali} className="btn btn-quiet w-full py-2 text-[13px]">
            Свалете снимката
          </button>
        </figure>
      )}
    </div>
  );
}
