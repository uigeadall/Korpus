'use client';

/**
 * Палитрата с модули — какво има за тази стая.
 *
 * Дотук модулите се добавяха с бутон и падаха най-отзад на реда, после
 * се влачеха до мястото си. Два хода за едно нещо. Тук се хваща модул
 * и се пуска право където трябва.
 *
 * Бутоните си остават бутони: влаченето не върши работа нито с
 * клавиатура, нито с пръст на тесен екран. Щракване добавя в края —
 * същото, което правеше старият бутон.
 */

import {
  MODULES,
  type ModuleKind,
  type RoomKind,
  type RowId,
  modulesFor,
} from '@/lib/cabinet-rules';

interface Props {
  room: RoomKind;
  /** Модулът, който в момента се влачи — за да личи кой е вдигнат. */
  dragging: ModuleKind | null;
  onGrab: (kind: ModuleKind, e: React.PointerEvent) => void;
  onAdd: (kind: ModuleKind) => void;
  /**
   * Къде се пуска. Палитрата стои и до чертежа, и до обема; да казва
   * „в чертежа", когато отсреща е стаята, е лъжа за едно натискане.
   */
  hint?: string;
  /** Накъде се пуска, за една дума в прочита на бутона: „в чертежа". */
  where?: string;
}

const ROW_TITLE: Record<RowId, string> = {
  base: 'Долу',
  upper: 'Горе',
};

/**
 * Малка картинка на модула: правоъгълник с толкова чела, колкото има.
 * По нея се познава шкаф с чекмеджета от шкаф с врата, без да се чете.
 */
function Thumb({ kind }: { kind: ModuleKind }) {
  const spec = MODULES[kind];
  const style = spec.facade?.style;
  const fronts = style === 'drawers' ? (spec.facade?.count ?? 3) : 1;
  const open = style === 'open' || !spec.hasCarcass;

  return (
    <svg viewBox="0 0 40 40" className="h-7 w-7 shrink-0" aria-hidden="true">
      <rect
        x={3}
        y={3}
        width={34}
        height={34}
        rx={2}
        fill={open ? 'none' : 'var(--surface)'}
        stroke="var(--muted)"
        strokeWidth={2}
        strokeDasharray={spec.hasCarcass ? undefined : '4 3'}
      />
      {!open &&
        Array.from({ length: fronts }, (_, i) => (
          <line
            key={i}
            x1={5}
            y1={3 + ((i + 1) * 34) / fronts}
            x2={35}
            y2={3 + ((i + 1) * 34) / fronts}
            stroke="var(--muted)"
            strokeWidth={1.5}
          />
        ))}
      {open && spec.hasCarcass &&
        [14, 22, 30].map((y) => (
          <line key={y} x1={5} y1={y} x2={35} y2={y} stroke="var(--muted)" strokeWidth={1.5} />
        ))}
    </svg>
  );
}

export function ModulePalette({
  room,
  dragging,
  onGrab,
  onAdd,
  hint = 'Завлечете модул в чертежа и го пуснете където трябва. Щракване го слага в края на реда.',
  where = 'в чертежа',
}: Props) {
  return (
    <section className="space-y-2 sm:space-y-3">
      {(['base', 'upper'] as RowId[]).map((row) => {
        const kinds = modulesFor(room, row);
        if (!kinds.length) return null;
        return (
          /*
           * Групата не е заглавие в структурата на страницата — тя е
           * етикет на списък. Като <h3> тя се вмъкваше преди всяко <h2>
           * наоколо и чупеше реда на заглавията.
           */
          <div key={row} role="group" aria-label={`Модули ${ROW_TITLE[row].toLowerCase()}`}>
            <p className="px-1 text-[11px] uppercase tracking-wide text-muted">
              {ROW_TITLE[row]}
            </p>
            {/*
              На тесен екран редът е хоризонтална лента под картината, а
              не стълб до нея. Стълбът там пада под сгъвката: модулът се
              хваща на едно място, а стаята е на друго и влаченето няма
              как да стигне. Лентата държи всички модули на един замах от
              обема.
            */}
            <ul className="mt-1.5 flex gap-1 overflow-x-auto pb-1 sm:block sm:space-y-1 sm:overflow-visible sm:pb-0">
              {kinds.map((kind) => (
                <li key={kind} className="shrink-0 sm:shrink">
                  <button
                    type="button"
                    onPointerDown={(e) => onGrab(kind, e)}
                    onClick={() => onAdd(kind)}
                    aria-label={`${MODULES[kind].label}. Завлечете го ${where} или натиснете, за да влезе в края на реда.`}
                    className={`flex w-full items-center gap-2 rounded-field px-2 py-1.5 text-left text-[13px] whitespace-nowrap transition-colors [touch-action:none] sm:whitespace-normal ${
                      dragging === kind
                        ? 'bg-accent/15 ring-1 ring-accent'
                        : 'bg-surface-sunken hover:bg-border/60'
                    }`}
                  >
                    <Thumb kind={kind} />
                    <span className="leading-tight">{MODULES[kind].label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="px-1 text-[11px] leading-relaxed text-muted">{hint}</p>
    </section>
  );
}
