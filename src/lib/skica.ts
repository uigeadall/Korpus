/**
 * Заявка за снимка по проекта — какво приемаме и какво не.
 *
 * Клиентът изпраща кадъра, който вече вижда (`render.ts`), и описанието
 * на стаята (`opisanie.ts`); моделът връща същата стая като снимка.
 *
 * Кадърът се прави в браузъра, не на сървъра: сцената е SVG и платното
 * я рисува там, където вече стои. Сървър, който я рисува наново, иска
 * цял браузър в себе си за нищо.
 *
 * Проверката е тук, а не в маршрутката, защото това е правило: всяко
 * повикване струва пари и е публична врата. Таванът на картинката не е
 * предпазливост — той е сметка.
 */

export const SKICA = {
  /** Цялото тяло, в байтове. Кадър 1024 px излиза около 1,5 MB. */
  body: 6 * 1024 * 1024,
  /** Самата картинка, в байтове след разкодиране. */
  image: 4 * 1024 * 1024,
  prompt: 2000,
  /**
   * Колко голям кадър се праща.
   *
   * Повече от това не прави снимката по-добра — моделът и без това
   * работи на своя размер — а качването от телефон става бавно.
   */
  sendWidth: 1024,
} as const;

export interface SkicaRequest {
  /** Кадърът на стаята, PNG в base64 (без `data:` начало). */
  image: string;
  /** Описанието за модела, на английски. */
  prompt: string;
  /** Коя стая — влиза в името на файла и в дневника. */
  room: string;
}

export interface Problem {
  field: keyof SkicaRequest | 'body';
  said: string;
}

export type Validation =
  | { ok: true; value: SkicaRequest }
  | { ok: false; problems: Problem[] };

/** Колко байта са скрити в base64 низ, без да го разкодираме. */
export function base64Bytes(text: string): number {
  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  return Math.floor((text.length * 3) / 4) - padding;
}

/** Прилича ли на PNG: подписът му, разкодиран от първите байтове. */
export function looksLikePng(base64: string): boolean {
  // „iVBORw0KGgo" е началото на всеки PNG в base64 — подписът му.
  return base64.startsWith('iVBORw0KGgo');
}

export function parseSkica(raw: unknown): Validation {
  const problems: Problem[] = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, problems: [{ field: 'body', said: 'Заявката не е разбираема.' }] };
  }
  const r = raw as Record<string, unknown>;

  const image = typeof r.image === 'string' ? r.image.replace(/^data:[^,]+,/, '') : '';
  if (!image) {
    problems.push({ field: 'image', said: 'Няма кадър.' });
  } else if (!looksLikePng(image)) {
    problems.push({ field: 'image', said: 'Кадърът не е PNG.' });
  } else if (base64Bytes(image) > SKICA.image) {
    problems.push({ field: 'image', said: 'Кадърът е прекалено голям.' });
  }

  const prompt = typeof r.prompt === 'string' ? r.prompt.trim().slice(0, SKICA.prompt) : '';
  if (prompt.length < 20) {
    problems.push({ field: 'prompt', said: 'Описанието е прекалено кратко.' });
  }

  const room = typeof r.room === 'string' ? r.room.trim().slice(0, 40) : '';

  if (problems.length) return { ok: false, problems };
  return { ok: true, value: { image, prompt, room: room || 'staya' } };
}

/**
 * Указанието към модела.
 *
 * Описанието казва какво има в стаята; това казва какво да прави с
 * кадъра. Отделено е, защото е решение за модела, а не за проекта, и
 * се мени, без да се пипа описанието.
 *
 * „Не мести и не добавяй" стои най-отпред нарочно: моделът иначе
 * разкрасява — слага саксия, мести контакт, прави шкафа по-широк. За
 * нас това е лъжа, защото същата стая отива и в цеха.
 */
export function instruction(prompt: string): string {
  return [
    'Turn this 3D render into a photorealistic interior photograph.',
    'Keep the exact same layout, proportions and camera angle.',
    'Do not move, add or remove any furniture, doors or windows.',
    'Keep the same materials and colours.',
    'Only add realistic lighting, texture and material detail.',
    '',
    prompt,
  ].join('\n');
}
