/**
 * `POST /api/skica` — кадърът става снимка.
 *
 * Клиентът праща това, което вижда, и описанието на стаята; моделът
 * връща същата стая като снимка. Ключът стои тук и не напуска сървъра.
 *
 * Всяко повикване струва пари — около четири цента. Затова преградата е
 * по-стегната от тази пред запитванията: там прекалено многото е досада,
 * тук е сметка.
 */

import { SKICA, instruction, parseSkica } from '@/lib/skica';
import { ModelError, skicaModel } from '@/lib/skica-model';

/**
 * Преграда срещу изпразване на сметката.
 *
 * Брои се в паметта на този процес; на сървър без състояние всеки
 * екземпляр брои свое и преградата изтънява. Същинската е Ж7 в плана —
 * но празна врата пред платен модел не се оставя.
 *
 * При разработка таванът е висок: там всички заявки идват от един адрес
 * (localhost) и пробите изяждаха тавана на човека пред екрана. Сменя се
 * и от `SKICA_MAX_PER_10MIN`.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW =
  Number(process.env.SKICA_MAX_PER_10MIN) || (process.env.NODE_ENV === 'development' ? 100 : 6);
const seen = new Map<string, number[]>();

function tooMany(who: string, now = Date.now()): boolean {
  const times = (seen.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  seen.set(who, times);
  if (seen.size > 5000) {
    for (const [key, list] of seen) {
      if (!list.some((t) => now - t < WINDOW_MS)) seen.delete(key);
    }
  }
  return times.length > MAX_PER_WINDOW;
}

function whoIs(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || 'незнаен';
}

export async function POST(request: Request) {
  const model = skicaModel();
  if (!model) {
    /*
     * Няма ключ — казва се, вместо да се чака минута и да се върне
     * мъгляво „не стана". 503, защото това е липсваща настройка, не
     * грешка на клиента.
     */
    return Response.json(
      { error: 'Снимките още не са включени.', configured: false },
      { status: 503 },
    );
  }

  if (tooMany(whoIs(request))) {
    return Response.json(
      { error: 'Твърде много снимки една след друга. Опитайте пак след малко.' },
      { status: 429 },
    );
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > SKICA.body) {
    return Response.json({ error: 'Кадърът е твърде голям.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Невалиден JSON.' }, { status: 400 });
  }

  const parsed = parseSkica(body);
  if (!parsed.ok) return Response.json({ problems: parsed.problems }, { status: 422 });

  const started = Date.now();
  try {
    const picture = await model.generate(instruction(parsed.value.prompt), parsed.value.image);
    console.info(
      `скица · ${picture.by ?? model.name} · стая: ${parsed.value.room} · ${Date.now() - started} мс`,
    );
    return Response.json({ image: picture.image, mime: picture.mime }, { status: 200 });
  } catch (error) {
    /*
     * Каквото е казал моделът, остава в дневника: в него може да има
     * следа от ключа или от сметката. На клиента се казва само, че не е
     * станало.
     */
    console.error(
      `скица се провали · ${model.name} · ${error instanceof Error ? error.message : error}`,
    );
    /*
     * Изчерпан дневен лимит не е „опитайте след малко" — до утре няма
     * да стане. Казва се само това; чуждият текст остава в дневника.
     */
    if (error instanceof ModelError && error.limit === 'day') {
      return Response.json(
        { error: 'Безплатният дневен лимит на AI снимките е изчерпан.', limit: 'day' },
        { status: 429 },
      );
    }
    return Response.json(
      { error: 'Снимката не се получи. Опитайте пак след малко.' },
      { status: error instanceof ModelError ? 502 : 500 },
    );
  }
}
