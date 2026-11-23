import { describe, expect, it } from 'vitest';
import { ogledText, parseOgled } from './ogled';
import { parseZapitvane, summaryOf } from './zapitvane';

describe('кога е удобно за оглед', () => {
  it('приема само познатото, без повторения, в реда на седмицата', () => {
    expect(parseOgled({ days: ['sab', 'pon', 'pon', 'nedelya'], times: ['vecher', 'x', 'sutrin'] })).toEqual({
      days: ['pon', 'sab'],
      times: ['sutrin', 'vecher'],
    });
  });

  it('нищо избрано значи няма пожелание', () => {
    expect(parseOgled(undefined)).toBeNull();
    expect(parseOgled('утре')).toBeNull();
    expect(parseOgled({ days: [], times: [] })).toBeNull();
    expect(parseOgled({ days: 'pon' })).toBeNull();
  });

  it('се казва с думи', () => {
    expect(ogledText({ days: ['vt', 'chet'], times: ['sledobed'] })).toBe(
      'вторник, четвъртък · следобед (15–18 ч.)',
    );
    expect(ogledText({ days: ['pon', 'vt', 'sr', 'chet', 'pet'], times: [] })).toBe('делнични дни');
    expect(ogledText({ days: ['pon', 'vt', 'sr', 'chet', 'pet', 'sab'], times: ['sutrin'] })).toBe(
      'всеки ден без неделя · сутрин (9–12 ч.)',
    );
    expect(ogledText(null)).toBe('');
  });

  it('влиза в запитването и в краткото му описание', () => {
    const v = parseZapitvane({
      name: 'Иван',
      phone: '0888 123 456',
      consent: true,
      ogled: { days: ['sab'], times: ['sutrin'] },
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.value.ogled).toEqual({ days: ['sab'], times: ['sutrin'] });
    expect(summaryOf(v.value)).toContain('оглед: събота · сутрин (9–12 ч.)');
  });

  it('запитване без пожелание е същото като преди', () => {
    const v = parseZapitvane({ name: 'Иван', phone: '0888 123 456', consent: true, ogled: { days: ['x'] } });
    expect(v.ok && 'ogled' in v.value).toBe(false);
  });
});
