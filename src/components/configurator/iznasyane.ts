'use client';

/**
 * Кадърът, свален като картинка.
 *
 * Самото рисуване е сметка и живее в `lib/render.ts`; тук е само онова,
 * което иска браузър — платно, което превръща низа в пиксели, и
 * свалянето.
 *
 * Минава се през `Image`, а не през библиотека: SVG, който е пълен
 * документ с мерки в пиксели и без цветове от темата, браузърът го
 * рисува сам. Точно затова `renderScene` настоява на това.
 */

import type { Rendered } from '@/lib/render';

/**
 * Низът става PNG.
 *
 * `blob:` вместо `data:`: дълъг `data:` адрес за сцена с хиляда лица
 * опира в ограничението за дължина в някои браузъри и картинката тихо
 * не се зарежда.
 */
export function svgToPng(rendered: Rendered): Promise<Blob> {
  const { svg, width, height } = rendered;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();

    const done = (fn: () => void) => {
      URL.revokeObjectURL(url);
      fn();
    };

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        done(() => reject(new Error('Платното не се отвори.')));
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        done(() =>
          blob ? resolve(blob) : reject(new Error('Картинката не се получи.')),
        );
      }, 'image/png');
    };

    image.onerror = () => done(() => reject(new Error('Кадърът не се прочете.')));
    image.src = url;
  });
}

/** Сваля готовото под дадено име. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  // Браузърът още чете адреса, докато сваля — пуска се след това.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Името, което сървърът е дал на файла.
 *
 * Той го смята от датата и вида; браузърът няма защо да го гадае
 * втори път. Няма ли заглавка, остава резервното.
 */
export function filenameFrom(response: Response, fallback: string): string {
  const said = response.headers.get('content-disposition') ?? '';
  return /filename="([^"]+)"/.exec(said)?.[1] ?? fallback;
}

/** Сваля отговора на заявка, под името, което сървърът е дал. */
export async function downloadResponse(response: Response, fallback: string): Promise<void> {
  downloadBlob(await response.blob(), filenameFrom(response, fallback));
}

/** Име на файла: по стая и по дата, за да не се трупат „(1)" в папката. */
export function imageName(room: string, pass: string): string {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  return `korpus-${room}-${pass}-${stamp}.png`;
}
