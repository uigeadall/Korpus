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

import { useEffect, useReducer, useRef, useState } from 'react';
import { useAdres, useEzik, useT } from '@/i18n/client';
import { metri } from '@/i18n/chisla';
import { prevedi } from '@/i18n/rechnik';
import { izbroi } from '@/i18n/tekst';
import { JILISHTE } from '@/i18n/tekstove/jilishte';
import {
  FLAT,
  FLAT_ROOM_LABEL,
  type Direction,
  type FlatRoomKind,
  type FlatRoom,
  areaOf,
  clampFlatRoom,
  isDone,
  isFurnished,
  progressOf,
  roomName as roomNameBg,
  imeNaEzik,
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
  flatReducer,
  loadHere,
  roomId,
  saveFlat,
  saveHere,
} from './flatState';
import { defaultFlat, placeProject } from '@/lib/flat';
import { fitProject } from '@/lib/flat-furniture';
import { decodeFlat, encodeFlat } from '@/lib/flat-share';
import { SpisakZaCeha } from './SpisakZaCeha';
import { decodeProject } from '@/lib/share';
import { kitchenRoom } from '@/lib/cabinet-rules';

const KINDS: FlatRoomKind[] = ['kitchen', 'living', 'bedroom', 'corridor', 'bath', 'hall', 'other'];

const ARROWS: { dir: Direction; sign: string }[] = [
  { dir: 'up', sign: '↑' },
  { dir: 'left', sign: '←' },
  { dir: 'down', sign: '↓' },
  { dir: 'right', sign: '→' },
];

/** Квадратните метри с един знак след точката — както и досега. */
const kv = (room: FlatRoom) => areaOf(room).toFixed(1);

export function FlatEditor() {
  const ezik = useEzik();
  const t = useT(JILISHTE);
  const kam = useAdres();
  const roomName = (room: FlatRoom) => roomNameBg(room, ezik);
  const vid = (kind: FlatRoomKind) => prevedi(FLAT_ROOM_LABEL[kind], ezik);
  const m = (mm: number) => metri(mm, ezik);
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
        said: t.otLink(otLink.rooms.length),
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
    /*
     * Отметнатото и добавеното се записват веднага, не чак при следващата
     * промяна. Ефектът може да мине втори път (React в режим за разработка
     * го пуска два пъти) — тогава адресът вече е изчистен и зареденият
     * наново чертеж трябва да носи стаята, иначе тя се губи.
     */
    const base = saved?.rooms.length ? saved : defaultFlat();
    if (done && project) {
      saveFlat(flatReducer(base, { type: 'finish', id: done, project }));
      dispatch({ type: 'finish', id: done, project });
      goTo(done, t.gotova);
      /*
       * Адресът се чисти, за да не се отмята наново при презареждане
       * и да не остане дълъг запис в лентата.
       */
      window.history.replaceState(null, '', kam('/jilishte'));
    }

    /*
     * Готов проект, направен без чертежа — „Добави в жилището" накрая на
     * „Направи проект". Заменя стаята от вида си с мерките и мебелта на
     * проекта, или влиза като нова, и се отмята. Мястото се смята
     * предварително, за да се застане там.
     */
    const dobavi = params.get('dobavi');
    const kitchen = dobavi ? decodeProject(dobavi) : null;
    if (dobavi && kitchen) {
      const kind = kitchen.roomKind ?? 'kitchen';
      const size = kitchenRoom(kitchen);
      const id = roomId();
      const placed = placeProject(base, kind, size, dobavi, id, (room) => fitProject(dobavi, room));
      saveFlat(placed.flat);
      const where = placed.flat.rooms.find((r) => r.id === placed.id);
      dispatch({ type: 'place', kind, width: size.width, depth: size.depth, project: dobavi, id });
      if (where) {
        const kazhi = where.id === id ? t.vlezeNova : t.zamenena;
        goTo(where.id, kazhi(roomName(where), m(where.width), m(where.depth)));
      } else show({ said: t.palno });
      window.history.replaceState(null, '', kam('/jilishte'));
    }
    // Веднъж, при отваряне: езикът и речникът не се менят, докато стаята е отворена.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        show({ said: t.linkKopiran });
        window.setTimeout(() => setKopirano(false), 2500);
      },
      () => show({ said: t.kopiraneNe }),
    );
  };

  /*
   * Записва се само чертеж, който още не е записан.
   *
   * Next пази страницата жива, докато човек е в „Направи проект", и при
   * връщане пуска ефектите ѝ наново. Без тази проверка записът пускаше
   * стария чертеж отгоре на току-що добавената стая — а вторият ход на
   * зареждането го четеше обратно. Съобщението казваше „заменена", а
   * всекидневната си стоеше празна (25.11.2026, жилище с копирано антре).
   */
  const changed = history.past.length > 0;
  const lastSaved = useRef<typeof flat | null>(null);
  useEffect(() => {
    if (!changed || lastSaved.current === flat) return;
    lastSaved.current = flat;
    saveFlat(flat);
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
  const furnishLink = (room: FlatRoom) => {
    // Запис отпреди мерките да вървят заедно се отваря в мерките от
    // чертежа, ако мебелта се побира — иначе какъвто е.
    const project = room.project ? (fitProject(room.project, room) ?? room.project) : null;
    return kam(
      `/proekt?staya=${room.kind}&shirina=${room.width}&dalbochina=${room.depth}` +
        `&stayaId=${encodeURIComponent(room.id)}` +
        (project ? `&p=${project}` : ''),
    );
  };

  /**
   * Нови мерки на стая. Обзаведена не се стеснява под мебелта си —
   * редукторът я оставя каквато е, а тук се казва защо. Иначе човек
   * дърпа ръба, нищо не мърда и не разбира какво става.
   */
  const resize = (id: string, width: number, depth: number) => {
    const room = flat.rooms.find((r) => r.id === id);
    if (room?.project) {
      const next = clampFlatRoom({ ...room, width, depth });
      if (fitProject(room.project, next) === null) {
        show({ said: t.neSePobira(roomName(room), m(next.width), m(next.depth)) });
        return;
      }
    }
    dispatch({ type: 'size', id, width, depth });
  };

  /**
   * Ходенето. Стрелката води в съседната стая и казва коя е — иначе
   * човек, който не вижда плана, не разбира, че се е преместил.
   */
  const walk = (dir: Direction) => {
    if (!current) return;
    const next = stepFrom(flat, current.id, dir);
    if (!next) {
      show({ said: t.kraya(t.posoka[dir]) });
      return;
    }
    goTo(next.id, t.tuk(roomName(next), kv(next)));
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
      if (target?.hasAttribute('data-opvane')) return;
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
        <h1 className="font-display text-3xl sm:text-4xl">{t.zaglavie}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t.vavedenie}</p>
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
              onSize={resize}
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
                goTo(id, room ? t.tuk(roomName(room), kv(room)) : undefined);
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
              current
                ? (isDone(current) ? t.promenete : t.obzavedete)(roomName(current).toLowerCase())
                : ''
            }
          />
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-medium">{t.dobavete}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => dispatch({ type: 'add', kind })}
                  disabled={flat.rooms.length >= FLAT.MAX_ROOMS}
                  className="rounded-pill bg-surface-sunken px-3 py-1.5 text-[13px] transition-colors hover:bg-border disabled:opacity-50"
                >
                  + {vid(kind)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              {t.broi(flat.rooms.length, FLAT.MAX_ROOMS, totalArea(flat).toFixed(1))}
            </p>
            {progress.total > 0 && (
              <p className="mt-1 text-xs text-muted">{t.obzavedeni(progress.done, progress.total)}</p>
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
              {kopirano ? t.linkatEKopiran : t.kopiraiLink}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">{t.linkatNosi}</p>
          </section>

          <SpisakZaCeha flat={flat} />

          <section className="card p-4">
            <h2 className="text-sm font-medium">{t.hodene}</h2>
            <div className="mt-3 grid w-max grid-cols-3 gap-1.5">
              <span />
              <ArrowButton item={ARROWS[0]} onWalk={walk} />
              <span />
              <ArrowButton item={ARROWS[1]} onWalk={walk} />
              <ArrowButton item={ARROWS[2]} onWalk={walk} />
              <ArrowButton item={ARROWS[3]} onWalk={walk} />
            </div>
            <p aria-live="polite" className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-muted">
              {said || t.natisnete}
            </p>
          </section>

          {current && (
            <section className="card p-4">
              <h2 className="text-sm font-medium">{t.tazi}</h2>

              <label className="mt-3 block">
                <span className="text-[11px] text-muted">{t.ime}</span>
                <input
                  value={imeNaEzik(current.name, ezik)}
                  onChange={(e) => dispatch({ type: 'rename', id: current.id, name: e.target.value })}
                  className="field mt-1 w-full py-1.5 text-sm"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-[11px] text-muted">{t.vid}</span>
                <select
                  value={current.kind}
                  onChange={(e) =>
                    dispatch({ type: 'kind', id: current.id, kind: e.target.value as FlatRoomKind })
                  }
                  className="field mt-1 w-full py-1.5 text-sm"
                >
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {vid(kind)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field
                  label={t.shirina}
                  value={current.width}
                  onChange={(width) => resize(current.id, width, current.depth)}
                />
                <Field
                  label={t.dalbochina}
                  value={current.depth}
                  onChange={(depth) => resize(current.id, current.width, depth)}
                />
              </div>

              <p className="mt-3 text-xs text-muted">
                {kv(current)} {ezik === 'bg' ? 'м²' : 'm²'} ·{' '}
                {neighbours.length
                  ? t.granichi(izbroi(neighbours.map((n) => roomName(n.room)), ezik))
                  : t.negranichi}
              </p>

              {isFurnished(current.kind) ? (
                <>
                  {isDone(current) && (
                    <p className="mt-4 flex items-center gap-2 rounded-field bg-accent/10 px-3 py-2 text-xs text-foreground">
                      <span aria-hidden="true">✓</span>
                      {t.gotovaE}
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
                      {t.oshteNe}
                    </p>
                  )}
                  {isDone(current) && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'unfinish', id: current.id })}
                      className="mt-2 block text-[13px] text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {t.nezavarshena}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-4 rounded-field bg-surface-sunken px-3 py-2 text-xs leading-relaxed text-muted">
                  {t.nyamaPravila(vid(current.kind).toLowerCase())}
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
                {t.iztriite(roomName(current).toLowerCase())}
              </button>
            </section>
          )}

          {clashes.length > 0 && (
            <p role="alert" className="text-xs leading-relaxed text-danger">
              {t.dveNaEdno(
                izbroi(
                  clashes.map(([a, b]) => t.i(roomName(a), roomName(b))),
                  ezik,
                ),
              )}
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
              {t.otmeni}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'redo' })}
              disabled={!canRedoFlat(history)}
              className="btn btn-quiet px-3 py-1.5 text-[13px] disabled:opacity-40"
            >
              {t.povtori}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'reset' })}
              className="btn btn-quiet px-3 py-1.5 text-[13px]"
            >
              {t.otnachalo}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ArrowButton({ item, onWalk }: { item: { dir: Direction; sign: string }; onWalk: (d: Direction) => void }) {
  const t = useT(JILISHTE);
  return (
    <button
      type="button"
      onClick={() => onWalk(item.dir)}
      aria-label={t.idi(t.posokaMalko[item.dir])}
      className="h-10 w-10 rounded-field bg-surface-sunken text-lg transition-colors hover:bg-border"
    >
      {item.sign}
    </button>
  );
}

/**
 * Поле за мярка. Пише се на чернова и се записва с Enter или при
 * излизане от полето.
 *
 * Записваше се при всеки клавиш: докато човек пише 3000, стаята минаваше
 * през 3, 30 и 300 мм — тоест през най-малката позволена. Празна стая
 * просто подскачаше, но обзаведената или отказваше още на първата цифра,
 * или придърпваше масите в междинната мярка и после не ги връщаше.
 * Стрелките на полето вървят по една стъпка и се записват веднага.
 */
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string | null) => {
    setDraft(null);
    if (raw === null || raw.trim() === '') return;
    const next = Number(raw);
    if (Number.isFinite(next) && next !== value) onChange(next);
  };
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type="number"
        value={draft ?? value}
        min={FLAT.MIN_SIDE}
        max={FLAT.MAX_SIDE}
        step={FLAT.STEP}
        onChange={(e) => {
          const raw = e.target.value;
          if (Math.abs(Number(raw) - value) === FLAT.STEP) commit(raw);
          else setDraft(raw);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft);
          if (e.key === 'Escape') setDraft(null);
        }}
        className="dim field mt-1 w-full py-1.5 text-sm"
      />
    </label>
  );
}
