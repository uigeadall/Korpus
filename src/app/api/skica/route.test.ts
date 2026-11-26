import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ModelError, setSkicaModel, type SkicaModel } from '@/lib/skica-model';
import { SKICA } from '@/lib/skica';
import { POST } from './route';

const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const dobro = {
  image: PIXEL,
  prompt: 'a kitchen, 4.2 by 3.2 metres, white cabinet fronts, photorealistic interior',
  room: 'kitchen',
};

/** Модел, който не ходи никъде. */
function fake(answer: () => Promise<{ image: string; mime: string }>): SkicaModel {
  return { name: 'измислен', generate: answer };
}

const gotov = fake(async () => ({ image: 'B'.repeat(500), mime: 'image/png' }));

function zayavka(body: unknown, ip = `10.0.0.${Math.floor(Math.random() * 250) + 1}`): Request {
  const text = JSON.stringify(body);
  return new Request('http://localhost/api/skica', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(text).length),
      'x-forwarded-for': ip,
    },
    body: text,
  });
}

beforeEach(() => setSkicaModel(gotov));
afterEach(() => setSkicaModel(undefined));

describe('когато моделът го има', () => {
  it('връща снимката', async () => {
    const res = await POST(zayavka(dobro));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { image: string; mime: string };
    expect(body.image.length).toBeGreaterThan(100);
    expect(body.mime).toBe('image/png');
  });

  it('подава на модела указанието, не само описанието', async () => {
    let видяно = '';
    setSkicaModel({
      name: 'измислен',
      async generate(instruction) {
        видяно = instruction;
        return { image: 'B'.repeat(500), mime: 'image/png' };
      },
    });
    await POST(zayavka(dobro));
    expect(видяно).toContain('Do not move, add or remove');
    expect(видяно).toContain('4.2 by 3.2 metres');
  });

  it('непълна заявка се отказва с посочени полета', async () => {
    const res = await POST(zayavka({ image: '', prompt: 'къс' }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { problems: { field: string }[] };
    expect(body.problems.map((p) => p.field)).toEqual(
      expect.arrayContaining(['image', 'prompt']),
    );
  });

  it('прекалено голямо тяло се отказва по размер, без да се чете', async () => {
    const res = await POST(
      new Request('http://localhost/api/skica', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(SKICA.body + 1),
          'x-forwarded-for': '10.2.2.2',
        },
        body: JSON.stringify(dobro),
      }),
    );
    expect(res.status).toBe(413);
  });
});

describe('когато нещо се обърка', () => {
  it('отказ от модела не изтича към клиента', async () => {
    setSkicaModel({
      name: 'измислен',
      async generate() {
        throw new ModelError('403 ключът AIzaSyXXXX е изчерпан, сметка 12345');
      },
    });
    const res = await POST(zayavka(dobro));
    expect(res.status).toBe(502);

    const text = await res.text();
    // Нито ключ, нито сметка, нито чужд текст — само че не е станало.
    expect(text).not.toContain('AIzaSy');
    expect(text).not.toContain('12345');
    expect(text).toContain('не се получи');
  });

  it('изчерпан дневен лимит се казва като такъв — без чуждия текст', async () => {
    setSkicaModel({
      name: 'измислен',
      async generate() {
        throw new ModelError('429 4006 daily free allocation, акаунт 3889', 'day');
      },
    });
    const res = await POST(zayavka(dobro));
    expect(res.status).toBe(429);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ limit: 'day' });
    expect(text).toContain('дневен лимит');
    expect(text).not.toContain('3889');
    expect(text).not.toContain('allocation');
  });

  it('без ключ вратата го казва веднага, вместо да чака', async () => {
    setSkicaModel(null);
    const res = await POST(zayavka(dobro));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { configured: boolean };
    expect(body.configured).toBe(false);
  });
});

describe('преградата пред платения модел', () => {
  it('пуска няколко, после спира', async () => {
    const ip = '10.9.9.9';
    const кодове: number[] = [];
    for (let i = 0; i < 9; i++) кодове.push((await POST(zayavka(dobro, ip))).status);
    expect(кодове.filter((c) => c === 200).length).toBeGreaterThan(0);
    expect(кодове.at(-1)).toBe(429);
  });

  it('брои по адрес — чужд човек не плаща за съседа си', async () => {
    const зает = '10.8.8.8';
    for (let i = 0; i < 9; i++) await POST(zayavka(dobro, зает));
    expect((await POST(zayavka(dobro, зает))).status).toBe(429);
    expect((await POST(zayavka(dobro, '10.8.8.7'))).status).toBe(200);
  });
});
