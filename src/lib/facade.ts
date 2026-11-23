/**
 * Как изглежда лицето на един модул — врати, чела, уреди и бленди.
 *
 * Един източник за двата изгледа. Чертежът ги рисува отпред в своите
 * координати, обемният изглед ги вдига като тела, залепени върху
 * корпуса. Ако това живееше на две места, кухнята щеше да изглежда по
 * един начин на чертежа и по друг в обема.
 *
 * Координатите са местни и в милиметри: `dx` от левия ръб на модула,
 * `dy` от долния му ръб.
 */

import { evenFronts } from './furniture/carcass';
import {
  DIM,
  type HingeSide,
  MODULES,
  type ModuleKind,
  doorLayout,
  moduleGeometry,
} from './cabinet-rules';

export type PanelKind = 'door' | 'drawer' | 'appliance' | 'filler';

export interface FacadePanel {
  dx: number;
  dy: number;
  width: number;
  height: number;
  kind: PanelKind;
  /** Страна на пантите; null за чела, уреди и бленди. */
  hinge: HingeSide | null;
}

export function facadePanels(m: {
  kind: ModuleKind;
  width: number;
  hingeSide?: HingeSide;
}): FacadePanel[] {
  const g = moduleGeometry(m.kind);
  const gap = DIM.GAP_EDGE;
  const between = DIM.GAP_BETWEEN;
  const innerWidth = m.width - 2 * gap;

  /** Врати, прилепени под горния ръб на модула. */
  const doors = (height: number, fromTop: number): FacadePanel[] => {
    const layout = doorLayout(m.width, m.hingeSide);
    const dy = g.height - fromTop - height;
    if (layout.count === 1) {
      return [{ dx: gap, dy, width: layout.width, height, kind: 'door', hinge: layout.sides[0] }];
    }
    return [
      { dx: gap, dy, width: layout.width, height, kind: 'door', hinge: 'left' },
      {
        dx: gap + layout.width + between,
        dy,
        width: layout.width,
        height,
        kind: 'door',
        hinge: 'right',
      },
    ];
  };

  const full = (kind: PanelKind): FacadePanel[] => [
    { dx: gap, dy: gap, width: innerWidth, height: g.height - 2 * gap, kind, hinge: null },
  ];

  /** Лица едно над друго, отгоре надолу, с дадени височини. */
  const stack = (heights: readonly number[], kind: PanelKind): FacadePanel[] => {
    const layout = doorLayout(m.width, m.hingeSide);
    const out: FacadePanel[] = [];
    let fromTop = gap;
    for (const height of heights) {
      out.push({
        dx: gap,
        dy: g.height - fromTop - height,
        width: kind === 'door' ? layout.width : innerWidth,
        height,
        kind,
        hinge: kind === 'door' ? layout.sides[0] : null,
      });
      fromTop += height + between;
    }
    return out;
  };

  const spec = MODULES[m.kind].facade;
  if (!spec) return [];

  switch (spec.style) {
    case 'doors':
      return doors(g.height - 2 * gap, gap);

    case 'panel':
      return full(spec.appliance ? 'appliance' : 'door');

    case 'appliance': {
      // Уредът е отгоре, блендата — отдолу.
      const applianceH = g.height - 2 * gap - spec.fillerBelow - between;
      return [
        {
          dx: gap,
          dy: g.height - gap - applianceH,
          width: innerWidth,
          height: applianceH,
          kind: 'appliance',
          hinge: null,
        },
        {
          dx: gap,
          dy: gap,
          width: innerWidth,
          height: spec.fillerBelow,
          kind: 'filler',
          hinge: null,
        },
      ];
    }

    case 'drawers': {
      /*
       * Кухнята дава изрични височини — те са контролни стойности от
       * спецификацията. Другите системи още нямат такива от мебелиста и
       * дотогава челата се делят поравно.
       */
      const heights =
        spec.fronts ??
        evenFronts(g.height - 2 * gap, spec.count ?? 3, between);
      return stack(heights, 'drawer');
    }

    case 'split':
      return stack(spec.heights, 'door');

    case 'open':
      return [];
  }
}

/**
 * Дръжката на едно лице: малка хоризонтална или вертикална пръчка.
 * Вратите я носят до отварящия се ръб, чекмеджетата — по средата.
 * Връща null, когато лицето няма дръжка (уред, бленда).
 */
export interface Handle {
  dx: number;
  dy: number;
  width: number;
  height: number;
}

const HANDLE_T = 22;
const HANDLE_L = 128;
/** Отстояние на дръжката от ръба на лицето. */
const HANDLE_INSET = 38;

export function handleFor(panel: FacadePanel): Handle | null {
  if (panel.kind === 'drawer') {
    // Ширината се свива при тясно чело, затова центърът се смята от нея,
    // не от пълната дължина — иначе дръжката изпълзява настрани.
    const width = Math.min(HANDLE_L, Math.max(60, panel.width - 2 * HANDLE_INSET));
    return {
      dx: panel.dx + (panel.width - width) / 2,
      dy: panel.dy + panel.height / 2 - HANDLE_T / 2,
      width,
      height: HANDLE_T,
    };
  }
  if (panel.kind !== 'door' || !panel.hinge) return null;

  // Дръжката стои срещу пантите и към горния ръб при долните шкафове.
  const atLeftEdge = panel.hinge === 'right';
  const length = Math.min(HANDLE_L, Math.max(60, panel.height - 2 * HANDLE_INSET));
  return {
    dx: atLeftEdge ? panel.dx + HANDLE_INSET : panel.dx + panel.width - HANDLE_INSET - HANDLE_T,
    dy: panel.dy + panel.height - HANDLE_INSET - length,
    width: HANDLE_T,
    height: length,
  };
}
