import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { computeKitchen, emptyKitchen, kitchenRoom, type Kitchen } from './cabinet-rules';
import { PART_COLOR, depthRange, paletteFor, renderScene } from './render';
import { DEFAULT_CAMERA, sceneFor, visibleFaces } from './scene3d';

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
