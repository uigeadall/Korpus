import { describe, expect, it } from 'vitest';
import { adres, eEzik, popalni, razdeli } from './ezik';
import { PRAVNI } from './tekstove/pravni';
import { PROEKT } from './tekstove/proekt';
import { SAIT } from './tekstove/sait';
import { STRANICI } from './tekstove/stranici';

describe('адресите на езиците', () => {
  it('българският е без префикс', () => {
    expect(adres('bg', '/proekt')).toBe('/proekt');
    expect(adres('bg', '/')).toBe('/');
    expect(adres('bg', '/en/proekt')).toBe('/proekt');
  });

  it('другите са под своя код', () => {
    expect(adres('en', '/proekt')).toBe('/en/proekt');
    expect(adres('zh', '/')).toBe('/zh');
    expect(adres('en', '/proekt?p=abc')).toBe('/en/proekt?p=abc');
    expect(adres('en', '/?x=1')).toBe('/en?x=1');
    expect(adres('zh', '/#gore')).toBe('/zh#gore');
  });

  it('не слага префикс два пъти', () => {
    expect(adres('en', '/en/proekt')).toBe('/en/proekt');
    expect(adres('zh', '/en/proekt')).toBe('/zh/proekt');
  });

  it('външните адреси минават както са', () => {
    expect(adres('en', 'mailto:a@b.bg')).toBe('mailto:a@b.bg');
    expect(adres('en', 'https://example.bg/x')).toBe('https://example.bg/x');
    expect(adres('en', '//cdn.example/x')).toBe('//cdn.example/x');
  });

  it('разделя езика от адреса', () => {
    expect(razdeli('/en/proekt')).toEqual({ ezik: 'en', put: '/proekt' });
    expect(razdeli('/zh')).toEqual({ ezik: 'zh', put: '/' });
    expect(razdeli('/en?x=1')).toEqual({ ezik: 'en', put: '/?x=1' });
    expect(razdeli('/proekt')).toEqual({ ezik: 'bg', put: '/proekt' });
    // „/english" не е английски — префиксът е цял сегмент
    expect(razdeli('/english')).toEqual({ ezik: 'bg', put: '/english' });
  });

  it('познава езиците', () => {
    expect(eEzik('en')).toBe(true);
    expect(eEzik('de')).toBe(false);
    expect(eEzik(undefined)).toBe(false);
  });

  it('попълва шаблон', () => {
    expect(popalni('{n} от {max}', { n: 2, max: 5 })).toBe('2 от 5');
    expect(popalni('{липсва}', {})).toBe('{липсва}');
  });
});

/**
 * Преводът е пълен, ако на другите езици няма празен ред. Формата я пази
 * TypeScript; тук се хваща забравеното `''`.
 */
function prazni(x: unknown, put = ''): string[] {
  if (typeof x === 'string') return x.trim() ? [] : [put];
  if (Array.isArray(x)) return x.flatMap((v, i) => prazni(v, `${put}[${i}]`));
  if (x && typeof x === 'object')
    return Object.entries(x).flatMap(([k, v]) => prazni(v, `${put}.${k}`));
  return [];
}

describe('речниците', () => {
  it.each([
    ['САЙТ', SAIT],
    ['СТРАНИЦИ', STRANICI],
    ['ПРОЕКТ', PROEKT],
  ] as const)('%s няма празни редове', (_, r) => {
    for (const ezik of ['bg', 'en', 'zh'] as const) expect(prazni(r[ezik]), ezik).toEqual([]);
  });

  it('правните текстове се казват на всеки език', () => {
    for (const ezik of ['en', 'zh'] as const) {
      const p = PRAVNI[ezik];
      const v = { ime: 'Korpus', meseci: 12, godini: 2 };
      expect(p.poveritelnost.bloka(v).length).toBe(PRAVNI.bg.poveritelnost.bloka(v).length);
      expect(p.usloviya.bloka(v).length).toBe(PRAVNI.bg.usloviya.bloka(v).length);
      expect(p.biskvitki.bloka(v).length).toBe(PRAVNI.bg.biskvitki.bloka(v).length);
      expect(p.vazhiBalgarskiyat).toBeTruthy();
    }
  });
});
