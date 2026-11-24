import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CLOUDFLARE_MODEL,
  ModelError,
  cloudflareModel,
  imageFromCloudflare,
  mimeOfBase64,
  outputSize,
  pickSkicaModel,
  pngSize,
  refusalFromCloudflare,
} from './skica-model';

/** Най-малкият истински PNG — един прозрачен пиксел. */
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** Заглавка на PNG 1024×768 — само първите 24 байта стигат за размера. */
function pngHead(width: number, height: number): string {
  const bytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 255, (width >>> 16) & 255, (width >>> 8) & 255, width & 255,
    (height >>> 24) & 255, (height >>> 16) & 255, (height >>> 8) & 255, height & 255,
  ];
  return btoa(String.fromCharCode(...bytes)) + 'A'.repeat(200);
}

const JPEG = '/9j/' + 'A'.repeat(400);

describe('разчитане на отговора на Cloudflare', () => {
  it('намира картинката под result.image', () => {
    const r = imageFromCloudflare({ result: { image: JPEG }, success: true, errors: [] });
    expect(r?.image).toBe(JPEG);
    expect(r?.mime).toBe('image/jpeg');
  });

  it('маха началото „data:", ако го има', () => {
    const r = imageFromCloudflare({ result: { image: `data:image/jpeg;base64,${JPEG}` } });
    expect(r?.image).toBe(JPEG);
  });

  it('няма картинка — връща нищо', () => {
    expect(imageFromCloudflare({ result: {} })).toBeNull();
    expect(imageFromCloudflare({ result: { image: 'AA' } })).toBeNull();
    expect(imageFromCloudflare(null)).toBeNull();
    expect(imageFromCloudflare({ success: false, errors: [{ code: 5006, message: 'x' }] })).toBeNull();
  });

  it('видът се познава по първите знаци', () => {
    expect(mimeOfBase64('/9j/4AAQ')).toBe('image/jpeg');
    expect(mimeOfBase64(PIXEL)).toBe('image/png');
    expect(mimeOfBase64('UklGRiQAAABXRUJQ')).toBe('image/webp');
  });

  it('отказът се чете за дневника', () => {
    expect(
      refusalFromCloudflare({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }),
    ).toBe('10000 Authentication error');
    expect(refusalFromCloudflare({ errors: [] })).toBeNull();
    expect(refusalFromCloudflare('нищо')).toBeNull();
  });
});

describe('размерът на снимката следва кадъра', () => {
  it('размерът на PNG се чете от заглавката', () => {
    expect(pngSize(PIXEL)).toEqual({ width: 1, height: 1 });
    expect(pngSize(pngHead(1024, 768))).toEqual({ width: 1024, height: 768 });
  });

  it('нещо, което не е PNG, няма размер', () => {
    expect(pngSize(JPEG)).toBeNull();
    expect(pngSize('')).toBeNull();
    expect(pngSize('!!!не е base64!!!')).toBeNull();
  });

  it('пази съотношението и стъпва на 16', () => {
    const s = outputSize({ width: 1024, height: 731 });
    expect(s.width).toBe(1024);
    expect(s.height % 16).toBe(0);
    expect(Math.abs(s.width / s.height - 1024 / 731)).toBeLessThan(0.03);
  });

  it('голям кадър се смалява до тавана', () => {
    expect(outputSize({ width: 2048, height: 1536 })).toEqual({ width: 1024, height: 768 });
  });

  it('без размер — разумно подразбиране, не квадрат', () => {
    const s = outputSize(null);
    expect(s.width).toBeGreaterThan(s.height);
  });
});

describe('кой модел рисува', () => {
  it('без ключове — никой', () => {
    expect(pickSkicaModel({})).toBeNull();
    expect(pickSkicaModel({ CLOUDFLARE_API_TOKEN: 'x' })).toBeNull();
  });

  it('Cloudflare, когато има и акаунт, и токен', () => {
    const m = pickSkicaModel({ CLOUDFLARE_ACCOUNT_ID: 'a', CLOUDFLARE_API_TOKEN: 't' });
    expect(m?.name).toBe(DEFAULT_CLOUDFLARE_MODEL);
  });

  it('Cloudflare е пред Gemini, освен ако не е казано друго', () => {
    const both = { CLOUDFLARE_ACCOUNT_ID: 'a', CLOUDFLARE_API_TOKEN: 't', GEMINI_API_KEY: 'g' };
    expect(pickSkicaModel(both)?.name).toContain('@cf/');
    expect(pickSkicaModel({ ...both, SKICA_PROVIDER: 'gemini' })?.name).not.toContain('@cf/');
  });

  it('само Gemini — Gemini', () => {
    expect(pickSkicaModel({ GEMINI_API_KEY: 'g' })?.name).not.toContain('@cf/');
  });
});

describe('повикването към Cloudflare', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('праща кадъра като файл, с указанието и размера', async () => {
    let url = '';
    let auth = '';
    let form: FormData | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: string, init: RequestInit) => {
        url = u;
        auth = new Headers(init.headers).get('authorization') ?? '';
        form = init.body as FormData;
        return new Response(JSON.stringify({ result: { image: JPEG }, success: true }), { status: 200 });
      }),
    );

    const picture = await cloudflareModel('akaunt', 'tajno', '@cf/x/y').generate('make it real', PIXEL);

    expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/akaunt/ai/run/@cf/x/y');
    expect(auth).toBe('Bearer tajno');
    const sent = form as unknown as FormData;
    expect(sent.get('prompt')).toBe('make it real');
    const file = sent.get('input_image_0') as Blob;
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(Math.floor((PIXEL.length * 3) / 4) - 2);
    expect(Number(sent.get('width')) % 16).toBe(0);
    expect(picture).toEqual({ image: JPEG, mime: 'image/jpeg' });
  });

  it('отказът става ModelError с казаното — за дневника', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }),
            { status: 401 },
          ),
      ),
    );
    const call = cloudflareModel('a', 't').generate('x', PIXEL);
    await expect(call).rejects.toBeInstanceOf(ModelError);
    await expect(cloudflareModel('a', 't').generate('x', PIXEL)).rejects.toThrow(
      '401 10000 Authentication error',
    );
  });

  it('успех без картинка също е грешка, не празна снимка', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ result: {}, success: true }), { status: 200 })),
    );
    await expect(cloudflareModel('a', 't').generate('x', PIXEL)).rejects.toThrow('без картинка');
  });
});
