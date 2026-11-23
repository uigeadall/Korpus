import { describe, expect, it } from 'vitest';
import { MODULES, type ModuleKind, acceptsShelves, canOpen } from './cabinet-rules';
import { isOperable, moduleSpeech, shelvesPhrase } from './speech';

const spoken = (kind: ModuleKind, open = false, shelves?: number) =>
  moduleSpeech({ code: 'Д1', kind, shelves, spec: { label: MODULES[kind].label } }, open);

describe('броят на рафтовете', () => {
  it('един рафт е рафт, а не рафта', () => {
    expect(shelvesPhrase(1)).toBe('1 рафт');
  });

  it('нула и повече от един са рафта', () => {
    expect(shelvesPhrase(0)).toBe('0 рафта');
    expect(shelvesPhrase(2)).toBe('2 рафта');
    expect(shelvesPhrase(5)).toBe('5 рафта');
  });
});

describe('изречението за модула', () => {
  it('шкафът казва дали е отворен или затворен', () => {
    expect(spoken('door', false)).toContain('затворен');
    expect(spoken('door', true)).toContain('отворен');
  });

  it('уредът се представя като уред и не обещава Enter', () => {
    const s = spoken('oven');
    expect(s).toContain('уред');
    expect(s).not.toContain('Enter');
  });

  it('шкафът с чекмеджета приема Enter, но не и рафтове', () => {
    const s = spoken('drawers');
    expect(s).toContain('Enter отваря и затваря');
    expect(s).not.toContain('Плюс и минус');
  });

  it('горният шкаф приема и двете', () => {
    const s = spoken('upper');
    expect(s).toContain('Enter отваря и затваря');
    expect(s).toContain('Плюс и минус');
  });

  it('казва точния брой рафтове, които клиентът е оставил', () => {
    expect(spoken('upper', false, 3)).toContain('3 рафта');
    expect(spoken('upper', false, 1)).toContain('1 рафт.');
  });

  it('без код изречението не започва с празно място', () => {
    const s = moduleSpeech({ kind: 'door', spec: { label: 'Долен шкаф' } }, false);
    expect(s.startsWith('Долен шкаф,')).toBe(true);
  });
});

describe('всеки вид модул се изговаря', () => {
  it('никой не остава без изречение и без двойни празни места', () => {
    for (const kind of Object.keys(MODULES) as ModuleKind[]) {
      const s = spoken(kind);
      expect(s, kind).toMatch(/^Д1 .+, .+, \d+ рафт/);
      expect(s, kind).not.toMatch(/ {2}/);
    }
  });

  it('обещава клавиш само там, където клавишът работи', () => {
    for (const kind of Object.keys(MODULES) as ModuleKind[]) {
      const s = spoken(kind);
      expect(s.includes('Enter'), kind).toBe(canOpen(kind));
      expect(s.includes('Плюс и минус'), kind).toBe(acceptsShelves(kind));
      expect(isOperable(kind), kind).toBe(s.includes('Enter') || s.includes('Плюс и минус'));
    }
  });
});
