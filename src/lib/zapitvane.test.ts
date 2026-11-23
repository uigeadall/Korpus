import { describe, expect, it } from 'vitest';
import { defaultFlat } from './flat';
import { encodeFlat } from './flat-share';
import { emptyKitchen } from './cabinet-rules';
import { encodeProject } from './share';
import {
  LIMITS,
  looksLikeEmail,
  looksLikePhone,
  parseZapitvane,
  summaryOf,
} from './zapitvane';

const добро = {
  name: 'Иван Петров',
  phone: '0888 123 456',
  email: '',
  note: 'Искам кухня и гардероб.',
  consent: true,
};

/** Кои полета са се оплакали. */
const полета = (r: ReturnType<typeof parseZapitvane>) =>
  r.ok ? [] : r.problems.map((p) => p.field);

describe('как да ни намерят', () => {
  it('само телефон стига', () => {
    const r = parseZapitvane(добро);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.phone).toBe('0888 123 456');
  });

  it('само имейл стига', () => {
    const r = parseZapitvane({ ...добро, phone: '', email: 'IVAN@Primer.BG' });
    expect(r.ok).toBe(true);
    // Имейлът се прибира с малки букви — иначе един и същ човек влиза
    // в базата по два пъти.
    if (r.ok) expect(r.value.email).toBe('ivan@primer.bg');
  });

  it('без нито едно от двете не минава', () => {
    expect(полета(parseZapitvane({ ...добро, phone: '', email: '' }))).toContain('phone');
  });

  it('име под две букви не минава', () => {
    expect(полета(parseZapitvane({ ...добро, name: 'И' }))).toContain('name');
  });

  it('без съгласие не минава', () => {
    expect(полета(parseZapitvane({ ...добро, consent: false }))).toContain('consent');
    expect(полета(parseZapitvane({ ...добро, consent: 'да' }))).toContain('consent');
  });

  it('празните места се свиват, а не се носят', () => {
    const r = parseZapitvane({ ...добро, name: '  Иван   Петров  ' });
    if (r.ok) expect(r.value.name).toBe('Иван Петров');
  });

  it('дългите полета се отрязват, вместо да се отказват', () => {
    const r = parseZapitvane({ ...добро, note: 'я'.repeat(5000) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.note.length).toBe(LIMITS.note);
  });
});

describe('телефон по български навик', () => {
  it('минават обичайните начини да се напише', () => {
    for (const v of ['0888123456', '0888 123 456', '+359 88 812 34 56', '(02) 987 65 43']) {
      expect(looksLikePhone(v), v).toBe(true);
    }
  });

  it('не минава това, което не е номер', () => {
    for (const v of ['', '123', 'обади ми се', '0888-ЗВЪННИ', '1'.repeat(20)]) {
      expect(looksLikePhone(v), v).toBe(false);
    }
  });
});

describe('имейл', () => {
  it('минават обичайните', () => {
    for (const v of ['a@b.bg', 'ivan.petrov@primer.co.uk', 'i+kuhnya@primer.bg']) {
      expect(looksLikeEmail(v), v).toBe(true);
    }
  });

  it('не минават явните грешки', () => {
    for (const v of ['', 'ivan', 'ivan@', '@primer.bg', 'ivan@primer', 'ivan @primer.bg']) {
      expect(looksLikeEmail(v), v).toBe(false);
    }
  });
});

describe('записите се отварят, а не само изглеждат като запис', () => {
  const жилище = encodeFlat(defaultFlat());
  const проект = encodeProject(emptyKitchen(3600));

  it('истинско жилище минава', () => {
    const r = parseZapitvane({ ...добро, flat: жилище });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.flat).toBe(жилище);
  });

  it('истинска стая минава', () => {
    const r = parseZapitvane({ ...добро, project: проект });
    expect(r.ok).toBe(true);
  });

  it('счупен запис не минава', () => {
    expect(полета(parseZapitvane({ ...добро, flat: 'не-е-жилище' }))).toContain('flat');
    expect(полета(parseZapitvane({ ...добро, project: '!!!' }))).toContain('project');
  });

  it('прекалено дълъг запис се отказва, без да се отваря', () => {
    const р = parseZapitvane({ ...добро, flat: 'A'.repeat(LIMITS.flat + 1) });
    expect(полета(р)).toContain('flat');
    if (!р.ok) expect(р.problems[0].said).toContain('голямо');
  });

  it('запитване без проект минава — човек може просто да пита', () => {
    expect(parseZapitvane(добро).ok).toBe(true);
  });
});

describe('какво не е заявка', () => {
  it('нищо, низ и число не чупят', () => {
    for (const raw of [null, undefined, 'здравей', 42, []]) {
      const r = parseZapitvane(raw);
      expect(r.ok, String(raw)).toBe(false);
    }
  });

  it('полета от друг вид се броят за празни, не за грешка в кода', () => {
    const r = parseZapitvane({ name: 42, phone: {}, email: [], consent: true });
    expect(r.ok).toBe(false);
    expect(полета(r)).toContain('name');
  });
});

describe('краткото описание', () => {
  it('казва кой е и какво носи', () => {
    const flat = defaultFlat();
    const сЖилище = {
      ...flat,
      rooms: flat.rooms.map((r, i) =>
        i < 2 ? { ...r, project: encodeProject(emptyKitchen(3600)) } : r,
      ),
    };
    const r = parseZapitvane({ ...добро, flat: encodeFlat(сЖилище) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const s = summaryOf(r.value);
    expect(s).toContain('Иван Петров');
    expect(s).toContain('0888 123 456');
    expect(s).toContain('6 помещения');
    expect(s).toContain('2 обзаведени');
  });

  it('казва и когато няма проект', () => {
    const r = parseZapitvane(добро);
    if (r.ok) expect(summaryOf(r.value)).toContain('без проект');
  });
});
