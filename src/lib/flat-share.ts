/**
 * Жилището, побрано в един линк.
 *
 * Стаята отдавна пътува (`share.ts`); жилището — не. Затова клиентът
 * можеше да начертае апартамента си, да обзаведе шест стаи, да затвори
 * раздела и при нас да не е пристигнало нищо. Това е първото звено към
 * истински бекенд: каквото тръгне по линк, същото ще тръгне и в тяло
 * на заявка.
 *
 * Записът НЕ влага проектите в себе си. Те вече са base64 и ако влязат
 * в общия запис, се кодират втори път и порастват с една трета.
 * Затова формата е съставна:
 *
 *     <чертеж>~<проект 1>~<проект 2>~…
 *
 * Тилдата е безопасна за адрес и я няма в азбуката на base64url, тъй
 * че не може да се обърка със самите записи. Стая без проект оставя
 * празно между две тилди — така редът на стаите и редът на проектите
 * си отговарят без имена.
 *
 * Мярка (вж. `docs/PLAN.md`, Ж): една стая е 190–220 знака, пълно
 * жилище от 12 стаи ≈ 3000. Браузърите носят десетки хиляди, но
 * пощенските програми пречупват около 2000 — затова линкът е за
 * обичайното жилище и за споделяне на ръка, а „изпрати ни го" ще
 * минава през тяло на заявка.
 */

import {
  FLAT,
  FLAT_ROOM_LABEL,
  type Flat,
  type FlatRoom,
  type FlatRoomKind,
  clampFlatRoom,
} from './flat';

/** Версия на записа. Вдига се, ако подредбата по-долу някога се счупи. */
const VERSION = 1;

/*
 * Постоянен списък. Редът му е част от формата на линка — нов вид се
 * ДОБАВЯ НАКРАЯ, никога не се вмъква по средата, иначе старите линкове
 * започват да сочат към друга стая.
 */
const KINDS: readonly FlatRoomKind[] = [
  'kitchen',
  'bedroom',
  'living',
  'bath',
  'corridor',
  'hall',
  'other',
];

/** Разделителят между чертежа и проектите. Няма го в base64url. */
const SEP = '~';

/** Стая: вид, ъгъл, размер и — само ако е преименувана — името. */
type PackedRoom = [number, number, number, number, number, string?];

interface PackedFlat {
  v: number;
  r: PackedRoom[];
}

function toUrlSafe(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(code: string): string {
  const padded = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeFlat(flat: Flat): string {
  const rooms = flat.rooms.slice(0, FLAT.MAX_ROOMS);

  const packed: PackedFlat = {
    v: VERSION,
    r: rooms.map((room): PackedRoom => {
      const kind = Math.max(0, KINDS.indexOf(room.kind));
      const x = Math.round(room.x);
      const y = Math.round(room.y);
      const w = Math.round(room.width);
      const d = Math.round(room.depth);

      // Името се носи само ако човек го е сменил. В повечето жилища
      // стаите се казват „Кухня" и „Баня" и това не бива да се плаща.
      const name = room.name.trim();
      return name && name !== FLAT_ROOM_LABEL[room.kind]
        ? [kind, x, y, w, d, name]
        : [kind, x, y, w, d];
    }),
  };

  /*
   * Проектите вървят отделно и по реда на стаите. Тилда накрая няма:
   * жилище без нито един обзаведен е само чертеж.
   */
  const projects = rooms.map((room) => room.project ?? '');
  const tail = projects.some(Boolean) ? SEP + projects.join(SEP) : '';
  return toUrlSafe(JSON.stringify(packed)) + tail;
}

export function decodeFlat(code: string): Flat | null {
  try {
    const parts = code.split(SEP);
    const packed = JSON.parse(fromUrlSafe(parts[0])) as PackedFlat;
    if (packed?.v !== VERSION || !Array.isArray(packed.r)) return null;

    const rooms = packed.r.slice(0, FLAT.MAX_ROOMS).map((p, i): FlatRoom => {
      const kind = KINDS[p[0]] ?? 'other';
      const project = parts[i + 1];
      return clampFlatRoom({
        /*
         * Имената на стаите се раздават наново. Старите служат само
         * докато жилището е отворено и да пътуват значи да се носят
         * знаци за нищо.
         */
        id: `l${i + 1}`,
        kind,
        name: typeof p[5] === 'string' && p[5].trim() ? p[5].trim() : FLAT_ROOM_LABEL[kind],
        x: Number(p[1]) || 0,
        y: Number(p[2]) || 0,
        width: Number(p[3]) || FLAT.MIN_SIDE,
        depth: Number(p[4]) || FLAT.MIN_SIDE,
        ...(project ? { project } : {}),
      });
    });

    // Жилище без стаи не е жилище — по-добре нищо, отколкото празен
    // чертеж, който замества започнатия.
    return rooms.length ? { rooms } : null;
  } catch {
    return null;
  }
}
