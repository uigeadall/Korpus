'use client';

/**
 * Воденият поток — входната врата за клиента.
 *
 * Конфигураторът е техническият проект: милиметри, кодове на шкафове,
 * разкрой. Това е стъпката преди него. Тук се питат само неща, на които
 * всеки може да отговори, правилата подреждат мебелта сами, а клиентът
 * вижда обема си, докато отговаря.
 *
 * Трите стаи минават по един и същ път. Различават се само въпросите и
 * правилата, по които се нареждат модулите — виж `rooms.ts` и
 * `lib/autolayout.ts`.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAdres, useEzik, useT } from '@/i18n/client';
import { MERKI, metri } from '@/i18n/chisla';
import { kod, prevedi } from '@/i18n/rechnik';
import { izbroi } from '@/i18n/tekst';
import { PROEKT } from '@/i18n/tekstove/proekt';
import { useFitToViewport } from '@/components/useFitToViewport';
import { ScrollMore } from '@/components/ScrollMore';
import {
  DOOR,
  MODULES,
  type ModuleKind,
  ROOM_KIND_LABEL,
  RULES_VERSION,
  type RoomDoor,
  type RoomKind,
  WALL_SIDES,
  WINDOW,
  type RoomWindow,
  clampWindow,
  defaultWindow,
  kitchenWindows,
  type WallSide,
  clampDoor,
  clampRoom,
  clampWallLength,
  computeKitchen,
  kitchenPlan,
  kitchenDoor,
  kitchenRoom,
  isGapKind,
  moduleGeometry,
  rulesAreCurrent,
} from '@/lib/cabinet-rules';
import { ROOM, ceilingOf } from '@/lib/furniture/room';
import { DOOR_HINGE_LABEL, doorClashes } from '@/lib/openings';
import { NEEDS_KEY, layoutFor } from '@/lib/autolayout';
import { CARCASS_COLORS, FACADE_COLORS, WORKTOPS } from '@/config/materials';
import { chooseFinish } from '@/lib/wall-finish';
import { WallFinishPanel } from '@/components/configurator/WallFinishPanel';
import { FloorFinishPanel } from '@/components/configurator/FloorFinishPanel';
import { type Action, NO_ROOM, blockedByWall, reducer } from '@/components/configurator/state';
import { useFlash } from '@/components/useFlash';
import { rotateInside } from '@/lib/fit';
import { ActionBar } from '@/components/configurator/ActionBar';
import { ModulePalette } from '@/components/configurator/ModulePalette';
import { Timeline } from '@/components/configurator/Timeline';
import { Scene3D } from '@/components/configurator/Scene3D';
import { FURNISHINGS, furnishingsFor } from '@/lib/furnishings';
import { decodeProject, encodeProject } from '@/lib/share';
import { MiniPlan } from './MiniPlan';
import { PriceEstimate } from './PriceEstimate';
import { ErgonomicsNotes } from '@/components/ErgonomicsNotes';
import { ergonomics } from '@/lib/ergonomics';
import { PhotoOverlay } from './PhotoOverlay';
import { ScenePreview } from './ScenePreview';
import { TEMPLATES, type Template, templateKitchen, templatePatch } from './templates';
import { SendProject } from './SendProject';
import { Skica } from './Skica';
import {
  type Answers,
  ANSWERS_KEY,
  START,
  extraOf,
  fromKitchen,
  guardedAnswers,
  withAllSides,
  furnitureFrom,
  place,
} from './answers';
import {
  BATH_SWITCHES,
  BEDROOM_CHOICES,
  BEDROOM_SWITCHES,
  HALL_SWITCHES,
  KITCHEN_CHOICES,
  KITCHEN_SWITCHES,
  LIVING_CHOICES,
  LIVING_SWITCHES,
  ROOM_COPY,
  compositionOf,
} from './rooms';




/** Петте стъпки; имената им са в `PROEKT.stapki`. */
const STEPS = [0, 1, 2, 3, 4] as const;

const ROOM_CARDS: { id: RoomKind }[] = [
  { id: 'kitchen' },
  { id: 'bedroom' },
  { id: 'living' },
  { id: 'bath' },
  { id: 'corridor' },
  { id: 'hall' },
];





export function ProjectWizard() {
  const router = useRouter();
  const ezik = useEzik();
  const t = useT(PROEKT);
  const kam = useAdres();
  const metres = (mm: number) => metri(mm, ezik);
  const M = MERKI[ezik];
  /*
   * И стъпката е редуктор: споделеният линк скача направо на края, а
   * това става в ефект, където setState върти излишен цикъл рендери.
   */
  const [step, goTo] = useReducer(
    (current: number, to: number | 'next' | 'back') =>
      to === 'next'
        ? Math.min(STEPS.length - 1, current + 1)
        : to === 'back'
          ? Math.max(0, current - 1)
          : Math.max(0, Math.min(STEPS.length - 1, to)),
    0,
  );
  // Редуктор, а не `useState`: връщането от браузъра става в ефект, а
  // setState там върти излишен цикъл рендери.
  // Пази мебелта в стаята — виж `guardedAnswers`.
  const [a, set] = useReducer(guardedAnswers, START);

  /*
   * Ако сме дошли от чертежа на жилището, помним коя стая обзавеждаме.
   * Накрая проектът се връща там и стаята се отбелязва за готова.
   * Редуктор, а не `useState`: задава се в ефект при отваряне.
   */
  const [fromFlat, cameFromRoom] = useReducer(
    (_current: string | null, id: string) => id,
    null as string | null,
  );
  const copy = ROOM_COPY[ezik][a.room];

  /*
   * Стената и стаята се държат една друга. Шест метра мебел в двуметрова
   * стая е невъзможно; ако го допуснем, тя минава през зида, а
   * плъзгачите показват числа, които не са верни.
   */
  const setWall = (wallLength: number) =>
    set((p) => ({ wallLength, roomWidth: Math.max(p.roomWidth, wallLength) }));
  const setRoomWidth = (roomWidth: number) =>
    set((p) => ({ roomWidth, wallLength: Math.min(p.wallLength, roomWidth) }));

  /*
   * Проектът преживява презареждане, а споделеният линк има превес над
   * запазеното: щом някой отвори чужд проект, иска да види него, не
   * своя отпреди.
   */
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('p');
      const shared = code ? decodeProject(code) : null;
      if (shared) {
        set(fromKitchen(shared));
        goTo(STEPS.length - 1);
        return;
      }
      /*
       * Идване от чертежа на жилището: стаята и мерките ѝ са известни,
       * затова се прескача въпросът „коя стая" и се започва от това
       * какво да има вътре.
       */
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('stayaId');
      if (roomId) cameFromRoom(roomId);

      const from = params.get('staya');
      if (from && (ROOM_CARDS.some((c) => c.id === from) as boolean)) {
        const number = (key: string, fallback: number) => {
          const value = Number(params.get(key));
          return Number.isFinite(value) && value > 0 ? value : fallback;
        };
        const roomWidth = clampRoom(number('shirina', START.roomWidth));
        const roomDepth = clampRoom(number('dalbochina', START.roomDepth));
        set({
          room: from as RoomKind,
          roomWidth,
          roomDepth,
          /*
           * Стената тук винаги е горната, затова дължината ѝ е
           * ширината на стаята. Вземеше ли се дългата страна, в
           * дълбока стая стената ставаше по-дълга от страната си и
           * правилата надуваха стаята, за да я поберат.
           */
          wallLength: clampWallLength(roomWidth),
          /*
           * Стаята от чертежа се отваря празна и това се казва изрично.
           * Чертежът знае дали е обзаведена: ако е, идва с `p=` и
           * минава по другия път. Без това тук щеше да излезе мебелта,
           * останала от предишна стая от същия вид.
           */
          byHand: true,
          hand: { base: [], upper: [] },
          shelves: {},
          furnishings: [],
          door: undefined,
          windows: undefined,
        });
        goTo(2);
        return;
      }

      const raw = localStorage.getItem(ANSWERS_KEY);
      if (raw) set(JSON.parse(raw) as Answers);
    } catch {
      // частен режим или счупен запис — тръгваме от началото
    }
  }, []);

  useEffect(() => {
    if (a === START) return;
    try {
      localStorage.setItem(ANSWERS_KEY, JSON.stringify(a));
    } catch {
      // няма къде да се пази; потокът пак работи
    }
  }, [a]);

  const furniture = useMemo(() => withAllSides(a.opened ?? furnitureFrom(a)), [a]);

  /**
   * По коя стена се нарежда — палитрата, влаченето в обема и лентата
   * работят с нея. С мебел по две или три стени стаята става Г- или
   * П-образна; ъглите между тях решават правилата.
   */
  const [wallSel, setWallSel] = useState<WallSide>('top');
  const selIndex = Math.max(0, furniture.walls.findIndex((w) => w.side === wallSel));
  const selWall = furniture.walls[selIndex];

  /** Готовите стаи — картинките им се смятат веднъж. */
  const templates = useMemo(
    () => TEMPLATES.map((t) => ({ t, kitchen: templateKitchen(t) })),
    [],
  );

  /**
   * Шаблонът се слага като отговори и потокът отива на „Как да
   * изглежда" — там се сменят цветовете, а назад са размерите. Друга
   * стая не се пипа: тя се прибира и чака. Само същата стая с мебел в
   * нея би се загубила — затова тогава се пита.
   */
  const applyTemplate = (tpl: Template) => {
    const busy = furniture.walls[0].base.length + furniture.walls[0].upper.length > 0;
    if (tpl.room === a.room && busy && !window.confirm(t.zamyana(tpl.name[ezik]))) {
      return;
    }
    /*
     * Дошли от жилището, стаята вече има мерки — тези от чертежа или
     * сменените на втората стъпка. Шаблонът не ги пипа.
     */
    set(templatePatch(tpl, fromFlat ? { width: a.roomWidth, depth: a.roomDepth } : undefined));
    goTo(3);
  };

  /**
   * Пипане по лентата.
   *
   * Минава през същия редуктор, с който работи конфигураторът —
   * един набор правила за местене, ширини и триене, вместо втори тук.
   * Резултатът става „донесен проект": оттук нататък въпросите не го
   * пренареждат, докато човек не пипне някой от тях.
   */
  const [notice, flashBg] = useFlash();
  const flash = (text: string) => flashBg(prevedi(text, ezik));
  const edit = (action: Action) => {
    if (blockedByWall(furniture, action)) {
      flash(NO_ROOM);
      return;
    }
    const next = reducer(furniture, action);
    if (!a.byHand) {
      set({ opened: next });
      return;
    }
    /*
     * В ръчен режим се пазят самите модули, не готовата конфигурация.
     * Така промяна по размерите минава през `furnitureFrom` и нареденото
     * оцелява; `opened` щеше да отпадне при първия пипнат въпрос.
     */
    const wall = next.walls[0];
    set({ hand: { base: wall.base, upper: wall.upper }, extra: extraOf(next.walls) });
  };
  const result = useMemo(() => computeKitchen(furniture), [furniture]);
  /** Какво ще пречи в стаята — вратата удря, хладилникът не се отваря… */
  const notes = useMemo(() => ergonomics(furniture, result, ezik), [furniture, result, ezik]);
  const layout = useMemo(
    () => layoutFor(a.room, a.wallLength, a.needs),
    [a.room, a.wallLength, a.needs],
  );
  const room = kitchenRoom(furniture);
  const door = kitchenDoor(furniture);
  const windows = kitchenWindows(furniture);

  /*
   * Кой отвор е „на ход": планът мести него. Изчезне ли прозорецът,
   * ходът се връща на вратата, за да не се мести нищо невидимо.
   */
  const [editing, setEditing] = useState<'door' | string>('door');
  /** Стената, за която се избира покритие — обемът се обръща към нея. */
  const [wallTarget, setWallTarget] = useState<WallSide | null>(null);

  /*
   * Дясната колона се плъзга сама. Нова стъпка се отваря отгоре — иначе
   * „Напред", натиснат най-долу, показва дъното на следващата стъпка.
   */
  const asideRef = useFitToViewport<HTMLElement>(72, 16, 'exact');
  const workRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    asideRef.current?.scrollTo({ top: 0 });
    /*
     * На широк екран новата стъпка поставя работната площ под менюто:
     * обемът и въпросите са изцяло на екрана, двете колони свършват на
     * една линия. Първата стъпка оставя заглавието да се вижда.
     */
    const work = workRef.current;
    if (step === 0 || !work || !window.matchMedia('(min-width: 64rem)').matches) return;
    const top = work.getBoundingClientRect().top + window.scrollY - 72;
    if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: 'smooth' });
  }, [step, asideRef]);

  /** Кои модули са маркирани в лентата. */
  const [picked, setPicked] = useState<string[]>([]);

  /** Модулът, вдигнат от палитрата и още невпуснат в стаята. */
  const [dragKind, setDragKind] = useState<ModuleKind | null>(null);
  const onTheMove = editing !== 'door' && !windows.some((w) => w.id === editing) ? 'door' : editing;

  /*
   * Мебел, която стои на пътя на вратата. Не се мести сама — казва се,
   * защото изборът е на човека: или мебелта другаде, или вратата.
   */
  const doorBlocked = useMemo(
    () =>
      doorClashes(
        room,
        door,
        kitchenPlan(furniture, result).flatMap((wall) =>
          [...wall.modules.base, ...wall.modules.upper].map((m) => ({
            rect: m.rect,
            code: m.module.code,
          })),
        ),
      ).filter((m) => m.code),
    [room, door, furniture, result],
  );

  // Шкафовете, не нишите — те са място, не мебел.
  const cabinets = furniture.walls.reduce(
    (n, w) => n + [...w.base, ...w.upper].filter((m) => !isGapKind(m.kind)).length,
    0,
  );
  /** Най-високата точка на мебелта — колко остава до тавана. */
  const furnitureTop = Math.max(
    0,
    ...furniture.walls.flatMap((w) =>
      [...w.base, ...w.upper].map((m) => {
        const g = moduleGeometry(m.kind);
        return g.y + g.height;
      }),
    ),
  );
  const worktopRun = furniture.walls[0].base
    .filter((m) => m.kind !== 'column')
    .reduce((sum, m) => sum + m.width, 0);

  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {copy.lead} {t.neOferta}
        </p>
      </header>

      <ol className="mb-8 flex flex-wrap gap-x-1 gap-y-2 text-[13px]">
        {t.stapki.map((label, i) => (
          <li key={i}>
            {/* Минатите стъпки се отварят с щракване — връщането назад не
                бива да иска четири натискания на „Назад". */}
            <button
              type="button"
              onClick={() => goTo(i)}
              disabled={i > step}
              aria-current={i === step ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-pill px-3 py-1.5 transition-colors disabled:cursor-default ${
 i === step ? 'bg-surface-sunken' : 'enabled:hover:bg-surface-sunken'
              }`}
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
 i === step
                    ? 'bg-accent text-accent-contrast'
                    : i < step
                      ? 'bg-accent/15 text-accent'
                      : 'bg-surface-sunken text-muted'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span className={i === step ? 'font-medium text-foreground' : 'text-muted'}>
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* Поне колкото екрана: така дясната колона, която се нагласява към
          видимото при скрол, расте вътре в тази рамка и не мени
          височината на страницата — иначе всичко подскача в края ѝ. */}
      <div
        ref={workRef}
        className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:min-h-[calc(100dvh-5.5rem)] lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        {/* Скролира се сама, щом надрасне прозореца — иначе закованата
            колона крие долния си край (виж и конфигуратора). Отгоре
            стои на височината на менюто, а не под него. */}
        {/* Двете колони са еднакво високи и свършват на една линия. Картата
            с обема се разпъва до дъното, вместо под нея да остава бяло. */}
        {/* Постоянна височина: картината не бива да „диша", докато
            страницата се превърта. */}
        <div
          data-kolona="lyava"
          className="space-y-3 lg:flex lg:h-[calc(100dvh-5.5rem)] lg:flex-col lg:overflow-y-auto"
        >
          {/*
            Модулите стоят до самата картина, а не в чужда колона: мястото
            им е там, където се пускат. Вляво обемът, вдясно каталогът —
            на тесен екран падат един под друг.
          */}
          <div className="card relative grid grid-cols-[minmax(0,1fr)] overflow-hidden bg-gradient-to-b from-surface to-surface-sunken sm:grid-cols-[minmax(0,1fr)_186px] lg:min-h-[300px] lg:flex-1">
            {/* Върху картината, не под нея — иначе съобщението свива
                картата и стаята подскача. */}
            {notice && (
              <p
                role="status"
                className="pointer-events-none absolute top-14 left-3 z-10 max-w-[min(26rem,60%)] rounded-field bg-surface/95 px-3 py-2 text-xs leading-relaxed text-danger shadow-sm ring-1 ring-border"
              >
                {notice}
              </p>
            )}
            <Scene3D
              fill
              className="aspect-[7/4] sm:aspect-auto"
              kitchen={furniture}
              room={room}
              placed={result.placed}
              worktop={furniture.materials.worktop}
              // Изгледът гледа натам, където човекът в момента мести отвор
              // или избира покритие.
              focusSide={
                step === 3 && wallTarget
                  ? wallTarget
                  : wallSel !== 'top'
                    ? wallSel
                    : (windows.find((w) => w.id === onTheMove)?.side ?? door.side)
              }
              dropKind={dragKind}
              dropWallIndex={selIndex}
              onDropModule={(kind, row, index) => {
                edit({ type: 'add', wallId: selWall.id!, row, kind, atIndex: index });
                setDragKind(null);
              }}
              onDropCancel={() => setDragKind(null)}
              onMoveModule={(id, toIndex) => edit({ type: 'reorder', id, toIndex })}
              onSlideModule={(id, left) => edit({ type: 'slide', id, left })}
              /* Камерата е на стаята: връщането в нея дава същия кадър,
                 а изнесената картинка тръгва оттам. */
              view={a.view}
              onView={(view) => set({ view })}
              onRemoveModule={(id) => edit({ type: 'remove', id })}
              onShelves={(id, value) =>
                set((p) => ({ shelves: { ...p.shelves, [id]: value } }))
              }
              onMoveFurnishing={(id, x, z) =>
                set((p) => ({
                  furnishings: p.furnishings.map((f) => (f.id === id ? { ...f, x, z } : f)),
                }))
              }
              onRotateFurnishing={(id) =>
                set((p) => ({
                  // Завъртяно до стената, изделието се придърпва навътре.
                  furnishings: p.furnishings.map((f) =>
                    f.id === id ? rotateInside(f, { width: p.roomWidth, depth: p.roomDepth }) : f,
                  ),
                }))
              }
              onRemoveFurnishing={(id) =>
                set((p) => ({ furnishings: p.furnishings.filter((f) => f.id !== id) }))
              }
            />

            {/*
              `min-w-0` не е украса: без него клетката на мрежата се
              мери по най-широкото си съдържание и лентата с модулите
              разпъва цялата страница настрани. На телефон това махаше
              `width=device-width` и сайтът се отваряше смален.
            */}
            <div className="min-w-0 border-t border-border bg-surface p-2.5 sm:max-h-none sm:min-h-0 sm:overflow-y-auto sm:border-t-0 sm:border-l">
              <div className="mb-2.5">
                <p className="mb-1 text-[11px] tracking-wide text-muted uppercase">{t.stena}</p>
                <div className="grid grid-cols-2 gap-1" role="group" aria-label={t.stenaZaMebelta}>
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                    const count = (() => {
                      const w = furniture.walls.find((x) => x.side === side);
                      return w ? [...w.base, ...w.upper].filter((m) => !isGapKind(m.kind)).length : 0;
                    })();
                    return (
                      <button
                        key={side}
                        type="button"
                        aria-pressed={wallSel === side}
                        onClick={() => setWallSel(side)}
                        className={`rounded-field px-2 py-1 text-[12px] transition-colors ${
                          wallSel === side
                            ? 'bg-accent text-accent-contrast'
                            : 'bg-surface-sunken text-muted hover:bg-border/60'
                        }`}
                      >
                        {t.stenaButon[side]}
                        {/* С истински интервал — иначе четецът чете „Вляво·6" слято. */}
                        {count > 0 && <span className="tabular-nums">{` · ${count}`}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <ModulePalette
                room={a.room}
                dragging={dragKind}
                onGrab={(kind) => setDragKind(kind)}
                onAdd={(kind) =>
                  edit({ type: 'add', wallId: selWall.id!, row: MODULES[kind].row, kind })
                }
                hint={t.paletaHint}
                where={t.paletaKade}
              />
            </div>
          </div>

          {/*
            Лентата стои под картината, в широката колона: клиповете
            искат място. В тясната колона единайсет модула излизат по
            трийсет пиксела и не се хващат.

            Показва се чак накрая — дотогава мебелта още се мени от
            въпросите и няма смисъл да се пипа на ръка.
          */}
          {step === STEPS.length - 1 && (
            <>
              <Timeline
                roomKind={a.room}
                side={wallSel}
                wallLength={selWall.length}
                placed={result.placed[selIndex]}
                selected={picked}
                onSelect={setPicked}
                onReorder={(id, toIndex) => edit({ type: 'reorder', id, toIndex })}
                onWidth={(ids, value) => edit({ type: 'widthMany', ids, value })}
              />

              {a.opened && (
                <p className="px-1 text-[12px] leading-relaxed text-muted">{t.podrezhdaneVashe}</p>
              )}

              <ActionBar
                count={picked.length}
                onDuplicate={() => edit({ type: 'duplicateMany', ids: picked })}
                onWidth={(dir) => {
                  for (const id of picked) edit({ type: 'nudgeWidth', id, dir });
                }}
                onRemove={() => {
                  edit({ type: 'removeMany', ids: picked });
                  setPicked([]);
                }}
                done={null}
              />
            </>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted">
            <span>
              <span className="dim tabular-nums">{cabinets}</span> {t.moduli(cabinets)}
            </span>
            <span>
              {t.stenaMalko}{' '}
              <span className="dim tabular-nums">
                {metres(a.wallLength)} {M.m}
              </span>
            </span>
            {a.room === 'kitchen' && (
              <span>
                {t.plotMalko}{' '}
                <span className="dim tabular-nums">
                  {metres(worktopRun)} {M.m}
                </span>
              </span>
            )}
            <PriceEstimate kitchen={furniture} result={result} compact />
            <span className="ml-auto">{t.podskazkaObem}</span>
          </div>

          {/* Предупрежденията стоят до картината, не вътре в някоя стъпка:
              аспираторът например отпада чак на четвърта. */}
          {layout.dropped.length > 0 && (
            <div role="status" className="rounded-field bg-danger/8 px-4 py-3">
              {layout.dropped.map((text) => (
                <p key={text} className="text-xs leading-relaxed text-danger">
                  {prevedi(text, ezik)}
                </p>
              ))}
            </div>
          )}
        </div>

        {/*
          На широк екран и дясната колона е закована и се плъзга сама.
          Докато беше част от страницата, долният ѝ край избутваше обема
          нагоре: човек скролира въпросите, а картината бяга. Сега се
          движи само това, което се скролира.
        */}
        <aside
          ref={asideRef}
          // Скролът ѝ не се предава на страницата: стигне ли дъното си,
          // спира, вместо да повлече и обема.
          className="space-y-4 lg:h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:[scrollbar-width:thin]"
        >
          {/*
            Дошли от жилището — първото, което човек иска, е да се върне в
            схемата и да види стаята отметната. Затова е най-отгоре на
            последната стъпка, над всичко останало. Долу, под картите с
            цената и снимките, в колона, която се скролира отделно, не се
            виждаше: човек натискаше „Готово" горе, отиваше в жилището от
            менюто и стаята си стоеше празна.
          */}
          {step === STEPS.length - 1 && fromFlat && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    kam(
                      `/jilishte?gotova=${encodeURIComponent(fromFlat)}` +
                        `&p=${encodeProject(furniture)}`,
                    ),
                  )
                }
                className="btn btn-primary w-full py-3"
              >
                {t.obratnoKamJilishteto}
              </button>
              <p className="text-[13px] leading-relaxed text-muted">{t.obratnoText}</p>
            </div>
          )}

          {/* Удобството стои най-горе, щом има мебел — пречи ли нещо, да се
              види преди цветовете. */}
          {step >= 2 && notes.length > 0 && (
            <Card title={t.udobstvo}>
              <ErgonomicsNotes notes={notes} />
            </Card>
          )}

          {step === 0 && (
            <Card title={t.koyaStaya}>
              <div className="space-y-2">
                {ROOM_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    aria-pressed={a.room === card.id}
                    // Смяната на стая изхвърля обзавеждането, което не ѝ
                    // принадлежи: диван в кухня е грешка, не избор.
                    onClick={() =>
                      set((p) => ({
                        room: card.id,
                        furnishings: p.furnishings.filter((f) =>
                          FURNISHINGS[f.kind].rooms.includes(card.id),
                        ),
                      }))
                    }
                    className={`block w-full rounded-field px-4 py-3.5 text-left ring-1 transition-colors ${
 a.room === card.id
                        ? 'bg-accent/8 ring-accent'
                        : 'bg-surface-sunken ring-transparent hover:bg-border/60'
                    }`}
                  >
                    <span className="block font-medium">
                      {prevedi(ROOM_KIND_LABEL[card.id], ezik)}
                    </span>
                    <span className="block text-sm text-muted">{t.stai[card.id]}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                {t.pravilaZaStaya}
              </p>
            </Card>
          )}

          {step === 0 && (
            <Card title={t.iliGotova}>
              <div className="grid grid-cols-2 gap-2">
                {templates.map(({ t: tpl, kitchen }) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="rounded-field bg-surface-sunken p-1.5 text-left ring-1 ring-transparent transition-colors hover:ring-accent"
                  >
                    <span className="block overflow-hidden rounded-[7px] bg-surface">
                      <ScenePreview kitchen={kitchen} label="" />
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-tight font-medium">
                      {/* Видимото име стои в името на бутона — гласовото
                          управление го намира по това, което човек чете. */}
                      <span className="sr-only">{t.gotovaStaya}</span>
                      {tpl.name[ezik]}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                      {tpl.note[ezik]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                {t.gotovaNachalo}
              </p>
            </Card>
          )}

          {step === 1 && (
            <Card title={copy.wallQuestion}>
              <div className="well mb-5 p-4">
                <MiniPlan
                  roomWidth={a.roomWidth}
                  roomDepth={a.roomDepth}
                  wallLength={a.wallLength}
                  door={door}
                  onDoorChange={(d) => set({ door: d })}
                  windows={windows}
                  onWindowChange={(win) =>
                    set({ windows: windows.map((w) => (w.id === win.id ? win : w)) })
                  }
                  moving={onTheMove}
                />
              </div>

              <Slider
                label={t.dalzhinaNaStenata}
                value={a.wallLength}
                min={1200}
                max={6000}
                step={100}
                onChange={setWall}
              />
              <p className="mt-1 text-xs text-muted">{copy.wallHint}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <Slider
                  label={t.shirinaNaStayata}
                  value={a.roomWidth}
                  min={1200}
                  max={8000}
                  step={100}
                  onChange={setRoomWidth}
                  compact
                />
                <Slider
                  label={t.dalbochinaNaStayata}
                  value={a.roomDepth}
                  min={1200}
                  max={8000}
                  step={100}
                  onChange={(roomDepth) => set({ roomDepth })}
                  compact
                />
              </div>

              {/* Таванът решава дали антресол влиза и колко остава над него. */}
              <div className="mt-4">
                <Slider
                  label={t.visochinaDoTavana}
                  value={a.roomHeight ?? ROOM.HEIGHT}
                  min={ROOM.HEIGHT_MIN}
                  max={ROOM.HEIGHT_MAX}
                  step={10}
                  onChange={(roomHeight) => set({ roomHeight })}
                  compact
                />
                <p className="mt-1 text-xs text-muted">{t.obiknovenoTavan}</p>
              </div>

              <OpeningControls
                room={{ width: a.roomWidth, depth: a.roomDepth }}
                door={door}
                windows={windows}
                editing={onTheMove}
                onEdit={setEditing}
                onDoor={(d) => set({ door: d })}
                onWindows={(list) => set({ windows: list })}
              />

              {doorBlocked.length > 0 && (
                <p role="alert" className="mt-3 text-xs leading-relaxed text-danger">
                  {t.vrataOpira(
                    doorBlocked.length,
                    izbroi(
                      doorBlocked.map((m) => kod(m.code ?? '', ezik)),
                      ezik,
                    ),
                  )}
                </p>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card title={t.naredeteYa}>
              <p className="text-sm leading-relaxed text-muted">{t.praznaText}</p>

              <p className="mt-3 text-sm">
                {cabinets === 0 ? (
                  <span className="text-muted">{t.oshteNyama}</span>
                ) : (
                  <>
                    <span className="dim">{cabinets}</span> {t.vStayata(cabinets)}
                  </>
                )}
              </p>

              {cabinets > 0 && (
                <button
                  type="button"
                  onClick={() => set({ byHand: true, hand: { base: [], upper: [] } })}
                  className="btn btn-quiet mt-3 text-[13px]"
                >
                  {t.izprazni}
                </button>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card title={copy.needsQuestion}>
              <p className="mb-3 text-xs leading-relaxed text-muted">
                {a.byHand ? t.akoNeIskate : t.pravilataPodrezhdat}
              </p>
              <div className="space-y-2">
                {a.room === 'kitchen' &&
                  KITCHEN_SWITCHES.map((s) => (
                    <Toggle
                      key={s.label.bg}
                      label={s.label[ezik]}
                      note={s.note[ezik]}
                      on={s.get(a.needs.kitchen)}
                      onChange={(on) =>
                        set((p) => ({
                          needs: { ...p.needs, kitchen: { ...p.needs.kitchen, ...s.set(on) } },
                        }))
                      }
                    />
                  ))}
                {a.room === 'bedroom' &&
                  BEDROOM_SWITCHES.map((s) => (
                    <Toggle
                      key={s.label.bg}
                      label={s.label[ezik]}
                      note={s.note[ezik]}
                      on={s.get(a.needs.bedroom)}
                      onChange={(on) =>
                        set((p) => ({
                          needs: { ...p.needs, bedroom: { ...p.needs.bedroom, ...s.set(on) } },
                        }))
                      }
                    />
                  ))}
                {a.room === 'living' &&
                  LIVING_SWITCHES.map((s) => (
                    <Toggle
                      key={s.label.bg}
                      label={s.label[ezik]}
                      note={s.note[ezik]}
                      on={s.get(a.needs.living)}
                      onChange={(on) =>
                        set((p) => ({
                          needs: { ...p.needs, living: { ...p.needs.living, ...s.set(on) } },
                        }))
                      }
                    />
                  ))}
                {a.room === 'bath' &&
                  BATH_SWITCHES.map((s) => (
                    <Toggle
                      key={s.label.bg}
                      label={s.label[ezik]}
                      note={s.note[ezik]}
                      on={s.get(a.needs.bath)}
                      onChange={(on) =>
                        set((p) => ({
                          needs: { ...p.needs, bath: { ...p.needs.bath, ...s.set(on) } },
                        }))
                      }
                    />
                  ))}
                {(a.room === 'corridor' || a.room === 'hall') &&
                  HALL_SWITCHES.map((s) => (
                    <Toggle
                      key={s.label.bg}
                      label={s.label[ezik]}
                      note={s.note[ezik]}
                      on={s.get(a.needs.hall)}
                      onChange={(on) =>
                        set((p) => ({
                          needs: { ...p.needs, hall: { ...p.needs.hall, ...s.set(on) } },
                        }))
                      }
                    />
                  ))}
              </div>

              {a.byHand && (
                <button
                  type="button"
                  onClick={() => set({ byHand: false })}
                  className="btn btn-quiet mt-4 text-[13px]"
                >
                  {t.podredetePoOtgovori}
                </button>
              )}

              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                {copy.always}
              </p>
            </Card>
          )}

          {step === 2 && (
            <Card title={t.obzavezhdane}>
              <div className="flex flex-wrap gap-2">
                {furnishingsFor(a.room).map((spec) => (
                  <button
                    key={spec.kind}
                    type="button"
                    onClick={() => set((p) => ({ furnishings: [...p.furnishings, place(p, spec.kind)] }))}
                    className="rounded-pill bg-surface-sunken px-3.5 py-2 text-[13px] transition-colors hover:bg-border"
                  >
                    + {prevedi(spec.label, ezik)}
                  </button>
                ))}
              </div>

              {a.furnishings.length > 0 && (
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {a.furnishings.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 py-2">
                      <span className="text-sm">{prevedi(FURNISHINGS[f.kind].label, ezik)}</span>
                      <span className="dim ml-auto text-[11px] tabular-nums">
                        {metres(FURNISHINGS[f.kind].width)} × {metres(FURNISHINGS[f.kind].depth)}{' '}
                        {M.m}
                      </span>
                      <button
                        type="button"
                        aria-label={t.zavarti(prevedi(FURNISHINGS[f.kind].label, ezik))}
                        onClick={() =>
                          set((p) => ({
                            furnishings: p.furnishings.map((x) =>
                              x.id === f.id
                                ? { ...x, rotation: (x.rotation + Math.PI / 2) % (Math.PI * 2) }
                                : x,
                            ),
                          }))
                        }
                        className="h-8 w-8 rounded-full bg-surface-sunken text-xs transition-colors hover:bg-border"
                      >
                        ⟳
                      </button>
                      <button
                        type="button"
                        aria-label={t.mahni(prevedi(FURNISHINGS[f.kind].label, ezik))}
                        onClick={() =>
                          set((p) => ({
                            furnishings: p.furnishings.filter((x) => x.id !== f.id),
                          }))
                        }
                        className="h-8 w-8 rounded-full bg-surface-sunken text-xs transition-colors hover:bg-danger hover:text-accent-contrast"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {a.furnishings.length > 0 && (
                <p className="mt-3 text-xs text-muted">{t.vlachete}</p>
              )}

              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                {t.gotoviIzdeliya}
              </p>
            </Card>
          )}

          {step === 3 && (
            <>
              <Card title={t.tsvyatFasadi}>
                <Swatches
                  options={FACADE_COLORS}
                  value={a.facadeColor}
                  onChange={(facadeColor) => set({ facadeColor })}
                />
              </Card>

              <Card title={t.tsvyatKorpus}>
                <Swatches
                  options={CARCASS_COLORS}
                  value={a.carcassColor}
                  onChange={(carcassColor) => set({ carcassColor })}
                />
              </Card>

              <Card title={t.steni}>
                <WallFinishPanel
                  choice={furniture.wallFinish}
                  onChoose={(side, id) =>
                    set((p) => ({ wallFinish: chooseFinish(p.opened?.wallFinish ?? p.wallFinish, side, id) }))
                  }
                  focusSide="top"
                  onTargetChange={(t) => setWallTarget(t === 'all' ? null : t)}
                />
              </Card>

              <Card title={t.pod}>
                <FloorFinishPanel
                  value={furniture.floorFinish}
                  onChoose={(id) => set({ floorFinish: id ?? undefined })}
                />
              </Card>

              {a.room === 'kitchen' && (
                <Card title={t.plot}>
                  <div className="grid grid-cols-2 gap-2">
                    {WORKTOPS.map((w) => (
                      <Choice
                        key={w.id}
                        selected={a.worktop === w.id}
                        onClick={() => set({ worktop: w.id })}
                      >
                        {prevedi(w.name, ezik)}
                      </Choice>
                    ))}
                  </div>
                </Card>
              )}

              <Card title={t.podredba}>
                {(a.room === 'kitchen'
                  ? KITCHEN_CHOICES
                  : a.room === 'bedroom'
                    ? BEDROOM_CHOICES
                    : LIVING_CHOICES
                ).map((group) => (
                  <div key={group.label.bg} className="mb-4 last:mb-0">
                    <p className="mb-2 text-sm text-muted">{group.label[ezik]}</p>
                    <div
                      className={`grid gap-2 ${
 group.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                      }`}
                    >
                      {group.options.map((option) => (
                        <Choice
                          key={option.value}
                          selected={
                            group.get(a.needs[NEEDS_KEY[a.room]] as never) === option.value
                          }
                          onClick={() =>
                            set((p) => ({
                              needs: {
                                ...p.needs,
                                [NEEDS_KEY[a.room]]: {
                                  ...p.needs[NEEDS_KEY[a.room]],
                                  ...(group.set(option.value) as object),
                                },
                              },
                            }))
                          }
                        >
                          {option.label[ezik]}
                        </Choice>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            </>
          )}

          {step === 4 && (
            <>
              {!rulesAreCurrent(furniture) && (
                <p role="status" className="well px-4 py-3 text-sm text-muted">
                  {t.pravilaNovi(furniture.rulesVersion ?? '—', RULES_VERSION)}
                </p>
              )}

              <Card title={t.rezultat}>
                <dl className="space-y-2 text-sm">
                  <Line term={t.term.staya} value={prevedi(ROOM_KIND_LABEL[a.room], ezik)} />
                  <Line term={t.term.stena} value={`${metres(a.wallLength)} ${M.m}`} />
                  <Line
                    term={t.term.doTavana}
                    value={`${metres(ceilingOf(room))} ${M.m}${
                      cabinets > 0 ? t.nadMebelta(Math.round(ceilingOf(room) - furnitureTop)) : ''
                    }`}
                  />
                  <Line term={t.term.vrata} value={t.vrataStoinost(t.strana[door.side], door.width)} />
                  {windows.length > 0 && (
                    <Line
                      term={t.term.prozortsi}
                      value={izbroi(
                        windows.map((w) => t.prozorecStoinost(t.strana[w.side], w.width)),
                        ezik,
                      )}
                    />
                  )}
                  <Line term={t.term.moduli} value={t.broi(cabinets)} />
                  <Line term={t.term.sastav} value={compositionOf(a.room, a.needs, ezik)} />
                  {a.furnishings.length > 0 && (
                    <Line
                      term={t.term.obzavezhdane}
                      value={izbroi(
                        a.furnishings.map((f) =>
                          prevedi(FURNISHINGS[f.kind].label, ezik).toLowerCase(),
                        ),
                        ezik,
                      )}
                    />
                  )}
                  <Line term={t.term.fasadi} value={prevedi(a.facadeColor, ezik)} />
                  {a.room === 'kitchen' && (
                    <Line
                      term={t.term.plot}
                      value={prevedi(WORKTOPS.find((w) => w.id === a.worktop)?.name ?? '—', ezik)}
                    />
                  )}
                </dl>

                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                  {t.pravilaVersiya(result.rulesVersion)}
                </p>
              </Card>

              {/*
                Стаята е готова — първото, което човек иска, е да я види
                като истинска. Затова е тук, а не на дъното при изпращането.
              */}
              {cabinets > 0 && (
                <Card title={t.kakSnimka}>
                  <Skica kitchen={furniture} view={a.view} />
                </Card>
              )}

              <Card title={t.tsena}>
                <PriceEstimate kitchen={furniture} result={result} />
              </Card>

              <Card title={t.naSnimka}>
                <PhotoOverlay
                  kitchen={furniture}
                  rows={result.placed[0]}
                  wallLength={furniture.walls[0].length}
                />
              </Card>

              {/*
                Направено без чертежа — готовата стая може да влезе в
                жилището: заменя стаята от същия вид с мерките и мебелта си,
                а ако такава няма — влиза като нова. Там се вижда с мебелта
                си в макета на цялото жилище.
              */}
              {!fromFlat && cabinets > 0 && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(kam(`/jilishte?dobavi=${encodeProject(furniture)}`))}
                    className="btn btn-quiet w-full py-3"
                  >
                    {t.dobavi}
                  </button>
                  <p className="text-[13px] leading-relaxed text-muted">{t.dobaviText}</p>
                </div>
              )}

              <SendProject kitchen={furniture} view={a.view} />

            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => goTo('back')}
              disabled={step === 0}
              className="rounded-pill px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-sunken disabled:opacity-30"
            >
              {t.nazad}
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => goTo('next')}
                className="btn btn-primary px-6"
              >
                {t.napred}
              </button>
            )}
          </div>
          <ScrollMore target={asideRef} />
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-display mb-4 text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  compact = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  const ezik = useEzik();
  return (
    <label className="block">
      {/* В тясна колона името и числото са едно под друго — иначе и двете
          се чупят на по два реда, а „м" се откъсва от числото. */}
      <span
        className={
          compact ? 'flex flex-col gap-0.5' : 'flex items-baseline justify-between gap-2'
        }
      >
        <span className="text-sm text-muted">{label}</span>
        <span className={`dim tabular-nums whitespace-nowrap ${compact ? 'text-sm' : 'text-xl'}`}>
          {metri(value, ezik)} {MERKI[ezik].m}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1 w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function Toggle({
  label,
  note,
  on,
  onChange,
}: {
  label: string;
  note: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-3 rounded-field px-4 py-3 text-left ring-1 transition-colors ${
 on ? 'bg-accent/8 ring-accent' : 'bg-surface-sunken ring-transparent hover:bg-border/60'
      }`}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
 on ? 'bg-accent text-accent-contrast' : 'bg-border'
        }`}
      >
        {on ? '✓' : ''}
      </span>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted">{note}</span>
      </span>
    </button>
  );
}

function Swatches({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string; hex: string }[];
  value: string;
  onChange: (name: string) => void;
}) {
  const ezik = useEzik();
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.name)}
          aria-pressed={value === option.name}
          className={`rounded-field p-1.5 text-left ring-2 transition-all ${
 value === option.name ? 'ring-accent' : 'ring-transparent hover:ring-border'
          }`}
        >
          <span
            aria-hidden
            className="block h-12 w-full rounded-[7px]"
            style={{ background: option.hex }}
          />
          <span className="mt-1 block text-[11px] leading-tight">{prevedi(option.name, ezik)}</span>
        </button>
      ))}
    </div>
  );
}

function Choice({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      // Избраното е с основния цвят, не с брас: брас върху потъналия фон
      // дава 4.29:1 и пада под прага за контраст.
      className={`rounded-field px-3 py-2 text-[13px] transition-colors ${
 selected
          ? 'bg-accent text-accent-contrast'
          : 'bg-surface-sunken text-muted hover:bg-border/60'
      }`}
    >
      {children}
    </button>
  );
}


/**
 * Къде се влиза и откъде идва светлината.
 *
 * Планът горе приема посочване — това е бързият начин. Тук са същите
 * неща с думи и клавиатура, защото посочване с влачене не върши работа
 * на всеки и не се чува от екранен четец.
 *
 * Врата и прозорци се редактират на едно място: избираш кой отвор е на
 * ход и го местиш. Иначе планът трябваше да гадае кое си хванал.
 */
function OpeningControls({
  room,
  door,
  windows,
  editing,
  onEdit,
  onDoor,
  onWindows,
}: {
  room: { width: number; depth: number };
  door: RoomDoor;
  windows: RoomWindow[];
  editing: 'door' | string;
  onEdit: (what: 'door' | string) => void;
  onDoor: (door: RoomDoor) => void;
  onWindows: (windows: RoomWindow[]) => void;
}) {
  const ezik = useEzik();
  const t = useT(PROEKT);
  const win = windows.find((w) => w.id === editing);
  const side = win ? win.side : door.side;
  const wall = side === 'top' || side === 'bottom' ? room.width : room.depth;
  const width = win ? win.width : door.width;
  const x = win ? win.x : door.x;

  const editDoor = (patch: Partial<RoomDoor>) => onDoor(clampDoor(room, { ...door, ...patch }));
  const editWin = (patch: Partial<RoomWindow>) =>
    win && onWindows(windows.map((w) => (w.id === win.id ? clampWindow(room, { ...w, ...patch }) : w)));
  const edit = (patch: { side?: WallSide; x?: number; width?: number }) =>
    win ? editWin(patch) : editDoor(patch);

  const addWindow = () => {
    if (windows.length >= WINDOW.MAX_COUNT) return;
    // Вратата заема стена — нов прозорец тръгва от друга.
    const fresh = defaultWindow(
      room,
      [door, ...windows],
      `win${windows.length + 1}-${Date.now().toString(36)}`,
    );
    onWindows([...windows, fresh]);
    onEdit(fresh.id);
  };

  const removeWindow = () => {
    if (!win) return;
    onWindows(windows.filter((w) => w.id !== win.id));
    onEdit('door');
  };

  return (
    <section className="mt-5 border-t border-border pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{t.vrataIProzortsi}</h3>
        <p className="text-xs text-muted">{t.plaznetePoPlana}</p>
      </div>

      {/* кой отвор се мести */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Choice selected={editing === 'door'} onClick={() => onEdit('door')}>
          {t.vrata}
        </Choice>
        {windows.map((w, i) => (
          <Choice key={w.id} selected={editing === w.id} onClick={() => onEdit(w.id)}>
            {t.prozorec(i + 1)}
          </Choice>
        ))}
        <button
          type="button"
          onClick={addWindow}
          disabled={windows.length >= WINDOW.MAX_COUNT}
          className="rounded-field bg-surface-sunken px-3 py-2 text-[13px] text-muted transition-colors hover:bg-border/60 disabled:opacity-50"
        >
          {t.plusProzorec}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {WALL_SIDES.map((s) => (
          <Choice key={s} selected={side === s} onClick={() => edit({ side: s })}>
            {t.stenaButon[s]}
          </Choice>
        ))}
      </div>

      <div className="mt-4">
        <Slider
          label={t.otstoyanie}
          value={x}
          min={0}
          max={Math.max(0, wall - width)}
          step={DOOR.STEP}
          onChange={(value) => edit({ x: value })}
          compact
        />
      </div>

      {win ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Slider
              label={t.shirina}
              value={win.width}
              min={WINDOW.MIN_WIDTH}
              max={Math.min(WINDOW.MAX_WIDTH, wall)}
              step={WINDOW.STEP}
              onChange={(value) => editWin({ width: value })}
              compact
            />
            <Slider
              label={t.parapet}
              value={win.sill}
              min={WINDOW.MIN_SILL}
              max={WINDOW.MAX_SILL}
              step={WINDOW.STEP}
              onChange={(value) => editWin({ sill: value })}
              compact
            />
            <Slider
              label={t.visochina}
              value={win.height}
              min={WINDOW.MIN_HEIGHT}
              max={WINDOW.MAX_HEIGHT}
              step={WINDOW.STEP}
              onChange={(value) => editWin({ height: value })}
              compact
            />
          </div>
          <button
            type="button"
            onClick={removeWindow}
            className="mt-3 text-[13px] text-muted underline-offset-4 transition-colors hover:text-danger hover:underline"
          >
            {t.mahniProzoreca}
          </button>
        </>
      ) : (
        // Ширините са четири и искат цял ред — в половин колона „1000" опираше в ръба.
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-sm text-muted">{t.shirinaMm}</span>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {DOOR.WIDTHS.map((w) => (
                <Choice key={w} selected={door.width === w} onClick={() => editDoor({ width: w })}>
                  {w}
                </Choice>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-muted">{t.panti}</span>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:max-w-[60%]">
              {(['left', 'right'] as const).map((hinge) => (
                <Choice
                  key={hinge}
                  selected={door.hinge === hinge}
                  onClick={() => editDoor({ hinge })}
                >
                  {prevedi(DOOR_HINGE_LABEL[hinge], ezik)}
                </Choice>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Line({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
