import { describe, expect, it } from 'vitest';
import { SKICA, base64Bytes, instruction, looksLikePng, parseSkica } from './skica';
import { imageFromGemini, refusalFromGemini } from './skica-model';

/** Най-малкият истински PNG — един прозрачен пиксел. */
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const dobro = {
  image: PIXEL,
  prompt: 'a kitchen, 4.2 by 3.2 metres, white cabinet fronts, photorealistic interior',
  room: 'kitchen',
};

const poleta = (r: ReturnType<typeof parseSkica>) =>
  r.ok ? [] : r.problems.map((p) => p.field);

describe('какво приемаме за заявка', () => {
  it('добра заявка минава', () => {
    const r = parseSkica(dobro);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.room).toBe('kitchen');
  });

  it('началото „data:" се маха, а не се отказва', () => {
    const r = parseSkica({ ...dobro, image: `data:image/png;base64,${PIXEL}` });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.image).toBe(PIXEL);
  });

  it('без кадър не минава', () => {
    expect(poleta(parseSkica({ ...dobro, image: '' }))).toContain('image');
  });

  it('нещо, което не е PNG, не минава', () => {
    expect(poleta(parseSkica({ ...dobro, image: 'QUJDREVG' }))).toContain('image');
  });

  it('късо описание не минава — моделът няма какво да чете', () => {
    expect(poleta(parseSkica({ ...dobro, prompt: 'кухня' }))).toContain('prompt');
  });

  it('стая без име получава име, вместо да се откаже', () => {
    const r = parseSkica({ ...dobro, room: '' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.room).toBeTruthy();
  });

  it('нищо, низ и число не чупят', () => {
    for (const raw of [null, undefined, 'здравей', 42, []]) {
      expect(parseSkica(raw).ok, String(raw)).toBe(false);
    }
  });
});

describe('таванът е сметка, не предпазливост', () => {
  it('големината се познава, без да се разкодира', () => {
    expect(base64Bytes(PIXEL)).toBeGreaterThan(50);
    expect(base64Bytes('QUJD')).toBe(3);
    expect(base64Bytes('QUJDRA==')).toBe(4);
  });

  it('прекалено голям кадър се отказва', () => {
    // Истински подпис, но дълъг колкото да мине тавана.
    const дълъг = PIXEL + 'A'.repeat(SKICA.image * 2);
    const r = parseSkica({ ...dobro, image: дълъг });
    expect(poleta(r)).toContain('image');
    if (!r.ok) expect(r.problems[0].said).toContain('голям');
  });

  it('подписът на PNG се познава', () => {
    expect(looksLikePng(PIXEL)).toBe(true);
    expect(looksLikePng('/9j/4AAQSkZJRg')).toBe(false); // JPEG
  });
});

describe('указанието към модела', () => {
  it('казва да не мести и да не добавя — преди всичко друго', () => {
    const text = instruction('a kitchen');
    expect(text).toContain('Do not move, add or remove');
    expect(text.indexOf('Do not move')).toBeLessThan(text.indexOf('a kitchen'));
  });

  it('носи описанието на стаята накрая', () => {
    expect(instruction('a bathroom, 2.2 metres')).toContain('a bathroom, 2.2 metres');
  });
});

describe('разчитане на отговора', () => {
  /*
   * Формата на чужд отговор е най-крехкото място във всяка такава
   * връзка. Затова се чете с отделна функция и тя има тестове — счупи
   * ли се, се вижда къде.
   */
  const картинка = 'A'.repeat(400);

  it('намира картинката в отговора', () => {
    const r = imageFromGemini({
      candidates: [{ content: { parts: [{ inlineData: { data: картинка, mimeType: 'image/png' } }] } }],
    });
    expect(r?.image).toBe(картинка);
    expect(r?.mime).toBe('image/png');
  });

  it('разбира и другия начин на изписване', () => {
    const r = imageFromGemini({
      candidates: [{ content: { parts: [{ inline_data: { data: картинка, mime_type: 'image/jpeg' } }] } }],
    });
    expect(r?.image).toBe(картинка);
    expect(r?.mime).toBe('image/jpeg');
  });

  it('прескача текста и стига до картинката', () => {
    const r = imageFromGemini({
      candidates: [
        { content: { parts: [{ text: 'Ето я кухнята' }, { inlineData: { data: картинка } }] } },
      ],
    });
    expect(r?.image).toBe(картинка);
  });

  it('няма картинка — връща нищо, а не празен низ', () => {
    expect(imageFromGemini({ candidates: [{ content: { parts: [{ text: 'не мога' }] } }] })).toBeNull();
    expect(imageFromGemini({})).toBeNull();
    expect(imageFromGemini(null)).toBeNull();
    expect(imageFromGemini({ candidates: [] })).toBeNull();
  });

  it('къс низ не се брои за картинка', () => {
    const r = imageFromGemini({ candidates: [{ content: { parts: [{ inlineData: { data: 'AA' } }] } }] });
    expect(r).toBeNull();
  });

  it('отказът се чете, за да влезе в дневника', () => {
    expect(
      refusalFromGemini({ candidates: [{ content: { parts: [{ text: 'не мога да направя това' }] } }] }),
    ).toContain('не мога');
    expect(refusalFromGemini({ candidates: [{ finishReason: 'SAFETY' }] })).toBe('SAFETY');
    expect(refusalFromGemini({ candidates: [{ finishReason: 'STOP' }] })).toBeNull();
  });
});

describe('указанието пази разреза и мебелта', () => {
  it('казва, че кадърът е разрез на бял фон, който не се дорисува', () => {
    const text = instruction('a living room');
    expect(text).toContain('cutaway view');
    expect(text).toContain('keep it plain white');
    expect(text).toContain('do not add walls, floor, ceiling, doors or windows');
  });

  it('позволява само дребна украса — не мебел и не уреди', () => {
    const text = instruction('a living room');
    expect(text).toContain('framed pictures');
    expect(text).toContain('Do not add furniture, kitchen units, a sink or appliances');
  });
});
