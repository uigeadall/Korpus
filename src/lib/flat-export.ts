/**
 * Едно жилище — един списък за цеха.
 *
 * Досега шест обзаведени стаи даваха шест PDF-а и шест XLSX-а. Цехът
 * получаваше шест пратки за една поръчка, подреждаше ги на ръка и
 * сам смяташе колко плочи да извади. Това е Б2 в `docs/PLAN.md`.
 *
 * Тук не се пресмята нищо наново. Детайлите на всяка стая излизат от
 * `computeKitchen` както винаги; сборът минава през СЪЩИТЕ функции
 * (`mergeParts`, `materialUsage`, `edgeUsage`, `facadeArea`), само че
 * върху всички детайли наведнъж. Правило №6: разкроят се смята на едно
 * място и това място не е тук.
 *
 * Две неща обаче са същински нови и те са причината файлът да
 * съществува:
 *
 * 1. **Номерата се сблъскват.** Кодовете започват отначало във всяка
 *    стая, затова „Д1" от кухнята и „Д1" от банята са две различни
 *    врати с едно име. В обединения списък това е сбъркан детайл, не
 *    неудобство. Затова шкафовете получават позиция през цялото
 *    жилище — `П1`, `П2`, … — а детайлите им `П7-03`. Кодът в стаята
 *    се пази в своя колона, за да може човек да го намери на екрана.
 *
 * 2. **Общият разкрой излиза по-малко плочи.** Шест стаи, всяка с
 *    недорязана плоча, хабят до шест парчета; наведнъж — едно. Числото
 *    е сметка, не обещание, и затова се връща и колкото биха били
 *    поотделно: разликата е това, което клиентът печели, а цехът не
 *    бива да я чува като реклама.
 */

import {
  type CabinetResult,
  type HardwareLine,
  type Kitchen,
  type KitchenResult,
  type Part,
  type Summary,
  SHEET,
  computeKitchen,
  edgeLabel,
} from './cabinet-rules';
import {
  type EdgeUsage,
  type MaterialUsage,
  type MergedPart,
  edgeUsage,
  facadeArea,
  materialUsage,
  mergeParts,
  round2,
} from './furniture/parts';
import { type Flat, type FlatRoom, roomName } from './flat';
import { decodeFlat } from './flat-share';
import { decodeProject } from './share';

/** Знакът пред позицията. „П" като позиция — така го наричат в цеха. */
const POS = 'П';

/** Шкаф, видян от цялото жилище. */
export interface FlatCabinet {
  /** Позицията в цялото жилище: `П1`, `П2`, … Уникална. */
  pos: string;
  /** Кодът вътре в стаята: `Д2`. Уникален само за своята стая. */
  code: string;
  /** Как клиентът нарича стаята. */
  room: string;
  roomId: string;
  label: string;
  width: number;
  /** Детайлите му, преномерирани с позицията. */
  parts: Part[];
  /** Непипнатият резултат — за колоните, които искат вид и стена. */
  source: CabinetResult;
}

/** Една обзаведена стая, разгъната. */
export interface FlatRoomBreakdown {
  room: FlatRoom;
  kitchen: Kitchen;
  result: KitchenResult;
  cabinets: FlatCabinet[];
}

export interface FlatSummary {
  rooms: number;
  cabinets: number;
  parts: number;
  partPieces: number;
  /** Разкроят на цялото жилище наведнъж. */
  materials: MaterialUsage[];
  /** Колко плочи биха излезли, ако всяка стая се реже отделно. */
  sheetsIfSeparate: number;
  edges: EdgeUsage[];
  paintAreaM2: number;
  /** Сборът по стаи. Плот има само в кухня и баня. */
  worktopLength: number;
  plinthLength: number;
}

export interface FlatBreakdown {
  rooms: FlatRoomBreakdown[];
  /**
   * Стаи с проект, който не се разчете.
   *
   * Не се премълчава: линк от стара версия или орязан при копиране
   * ще липсва от списъка и цехът няма как да разбере, че му е дадена
   * непълна поръчка. Тази бележка отива на хартията.
   */
  broken: FlatRoom[];
  /** Всички детайли на жилището, с позиции през цялото жилище. */
  parts: Part[];
  /** Обединените еднакви детайли — за разкроя. */
  byMaterial: MergedPart[];
  /** Обковът, събран по вид. */
  hardware: HardwareLine[];
  summary: FlatSummary;
}

/**
 * Преномерира детайлите на един шкаф с позицията му в жилището.
 *
 * `Д2-03` става `П7-03`: същата последователност вътре в шкафа, но
 * име, което не се повтаря в друга стая. `cabinet` също сочи
 * позицията — така обединените редове в разкроя изреждат номера,
 * които наистина съществуват само веднъж.
 */
function renumber(parts: Part[], pos: string): Part[] {
  return parts.map((p) => ({
    ...p,
    no: `${pos}-${p.no.split('-').at(-1) ?? '01'}`,
    cabinet: pos,
  }));
}

/**
 * Разгъва жилището: всяка стая с проект се пресмята веднъж.
 *
 * Редът е редът на стаите в чертежа — той е и редът на позициите, и
 * редът на листовете. Стая без проект не влиза; стая с нечетим проект
 * влиза в `broken`.
 */
export function flatBreakdown(flat: Flat): FlatBreakdown {
  const rooms: FlatRoomBreakdown[] = [];
  const broken: FlatRoom[] = [];
  const parts: Part[] = [];
  let pos = 0;
  let sheetsIfSeparate = 0;

  for (const room of flat.rooms) {
    if (!room.project) continue;

    const kitchen = decodeProject(room.project);
    if (!kitchen) {
      broken.push(room);
      continue;
    }

    const result = computeKitchen(kitchen);
    // Празна стая: отворена е, но в нея няма нито един шкаф. Не е
    // счупена и не е готова — просто няма какво да се реже.
    if (!result.cabinets.length) continue;

    const cabinets = result.cabinets.map((c) => {
      const code = `${POS}${++pos}`;
      return {
        pos: code,
        code: c.code,
        room: roomName(room),
        roomId: room.id,
        label: c.label,
        width: c.width,
        parts: renumber(c.parts, code),
        source: c,
      };
    });

    for (const c of cabinets) parts.push(...c.parts);
    sheetsIfSeparate += result.summary.materials.reduce((s, m) => s + m.sheets, 0);

    rooms.push({ room, kitchen, result, cabinets });
  }

  return {
    rooms,
    broken,
    parts,
    byMaterial: mergeParts(parts),
    hardware: mergeHardware(rooms.map((r) => r.result.hardware)),
    summary: {
      rooms: rooms.length,
      cabinets: rooms.reduce((s, r) => s + r.cabinets.length, 0),
      parts: parts.length,
      partPieces: parts.reduce((s, p) => s + p.qty, 0),
      materials: materialUsage(parts, SHEET),
      sheetsIfSeparate,
      edges: edgeUsage(parts, edgeLabel),
      paintAreaM2: round2(facadeArea(parts)),
      worktopLength: sumLine(rooms, 'worktopLength'),
      plinthLength: sumLine(rooms, 'plinthLength'),
    },
  };
}

function sumLine(rooms: FlatRoomBreakdown[], key: keyof Summary & ('worktopLength' | 'plinthLength')) {
  return rooms.reduce((s, r) => s + r.result.summary[key], 0);
}

/* ------------------------------------------------------------------ */
/* Какво приема вратата                                                */
/* ------------------------------------------------------------------ */

/** Най-дългият запис на жилище, който приемаме. Същият таван като при
 *  запитването: двата пътя носят едно и също нещо. */
export const FLAT_CODE_MAX = 8000;

export type FlatRequest =
  | { ok: true; flat: Flat }
  | { ok: false; said: string };

/**
 * Разчита тялото на заявка за списък.
 *
 * Дължината се гледа ПРЕДИ разкодирането: иначе таванът пази паметта
 * едва след като е похабена.
 */
export function parseFlatBody(body: unknown): FlatRequest {
  const code = (body as { flat?: unknown })?.flat;
  if (typeof code !== 'string' || !code) return { ok: false, said: 'Липсва жилище.' };
  if (code.length > FLAT_CODE_MAX) return { ok: false, said: 'Жилището е прекалено голямо.' };

  const flat = decodeFlat(code);
  if (!flat) return { ok: false, said: 'Записът на жилището не се отваря.' };
  if (!flat.rooms.some((r) => r.project)) {
    return { ok: false, said: 'Няма нито една обзаведена стая.' };
  }
  return { ok: true, flat };
}

/**
 * Събира обкова на няколко стаи в една заявка към доставчика.
 *
 * Сборът е по име, мярка **и бележка**. Бележката носи избора на
 * стаята — кое чекмедже, кой плот — затова две стаи с различни
 * механизми остават два реда. Слеят ли се, заявката става за сто
 * еднакви механизма, каквито поръчката не иска.
 */
export function mergeHardware(lists: HardwareLine[][]): HardwareLine[] {
  const map = new Map<string, HardwareLine>();
  for (const list of lists) {
    for (const line of list) {
      const key = `${line.name}|${line.unit}|${line.note ?? ''}`;
      const found = map.get(key);
      if (found) found.qty += line.qty;
      else map.set(key, { ...line });
    }
  }
  return [...map.values()].filter((l) => l.qty > 0);
}
