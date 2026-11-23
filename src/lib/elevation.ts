/**
 * Стената с мебелта, гледана право отпред — за полагане върху снимка.
 *
 * Мерките са в милиметри по стената: `x` от началото ѝ, `y` нагоре от
 * пода. Правилата са същите като в обема — плот само в кухнята, цокъл
 * под всичко с корпус, лица и дръжки от `facadePanels` и `handleFor` —
 * затова снимката показва същата мебел, която е и в обема, и в цеха.
 */

import {
  DIM,
  MODULES,
  type OpeningType,
  type PlacedModule,
  type RoomKind,
  WORKTOP_THICKNESS,
  type WorktopType,
  moduleGeometry,
} from './cabinet-rules';
import { facadePanels, handleFor } from './facade';

export type ElevationRole = 'plinth' | 'carcass' | 'facade' | 'appliance' | 'worktop' | 'handle';

export interface ElevationRect {
  x: number;
  /** Долният ръб, над пода. */
  y: number;
  width: number;
  height: number;
  role: ElevationRole;
}

const isGap = (m: PlacedModule) => m.kind === 'lgap' || m.kind === 'ugap';

/** Редът на рисуване: отзад напред — цокъл, корпус, лица, плот, дръжки. */
export function elevation(
  rows: { base: PlacedModule[]; upper: PlacedModule[] },
  opts: { room: RoomKind; worktop: WorktopType; opening: OpeningType },
): ElevationRect[] {
  const out: ElevationRect[] = [];
  const all = [...rows.base, ...rows.upper].filter((m) => !isGap(m));

  // Цокълът — на непрекъснати участъци с еднаква височина.
  let run: ElevationRect | null = null;
  for (const m of rows.base) {
    if (!MODULES[m.kind].hasCarcass && m.kind !== 'dw') {
      run = null;
      continue;
    }
    const g = moduleGeometry(m.kind);
    if (g.y <= 0) {
      run = null;
      continue;
    }
    if (run && run.x + run.width === m.x && run.height === g.y) run.width += m.width;
    else {
      run = { x: m.x, y: 0, width: m.width, height: g.y, role: 'plinth' };
      out.push(run);
    }
  }

  for (const m of all) {
    const g = moduleGeometry(m.kind);
    out.push({ x: m.x, y: g.y, width: m.width, height: g.height, role: 'carcass' });
  }

  const handles: ElevationRect[] = [];
  for (const m of all) {
    if (MODULES[m.kind].facade?.style === 'open') continue;
    const g = moduleGeometry(m.kind);
    for (const panel of facadePanels(m)) {
      out.push({
        x: m.x + panel.dx,
        y: g.y + panel.dy,
        width: panel.width,
        height: panel.height,
        role: panel.kind === 'appliance' ? 'appliance' : 'facade',
      });
      if (opts.opening !== 'handles') continue;
      const h = handleFor(panel);
      if (h) handles.push({ x: m.x + h.dx, y: g.y + h.dy, width: h.width, height: h.height, role: 'handle' });
    }
  }

  // Плотът е кухненско понятие — същото правило като в обема.
  if (opts.room === 'kitchen') {
    let top: ElevationRect | null = null;
    for (const m of rows.base) {
      if (m.kind === 'column' || m.kind === 'lgap') {
        top = null;
        continue;
      }
      if (top && top.x + top.width === m.x) top.width += m.width;
      else {
        top = {
          x: m.x,
          y: DIM.LEG + DIM.BASE_H,
          width: m.width,
          height: WORKTOP_THICKNESS[opts.worktop],
          role: 'worktop',
        };
        out.push(top);
      }
    }
  }

  return [...out, ...handles];
}
