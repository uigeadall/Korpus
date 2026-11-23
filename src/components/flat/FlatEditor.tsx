'use client';

/**
 * Чертежът на цялото жилище.
 *
 * Дотук приложението знаеше една стая. Клиентът обаче си мисли за
 * жилището цяло: кухня до хола, коридор между спалните. Тук то се
 * чертае — стая по стая — и се обикаля със стрелките, както човек
 * минава през вратите.
 *
 * Стаите, за които имаме правила за мебел, водят към „Направи проект";
 * останалите влизат в плана, защото без тях жилището не е жилище.
 */

import { useEffect, useReducer, useState } from 'react';
import {
  FLAT,
  FLAT_ROOM_LABEL,
  type Direction,
  DIRECTION_LABEL,
  type FlatRoomKind,
  type FlatRoom,
  areaOf,
  isDone,
  isFurnished,
  progressOf,
  roomName,
  neighboursOf,
  overlappingRooms,
  stepFrom,
  totalArea,
} from '@/lib/flat';
import { FlatPlan } from './FlatPlan';
import { FlatActionBar } from './FlatActionBar';
import { FlatScene } from './FlatScene';
import {
  canRedoFlat,
  canUndoFlat,
  flatHistoryReducer,
  initFlatHistory,
  loadFlat,
  loadHere,
  saveFlat,
  saveHere,
} from './flatState';
import { defaultFlat } from '@/lib/flat';
import { decodeFlat, encodeFlat } from '@/lib/flat-share';

const KINDS: FlatRoomKind[] = ['kitchen', 'living', 'bedroom', 'corridor', 'bath', 'hall', 'other'];

const ARROWS: { dir: Direction; sign: string }[] = [
  { dir: 'up', sign: '↑' },
  { dir: 'left', sign: '←' },
  { dir: 'down', sign: '↓' },
  { dir: 'right', sign: '→' },
];

export function FlatEditor() {
  const [history, dispatch] = useReducer(flatHistoryReducer, undefined, () =>
    initFlatHistory(defaultFlat()),
  );
  const flat = history.present;

  /*
   * Коя стая гледаме и какво да чуе този, който не вижда плана. Двете
   * се менят заедно — при всяка стрелка — затова са един редуктор.
   * Редуктор, а не `useState`: връщането от обзавеждане ги задава в
   * ефект, а setState там върти излишен цикъл рендери.
   */
  const [view, show] = useReducer(
    (
      state: { currentId: string | null; said: string; selected: string[] },
      next: Partial<typeof state>,
    ) => ({ ...state, ...next }),
    { currentId: flat.rooms[0]?.id ?? null, said: '', selected: [] as string[] },
  );
  const currentId = view.currentId;
  const said = view.said;
  /** Маркираните стаи. Текущата винаги е сред тях. */
  const selected = view.selected.length ? view.selected : currentId ? [currentId] : [];

  /**
   * Преместване в друга стая.
   *
   * Записва се тук, при самото преместване, а не с ефект, който
   * огледалва състоянието: такъв ефект се изпълнява и преди
   * възстановяването да е стигнало до състоянието и презаписва
   * запомненото с началната стая.
   */
  const goTo = (id: string | null, heard?: string) => {
    show({ currentId: id, selected: id ? [id] : [], ...(heard === undefined ? {} : { said: heard }) });
    if (id) saveHere(id);
  };

  /** Щракване по стая: сама, добавена към маркираните или превключена. */
  const pickRoom = (id: string, how: 'only' | 'extend' | 'toggle') => {
    if (how === 'only') {
      goTo(id);
      return;
    }
    const next =
      how === 'extend'
        ? selected.includes(id)
          ? selected
          : [...selected, id]
        : selected.includes(id)
          ? selected.filter((s) => s !== id)
          : [...selected, id];
    show({ selected: next, currentId: next.at(-1) ?? id });
    if (next.length) saveHere(next.at(-1)!);
  };

  /*
   * Връщаме чертежа след mount, за да няма разминаване при SSR. Ако
   * се връщаме от обзавеждане, стаята се отмята веднага след това —
   * редът е важен, иначе зареденият чертеж я застъпва.
   */
  useEffect(() => {
    /*
     * Донесено по линк жилище има превес над запазеното: щом някой
     * отвори чужд чертеж, иска да види него, не своя отпреди. Затова
     * се гледа първо и записът не се пипа, докато човек не промени
     * нещо — тогава този чертеж става негов.
     */
    const donesen = new URLSearchParams(window.location.search).get('j');
    const otLink = donesen ? decodeFlat(donesen) : null;
    if (otLink) {
      dispatch({ type: 'load', value: otLink });
      show({
        currentId: otLink.rooms[0]?.id,
        said: `Отворено жилище от линк: ${otLink.rooms.length} помещения.`,
      });
      return;
    }

    const saved = loadFlat();
    if (saved?.rooms.length) dispatch({ type: 'load', value: saved });

    /*
     * Връщаме се там, където сме стояли. Гледа се и когато чертежът
     * не е записан: ходенето не го мени, а човекът пак е бил някъде.
     */
    const here = loadHere();
    const rooms = saved?.rooms.length ? saved.rooms : defaultFlat().rooms;
    if (here && rooms.some((r) => r.id === here)) show({ currentId: here });

    const params = new URLSearchParams(window.location.search);
    const done = params.get('gotova');
    const project = params.get('p');
    if (done && project) {
      dispatch({ type: 'finish', id: done, project });
      goTo(done, 'Стаята е готова и е отметната в схемата.');
      /*
       * Адресът се чисти, за да не се отмята наново при презареждане
       * и да не остане дълъг запис в лентата.
       */
      window.history.replaceState(null, '', '/jilishte');
    }
  }, []);

  /**
   * Линкът към жилището.
   *
   * Клавиатурата не носи адресна лента, а човек не може да препише
   * хиляда и четиристотин знака — затова копирането е бутон. Откаже ли
   * хранилището (частен режим, отказано разрешение), казваме го,
   * вместо да се правим, че е станало.
   */
  const [kopirano, setKopirano] = useState(false);
  const kopirajLink = () => {
    const url = `${window.location.origin}/jilishte?j=${encodeFlat(flat)}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setKopirano(true);
        show({ said: 'Линкът към жилището е копиран.' });
        window.setTimeout(() => setKopirano(false), 2500);
      },
      () => show({ said: 'Копирането не стана. Вземете адреса от лентата горе.' }),
    );
  };

  const changed = history.past.length > 0;
  useEffect(() => {
    if (changed) saveFlat(flat);
  }, [changed, flat]);

  const current = flat.rooms.find((r) => r.id === currentId) ?? flat.rooms[0] ?? null;
  const neighbours = current ? neighboursOf(flat, current.id) : [];
  const clashes = overlappingRooms(flat);
  const progress = progressOf(flat);

  /**
   * Къде води „Обзаведете".
   *
   * Към водения поток: там се пита на човешки език, правилата
   * подреждат, а накрая лентата позволява да се донагласи. Готова
   * стая се отваря такава, каквато е оставена.
   */
  const furnishLink = (room: FlatRoom) =>
    `/proekt?staya=${room.kind}&shirina=${room.width}&dalbochina=${room.depth}` +
    `&stayaId=${encodeURIComponent(room.id)}` +
    (room.project ? `&p=${room.project}` : '');

  /**
   * Ходенето. Стрелката води в съседната стая и казва коя е — иначе
   * човек, който не вижда плана, не разбира, че се е преместил.
   */
  const walk = (dir: Direction) => {
    if (!current) return;
    const next = stepFrom(flat, current.id, dir);
    if (!next) {
      show({ said: `${DIRECTION_LABEL[dir]} няма накъде — това е краят на жилището.` });
      return;
    }
    goTo(next.id, `${roomName(next)}, ${areaOf(next).toFixed(1)} квадрата.`);
  };

  /* Стрелките работят навсякъде, стига да не пишеш в поле. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      // Ъгълът за опъване държи своите стрелки сам.
      if (target?.getAttribute('aria-label')?.startsWith('Опънете')) return;
      const dirs: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const dir = dirs[e.key];
      if (!dir) return;
      e.preventDefault();
      walk(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl">Начертайте жилището</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Сложете стаите една до друга както са при вас. Влачете ги, опъвайте ги за долния
          десен ъгъл — лепят се сами. Стрелките ви водят от стая в стая.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 pb-24">
          <div className="card overflow-hidden p-3">
            <FlatPlan
              flat={flat}
              currentId={current?.id ?? null}
              selected={selected}
              onPick={pickRoom}
              onMove={(ids, x, y) => dispatch({ type: 'moveMany', ids, x, y })}
              onSize={(id, width, depth) => dispatch({ type: 'size', id, width, depth })}
            />
          </div>

          <div className="card overflow-hidden p-3">
            <FlatScene
              flat={flat}
              currentId={current?.id ?? null}
              /* Макетът става вход, не само изглед: щракването по
                 помещение води в него, както и щракването в плана. */
              onPick={(id) => {
                const room = flat.rooms.find((r) => r.id === id);
                goTo(id, room ? `${roomName(room)}, ${areaOf(room).toFixed(1)} квадрата.` : undefined);
              }}
            />
          </div>

          {/*
            Долната лента: едрите действия върху маркираните стаи,
            винаги под ръка. Връщането остава отдясно, където си беше.
          */}
          <FlatActionBar
            count={selected.length}
            onDuplicate={() => {
              for (const id of selected) dispatch({ type: 'duplicate', id });
            }}
            onRemove={() => {
              dispatch({ type: 'removeMany', ids: selected });
              goTo(flat.rooms.find((r) => !selected.includes(r.id))?.id ?? null);
            }}
            onFurnish={current && isFurnished(current.kind) ? furnishLink(current) : null}
            furnishLabel={
              current ? `${isDone(current) ? 'Променете' : 'Обзаведете'} ${roomName(current).toLowerCase()}` : ''
            }
          />
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-medium">Добавете помещение</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => dispatch({ type: 'add', kind })}
                  disabled={flat.rooms.length >= FLAT.MAX_ROOMS}
                  className="rounded-pill bg-surface-sunken px-3 py-1.5 text-[13px] transition-colors hover:bg-border disabled:opacity-50"
                >
                  + {FLAT_ROOM_LABEL[kind]}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              {flat.rooms.length} от {FLAT.MAX_ROOMS} помещения · {totalArea(flat).toFixed(1)} м²
              общо
            </p>
            {progress.total > 0 && (
              <p className="mt-1 text-xs text-muted">
                Обзаведени: {progress.done} от {progress.total}
                {progress.done === progress.total ? ' — цялото жилище е готово' : ''}
              </p>
            )}

            {/*
              Докато няма база, това е единственият начин жилището да
              излезе от този браузър — и да стигне до нас.
            */}
            <button
              type="button"
              onClick={kopirajLink}
              className="btn btn-quiet mt-3 w-full text-[13px]"
            >
              {kopirano ? 'Линкът е копиран' : 'Копирайте линк към жилището'}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Линкът носи целия чертеж и обзаведените стаи. Отваря се на друго устройство и
              може да се прати на нас.
            </p>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-medium">Ходене</h2>
            <div className="mt-3 grid w-max grid-cols-3 gap-1.5">
              <span />
              <ArrowButton item={ARROWS[0]} onWalk={walk} />
              <span />
              <ArrowButton item={ARROWS[1]} onWalk={walk} />
              <ArrowButton item={ARROWS[2]} onWalk={walk} />
              <ArrowButton item={ARROWS[3]} onWalk={walk} />
            </div>
            <p aria-live="polite" className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-muted">
              {said || 'Натиснете стрелка, за да минете в съседната стая.'}
            </p>
          </section>

          {current && (
            <section className="card p-4">
              <h2 className="text-sm font-medium">Тази стая</h2>

              <label className="mt-3 block">
                <span className="text-[11px] text-muted">Име</span>
                <input
                  value={current.name}
                  onChange={(e) => dispatch({ type: 'rename', id: current.id, name: e.target.value })}
                  className="field mt-1 w-full py-1.5 text-sm"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-[11px] text-muted">Вид</span>
                <select
                  value={current.kind}
                  onChange={(e) =>
                    dispatch({ type: 'kind', id: current.id, kind: e.target.value as FlatRoomKind })
                  }
                  className="field mt-1 w-full py-1.5 text-sm"
                >
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {FLAT_ROOM_LABEL[kind]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field
                  label="Ширина"
                  value={current.width}
                  onChange={(width) =>
                    dispatch({ type: 'size', id: current.id, width, depth: current.depth })
                  }
                />
                <Field
                  label="Дълбочина"
                  value={current.depth}
                  onChange={(depth) =>
                    dispatch({ type: 'size', id: current.id, width: current.width, depth })
                  }
                />
              </div>

              <p className="mt-3 text-xs text-muted">
                {areaOf(current).toFixed(1)} м² ·{' '}
                {neighbours.length
                  ? `граничи с ${neighbours.map((n) => roomName(n.room)).join(', ')}`
                  : 'не граничи с нищо — долепете я до друга стая'}
              </p>

              {isFurnished(current.kind) ? (
                <>
                  {isDone(current) && (
                    <p className="mt-4 flex items-center gap-2 rounded-field bg-accent/10 px-3 py-2 text-xs text-foreground">
                      <span aria-hidden="true">✓</span>
                      Готова е. Отворете я пак, за да я промените.
                    </p>
                  )}
                  {/*
                    Самият бутон е в долната лента, където стои винаги
                    под ръка. Тук остава само какво е състоянието —
                    два еднакви бутона на един екран са по-лошо от
                    един малко по-далеч.
                  */}
                  {!isDone(current) && (
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      Още не е обзаведена. Бутонът е долу вдясно.
                    </p>
                  )}
                  {isDone(current) && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'unfinish', id: current.id })}
                      className="mt-2 block text-[13px] text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      Отметнете я като незавършена
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-4 rounded-field bg-surface-sunken px-3 py-2 text-xs leading-relaxed text-muted">
                  За {FLAT_ROOM_LABEL[current.kind].toLowerCase()} още нямаме правила за мебел.
                  Влиза в плана, за да са верни размерите на съседните стаи.
                </p>
              )}

              {/*
                Двата надписа стояха един до друг и двата почваха с
                „Махнете" — единият махаше отметката, другият цялата
                стая. Сега се различават и по дума, и по ред.
              */}
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'remove', id: current.id });
                  goTo(flat.rooms.find((r) => r.id !== current.id)?.id ?? null);
                }}
                className="mt-3 block text-[13px] text-muted underline-offset-4 transition-colors hover:text-danger hover:underline"
              >
                Изтрийте {roomName(current).toLowerCase()} от чертежа
              </button>
            </section>
          )}

          {clashes.length > 0 && (
            <p role="alert" className="text-xs leading-relaxed text-danger">
              Две помещения стоят на едно място:{' '}
              {clashes.map(([a, b]) => `${roomName(a)} и ${roomName(b)}`).join(', ')}. Разделете ги —
              жилището не се строи така.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {/*
              „Назад" и „Напред" тук значеха отмяна и повтаряне, а до
              тях стоят стрелките за ходене — две различни неща с една
              и съща дума. Сега се казват каквото правят.
            */}
            <button
              type="button"
              onClick={() => dispatch({ type: 'undo' })}
              disabled={!canUndoFlat(history)}
              className="btn btn-quiet px-3 py-1.5 text-[13px] disabled:opacity-40"
            >
              Отмени
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'redo' })}
              disabled={!canRedoFlat(history)}
              className="btn btn-quiet px-3 py-1.5 text-[13px] disabled:opacity-40"
            >
              Повтори
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'reset' })}
              className="btn btn-quiet px-3 py-1.5 text-[13px]"
            >
              Отначало
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ArrowButton({ item, onWalk }: { item: { dir: Direction; sign: string }; onWalk: (d: Direction) => void }) {
  return (
    <button
      type="button"
      onClick={() => onWalk(item.dir)}
      aria-label={`Иди ${DIRECTION_LABEL[item.dir]}`}
      className="h-10 w-10 rounded-field bg-surface-sunken text-lg transition-colors hover:bg-border"
    >
      {item.sign}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type="number"
        value={value}
        min={FLAT.MIN_SIDE}
        max={FLAT.MAX_SIDE}
        step={FLAT.STEP}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dim field mt-1 w-full py-1.5 text-sm"
      />
    </label>
  );
}
