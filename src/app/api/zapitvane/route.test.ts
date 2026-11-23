import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultFlat } from '@/lib/flat';
import { encodeFlat } from '@/lib/flat-share';
import { LIMITS } from '@/lib/zapitvane';
import { memoryStore, setZapitvaneStore } from '@/lib/zapitvane-store';
import { POST } from './route';

/**
 * Вратата, а не правилото. Какво е валидно запитване се проверява в
 * `lib/zapitvane.test.ts`; тук е само дали вратата връща каквото
 * трябва и дали пуска твърде много наведнъж.
 */

const добро = {
  name: 'Иван Петров',
  phone: '0888 123 456',
  note: 'Кухня.',
  consent: true,
};

/** Заявка от даден адрес — преградата брои по него. */
function zayavka(body: unknown, ip = `10.0.0.${Math.floor(Math.random() * 250) + 1}`): Request {
  const text = JSON.stringify(body);
  return new Request('http://localhost/api/zapitvane', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(text).length),
      'x-forwarded-for': ip,
    },
    body: text,
  });
}

beforeEach(() => setZapitvaneStore(memoryStore()));
afterEach(() => setZapitvaneStore(null));

describe('приемане', () => {
  it('добро запитване се приема и получава номер', async () => {
    const res = await POST(zayavka(добро));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; durable: boolean };
    expect(body.id).toBeTruthy();
    // Днес отзад е памет и това се казва, а не се скрива.
    expect(body.durable).toBe(false);
  });

  it('жилището стига дотам', async () => {
    const store = memoryStore();
    setZapitvaneStore(store);
    const res = await POST(zayavka({ ...добро, flat: encodeFlat(defaultFlat()) }));
    expect(res.status).toBe(201);

    const [последно] = await store.recent();
    expect(последно.summary).toContain('6 помещения');
  });

  it('отговорът не връща лични данни обратно', async () => {
    const res = await POST(zayavka(добро));
    const text = await res.text();
    expect(text).not.toContain('Иван');
    expect(text).not.toContain('0888');
  });
});

describe('отказване', () => {
  it('непълно запитване се отказва с посочени полета', async () => {
    const res = await POST(zayavka({ name: 'И', consent: false }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { problems: { field: string }[] };
    expect(body.problems.map((p) => p.field)).toEqual(
      expect.arrayContaining(['name', 'phone', 'consent']),
    );
  });

  it('невалиден JSON не чупи вратата', async () => {
    const res = await POST(
      new Request('http://localhost/api/zapitvane', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.1.1.1' },
        body: '{не е json',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('прекалено голямо тяло се отказва по размер, без да се чете', async () => {
    const res = await POST(
      new Request('http://localhost/api/zapitvane', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(LIMITS.body + 1),
          'x-forwarded-for': '10.2.2.2',
        },
        body: JSON.stringify(добро),
      }),
    );
    expect(res.status).toBe(413);
  });
});

describe('преградата срещу заливане', () => {
  it('пуска няколко, после спира', async () => {
    const ip = '10.9.9.9';
    const кодове: number[] = [];
    for (let i = 0; i < 8; i++) кодове.push((await POST(zayavka(добро, ip))).status);

    expect(кодове.filter((c) => c === 201).length).toBeGreaterThan(0);
    expect(кодове.at(-1)).toBe(429);
  });

  it('брои по адрес — чужд човек не плаща за съседа си', async () => {
    const зает = '10.8.8.8';
    for (let i = 0; i < 8; i++) await POST(zayavka(добро, зает));
    expect((await POST(zayavka(добро, зает))).status).toBe(429);
    expect((await POST(zayavka(добро, '10.8.8.9'))).status).toBe(201);
  });
});
