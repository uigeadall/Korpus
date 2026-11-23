/**
 * Шарката на една стена — фуги, дъски, мотиви — в милиметри по самата
 * стена.
 *
 * Чиста геометрия без React: `u` върви по стената, `v` нагоре от пода.
 * Шарката е закотвена за ъгъла на стаята, а не за парчето зид, което се
 * рисува. Затова зид, разрязан от врата или прозорец, продължава
 * тухлите си от двете страни на отвора, вместо всяко парче да почва
 * своя редица от нула.
 *
 * Тук се смята само какво има по стената. Как се вижда — перспектива,
 * светлина, отрязване по ръба на парчето — е работа на рисуването.
 */

export type Pt = [u: number, v: number];

/** Как е изградена повърхността. Цветовете са шестнайсетични. */
export type PatternSpec =
  /** Гладка боя — само основният цвят. */
  | { kind: 'plain' }
  /** Петна с мек преход: мазилка, венецианска, микроцимент, корк. */
  | { kind: 'mottle'; scale: number; tones: string[]; density: number }
  /** Кофражен бетон: панели и дупките от анкерите. */
  | { kind: 'concrete'; panelW: number; panelH: number; joint: string; tones: string[] }
  /** Тухли на редове. `bond` е как се разминават фугите. */
  | {
      kind: 'brick';
      w: number;
      h: number;
      mortar: string;
      tones: string[];
      bond: 'stretcher' | 'stack' | 'third' | 'flemish';
    }
  /** Камък на редове с различна дължина на парчетата. */
  | { kind: 'stone'; course: number; minW: number; maxW: number; mortar: string; tones: string[] }
  /** Плочки и мозайка. `offset` е колко се отмества всеки втори ред (0–0.5). */
  | {
      kind: 'tile';
      w: number;
      h: number;
      offset: number;
      grout: string;
      tones?: string[];
      /** Част от плочките в друг тон, 0–1. */
      mix?: number;
    }
  /** Шахматна дъска от два цвята. */
  | { kind: 'checker'; size: number; alt: string; grout: string }
  /** Рибена кост. */
  /** Рибена кост 2:1 — `h` е късата страна на плочката. */
  | { kind: 'herringbone'; h: number; grout: string; tones?: string[] }
  /** Дъски — обшивка, ламинат. */
  | {
      kind: 'planks';
      w: number;
      length: number;
      dir: 'h' | 'v';
      gap: string;
      tones: string[];
      grain: string;
    }
  /** Ламели с тъмни процепи помежду. */
  | { kind: 'slats'; w: number; gap: number; gapColor: string; tones: string[] }
  /** Тапет на ивици. Ширините се повтарят в същия ред, както и цветовете. */
  | { kind: 'stripes'; widths: number[]; colors: string[] }
  /** Тапет с листа на редове. */
  | {
      kind: 'motif';
      step: number;
      color: string;
      size: number;
      /** Всеки втори ред на половин стъпка. */
      offset: boolean;
    }
  /** Ромбова решетка — тапет в стил дамаска, без да се рисува истинска дамаска. */
  | { kind: 'lattice'; step: number; color: string; dot?: string }
  /** Мрамор: жилки по повърхността. */
  | { kind: 'marble'; vein: string; density: number; slab: number; joint: string }
  /** Ламперия долу, боя горе, лайсна помежду. */
  | { kind: 'wainscot'; height: number; panel: number; lower: string; rail: string }
  /** Обемни панели — квадрати със светла и тъмна страна. */
  | { kind: 'panels3d'; size: number; light: string; dark: string }
  /** Ребрест панел — вертикални ребра със светлина отстрани. */
  | { kind: 'fluted'; w: number; light: string; dark: string };

/** Парчета с еднакъв цвят — един `<path>` при рисуването. */
export interface FillLayer {
  color: string;
  opacity: number;
  polys: Pt[][];
}

/** Линии с еднакъв цвят и дебелина в пиксели на екрана. */
export interface LineLayer {
  color: string;
  opacity: number;
  /** Дебелина в пиксели на екрана — фугата не дебелее с приближаването. */
  width: number;
  segs: [Pt, Pt][];
}

export interface WallMarks {
  fills: FillLayer[];
  lines: LineLayer[];
}

/** Прозорецът по стената, който трябва да се покрие. */
export interface UvRect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/**
 * Таван на парчетата в една стена. Мозайка 2,5 см по четириметрова
 * стена са петнайсет хиляди плочки; толкова многоъгълника при всяко
 * завъртане на камерата скапват рисуването. Линиите на фугите остават
 * всички — те са малко и дълги. Цветните петна се разреждат.
 */
export const FILL_BUDGET = 700;

/**
 * Случайно, но винаги едно и също за едно и също място. Без това
 * тухлите сменят цвета си при всяко завъртане.
 */
export function hash(a: number, b: number, seed = 0): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const rect = (u0: number, v0: number, u1: number, v1: number): Pt[] => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];

/** Сбира парчетата по цвят и пази тавана. */
class Builder {
  private fillMap = new Map<string, FillLayer>();
  private lineMap = new Map<string, LineLayer>();
  private count = 0;

  fill(color: string, poly: Pt[], opacity = 1) {
    if (this.count >= FILL_BUDGET) return;
    this.count += 1;
    const key = `${color}|${opacity}`;
    let layer = this.fillMap.get(key);
    if (!layer) {
      layer = { color, opacity, polys: [] };
      this.fillMap.set(key, layer);
    }
    layer.polys.push(poly);
  }

  line(color: string, width: number, a: Pt, b: Pt, opacity = 1) {
    const key = `${color}|${width}|${opacity}`;
    let layer = this.lineMap.get(key);
    if (!layer) {
      layer = { color, opacity, width, segs: [] };
      this.lineMap.set(key, layer);
    }
    layer.segs.push([a, b]);
  }

  /** Колко парчета още влизат — за разреждането на гъстите шарки. */
  get room(): number {
    return FILL_BUDGET - this.count;
  }

  done(): WallMarks {
    return { fills: [...this.fillMap.values()], lines: [...this.lineMap.values()] };
  }
}

/**
 * Какво да се оцвети, когато клетките са повече от тавана: всяка n-та.
 * Разреждането е по място, не по ред — затова не прави ивици.
 */
function thinning(cells: number, wanted: number, room: number): number {
  const expected = cells * wanted;
  return expected <= room ? 1 : room / expected;
}

/** Целите индекси на клетките, които покриват отрязъка [a, b]. */
function span(a: number, b: number, step: number): [number, number] {
  return [Math.floor(a / step), Math.ceil(b / step)];
}

/**
 * Шарката на правоъгълник от стената.
 *
 * Връща само неща в този правоъгълник или малко извън него — ръбът се
 * отрязва при рисуването. `seed` различава стените една от друга, за да
 * не са две тухлени стени огледално еднакви.
 */
export function wallMarks(spec: PatternSpec, area: UvRect, seed = 0): WallMarks {
  const out = new Builder();
  const { u0, u1, v0, v1 } = area;

  switch (spec.kind) {
    case 'plain':
      break;

    case 'mottle': {
      const s = spec.scale;
      const [i0, i1] = span(u0, u1, s);
      const [j0, j1] = span(v0, v1, s);
      const keep = thinning((i1 - i0) * (j1 - j0), spec.density, out.room);
      for (let i = i0; i < i1; i++) {
        for (let j = j0; j < j1; j++) {
          const r = hash(i, j, seed + 11);
          if (r > spec.density * keep) continue;
          const tone = spec.tones[Math.floor(hash(i, j, seed + 12) * spec.tones.length)];
          const cu = (i + hash(i, j, seed + 13)) * s;
          const cv = (j + hash(i, j, seed + 14)) * s;
          const rad = s * (0.35 + hash(i, j, seed + 15) * 0.5);
          out.fill(tone, blob(cu, cv, rad, hash(i, j, seed + 16)), 0.35);
        }
      }
      break;
    }

    case 'concrete': {
      const { panelW, panelH } = spec;
      const [i0, i1] = span(u0, u1, panelW);
      const [j0, j1] = span(v0, v1, panelH);
      for (let i = i0; i < i1; i++) {
        for (let j = j0; j < j1; j++) {
          const tone = spec.tones[Math.floor(hash(i, j, seed + 21) * spec.tones.length)];
          out.fill(tone, rect(i * panelW, j * panelH, (i + 1) * panelW, (j + 1) * panelH), 0.45);
          // Дупките от анкерите — по четири на панел.
          for (const [fu, fv] of [
            [0.2, 0.25],
            [0.8, 0.25],
            [0.2, 0.75],
            [0.8, 0.75],
          ]) {
            const cu = (i + fu) * panelW;
            const cv = (j + fv) * panelH;
            out.fill(spec.joint, blob(cu, cv, 14, 0.5, 6), 0.7);
          }
        }
      }
      for (let i = i0; i <= i1; i++) out.line(spec.joint, 1, [i * panelW, v0], [i * panelW, v1], 0.6);
      for (let j = j0; j <= j1; j++) out.line(spec.joint, 1, [u0, j * panelH], [u1, j * panelH], 0.6);
      break;
    }

    case 'brick': {
      const { w, h } = spec;
      const [j0, j1] = span(v0, v1, h);
      const shiftOf = (j: number) =>
        spec.bond === 'stack'
          ? 0
          : spec.bond === 'third'
            ? (((j % 3) + 3) % 3) * (w / 3)
            : spec.bond === 'flemish'
              ? (j & 1) * (w * 0.75)
              : (j & 1) * (w / 2);
      const perRow = Math.ceil((u1 - u0) / w) + 2;
      const keep = thinning(perRow * (j1 - j0), 1, out.room);
      for (let j = j0; j < j1; j++) {
        const shift = shiftOf(j);
        const [i0, i1] = span(u0 - shift, u1 - shift, w);
        out.line(spec.mortar, 1.1, [u0, j * h], [u1, j * h]);
        for (let i = i0; i <= i1; i++) {
          const a = i * w + shift;
          out.line(spec.mortar, 1.1, [a, j * h], [a, (j + 1) * h]);
          if (i < i1 && hash(i, j, seed + 31) <= keep) {
            const tone = spec.tones[Math.floor(hash(i, j, seed + 32) * spec.tones.length)];
            out.fill(tone, rect(a, j * h, a + w, (j + 1) * h), 0.55);
          }
        }
      }
      break;
    }

    case 'stone': {
      const { course } = spec;
      const [j0, j1] = span(v0, v1, course);
      for (let j = j0; j < j1; j++) {
        out.line(spec.mortar, 1.2, [u0, j * course], [u1, j * course]);
        // Парчетата се броят от началото на стената, за да не зависят
        // от това кое парче зид се рисува.
        let a = 0;
        let i = 0;
        const width = (k: number) => spec.minW + hash(k, j, seed + 41) * (spec.maxW - spec.minW);
        // Назад до лявия ръб и напред до десния.
        while (a > u0) {
          i -= 1;
          a -= width(i);
        }
        while (a < u1) {
          const b = a + width(i);
          out.line(spec.mortar, 1.2, [a, j * course], [a, (j + 1) * course]);
          if (b > u0) {
            const tone = spec.tones[Math.floor(hash(i, j, seed + 42) * spec.tones.length)];
            out.fill(tone, rect(a, j * course, b, (j + 1) * course), 0.6);
          }
          a = b;
          i += 1;
        }
      }
      break;
    }

    case 'tile': {
      const { w, h } = spec;
      const [j0, j1] = span(v0, v1, h);
      const offsetOf = (j: number) => (spec.offset ? ((j & 1) * spec.offset * w) % w : 0);
      const mix = spec.tones?.length ? (spec.mix ?? 0.3) : 0;
      const perRow = Math.ceil((u1 - u0) / w) + 2;
      const keep = thinning(perRow * (j1 - j0), mix, out.room);
      const fine = w < 60 && h < 60;
      const thick = fine ? 0.6 : 1;
      for (let j = j0; j <= j1; j++) out.line(spec.grout, thick, [u0, j * h], [u1, j * h]);
      for (let j = j0; j < j1; j++) {
        const shift = offsetOf(j);
        const [i0, i1] = span(u0 - shift, u1 - shift, w);
        for (let i = i0; i <= i1; i++) {
          const a = i * w + shift;
          // Без отместване вертикалните фуги са една дълга линия — по-евтино.
          if (spec.offset) out.line(spec.grout, thick, [a, j * h], [a, (j + 1) * h]);
          if (mix && i < i1 && hash(i, j, seed + 51) <= mix * keep) {
            const tones = spec.tones!;
            const tone = tones[Math.floor(hash(i, j, seed + 52) * tones.length)];
            out.fill(tone, rect(a, j * h, a + w, (j + 1) * h), 0.75);
          }
        }
      }
      if (!spec.offset) {
        const [i0, i1] = span(u0, u1, w);
        for (let i = i0; i <= i1; i++) out.line(spec.grout, thick, [i * w, v0], [i * w, v1]);
      }
      break;
    }

    case 'planks': {
      const along = spec.dir === 'h';
      // В местни мерки: `a` по дъската, `b` напреко.
      const [a0, a1] = along ? [u0, u1] : [v0, v1];
      const [b0, b1] = along ? [v0, v1] : [u0, u1];
      const P = (a: number, b: number): Pt => (along ? [a, b] : [b, a]);
      const [k0, k1] = span(b0, b1, spec.w);
      for (let k = k0; k < k1; k++) {
        const lo = k * spec.w;
        const hi = lo + spec.w;
        out.line(spec.gap, 1.1, P(a0, lo), P(a1, lo));
        // Челата на дъските — разминати на всеки ред.
        const shift = hash(k, 0, seed + 71) * spec.length;
        const [i0, i1] = span(a0 - shift, a1 - shift, spec.length);
        for (let i = i0; i <= i1; i++) {
          const a = i * spec.length + shift;
          out.line(spec.gap, 1.1, P(a, lo), P(a, hi));
          if (i < i1) {
            const tone = spec.tones[Math.floor(hash(i, k, seed + 72) * spec.tones.length)];
            out.fill(tone, [P(a, lo), P(a + spec.length, lo), P(a + spec.length, hi), P(a, hi)], 0.5);
          }
        }
        // Фладерът — две-три тънки линии по дължината на дъската.
        const lines = 2 + Math.floor(hash(k, 1, seed + 73) * 2);
        for (let g = 1; g <= lines; g++) {
          const b = lo + (spec.w * g) / (lines + 1) + (hash(k, g, seed + 74) - 0.5) * spec.w * 0.2;
          out.line(spec.grain, 0.6, P(a0, b), P(a1, b), 0.35);
        }
      }
      break;
    }

    case 'slats': {
      const pitch = spec.w + spec.gap;
      const [i0, i1] = span(u0, u1, pitch);
      for (let i = i0; i < i1; i++) {
        const a = i * pitch;
        out.fill(spec.gapColor, rect(a + spec.w, v0, a + pitch, v1));
        const tone = spec.tones[Math.floor(hash(i, 0, seed + 81) * spec.tones.length)];
        out.fill(tone, rect(a, v0, a + spec.w, v1), 0.4);
      }
      break;
    }

    case 'stripes': {
      const period = spec.widths.reduce((s, x) => s + x, 0);
      const [p0, p1] = span(u0, u1, period);
      for (let p = p0; p < p1; p++) {
        let a = p * period;
        spec.widths.forEach((width, k) => {
          const color = spec.colors[k % spec.colors.length];
          if (color !== 'none') out.fill(color, rect(a, v0, a + width, v1));
          a += width;
        });
      }
      break;
    }

    case 'motif': {
      const s = spec.step;
      const [i0, i1] = span(u0 - s, u1 + s, s);
      const [j0, j1] = span(v0 - s, v1 + s, s);
      for (let j = j0; j < j1; j++) {
        const shift = spec.offset && j & 1 ? s / 2 : 0;
        for (let i = i0; i < i1; i++) {
          const cu = i * s + shift + s / 2;
          const cv = j * s + s / 2;
          out.fill(spec.color, leaf(cu, cv, spec.size));
        }
      }
      break;
    }

    case 'lattice': {
      // Две семейства диагонали; пресечките им дават ромбовете.
      const s = spec.step;
      const [k0, k1] = span(u0 - (v1 - v0) - s, u1 + (v1 - v0) + s, s);
      for (let k = k0; k <= k1; k++) {
        const c = k * s;
        out.line(spec.color, 0.9, [c + v0, v0], [c + v1, v1], 0.8);
        out.line(spec.color, 0.9, [c - v0, v0], [c - v1, v1], 0.8);
      }
      if (spec.dot) {
        const [i0, i1] = span(u0, u1, s);
        const [j0, j1] = span(v0, v1, s);
        for (let i = i0; i <= i1; i++) {
          for (let j = j0; j <= j1; j++) {
            // Средата на всеки ромб.
            if (((i + j) & 1) === 0) continue;
            out.fill(spec.dot, diamond(i * s, j * s, s * 0.16));
          }
        }
      }
      break;
    }

    case 'marble': {
      // Плочи с фуга, а по тях жилки — начупени линии на случаен ход.
      const s = spec.slab;
      const [i0, i1] = span(u0, u1, s);
      const [j0, j1] = span(v0, v1, s * 2);
      for (let i = i0; i <= i1; i++) out.line(spec.joint, 0.8, [i * s, v0], [i * s, v1], 0.7);
      for (let j = j0; j <= j1; j++) out.line(spec.joint, 0.8, [u0, j * s * 2], [u1, j * s * 2], 0.7);
      for (let i = i0; i < i1; i++) {
        for (let j = j0; j < j1; j++) {
          const veins = Math.max(1, Math.round(spec.density * 4));
          for (let n = 0; n < veins; n++) {
            let pu = (i + hash(i, j * 7 + n, seed + 91)) * s;
            let pv = j * s * 2;
            let dir = (hash(i, j * 7 + n, seed + 92) - 0.5) * 1.6;
            const stepLen = s / 6;
            for (let t = 0; t < 12 && pv < (j + 1) * s * 2; t++) {
              dir += (hash(i * 31 + t, j * 7 + n, seed + 93) - 0.5) * 0.9;
              const nu = pu + Math.sin(dir) * stepLen;
              const nv = pv + Math.cos(dir) * stepLen;
              out.line(spec.vein, n === 0 ? 1.2 : 0.7, [pu, pv], [nu, nv], n === 0 ? 0.55 : 0.35);
              pu = nu;
              pv = nv;
            }
          }
        }
      }
      break;
    }

    case 'wainscot': {
      const top = spec.height;
      if (v0 < top) {
        out.fill(spec.lower, rect(u0, v0, u1, Math.min(top, v1)));
        // Пана — правоъгълни рамки, по една на всяка стъпка.
        const [i0, i1] = span(u0, u1, spec.panel);
        for (let i = i0; i < i1; i++) {
          const a = i * spec.panel;
          const inset = 70;
          const frame = rect(a + inset, 160, a + spec.panel - inset, top - 120);
          for (let e = 0; e < 4; e++) out.line(spec.rail, 1, frame[e], frame[(e + 1) % 4], 0.7);
        }
        out.line(spec.rail, 1, [u0, 120], [u1, 120], 0.8);
      }
      if (v0 <= top + 40 && v1 >= top) out.fill(spec.rail, rect(u0, top, u1, top + 40));
      break;
    }

    case 'panels3d': {
      const s = spec.size;
      const [i0, i1] = span(u0, u1, s);
      const [j0, j1] = span(v0, v1, s);
      for (let i = i0; i < i1; i++) {
        for (let j = j0; j < j1; j++) {
          const a = i * s;
          const b = j * s;
          const c: Pt = [a + s / 2, b + s / 2];
          // Пирамида: горе и вляво светло, долу и вдясно тъмно.
          out.fill(spec.light, [[a, b + s], [a + s, b + s], c]);
          out.fill(spec.light, [[a, b], [a, b + s], c], 0.6);
          out.fill(spec.dark, [[a, b], [a + s, b], c]);
          out.fill(spec.dark, [[a + s, b], [a + s, b + s], c], 0.6);
        }
      }
      break;
    }

    case 'fluted': {
      const [i0, i1] = span(u0, u1, spec.w);
      for (let i = i0; i < i1; i++) {
        const a = i * spec.w;
        out.fill(spec.light, rect(a, v0, a + spec.w * 0.35, v1), 0.7);
        out.fill(spec.dark, rect(a + spec.w * 0.7, v0, a + spec.w, v1), 0.7);
      }
      break;
    }
  }

  return out.done();
}

/** Неправилно петно около точка — мазилката не е на кръгчета. */
function blob(cu: number, cv: number, rad: number, wobble: number, sides = 9): Pt[] {
  const poly: Pt[] = [];
  for (let k = 0; k < sides; k++) {
    const ang = (k / sides) * Math.PI * 2;
    const r = rad * (0.75 + 0.25 * Math.sin(ang * 3 + wobble * 6.28));
    poly.push([cu + Math.cos(ang) * r, cv + Math.sin(ang) * r]);
  }
  return poly;
}

/** Ромбче — в средата на клетките на дамаската. */
function diamond(cu: number, cv: number, r: number): Pt[] {
  return [
    [cu, cv - r],
    [cu + r * 0.7, cv],
    [cu, cv + r],
    [cu - r * 0.7, cv],
  ];
}

/** Листо — мотивът на тапета. */
function leaf(cu: number, cv: number, r: number): Pt[] {
  return [
    [cu, cv - r],
    [cu + r * 0.45, cv - r * 0.2],
    [cu + r * 0.2, cv + r * 0.6],
    [cu, cv + r],
    [cu - r * 0.2, cv + r * 0.6],
    [cu - r * 0.45, cv - r * 0.2],
  ];
}
