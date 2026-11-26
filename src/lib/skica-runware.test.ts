import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ModelError,
  chainModels,
  imageFromRunware,
  refusalFromRunware,
  runwareModel,
  type SkicaModel,
} from './skica-model';

/** Най-малкият истински PNG — един прозрачен пиксел. */
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const JPEG = '/9j/' + 'A'.repeat(400);

describe('разчитане на отговора на Runware', () => {
  it('адресът на снимката от data[0].imageURL', () => {
    const r = imageFromRunware({
      data: [{ taskType: 'imageInference', imageURL: 'https://im.runware.ai/image/x.jpg', cost: 0.0019 }],
    });
    expect(r).toEqual({ url: 'https://im.runware.ai/image/x.jpg', cost: 0.0019 });
  });

  it('готова снимка в base64 или data URI се взима направо', () => {
    expect(imageFromRunware({ data: [{ imageBase64Data: JPEG }] })).toMatchObject({
      image: JPEG,
      mime: 'image/jpeg',
    });
    expect(imageFromRunware({ data: [{ imageDataURI: `data:image/jpeg;base64,${JPEG}` }] })).toMatchObject({
      image: JPEG,
    });
  });

  it('без снимка или с подозрителен адрес — нищо', () => {
    expect(imageFromRunware({ data: [] })).toBeNull();
    expect(imageFromRunware({ data: [{ imageURL: 'http://нешифрован/x.jpg' }] })).toBeNull();
    expect(imageFromRunware(null)).toBeNull();
  });

  it('отказът се чете за дневника', () => {
    expect(
      refusalFromRunware({ errors: [{ code: 'insufficientCredits', message: 'Not enough balance' }] }),
    ).toBe('insufficientCredits Not enough balance');
    expect(refusalFromRunware({ data: [] })).toBeNull();
  });
});

describe('повикването към Runware', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('праща задача с кадъра като data URI и сваля готовата снимка', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url === 'https://api.runware.ai/v1') {
          return new Response(
            JSON.stringify({ data: [{ imageURL: 'https://im.runware.ai/image/gotova.jpg', cost: 0.0019 }] }),
            { status: 200 },
          );
        }
        return new Response(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        });
      }),
    );

    const picture = await runwareModel('kluch').generate('make it real', PIXEL);

    const [task] = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>[];
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer kluch');
    expect(task).toMatchObject({
      taskType: 'imageInference',
      model: 'runware:400@4',
      positivePrompt: 'make it real',
      inputs: { referenceImages: [`data:image/png;base64,${PIXEL}`] },
    });
    expect(String(task.taskUUID)).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number(task.width) % 16).toBe(0);
    expect(calls[1].url).toBe('https://im.runware.ai/image/gotova.jpg');
    expect(picture.mime).toBe('image/jpeg');
    expect(picture.image.startsWith('/9j/')).toBe(true);
  });

  it('свършен кредит е грешка с казаното — за дневника', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ errors: [{ code: 'insufficientCredits', message: 'top up' }] }), {
            status: 402,
          }),
      ),
    );
    await expect(runwareModel('k').generate('x', PIXEL)).rejects.toThrow('402 insufficientCredits top up');
  });
});

describe('веригата: безплатното първо, евтиното след него', () => {
  const ok = (name: string): SkicaModel => ({
    name,
    generate: async () => ({ image: JPEG, mime: 'image/jpeg' }),
  });
  const fails = (name: string, limit: 'day' | null): SkicaModel => ({
    name,
    generate: async () => {
      throw new ModelError(`${name} отказа`, limit);
    },
  });

  it('свърши ли дневният лимит на първия, рисува вторият', async () => {
    const chain = chainModels([fails('cloudflare', 'day'), ok('runware')]);
    const picture = await chain!.generate('x', PIXEL);
    expect(picture.by).toBe('runware');
  });

  it('при друга грешка не се плаща втори път', async () => {
    const second = vi.fn(async () => ({ image: JPEG, mime: 'image/jpeg' }));
    const chain = chainModels([fails('cloudflare', null), { name: 'runware', generate: second }]);
    await expect(chain!.generate('x', PIXEL)).rejects.toThrow('cloudflare отказа');
    expect(second).not.toHaveBeenCalled();
  });

  it('свърши ли на всички, казва се лимитът — не мъгляво', async () => {
    const chain = chainModels([fails('a', 'day'), fails('b', 'day')]);
    const error = await chain!.generate('x', PIXEL).catch((e: unknown) => e);
    expect((error as ModelError).limit).toBe('day');
  });

  it('първият, когато всичко е наред', async () => {
    const picture = await chainModels([ok('cloudflare'), ok('runware')])!.generate('x', PIXEL);
    expect(picture.by).toBe('cloudflare');
  });

  it('празна верига — няма модел', () => {
    expect(chainModels([])).toBeNull();
  });
});
