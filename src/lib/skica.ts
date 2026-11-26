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
 *
 * Кадърът е РАЗРЕЗ: стаята отгоре, с махнати стени, на бял фон. Без да
 * му се каже, моделът го чете като снимка от нивото на очите и
 * „дорисува" бялото — добавя стени, врати, прозорец, прави пода подиум.
 * Проверено на живо на 24.11.2026 с FLUX.2 klein: с тези думи разрезът
 * и белият фон остават, мебелта стои, а украсата е само дребна.
 *
 * Дребната украса — картина, растение, предмети по плота — е позволена
 * нарочно: снимката е за „ето как ще изглежда", и гола стая изглежда
 * по-зле от истинската. Мебел и уреди не се добавят: те са поръчката.
 */
export function instruction(prompt: string): string {
  return [
    'Turn this 3D render into a photorealistic photograph of the same room, keeping everything that is in it.',
    'This is a cutaway view: one room seen from above at an angle, with walls removed so we can look inside. ' +
      'Keep this exact cutaway view and camera angle. The white area around the room is empty background: ' +
      'keep it plain white. Do not extend the room and do not add walls, floor, ceiling, doors or windows.',
    'Do not move, add or remove any cabinets, furniture, doors or windows: keep each one exactly as it is, ' +
      'with the same number, size, position, colour and handles. Each piece stays the kind of furniture ' +
      'listed below: do not turn shelves or cabinets into anything else.',
    'Make materials, lighting and shadows realistic. You may lightly style the room with a few small ' +
      'decorative touches: one or two framed pictures on empty wall space, a plant, a few books or small ' +
      'objects on open shelves and surfaces. Do not add furniture, kitchen units, a sink or appliances.',
    '',
    `The room: ${prompt}`,
  ].join('\n');
}
