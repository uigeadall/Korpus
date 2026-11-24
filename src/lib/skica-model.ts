/**
 * Моделът, който прави снимката — зад гнездо, не вшит.
 *
 * Отзад стои семейството на Google за картинки, което хората наричат
 * „nano banana". Избрано е, защото приема нашия кадър какъвто си е и го
 * доправя: не му трябва карта на дълбочината, когато има готов рендер.
 * Утре на негово място може да застане друг — затова всичко, което
 * знае как се говори с точно този, стои на едно място.
 *
 * Ключът се чете от средата и никога не напуска сървъра. В браузъра не
 * влиза и в git не влиза (правило 4).
 *
 * ВНИМАНИЕ: формата на отговора е писана по описанието на API-то. При
 * първото пускане ключът стигна до Google, но квотата беше нула и
 * отговорът не можа да се види. Разчитането е отделна чиста функция с
 * тестове точно затова — счупи ли се, се вижда къде, вместо цялото
 * повикване да върне „нещо не стана".
 */

export interface SkicaResult {
  /** Готовата снимка, PNG или JPEG в base64. */
  image: string;
  mime: string;
}

export interface SkicaModel {
  /** Име за дневника. */
  readonly name: string;
  generate(instruction: string, image: string): Promise<SkicaResult>;
}

/**
 * Кой модел рисува.
 *
 * Имената им се менят по-бързо от кода: при първото пускане се оказа,
 * че избраното отпреди вече е старо, а `gemini-2.5-flash` изобщо „не се
 * дава на нови потребители". Затова името се чете от средата и може да
 * се смени без пускане наново — а подразбиращото се е това, което
 * върви днес.
 *
 * Списъкът на достъпните се вижда с:
 *   curl https://generativelanguage.googleapis.com/v1beta/models \
 *     -H "x-goog-api-key: $GEMINI_API_KEY"
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-image';

export function geminiModelName(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Какво се вади от отговора на Gemini.
 *
 * Отговорът носи части: едни са текст, други — картинка. Търси се
 * първата картинка. Отделено е от мрежата, за да има тест: формата на
 * чужд отговор е най-крехкото място във всяка такава връзка.
 */
export function imageFromGemini(payload: unknown): SkicaResult | null {
  const parts = (payload as { candidates?: { content?: { parts?: unknown[] } }[] })?.candidates?.[0]
    ?.content?.parts;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    const p = part as { inlineData?: { data?: string; mimeType?: string } };
    // API-то връща `inlineData` в JSON от REST и `inline_data` на места
    // в документацията; приемат се и двете, вместо да се гадае.
    const inline = p.inlineData ?? (part as { inline_data?: { data?: string; mime_type?: string } }).inline_data;
    const data = (inline as { data?: string })?.data;
    if (typeof data === 'string' && data.length > 100) {
      const mime =
        (inline as { mimeType?: string })?.mimeType ??
        (inline as { mime_type?: string })?.mime_type ??
        'image/png';
      return { image: data, mime };
    }
  }
  return null;
}

/** Какво е казал моделът, когато не е върнал картинка. */
export function refusalFromGemini(payload: unknown): string | null {
  const candidate = (payload as { candidates?: { finishReason?: string; content?: { parts?: unknown[] } }[] })
    ?.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((p) => (p as { text?: string }).text)
    .filter(Boolean)
    .join(' ')
    .trim();
  if (text) return text.slice(0, 300);
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') return candidate.finishReason;
  return null;
}

export function geminiModel(apiKey: string, model = geminiModelName()): SkicaModel {
  return {
    name: model,
    async generate(instruction, image) {
      const response = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: instruction },
                { inline_data: { mime_type: 'image/png', data: image } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        /*
         * Съобщението на Google се взима, но не се предава на клиента:
         * в него може да има следа от ключа или от сметката. В дневника
         * — да; на екрана — не.
         */
        const said = await response.text().catch(() => '');
        throw new ModelError(`${response.status} ${said.slice(0, 200)}`);
      }

      const payload: unknown = await response.json();
      const picture = imageFromGemini(payload);
      if (!picture) throw new ModelError(refusalFromGemini(payload) ?? 'без картинка в отговора');
      return picture;
    },
  };
}

/** Грешка от модела — за да се отличи от нашите. */
export class ModelError extends Error {}

/* ------------------------------------------------------------------ *
 * Cloudflare Workers AI — FLUX.2
 *
 * Втори модел зад същото гнездо. FLUX.2 приема готов кадър като
 * образец (`input_image_0`) и го доправя по указанието — същото, което
 * прави и Gemini, само че Gemini на този проект няма квота.
 *
 * Вратата е `multipart/form-data`, не JSON: картинката отива като файл.
 * Отговорът е JSON с картинката в base64 под `result.image`.
 * ------------------------------------------------------------------ */

/**
 * Кой модел на Cloudflare рисува. `flux-2-dev` е най-добрият за снимка;
 * `flux-2-klein-9b` и `flux-2-klein-4b` са по-бързи и по-евтини. Сменя
 * се от `CLOUDFLARE_IMAGE_MODEL`, без да се пипа кодът.
 */
export const DEFAULT_CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-2-dev';

export function cloudflareModelName(): string {
  return process.env.CLOUDFLARE_IMAGE_MODEL?.trim() || DEFAULT_CLOUDFLARE_MODEL;
}

/** Какъв файл е по първите знаци на base64 — отговорът не казва. */
export function mimeOfBase64(data: string): string {
  if (data.startsWith('/9j/')) return 'image/jpeg';
  if (data.startsWith('iVBORw0KGgo')) return 'image/png';
  if (data.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

/** Какво се вади от отговора на Cloudflare: `{ result: { image } }`. */
export function imageFromCloudflare(payload: unknown): SkicaResult | null {
  const result = (payload as { result?: unknown })?.result;
  const raw = typeof result === 'string' ? result : (result as { image?: unknown })?.image;
  if (typeof raw !== 'string') return null;
  const image = raw.replace(/^data:[^,]+,/, '');
  if (image.length <= 100) return null;
  return { image, mime: mimeOfBase64(image) };
}

/** Какво е казал Cloudflare при отказ — за дневника. */
export function refusalFromCloudflare(payload: unknown): string | null {
  const errors = (payload as { errors?: { code?: number; message?: string }[] })?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  return errors
    .map((e) => [e?.code, e?.message].filter(Boolean).join(' '))
    .join('; ')
    .slice(0, 300);
}

/** Ширината и височината на PNG — от заглавката, без да се разкодира целият. */
export function pngSize(base64: string): { width: number; height: number } | null {
  // Първите 24 байта: подпис (8) + дължина и „IHDR" (8) + ширина (4) + височина (4).
  let head: string;
  try {
    head = atob(base64.slice(0, 32));
  } catch {
    return null;
  }
  if (head.length < 24 || head.slice(12, 16) !== 'IHDR') return null;
  const u32 = (at: number) =>
    ((head.charCodeAt(at) << 24) |
      (head.charCodeAt(at + 1) << 16) |
      (head.charCodeAt(at + 2) << 8) |
      head.charCodeAt(at + 3)) >>>
    0;
  const width = u32(16);
  const height = u32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * В какъв размер да рисува моделът: със съотношението на кадъра, иначе
 * излиза квадрат и стаята се разтяга. Кратно на 16, до `max` по
 * дългата страна.
 */
export function outputSize(
  size: { width: number; height: number } | null,
  max = 1024,
): { width: number; height: number } {
  if (!size) return { width: max, height: Math.round((max * 0.75) / 16) * 16 };
  const scale = Math.min(1, max / Math.max(size.width, size.height));
  const snap = (n: number) => Math.max(256, Math.round((n * scale) / 16) * 16);
  return { width: snap(size.width), height: snap(size.height) };
}

const CLOUDFLARE_URL = 'https://api.cloudflare.com/client/v4/accounts';

export function cloudflareModel(
  accountId: string,
  token: string,
  model = cloudflareModelName(),
): SkicaModel {
  return {
    name: model,
    async generate(instruction, image) {
      const { width, height } = outputSize(pngSize(image));
      const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));

      const form = new FormData();
      form.append('prompt', instruction);
      form.append('input_image_0', new Blob([bytes], { type: 'image/png' }), 'kadar.png');
      form.append('width', String(width));
      form.append('height', String(height));

      const response = await fetch(`${CLOUDFLARE_URL}/${accountId}/ai/run/${model}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });

      // Същото правило като при Gemini: казаното от Cloudflare — в дневника, не на екрана.
      const text = await response.text().catch(() => '');
      let payload: unknown = null;
      try {
        payload = JSON.parse(text);
      } catch {
        /* не е JSON — остава суровият текст за дневника */
      }

      if (!response.ok) {
        throw new ModelError(
          `${response.status} ${refusalFromCloudflare(payload) ?? text.slice(0, 200)}`,
        );
      }

      const picture = imageFromCloudflare(payload);
      if (!picture) {
        throw new ModelError(refusalFromCloudflare(payload) ?? 'без картинка в отговора');
      }
      return picture;
    },
  };
}

/*
 * Един модел за целия процес. Няма ли ключ, няма и модел — вратата го
 * казва честно, вместо да се прави, че ще стане.
 *
 * Cloudflare е пръв, когато е настроен: Gemini на този проект няма
 * квота. Има ли и двата, `SKICA_PROVIDER=gemini` връща Gemini.
 */
let current: SkicaModel | null | undefined;

export function pickSkicaModel(env: Record<string, string | undefined>): SkicaModel | null {
  const account = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = env.CLOUDFLARE_API_TOKEN?.trim();
  const gemini = env.GEMINI_API_KEY?.trim();
  const prefer = env.SKICA_PROVIDER?.trim().toLowerCase();

  const cloudflare = account && token ? cloudflareModel(account, token) : null;
  const google = gemini ? geminiModel(gemini) : null;

  if (prefer === 'gemini') return google ?? cloudflare;
  return cloudflare ?? google;
}

export function skicaModel(): SkicaModel | null {
  if (current === undefined) current = pickSkicaModel(process.env);
  return current;
}

/** За проверките: сменя модела и връща предишния. */
export function setSkicaModel(model: SkicaModel | null | undefined): void {
  current = model;
}
