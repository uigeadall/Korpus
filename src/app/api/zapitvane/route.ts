/**
 * `POST /api/zapitvane` — запитване от клиента.
 *
 * Публична врата, затова редът е: първо колко е голямо, после дали е
 * разбираемо, после дали е вярно, и чак накрая се пази. Проверката
 * живее в `lib/zapitvane.ts` и има свои тестове; тук е само вратата.
 *
 * Хранилището още е памет — база няма (виж `docs/PLAN.md`, Ж5). Затова
 * отговорът носи `durable`: формата да може да каже на човека истината,
 * вместо да му покаже „изпратено" за нещо, което не е стигнало никъде.
 *
 * В дневника не влизат лични данни. Пише се кой запис е приет и какво
 * е носил, не кой го е пратил.
 */

import { LIMITS, parseZapitvane } from '@/lib/zapitvane';
import { zapitvaneStore } from '@/lib/zapitvane-store';

/**
 * Първа преграда срещу заливане, не същинската.
 *
 * Брои се в паметта на този процес. На сървър без състояние всеки
 * екземпляр брои свое и преградата изтънява — затова Ж7 стои отделно в
 * плана. Но празна врата е по-лошо от тънка.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const seen = new Map<string, number[]>();

function tooMany(who: string, now = Date.now()): boolean {
  const times = (seen.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  seen.set(who, times);

  // Картата не расте без край: забравя се всеки, който е млъкнал.
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
  if (tooMany(whoIs(request))) {
    return Response.json(
      { error: 'Твърде много запитвания едно след друго. Опитайте пак след малко.' },
      { status: 429 },
    );
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > LIMITS.body) {
    return Response.json({ error: 'Заявката е твърде голяма.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Невалиден JSON.' }, { status: 400 });
  }

  const parsed = parseZapitvane(body);
  if (!parsed.ok) {
    return Response.json({ problems: parsed.problems }, { status: 422 });
  }

  const store = zapitvaneStore();
  const saved = await store.save(parsed.value);

  console.info(
    `запитване ${saved.id} · хранилище: ${store.name}` +
      ` · жилище: ${parsed.value.flat ? 'да' : 'не'}` +
      ` · стая: ${parsed.value.project ? 'да' : 'не'}`,
  );

  return Response.json({ id: saved.id, at: saved.at, durable: store.durable }, { status: 201 });
}
