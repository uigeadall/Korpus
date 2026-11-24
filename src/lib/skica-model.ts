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

/*
 * Един модел за целия процес. Няма ли ключ, няма и модел — вратата го
 * казва честно, вместо да се прави, че ще стане.
 */
let current: SkicaModel | null | undefined;

export function skicaModel(): SkicaModel | null {
  if (current === undefined) {
    const key = process.env.GEMINI_API_KEY?.trim();
    current = key ? geminiModel(key) : null;
  }
  return current;
}

/** За проверките: сменя модела и връща предишния. */
export function setSkicaModel(model: SkicaModel | null | undefined): void {
  current = model;
}
