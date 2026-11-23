import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WALL_FINISH,
  chooseFinish,
  finishIdFor,
  hasOwnFinish,
  innerWallPlane,
  isDefaultFinish,
  packFinish,
  planeArea,
  planePoint,
  resetSide,
  unpackFinish,
} from './wall-finish';
import { boxFaces, shellWall } from './scene3d';
import { WALL_SIDES } from './furniture/room';

const room = { width: 4200, depth: 3200 };

describe('покритието на стените', () => {
  it('стая без избор е с подразбиращото се', () => {
    for (const side of WALL_SIDES) expect(finishIdFor(undefined, side)).toBe('boya-default');
    expect(isDefaultFinish(undefined)).toBe(true);
    expect(isDefaultFinish(DEFAULT_WALL_FINISH)).toBe(true);
  });

  it('акцентна стена — само тя е различна', () => {
    let c = chooseFinish(undefined, 'all', 'boya-greige');
    c = chooseFinish(c, 'top', 'tuhla-red-r');
    expect(finishIdFor(c, 'top')).toBe('tuhla-red-r');
    expect(finishIdFor(c, 'left')).toBe('boya-greige');
    expect(hasOwnFinish(c, 'top')).toBe(true);
    expect(hasOwnFinish(c, 'left')).toBe(false);
  });

  it('„всички стени" наистина значи всички', () => {
    let c = chooseFinish(undefined, 'top', 'tuhla-red-r');
    c = chooseFinish(c, 'all', 'boya-pearl');
    for (const side of WALL_SIDES) expect(finishIdFor(c, side)).toBe('boya-pearl');
    expect(c.sides).toBeUndefined();
  });

  it('стена, върната към общото, не остава отделна', () => {
    let c = chooseFinish({ all: 'boya-greige' }, 'left', 'tapet-lista-green-cream');
    c = resetSide(c, 'left');
    expect(c).toEqual({ all: 'boya-greige' });
    expect(chooseFinish({ all: 'boya-greige' }, 'left', 'boya-greige')).toEqual({ all: 'boya-greige' });
  });

  it('влиза в линка и излиза същото', () => {
    const c = chooseFinish(chooseFinish(undefined, 'all', 'mazilka-venec-sand'), 'bottom', 'plochki-metro-white');
    const packed = packFinish(c)!;
    expect(packed).toEqual(['mazilka-venec-sand', '', '', 'plochki-metro-white']);
    expect(unpackFinish(JSON.parse(JSON.stringify(packed)))).toEqual(c);
  });

  it('подразбиращата се стена не пише нищо в линка', () => {
    expect(packFinish(undefined)).toBeUndefined();
    expect(packFinish({ all: 'boya-default' })).toBeUndefined();
  });

  it('чужд или счупен запис не чупи стаята', () => {
    expect(unpackFinish(undefined)).toBeUndefined();
    expect(unpackFinish('tuhla')).toBeUndefined();
    expect(unpackFinish([42])).toBeUndefined();
    expect(unpackFinish(['от-бъдещето', 'tuhla-red-r'])).toEqual({
      all: 'boya-default',
      sides: { top: 'tuhla-red-r' },
    });
  });

  it('намира вътрешното лице на всяка стена и само него', () => {
    for (const side of WALL_SIDES) {
      const faces = boxFaces({ ...shellWall(room, side), key: side });
      const inner = faces
        .map((f) => innerWallPlane(f.corners, f.normal, room))
        .filter((p) => p !== null);
      expect(inner.map((p) => p!.side)).toEqual([side]);
    }
  });

  it('точка по стената се връща на самото лице', () => {
    const faces = boxFaces({ ...shellWall(room, 'right'), key: 'r' });
    const face = faces.find((f) => innerWallPlane(f.corners, f.normal, room))!;
    const plane = innerWallPlane(face.corners, face.normal, room)!;
    expect(planeArea(plane, face.corners)).toEqual({ u0: 0, u1: 3200, v0: 0, v1: 2600 });
    expect(planePoint(plane, 1000, 500)).toEqual({ x: 4200, y: 500, z: 1000 });
  });
});

describe('стените в линка към проекта', () => {
  it('проект с акцентна стена се отваря със същите стени', async () => {
    const { decodeProject, encodeProject } = await import('./share');
    const { emptyKitchen } = await import('./cabinet-rules');
    const kitchen = {
      ...emptyKitchen(3600),
      wallFinish: chooseFinish({ all: 'boya-greige' }, 'top', 'tuhla-red-r'),
    };
    expect(decodeProject(encodeProject(kitchen))?.wallFinish).toEqual({
      all: 'boya-greige',
      sides: { top: 'tuhla-red-r' },
    });
  });

  it('линкът на проект без избор е същият като преди', async () => {
    const { decodeProject, encodeProject } = await import('./share');
    const { emptyKitchen } = await import('./cabinet-rules');
    const plain = emptyKitchen(3600);
    const code = encodeProject(plain);
    expect(code).toBe(encodeProject({ ...plain, wallFinish: { all: 'boya-default' } }));
    expect(decodeProject(code)?.wallFinish).toBeUndefined();
  });
});
