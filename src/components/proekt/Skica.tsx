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
 *
 * След снимката — два бутона. „Харесва ми" я праща: на телефон през
 * менюто за споделяне (Viber, WhatsApp, имейл) заедно с линка към
 * проекта; където такова меню няма, снимката се сваля, а линкът се
 * копира. Направо до фирмата още не може — пощата и базата чакат
 * акаунтите (план 0.3, Ж5–Ж6). „Не ми харесва" рисува нова, а старата
 * стои на екрана, докато новата дойде: празно място между двете кара
 * човек да мисли, че е счупено.
 */

import { useState } from 'react';
import { type Kitchen, computeKitchen, kitchenRoom } from '@/lib/cabinet-rules';
import { describeProject } from '@/lib/opisanie';
import { renderScene, tightViewBox } from '@/lib/render';
import { SKICA } from '@/lib/skica';
import { DEFAULT_CAMERA, sceneFor } from '@/lib/scene3d';
import { projectLink } from '@/lib/share';
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

/** Какво стана с харесаната снимка. */
type Pratena = 'spodelena' | 'svalena-i-kopiran' | 'svalena';

type Sastoyanie =
  | { vid: 'pokoj' }
  /** `prev` — снимката, която стои на екрана, докато се рисува нова. */
  | { vid: 'chaka'; prev?: string }
  | { vid: 'gotova'; src: string; pratena?: Pratena }
  | { vid: 'greshka'; said: string; prev?: string };

const PRATENA_SAID: Record<Pratena, string> = {
  spodelena: '✓ Изпратено.',
  'svalena-i-kopiran':
    '✓ Снимката е свалена, а линкът към проекта е копиран. Пратете ги по имейл, Viber или WhatsApp.',
  svalena: '✓ Снимката е свалена. Пратете я заедно с линка към проекта.',
};

export function Skica({
  kitchen,
  view,
}: {
  kitchen: Kitchen;
  view?: { yaw: number; pitch: number; distance: number };
}) {
  const [s, setS] = useState<Sastoyanie>({ vid: 'pokoj' });

  /** Снимката на екрана, каквото и да става в момента. */
  const shown = s.vid === 'gotova' ? s.src : s.vid === 'pokoj' ? undefined : s.prev;

  const napravi = async (prev?: string) => {
    const fail = (said: string) => setS({ vid: 'greshka', said, prev });
    setS({ vid: 'chaka', prev });
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
      // Плътно около стаята: с бяло наоколо моделът мести вратите (виж `tightViewBox`).
      const rendered = renderScene(boxes, cam, kitchen, {
        width: SKICA.sendWidth,
        room,
        viewBox: tightViewBox(boxes, cam),
      });
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
        fail('Снимките още не са включени при нас.');
        return;
      }
      if (response.status === 429) {
        const body = (await response.json().catch(() => ({}))) as { limit?: string };
        fail(
          body.limit === 'day'
            ? `Безплатният дневен лимит на AI снимките е изчерпан. Опитайте след ${resetTime()} ч.`
            : 'Твърде много снимки наведнъж. Опитайте след малко.',
        );
        return;
      }
      if (!response.ok) throw new Error(String(response.status));

      const body = (await response.json()) as { image: string; mime: string };
      setS({ vid: 'gotova', src: `data:${body.mime};base64,${body.image}` });
    } catch {
      fail('Снимката не се получи. Опитайте пак след малко.');
    }
  };

  const snimkata = async (src: string) => {
    const blob = await (await fetch(src)).blob();
    return { blob, name: imageName(kitchen.roomKind ?? 'kitchen', 'snimka') };
  };

  const svali = async () => {
    if (!shown) return;
    const { blob, name } = await snimkata(shown);
    downloadBlob(blob, name);
  };

  const prati = async () => {
    if (s.vid !== 'gotova') return;
    const src = s.src;
    const { blob, name } = await snimkata(src);
    const link = projectLink(window.location.origin, '/proekt', kitchen);
    const text = `Харесва ми как ще изглежда стаята ми. Ето проекта: ${link}`;
    const file = new File([blob], name, { type: blob.type || 'image/jpeg' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Моята стая', text });
        setS({ vid: 'gotova', src, pratena: 'spodelena' });
        return;
      } catch (error) {
        // Човекът е затворил менюто — това е отказ, не грешка.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    // Без меню за споделяне: снимката се сваля, линкът се копира.
    downloadBlob(blob, name);
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      /* без достъп до клипборда — остава само снимката */
    }
    setS({ vid: 'gotova', src, pratena: copied ? 'svalena-i-kopiran' : 'svalena' });
  };

  const chaka = s.vid === 'chaka';

  return (
    <div className="space-y-3">
      {!shown && (
        <>
          <p className="text-[13px] leading-relaxed text-muted">
            AI взима стаята точно както сте я наредили и я рисува като истинска снимка — със
            светлина, материали и отражения. Отнема до половин минута.
          </p>
          <button
            type="button"
            onClick={() => napravi()}
            disabled={chaka}
            aria-busy={chaka}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {chaka ? 'AI рисува стаята…' : 'Генерирайте с AI'}
          </button>
        </>
      )}

      {s.vid === 'greshka' && (
        <p role="alert" className="text-sm text-danger">
          {s.said}
        </p>
      )}

      {shown && (
        <figure className="m-0 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown}
            alt="Снимка на стаята, направена по проекта от модел. Впечатление, не чертеж."
            className={`w-full rounded-[7px] border border-border transition-opacity ${chaka ? 'opacity-40' : ''}`}
          />
          <figcaption className="text-[13px] leading-relaxed text-muted">
            <strong className="text-foreground">Това е впечатление, не чертеж.</strong> Моделът
            рисува по вашия проект, но измисля подробности — дръжка, контакт, отражение. Това,
            което отива в цеха, е PDF-ът с размерите.
          </figcaption>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={prati}
              disabled={s.vid !== 'gotova'}
              className="btn btn-primary py-3 text-[13px] disabled:opacity-50"
            >
              Харесва ми — пратете я
            </button>
            <button
              type="button"
              onClick={() => napravi(shown)}
              disabled={chaka}
              aria-busy={chaka}
              className="btn btn-quiet py-3 text-[13px] disabled:opacity-50"
            >
              {chaka ? 'AI рисува нова…' : 'Не ми харесва — нова'}
            </button>
          </div>

          {s.vid === 'gotova' && s.pratena && (
            <p role="status" className="text-[13px] leading-relaxed text-muted">
              {PRATENA_SAID[s.pratena]}
            </p>
          )}

          <button type="button" onClick={svali} className="btn btn-quiet w-full py-2 text-[13px]">
            Свалете снимката
          </button>
        </figure>
      )}
    </div>
  );
}
