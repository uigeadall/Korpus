import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { computeKitchen, emptyKitchen, kitchenRoom, type Kitchen } from './cabinet-rules';
import { PART_COLOR, depthRange, paletteFor, renderScene, tightViewBox } from './render';
import { AO_INK } from './ao';
import { DEFAULT_CAMERA, project, sceneFor, viewBoxFor, visibleFaces } from './scene3d';
import { WALL_FINISHES } from '@/config/wall-finishes';
import { FLOOR_FINISHES } from '@/config/floor-finishes';

/** Кухня с мебел — сцената трябва да има какво да покаже. */
function kuhnya(): Kitchen {
  const k = emptyKitchen(3600);
  k.room = { width: 4200, depth: 3200 };
  const l = layoutFor('kitchen', 3600, DEFAULT_ROOM_NEEDS);
  k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
  return k;
}

function kadar(k = kuhnya()) {
  const room = kitchenRoom(k);
  const cam = DEFAULT_CAMERA(room);
  const boxes = sceneFor(k, room, computeKitchen(k).placed, k.materials.worktop);
  return { k, cam, boxes, room };
}

describe('готовият документ', () => {
  it('е самостоятелен: с xmlns и с мерки в пиксели', () => {
    const { k, cam, boxes } = kadar();
    const { svg, width, height } = renderScene(boxes, cam, k, { width: 1200 });

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`width="1200"`);
    expect(svg).toContain(`height="${height}"`);
    expect(width).toBe(1200);
    expect(height).toBeGreaterThan(100);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('няма нито един цвят от променлива на темата', () => {
    /*
     * Откъсната картинка не вижда страницата: `var(--accent)` в нея
     * става черно. Това е единственият начин грешката да се хване рано —
     * на екрана тя не личи.
     */
    for (const pass of ['material', 'depth', 'parts'] as const) {
      const { k, cam, boxes } = kadar();
      const { svg } = renderScene(boxes, cam, k, { pass });
      expect(svg, pass).not.toContain('var(--');
      expect(svg, pass).not.toContain('currentColor');
    }
  });

  it('има плътен фон — прозрачното почернява в поща и в чат', () => {
    const { k, cam, boxes } = kadar();
    expect(renderScene(boxes, cam, k).svg).toContain('<rect');
  });

  it('заглавието се вписва и се пази от знаци, които чупят XML', () => {
    const { k, cam, boxes } = kadar();
    const { svg } = renderScene(boxes, cam, k, { title: 'Кухня <3600> & "гардероб"' });
    expect(svg).toContain('<title>Кухня &lt;3600&gt; &amp; &quot;гардероб&quot;</title>');
  });

  it('височината следва формата на кадъра, не се налага отвън', () => {
    const { k, cam, boxes } = kadar();
    const a = renderScene(boxes, cam, k, { width: 800 });
    const b = renderScene(boxes, cam, k, { width: 1600 });
    expect(b.height / a.height).toBeCloseTo(2, 1);
  });

  it('празна стая също се рисува, без да хвърля', () => {
    const k = emptyKitchen(3600);
    const room = kitchenRoom(k);
    const cam = DEFAULT_CAMERA(room);
    const boxes = sceneFor(k, room, computeKitchen(k).placed, k.materials.worktop);
    expect(renderScene(boxes, cam, k).svg).toContain('</svg>');
  });
});

describe('износът показва същото като екрана', () => {
  /*
   * Четирите неща, с които първият опит лъжеше. Картинката обещава
   * „едно към едно с екрана" и това е единственото място, където
   * обещанието се пази — на екрана разликата не личи, защото и двете
   * изглеждат правдоподобно.
   */
  const tuhla = WALL_FINISHES.find((f) => f.category === 'tuhla')!;

  const izgled = (promeni: (k: Kitchen) => void = () => {}) => {
    const k = kuhnya();
    promeni(k);
    const room = kitchenRoom(k);
    const cam = DEFAULT_CAMERA(room);
    const boxes = sceneFor(k, room, computeKitchen(k).placed, k.materials.worktop);
    return renderScene(boxes, cam, k, { width: 900, room }).svg;
  };

  it('покритието на ОТДЕЛНА стена личи', () => {
    const гол = izgled();
    const тухлена = izgled((k) => {
      k.wallFinish = { all: 'boya-default', sides: { top: tuhla.id } };
    });
    expect(тухлена).not.toBe(гол);
  });

  it('шарката се рисува, а не само цветът', () => {
    const svg = izgled((k) => {
      k.wallFinish = { all: tuhla.id };
    });
    // Фугите на тухлите са чертички, не плътен правоъгълник.
    expect(svg).toContain('<path');
    expect(svg).toContain('clip-path');
  });

  it('настилката на пода личи', () => {
    // Подът си има свой каталог — не е покритие за стена.
    const паркет = FLOOR_FINISHES.find((f) => f.category === 'parket')!;
    expect(izgled((k) => {
      k.floorFinish = паркет.id;
    })).not.toBe(izgled());
  });

  it('без стая зидовете пак излизат, само без своето покритие', () => {
    // Старото извикване без `room` не бива да хвърля.
    const k = kuhnya();
    const room = kitchenRoom(k);
    const cam = DEFAULT_CAMERA(room);
    const boxes = sceneFor(k, room, computeKitchen(k).placed, k.materials.worktop);
    expect(renderScene(boxes, cam, k, { width: 900 }).svg).toContain('</svg>');
  });

  it('меките срещи влизат в картинката', () => {
    /*
     * Ъглите на стаята тъмнеят. Без стая срещите не се знаят — това е
     * и единствената разлика, която `room` прави освен покритията.
     */
    const k = kuhnya();
    const room = kitchenRoom(k);
    const cam = DEFAULT_CAMERA(room);
    const boxes = sceneFor(k, room, computeKitchen(k).placed, k.materials.worktop);
    const svg = renderScene(boxes, cam, k, { width: 900, room }).svg;
    expect(svg).toContain('gradientUnits="userSpaceOnUse"');
    expect(svg).toContain(AO_INK);
  });

  it('картите за машината остават без тъмнина в ъглите', () => {
    // Там тъмнината в ъгъла е втора област, не сянка.
    const { k, cam, boxes } = kadar();
    for (const pass of ['depth', 'parts'] as const) {
      const svg = renderScene(boxes, cam, k, { pass, room: kitchenRoom(k) }).svg;
      expect(svg, pass).not.toContain('gradientUnits');
    }
  });

  it('сянката на пода е размазана, както на екрана', () => {
    // Дотук износът я рисуваше с остър ръб и обещанието „едно към едно
    // с екрана" не се спазваше точно тук.
    const { k, cam, boxes } = kadar();
    const svg = renderScene(boxes, cam, k, { room: kitchenRoom(k) }).svg;
    expect(svg).toContain('feGaussianBlur');
    expect(svg).toContain('filter="url(#f-shadow)"');
  });

  it('камерата решава кадъра — друг ъгъл, друга картинка', () => {
    const k = kuhnya();
    const room = kitchenRoom(k);
    const boxes = sceneFor(k, room, computeKitchen(k).placed, k.materials.worktop);
    const право = renderScene(boxes, DEFAULT_CAMERA(room), k, { width: 900, room }).svg;
    const завъртяно = renderScene(
      boxes,
      { ...DEFAULT_CAMERA(room), yaw: 0.6 },
      k,
      { width: 900, room },
    ).svg;
    expect(завъртяно).not.toBe(право);
  });
});

describe('трите прочита', () => {
  it('материалите носят преливките, картите — не', () => {
    const { k, cam, boxes } = kadar();
    expect(renderScene(boxes, cam, k, { pass: 'material' }).svg).toContain('<linearGradient');
    expect(renderScene(boxes, cam, k, { pass: 'depth' }).svg).not.toContain('<linearGradient');
    expect(renderScene(boxes, cam, k, { pass: 'parts' }).svg).not.toContain('<linearGradient');
  });

  it('дълбочината е само сиво', () => {
    const { k, cam, boxes } = kadar();
    const { svg } = renderScene(boxes, cam, k, { pass: 'depth' });
    const цветове = [...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    expect(цветове.length).toBeGreaterThan(20);
    for (const c of цветове) {
      expect(c.slice(1, 3), c).toBe(c.slice(3, 5));
      expect(c.slice(3, 5), c).toBe(c.slice(5, 7));
    }
  });

  it('близкото е по-светло от далечното', () => {
    const { cam, boxes } = kadar();
    const faces = visibleFaces(boxes, cam);
    const { near, far } = depthRange(faces, cam);
    expect(far).toBeGreaterThan(near);
  });

  it('частите са плоски цветове от картата, без осветяване', () => {
    const { k, cam, boxes } = kadar();
    const { svg } = renderScene(boxes, cam, k, { pass: 'parts' });
    const цветове = new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]));
    const карта = new Set(Object.values(PART_COLOR));
    // Фонът е единственото, което не е от картата.
    for (const c of цветове) {
      if (c === '#000000') continue;
      expect(карта.has(c), c).toBe(true);
    }
  });

  it('всяка роля си има свой цвят в картата на частите', () => {
    const цветове = Object.values(PART_COLOR);
    expect(new Set(цветове).size, 'два вида с един цвят се сливат в една област').toBe(
      цветове.length,
    );
  });

  it('материалите следват избраното, не са заковани', () => {
    const тъмна = kuhnya();
    тъмна.materials = {
      ...тъмна.materials,
      facade: { ...тъмна.materials.facade, color: 'RAL 7016 антрацит' },
    };
    expect(paletteFor(тъмна).facade).not.toBe(paletteFor(kuhnya()).facade);

    const { cam, boxes } = kadar(тъмна);
    const { svg } = renderScene(boxes, cam, тъмна, { pass: 'material' });
    expect(svg).toContain('<linearGradient');
  });
});

describe('плътният кадър за AI', () => {
  /*
   * С бяло около стаята моделът мести вратите и дорисува стени —
   * проверено на живо. Кадърът за AI е плътно около нарисуваното.
   */
  const box = (v: string) => {
    const [x, y, w, h] = v.split(' ').map(Number);
    return { x, y, w, h };
  };

  it('е по-малък от кадъра на екрана — по-малко бяло', () => {
    const { cam, boxes } = kadar();
    const tight = box(tightViewBox(boxes, cam));
    const screen = box(viewBoxFor(boxes, cam));
    expect(tight.w * tight.h).toBeLessThan(screen.w * screen.h * 0.8);
  });

  it('побира всичко видимо, и зидовете — отрязан зид моделът дорисува', () => {
    const { cam, boxes } = kadar();
    const t = box(tightViewBox(boxes, cam));
    for (const f of visibleFaces(boxes, cam)) {
      for (const c of f.corners) {
        const p = project(c, cam);
        expect(p.x).toBeGreaterThanOrEqual(t.x);
        expect(p.x).toBeLessThanOrEqual(t.x + t.w);
        expect(p.y).toBeGreaterThanOrEqual(t.y);
        expect(p.y).toBeLessThanOrEqual(t.y + t.h);
      }
    }
  });

  it('renderScene го приема наготово', () => {
    const { k, cam, boxes } = kadar();
    const viewBox = tightViewBox(boxes, cam);
    expect(renderScene(boxes, cam, k, { width: 1024, viewBox }).svg).toContain(`viewBox="${viewBox}"`);
  });
});
