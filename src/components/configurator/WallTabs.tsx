'use client';

/**
 * Превключване между стените на стаята. Не са табове в смисъла на
 * ARIA — всяка стена е превключвател, който казва коя се редактира и
 * се чертае отдолу.
 */

import { WALL_SIDE_LABEL, type Wall, type WallSide, freeSides, wallSide } from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';

interface Props {
  walls: Wall[];
  activeWallId?: string;
  onSelect: (wallId: string) => void;
  onAdd: (side: WallSide) => void;
  onRemove: (wallId: string) => void;
}

export function WallTabs({ walls, activeWallId, onSelect, onAdd, onRemove }: Props) {
  const free = freeSides(walls.map((w, i) => wallSide(w, i)));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Стени</span>

      {walls.map((wall, i) => {
        const side = wallSide(wall, i);
        const active = wall.id === activeWallId;
        const count = wall.base.length + wall.upper.length;
        return (
          <button
            key={wall.id ?? i}
            type="button"
            aria-pressed={active}
            onClick={() => wall.id && onSelect(wall.id)}
            className={`border px-3 py-1.5 text-xs transition-colors ${
 active
                ? 'border-accent text-accent'
                : 'border-border text-muted hover:bg-border'
            }`}
          >
            {WALL_SIDE_LABEL[side]} <span className="dim">{formatMm(wall.length)}</span>
            <span className="ml-1 text-[10px] text-muted">· {count}</span>
          </button>
        );
      })}

      {free.map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => onAdd(side)}
          className="border border-dashed border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-border"
        >
          + {WALL_SIDE_LABEL[side].toLowerCase()}
        </button>
      ))}

      {walls.length > 1 && activeWallId && (
        <button
          type="button"
          onClick={() => onRemove(activeWallId)}
          className="ml-auto px-2 py-1.5 text-xs text-muted underline underline-offset-2 hover:text-danger"
        >
          Премахни стената
        </button>
      )}
    </div>
  );
}
