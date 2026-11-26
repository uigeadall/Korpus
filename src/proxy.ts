/**
 * Кой език отговаря на адреса.
 *
 * - `/en/…` и `/zh/…` — минават както са.
 * - `/bg/…` — пренасочва се към адреса без префикс: българският има
 *   един адрес, не два.
 * - всичко друго е български и вътрешно се обслужва от `/bg/…`.
 *
 * Изключение: човек, който сам е избрал английски или китайски от
 * менюто, и отвори български адрес (пратен линк, отметка) — отива на
 * своя език. Изборът стои в бисквитка и само менюто я пише; адресът
 * на чужд език, отворен веднъж, не сменя нищо.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { BISKVITKA, OSNOVEN, adres, eEzik, razdeli } from '@/i18n/ezik';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { ezik, put } = razdeli(pathname);
  const sPrefiks = pathname !== put;

  if (sPrefiks && ezik === OSNOVEN) {
    return NextResponse.redirect(new URL(`${put}${search}`, request.url), 308);
  }
  if (sPrefiks) return NextResponse.next();

  const izbran = request.cookies.get(BISKVITKA)?.value;
  if (eEzik(izbran) && izbran !== OSNOVEN && request.method === 'GET') {
    return NextResponse.redirect(new URL(`${adres(izbran, put)}${search}`, request.url), 307);
  }

  return NextResponse.rewrite(
    new URL(`/${OSNOVEN}${put === '/' ? '' : put}${search}`, request.url),
  );
}

export const config = {
  // Без API, вътрешните файлове на Next и всичко с разширение (картинки,
  // шрифтове, favicon) — те нямат език.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
