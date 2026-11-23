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
import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  DOOR,
  MODULES,
  type ModuleKind,
  ROOM_KIND_LABEL,
  type RoomDoor,
  type RoomKind,
  WALL_SIDES,
  WALL_SIDE_LABEL,
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
  rulesNote,
} from '@/lib/cabinet-rules';
import { DOOR_HINGE_LABEL, doorClashes } from '@/lib/openings';
import { NEEDS_KEY, layoutFor } from '@/lib/autolayout';
import { CARCASS_COLORS, FACADE_COLORS, WORKTOPS } from '@/config/materials';
import { type Action, reducer } from '@/components/configurator/state';
import { ActionBar } from '@/components/configurator/ActionBar';
import { ModulePalette } from '@/components/configurator/ModulePalette';
import { Timeline } from '@/components/configurator/Timeline';
import { Scene3D } from '@/components/configurator/Scene3D';
import { FURNISHINGS, furnishingsFor } from '@/lib/furnishings';
import { decodeProject, encodeProject } from '@/lib/share';
import { MiniPlan } from './MiniPlan';
import { SendProject } from './SendProject';
import {
  type Answers,
  ANSWERS_KEY,
  START,
  answers,
  fromKitchen,
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




const STEPS = ['Стаята', 'Размери', 'Какво да има', 'Как да изглежда', 'Готово'] as const;


const ROOM_CARDS: { id: RoomKind; note: string }[] = [
  { id: 'kitchen', note: 'Долен и горен ред, уреди, плот' },
  { id: 'bedroom', note: 'Гардероб с лост, рафтове и антресол' },
  { id: 'living', note: 'ТВ композиция, библиотека, стенен ред' },
  { id: 'bath', note: 'Висящ шкаф с мивка, колона, огледало' },
  { id: 'corridor', note: 'Плитки шкафове, закачалка, антресол' },
  { id: 'hall', note: 'Шкаф за обувки и за връхни дрехи' },
];

const metres = (mm: number) => (mm / 1000).toFixed(2).replace('.', ',');





export function ProjectWizard() {
  const router = useRouter();
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
  const [a, set] = useReducer(answers, START);

  /*
   * Ако сме дошли от чертежа на жилището, помним коя стая обзавеждаме.
   * Накрая проектът се връща там и стаята се отбелязва за готова.
   * Редуктор, а не `useState`: задава се в ефект при отваряне.
   */
  const [fromFlat, cameFromRoom] = useReducer(
    (_current: string | null, id: string) => id,
    null as string | null,
  );
  const copy = ROOM_COPY[a.room];

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

  const furniture = useMemo(() => a.opened ?? furnitureFrom(a), [a]);

  /**
   * Пипане по лентата.
   *
   * Минава през същия редуктор, с който работи конфигураторът —
   * един набор правила за местене, ширини и триене, вместо втори тук.
   * Резултатът става „донесен проект": оттук нататък въпросите не го
   * пренареждат, докато човек не пипне някой от тях.
   */
  const edit = (action: Action) => {
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
    set({ hand: { base: wall.base, upper: wall.upper } });
  };
  const result = useMemo(() => computeKitchen(furniture), [furniture]);
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

  const cabinets = furniture.walls[0].base.length + furniture.walls[0].upper.length;
  const worktopRun = furniture.walls[0].base
    .filter((m) => m.kind !== 'column')
    .reduce((sum, m) => sum + m.width, 0);

  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="eyebrow">Проект за пет минути</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {copy.lead} Това не е оферта — точната цена идва след измерване на място.
        </p>
      </header>

      <ol className="mb-8 flex flex-wrap gap-x-1 gap-y-2 text-[13px]">
        {STEPS.map((label, i) => (
          <li key={label}>
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

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Скролира се сама, щом надрасне прозореца — иначе закованата
            колона крие долния си край (виж и конфигуратора). */}
        <div className="space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {/*
            Модулите стоят до самата картина, а не в чужда колона: мястото
            им е там, където се пускат. Вляво обемът, вдясно каталогът —
            на тесен екран падат един под друг.
          */}
          <div className="card grid grid-cols-[minmax(0,1fr)] overflow-hidden bg-gradient-to-b from-surface to-surface-sunken sm:grid-cols-[minmax(0,1fr)_186px]">
            <Scene3D
              kitchen={furniture}
              room={room}
              placed={result.placed}
              worktop={furniture.materials.worktop}
              // Изгледът гледа натам, където човекът в момента мести отвор.
              focusSide={windows.find((w) => w.id === onTheMove)?.side ?? door.side}
              dropKind={dragKind}
              onDropModule={(kind, row, index) => {
                edit({ type: 'add', wallId: 'proekt-wall-1', row, kind, atIndex: index });
                setDragKind(null);
              }}
              onDropCancel={() => setDragKind(null)}
              onMoveModule={(id, toIndex, gap) => edit({ type: 'slide', id, toIndex, gap })}
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
                  furnishings: p.furnishings.map((f) =>
                    f.id === id ? { ...f, rotation: (f.rotation + Math.PI / 2) % (Math.PI * 2) } : f,
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
            <div className="min-w-0 border-t border-border bg-surface p-2.5 sm:max-h-none sm:overflow-y-auto sm:border-t-0 sm:border-l">
              <ModulePalette
                room={a.room}
                dragging={dragKind}
                onGrab={(kind) => setDragKind(kind)}
                onAdd={(kind) =>
                  edit({ type: 'add', wallId: 'proekt-wall-1', row: MODULES[kind].row, kind })
                }
                hint="Завлечете модул в стаята и го пуснете до стената. Щракване го слага в края."
                where="в стаята"
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
                side="top"
                wallLength={a.wallLength}
                placed={result.placed[0]}
                selected={picked}
                onSelect={setPicked}
                onReorder={(id, toIndex) => edit({ type: 'reorder', id, toIndex })}
                onWidth={(ids, value) => edit({ type: 'widthMany', ids, value })}
              />

              {a.opened && (
                <p className="px-1 text-[12px] leading-relaxed text-muted">
                  Подреждането вече е ваше. Върнете ли се на някой от въпросите, правилата ще
                  подредят наново и промените по лентата ще отпаднат.
                </p>
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
              <span className="dim tabular-nums">{cabinets}</span> модула
            </span>
            <span>
              стена <span className="dim tabular-nums">{metres(a.wallLength)} м</span>
            </span>
            {a.room === 'kitchen' && (
              <span>
                плот <span className="dim tabular-nums">{metres(worktopRun)} м</span>
              </span>
            )}
            <span className="ml-auto">
              Щракнете шкаф, за да се отвори. Рафтовете се влачат вътре и влизат в разбивката.
            </span>
          </div>

          {/* Предупрежденията стоят до картината, не вътре в някоя стъпка:
              аспираторът например отпада чак на четвърта. */}
          {layout.dropped.length > 0 && (
            <div role="status" className="rounded-field bg-danger/8 px-4 py-3">
              {layout.dropped.map((text) => (
                <p key={text} className="text-xs leading-relaxed text-danger">
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {step === 0 && (
            <Card title="Коя стая обзавеждаме?">
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
                    <span className="block font-medium">{ROOM_KIND_LABEL[card.id]}</span>
                    <span className="block text-sm text-muted">{card.note}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                Всяка стая си има своите правила за размери и обков. Размерите за спалня и
                всекидневна са работни, докато мебелистът не потвърди своите.
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
                label="Дължина на стената"
                value={a.wallLength}
                min={1200}
                max={6000}
                step={100}
                onChange={setWall}
              />
              <p className="mt-1 text-xs text-muted">{copy.wallHint}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <Slider
                  label="Ширина на стаята"
                  value={a.roomWidth}
                  min={1200}
                  max={8000}
                  step={100}
                  onChange={setRoomWidth}
                  compact
                />
                <Slider
                  label="Дълбочина на стаята"
                  value={a.roomDepth}
                  min={1200}
                  max={8000}
                  step={100}
                  onChange={(roomDepth) => set({ roomDepth })}
                  compact
                />
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
                  Вратата опира в {doorBlocked.length === 1 ? 'шкаф' : 'шкафове'}{' '}
                  {doorBlocked.map((m) => m.code).join(', ')}. Преместете вратата или скъсете
                  стената — иначе крилото няма да се отваря докрай.
                </p>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card title="Наредете я">
              <p className="text-sm leading-relaxed text-muted">
                Стаята е празна. Модулите стоят до изгледа — хванете модул и го пуснете до
                стената, където да застане. Пуснатото се вижда веднага в обема.
              </p>

              <p className="mt-3 text-sm">
                {cabinets === 0 ? (
                  <span className="text-muted">Още няма нищо в стаята.</span>
                ) : (
                  <>
                    <span className="dim">{cabinets}</span>{' '}
                    {cabinets === 1 ? 'модул' : 'модула'} в стаята
                  </>
                )}
              </p>

              {cabinets > 0 && (
                <button
                  type="button"
                  onClick={() => set({ byHand: true, hand: { base: [], upper: [] } })}
                  className="btn btn-quiet mt-3 text-[13px]"
                >
                  Изпразнете стаята
                </button>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card title={copy.needsQuestion}>
              <p className="mb-3 text-xs leading-relaxed text-muted">
                {a.byHand
                  ? 'Ако не искате да редите сами: отговорете тук и правилата ще подредят стаята наведнъж.'
                  : 'Правилата подреждат стаята по тези отговори. Пипнете ли ги, подреждат наново.'}
              </p>
              <div className="space-y-2">
                {a.room === 'kitchen' &&
                  KITCHEN_SWITCHES.map((s) => (
                    <Toggle
                      key={s.label}
                      label={s.label}
                      note={s.note}
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
                      key={s.label}
                      label={s.label}
                      note={s.note}
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
                      key={s.label}
                      label={s.label}
                      note={s.note}
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
                      key={s.label}
                      label={s.label}
                      note={s.note}
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
                      key={s.label}
                      label={s.label}
                      note={s.note}
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
                  Подредете я по тези отговори
                </button>
              )}

              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                {copy.always}
              </p>
            </Card>
          )}

          {step === 2 && (
            <Card title="Обзавеждане">
              <div className="flex flex-wrap gap-2">
                {furnishingsFor(a.room).map((spec) => (
                  <button
                    key={spec.kind}
                    type="button"
                    onClick={() => set((p) => ({ furnishings: [...p.furnishings, place(p, spec.kind)] }))}
                    className="rounded-pill bg-surface-sunken px-3.5 py-2 text-[13px] transition-colors hover:bg-border"
                  >
                    + {spec.label}
                  </button>
                ))}
              </div>

              {a.furnishings.length > 0 && (
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {a.furnishings.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 py-2">
                      <span className="text-sm">{FURNISHINGS[f.kind].label}</span>
                      <span className="dim ml-auto text-[11px] tabular-nums">
                        {metres(FURNISHINGS[f.kind].width)} × {metres(FURNISHINGS[f.kind].depth)} м
                      </span>
                      <button
                        type="button"
                        aria-label={`Завърти ${FURNISHINGS[f.kind].label}`}
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
                        aria-label={`Махни ${FURNISHINGS[f.kind].label}`}
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
                <p className="mt-3 text-xs text-muted">
                  Влачете ги по пода направо в изгледа; щракнете предмет там, за да го завъртите
                  или махнете.
                </p>
              )}

              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                Това са готови изделия, не мебел по мярка. Показваме ги, за да видите дали
                стаята работи — не влизат в проекта за производство и не се включват в
                разбивката.
              </p>
            </Card>
          )}

          {step === 3 && (
            <>
              <Card title="Цвят на фасадите">
                <Swatches
                  options={FACADE_COLORS}
                  value={a.facadeColor}
                  onChange={(facadeColor) => set({ facadeColor })}
                />
              </Card>

              <Card title="Цвят на корпуса">
                <Swatches
                  options={CARCASS_COLORS}
                  value={a.carcassColor}
                  onChange={(carcassColor) => set({ carcassColor })}
                />
              </Card>

              {a.room === 'kitchen' && (
                <Card title="Плот">
                  <div className="grid grid-cols-2 gap-2">
                    {WORKTOPS.map((w) => (
                      <Choice
                        key={w.id}
                        selected={a.worktop === w.id}
                        onClick={() => set({ worktop: w.id })}
                      >
                        {w.name}
                      </Choice>
                    ))}
                  </div>
                </Card>
              )}

              <Card title="Подредба">
                {(a.room === 'kitchen'
                  ? KITCHEN_CHOICES
                  : a.room === 'bedroom'
                    ? BEDROOM_CHOICES
                    : LIVING_CHOICES
                ).map((group) => (
                  <div key={group.label} className="mb-4 last:mb-0">
                    <p className="mb-2 text-sm text-muted">
                      {group.label}
                    </p>
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
                          {option.label}
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
              {rulesNote(furniture) && (
                <p role="status" className="well px-4 py-3 text-sm text-muted">
                  {rulesNote(furniture)}
                </p>
              )}

              <Card title="Ето какво се получи">
                <dl className="space-y-2 text-sm">
                  <Line term="Стая" value={ROOM_KIND_LABEL[a.room]} />
                  <Line term="Стена" value={`${metres(a.wallLength)} м`} />
                  <Line
                    term="Врата"
                    value={`${WALL_SIDE_LABEL[door.side].toLowerCase()} стена, ${door.width} мм`}
                  />
                  {windows.length > 0 && (
                    <Line
                      term="Прозорци"
                      value={windows
                        .map((w) => `${WALL_SIDE_LABEL[w.side].toLowerCase()} ${w.width} мм`)
                        .join(', ')}
                    />
                  )}
                  <Line term="Модули" value={`${cabinets} броя`} />
                  <Line term="Състав" value={compositionOf(a.room, a.needs)} />
                  {a.furnishings.length > 0 && (
                    <Line
                      term="Обзавеждане"
                      value={a.furnishings
                        .map((f) => FURNISHINGS[f.kind].label.toLowerCase())
                        .join(', ')}
                    />
                  )}
                  <Line term="Фасади" value={a.facadeColor} />
                  {a.room === 'kitchen' && (
                    <Line
                      term="Плот"
                      value={WORKTOPS.find((w) => w.id === a.worktop)?.name ?? '—'}
                    />
                  )}
                </dl>

                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                  Размерите и обковът са сметнати по нашите правила, версия {result.rulesVersion}.
                  Това е работен проект, не оферта: точните размери излизат след измерване на
                  място.
                </p>
              </Card>

              {/*
                Дошли от жилището — първото, което човек иска, е да се
                върне в схемата и да види стаята отметната.
              */}
              {fromFlat && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/jilishte?gotova=${encodeURIComponent(fromFlat)}` +
                          `&p=${encodeProject(furniture)}`,
                      )
                    }
                    className="btn btn-primary w-full py-3"
                  >
                    Готово — обратно към жилището
                  </button>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Стаята се отмята в схемата. Можете да се върнете в нея и да я промените по
                    всяко време.
                  </p>
                </div>
              )}

              <SendProject kitchen={furniture} />

            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => goTo('back')}
              disabled={step === 0}
              className="rounded-pill px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-sunken disabled:opacity-30"
            >
              Назад
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => goTo('next')}
                className="btn btn-primary px-6"
              >
                Напред
              </button>
            )}
          </div>
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
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{label}</span>
        <span className={`dim tabular-nums ${compact ? 'text-sm' : 'text-xl'}`}>
          {metres(value)} м
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
          <span className="mt-1 block text-[11px] leading-tight">{option.name}</span>
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

const WALL_BUTTON: Record<WallSide, string> = {
  top: 'Горе',
  right: 'Вдясно',
  bottom: 'Долу',
  left: 'Вляво',
};

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
        <h3 className="text-sm font-medium">Врата и прозорци</h3>
        <p className="text-xs text-muted">плъзнете по плана</p>
      </div>

      {/* кой отвор се мести */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Choice selected={editing === 'door'} onClick={() => onEdit('door')}>
          Врата
        </Choice>
        {windows.map((w, i) => (
          <Choice key={w.id} selected={editing === w.id} onClick={() => onEdit(w.id)}>
            Прозорец {i + 1}
          </Choice>
        ))}
        <button
          type="button"
          onClick={addWindow}
          disabled={windows.length >= WINDOW.MAX_COUNT}
          className="rounded-field bg-surface-sunken px-3 py-2 text-[13px] text-muted transition-colors hover:bg-border/60 disabled:opacity-50"
        >
          + Прозорец
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {WALL_SIDES.map((s) => (
          <Choice key={s} selected={side === s} onClick={() => edit({ side: s })}>
            {WALL_BUTTON[s]}
          </Choice>
        ))}
      </div>

      <div className="mt-4">
        <Slider
          label="Отстояние от левия ъгъл"
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
              label="Ширина"
              value={win.width}
              min={WINDOW.MIN_WIDTH}
              max={Math.min(WINDOW.MAX_WIDTH, wall)}
              step={WINDOW.STEP}
              onChange={(value) => editWin({ width: value })}
              compact
            />
            <Slider
              label="Парапет"
              value={win.sill}
              min={WINDOW.MIN_SILL}
              max={WINDOW.MAX_SILL}
              step={WINDOW.STEP}
              onChange={(value) => editWin({ sill: value })}
              compact
            />
            <Slider
              label="Височина"
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
            Махнете този прозорец
          </button>
        </>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted">Ширина</span>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {DOOR.WIDTHS.map((w) => (
                <Choice key={w} selected={door.width === w} onClick={() => editDoor({ width: w })}>
                  {w}
                </Choice>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-muted">Панти</span>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(['left', 'right'] as const).map((hinge) => (
                <Choice
                  key={hinge}
                  selected={door.hinge === hinge}
                  onClick={() => editDoor({ hinge })}
                >
                  {DOOR_HINGE_LABEL[hinge]}
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
