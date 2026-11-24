import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ModelError,
  imageFromPollinations,
  pickSkicaModel,
  pollinationsModel,
  refusalFromPollinations,
} from './skica-model';

/** Най-малкият истински PNG — един прозрачен пиксел. */
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const JPEG = '/9j/' + 'A'.repeat(400);

describe('разчитане на отговора на Pollinations', () => {
  it('base64 от data[0].b64_json — както при OpenAI', () => {
    expect(imageFromPollinations({ data: [{ b64_json: JPEG }] })).toEqual({ image: JPEG, mime: 'image/jpeg' });
  });

  it('или адрес, от който да се свали', () => {
    expect(imageFromPollinations({ data: [{ url: 'https://media.pollinations.ai/abc' }] })).toEqual({
      url: 'https://media.pollinations.ai/abc',
    });
  });

  it('без снимка — нищо', () => {
    expect(imageFromPollinations({ data: [] })).toBeNull();
    expect(imageFromPollinations({ data: [{ b64_json: 'AA' }] })).toBeNull();
    expect(imageFromPollinations(null)).toBeNull();
  });

  it('отказът се чете и като низ, и като обект', () => {
    expect(refusalFromPollinations({ error: 'Invalid key' })).toBe('Invalid key');
    expect(refusalFromPollinations({ error: { code: 'PAYMENT_REQUIRED', message: 'budget' } })).toBe(
      'PAYMENT_REQUIRED budget',
    );
    expect(refusalFromPollinations({})).toBeNull();
  });
});

describe('повикването към Pollinations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('праща кадъра като файл, с модела и размера', async () => {
    let url = '';
    let auth = '';
    let form: FormData | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: string, init: RequestInit) => {
        url = u;
        auth = new Headers(init.headers).get('authorization') ?? '';
        form = init.body as FormData;
        return new Response(JSON.stringify({ data: [{ b64_json: JPEG }] }), { status: 200 });
      }),
    );

    const picture = await pollinationsModel('sk_test').generate('make it real', PIXEL);

    expect(url).toBe('https://gen.pollinations.ai/v1/images/edits');
    expect(auth).toBe('Bearer sk_test');
    const sent = form as unknown as FormData;
    expect(sent.get('model')).toBe('black-forest-labs/flux.2-klein-4b');
    expect(sent.get('prompt')).toBe('make it real');
    expect(String(sent.get('size'))).toMatch(/^\d+x\d+$/);
    expect((sent.get('image') as Blob).type).toBe('image/png');
    expect(picture).toEqual({ image: JPEG, mime: 'image/jpeg' });
  });

  it('402 е изхарчен безплатен бюджет — лимит, не повреда', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'PAYMENT_REQUIRED' }), { status: 402 })),
    );
    const error = await pollinationsModel('sk').generate('x', PIXEL).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ModelError);
    expect((error as ModelError).limit).toBe('day');
  });

  it('грешен ключ е повреда, не лимит', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Invalid key"}', { status: 401 })));
    const error = await pollinationsModel('sk').generate('x', PIXEL).catch((e: unknown) => e);
    expect((error as ModelError).limit).toBeNull();
    expect((error as ModelError).message).toBe('401 Invalid key');
  });
});

describe('мястото на Pollinations във веригата', () => {
  it('веднага след безплатния Cloudflare и преди платения Runware', () => {
    const order =
      pickSkicaModel({
        CLOUDFLARE_ACCOUNT_ID: 'a',
        CLOUDFLARE_API_TOKEN: 't',
        POLLINATIONS_API_KEY: 'sk',
        RUNWARE_API_KEY: 'r',
      })?.name.split(' → ') ?? [];
    expect(order.map((n) => n.split(/[ /]/)[0])).toEqual(['@cf', 'pollinations', 'runware']);
  });

  it('само Pollinations — Pollinations', () => {
    expect(pickSkicaModel({ POLLINATIONS_API_KEY: 'sk' })?.name).toBe(
      'pollinations black-forest-labs/flux.2-klein-4b',
    );
  });
});
