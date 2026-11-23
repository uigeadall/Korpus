'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  DIM,
  MODULES,
  type ModuleKind,
  ROOM,
  ROOM_KINDS,
  type RoomKind,
  emptyRoom,
  ROOM_KIND_LABEL,
  type RowId,
  WALL_SIDE_LABEL,
  type WallSide,
  clampRoom,
  computeKitchen,
  kitchenPlan,
  kitchenDoor,
  kitchenRoom,
  kitchenWallOpenings,
  kitchenWindows,
  rulesNote,
  wallSide,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import {
  type Point,
  calibrate,
  clampOpacity,
  fitUnderlay,
  moveUnderlay,
  scaleUnderlay,
} from '@/lib/furniture/underlay';
import {
  CABINET_COLUMNS,
  EXPORT_COLUMNS,
  type ExportView,
  exportFileName,
  toCabinetRows,
  toCsv,
  toExportRows,
  workbookFileName,
} from '@/lib/export-mapping';
import { offerFileName } from '@/lib/pdf/names';
import { decodeProject, encodeProject } from '@/lib/share';
import { KitchenDrawing } from './KitchenDrawing';
import { ActionBar } from './ActionBar';
import { ModulePalette } from './ModulePalette';
import { Timeline } from './Timeline';
import { Scene3D } from './Scene3D';
import { MaterialsPanel } from './MaterialsPanel';
import { OpeningsPanel } from './OpeningsPanel';
import { Panel } from './Panel';
import { UnderlayPanel, type UnderlayState } from './UnderlayPanel';
import { ResultTabs } from './ResultTabs';
import { RoomPlan, type PlanMode } from './RoomPlan';
import { RowEditor } from './RowEditor';
import { RowStatusBar } from './RowStatusBar';
import { WallTabs } from './WallTabs';
import { WallFinishPanel } from './WallFinishPanel';
import { FloorFinishPanel } from './FloorFinishPanel';
import { useFitToViewport } from '@/components/useFitToViewport';
import { useFlash } from '@/components/useFlash';
import { ScrollMore } from '@/components/ScrollMore';
import { PriceEstimate } from '@/components/proekt/PriceEstimate';
import { ErgonomicsNotes } from '@/components/ErgonomicsNotes';
import { ergonomics } from '@/lib/ergonomics';
import {
  type Action,
  NO_ROOM,
  blockedByWall,
  canRedo,
  canUndo,
  clampWall,
  historyReducer,
  initHistory,
  loadLocal,
  sampleKitchen,
  saveLocal,
} from './state';

const VIEW_LABEL: Record<ExportView, string> = {
  cabinet: 'По шкафове',
  material: 'По материал',
  cabinets: 'Заявка за шкафове',
};

export function Configurator() {
  const [history, dispatchHistory] = useReducer(historyReducer, undefined, () =>
    initHistory(sampleKitchen()),
  );
  const kitchen = history.present;
  /*
   * Всичко минава оттук. Действие, за което няма място на стената, не
   * минава (виж `reducer`) — и казва защо, вместо да мълчи.
   */
  const [notice, flash] = useFlash();
  // Стабилна обвивка: ефектите, които я ползват, не бива да се
  // пренавързват при всяка промяна на кухнята.
  const kitchenNow = useRef(kitchen);
  useEffect(() => {
    kitchenNow.current = kitchen;
  }, [kitchen]);
  const dispatch = useCallback(
    (a: Action) => {
      if (blockedByWall(kitchenNow.current, a)) flash(NO_ROOM);
      dispatchHistory(a);
    },
    [flash],
  );

  // Отбелязва се с редуктор, а не със setState: връщането става вътре в
  // ефект, а setState там върти излишен цикъл рендери.
  const [restored, markRestored] = useReducer(() => true, false);
  /*
   * Избраното е списък: лентата позволява да се маркират няколко
   * клипа наведнъж. Чертежът и панелите работят с един — за тях важи
   * последният избран.
   */
  const [selected, setSelected] = useState<string[]>([]);
  /** Стената, за която се избира покритие — обемът се обръща към нея. */
  const [wallTarget, setWallTarget] = useState<WallSide | null>(null);
  /** Дясната колона се плъзга сама и се побира във видимото. */
  // Двете колони са еднакво високи и свършват на една линия.
  const asideRef = useFitToViewport<HTMLElement>(72, 16, 'exact');
  const selectedId = selected.at(-1) ?? null;
  const setSelectedId = (id: string | null) => setSelected(id ? [id] : []);
  const [view, setView] = useState<ExportView>('cabinet');
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  /** Чертежът е за работа, обемът — за показване на клиента. */
  const [view3d, setView3d] = useState(false);

  /*
   * Модул, вдигнат от палитрата. Държи се тук, защото го виждат и
   * палитрата (кой е вдигнат), и чертежът (къде ще влезе), и сянката,
   * която следва показалеца.
   */
  /*
   * От коя стая на жилището сме дошли. Редуктор, а не `useState`:
   * задава се в ефекта при отваряне.
   */
  const [fromFlat, cameFromRoom] = useReducer(
    (_current: string | null, id: string) => id,
    null as string | null,
  );

  const [dragKind, setDragKind] = useState<ModuleKind | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  // Само се абонира. Сянката не се изчиства тук — при пуснат модул
  // тя така или иначе не се рисува, а setState в ефект върти излишен
  // цикъл рендери.
  useEffect(() => {
    if (!dragKind) return;
    const move = (e: PointerEvent) => setGhost({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [dragKind]);

  /*
   * Какво се отваря, по ред на предимство:
   *
   *   1. Линк с проект — някой го е пратил и иска точно него.
   *   2. Стая от чертежа на жилището — отваря се празна, с нейните
   *      мерки; модулите влизат с влачене от палитрата.
   *   3. Последното, което сме пипали в този браузър.
   *
   * Всичко това става след mount, за да няма разминаване при SSR.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const id = params.get('stayaId');
    const kind = params.get('staya');
    const known = kind && (ROOM_KINDS as readonly string[]).includes(kind);
    const size = (key: string, fallback: number) => {
      const value = Number(params.get(key));
      return Number.isFinite(value) && value > 0 ? clampRoom(value) : fallback;
    };

    const code = params.get('p');
    const shared = code ? decodeProject(code) : null;
    if (shared) {
      /*
       * Стаята в жилището може да е преоразмерена, откакто проектът е
       * запазен. Мебелта си остава — тя е избор на човека — но
       * размерите на стаята следват чертежа, иначе се връщаш в стая,
       * която вече не съществува.
       */
      dispatchHistory({
        type: 'load',
        value: known
          ? {
              ...shared,
              room: {
                width: size('shirina', shared.room?.width ?? 4200),
                depth: size('dalbochina', shared.room?.depth ?? 3200),
              },
            }
          : shared,
      });
      if (id) cameFromRoom(id);
      return;
    }

    if (known) {
      dispatchHistory({
        type: 'load',
        value: emptyRoom(kind as RoomKind, size('shirina', 3600), size('dalbochina', 3000)),
      });
      if (id) cameFromRoom(id);
      return;
    }

    const saved = loadLocal();
    if (saved) {
      dispatchHistory({ type: 'load', value: saved });
      markRestored();
    }
  }, []);

  /*
   * Записваме чак след първата истинска промяна. Иначе самото отваряне на
   * страницата „запазва" примера и при второто идване пише, че е върната
   * конфигурация, която никой не е правил.
   */
  const changed = history.past.length > 0;
  useEffect(() => {
    if (changed) saveLocal(kitchen);
  }, [changed, kitchen]);

  const result = useMemo(() => computeKitchen(kitchen), [kitchen]);
  const notes = useMemo(() => ergonomics(kitchen, result), [kitchen, result]);
  const plan = useMemo(() => kitchenPlan(kitchen, result), [kitchen, result]);
  const room = kitchenRoom(kitchen);
  const door = kitchenDoor(kitchen);
  const windows = kitchenWindows(kitchen);

  // Стената, която се редактира и се чертае отпред. Ако изчезне
  // (махната стена, върната конфигурация), падаме на първата.
  const [activeWallId, setActiveWallId] = useState<string | null>(null);
  const activeIndex = Math.max(
    0,
    kitchen.walls.findIndex((w) => w.id === activeWallId),
  );
  const wall = kitchen.walls[activeIndex];
  const placed = result.placed[activeIndex];
  const status = result.rowStatus[activeIndex];

  /* --- Клавиатура ---------------------------------------------------
   * Конфигураторът се кара с две ръце: едната на мишката, другата на
   * клавишите. Полетата за въвеждане си остават техни — там Backspace
   * трие текст, не шкафове.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName ?? '')
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        dispatchHistory({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        dispatchHistory({ type: 'redo' });
        return;
      }

      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if (!selectedId) return;

      if (mod && key === 'd') {
        e.preventDefault();
        dispatch({ type: 'duplicateMany', ids: selected });
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'removeMany', ids: selected });
        setSelected([]);
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        dispatch({ type: 'nudgeWidth', id: selectedId, dir: 1 });
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        dispatch({ type: 'nudgeWidth', id: selectedId, dir: -1 });
        return;
      }
      // Стрелките върху модул в чертежа се поемат от самия чертеж —
      // тук ловим само случая, в който фокусът е другаде.
      if (target?.closest('svg')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        dispatch({ type: 'move', id: selectedId, dir: e.key === 'ArrowLeft' ? -1 : 1 });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, selected, selectedId]);

  // Планът на жилището живее само в този екран: файлът не се качва
  // никъде и не се записва, затова не е част от конфигурацията.
  const [underlay, setUnderlay] = useState<UnderlayState | null>(null);
  const [planMode, setPlanMode] = useState<PlanMode>('select');
  const [points, setPoints] = useState<Point[]>([]);
  const [realMm, setRealMm] = useState('1000');

  const pickUnderlay = (file: File) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      setUnderlay({ src, name: file.name, aspect, rect: fitUnderlay(room, aspect), opacity: 0.45 });
      setPlanMode('select');
      setPoints([]);
    };
    img.onerror = () => URL.revokeObjectURL(src);
    img.src = src;
  };

  const removeUnderlay = () => {
    if (underlay) URL.revokeObjectURL(underlay.src);
    setUnderlay(null);
    setPlanMode('select');
    setPoints([]);
  };

  const applyCalibration = () => {
    const mm = Number(realMm);
    if (!underlay || points.length !== 2 || !Number.isFinite(mm) || mm <= 0) return;
    setUnderlay({ ...underlay, rect: calibrate(underlay.rect, points[0], points[1], mm) });
    setPoints([]);
    setPlanMode('select');
  };

  // Нова стена става активната — иначе бутонът изглежда, че не прави нищо.
  const wallCount = useRef(kitchen.walls.length);
  useEffect(() => {
    if (kitchen.walls.length > wallCount.current) {
      setActiveWallId(kitchen.walls.at(-1)?.id ?? null);
      setSelectedId(null);
    }
    wallCount.current = kitchen.walls.length;
  }, [kitchen.walls]);

  const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const csv =
      view === 'cabinets'
        ? toCsv(toCabinetRows(result, kitchen.materials), CABINET_COLUMNS)
        : toCsv(toExportRows(result, view), EXPORT_COLUMNS);
    save(new Blob([csv], { type: 'text/csv;charset=utf-8' }), exportFileName(view, 'csv'));
  };

  /** XLSX и PDF се правят на сървъра — файловете излизат сметнати с
   * правилата на сайта, а браузърът не носи библиотеките. */
  const download = async (kind: 'xlsx' | 'pdf') => {
    setExporting(kind);
    setExportError(null);
    try {
      const response = await fetch(`/api/export/${kind}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(kitchen),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Грешка ${response.status}`);
      }
      save(await response.blob(), kind === 'xlsx' ? workbookFileName() : offerFileName());
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Нещо се обърка.');
    } finally {
      setExporting(null);
    }
  };

  const selectWall = useCallback((id: string) => {
    setActiveWallId(id);
    setSelectedId(null);
  }, []);


  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          {/* Инструментът е наш, не на клиента — казва се направо. */}
          <p className="eyebrow">Конфигуратор · вътрешен инструмент</p>
          <h1 className="font-display mt-1 text-3xl sm:text-4xl">
            {ROOM_KIND_LABEL[kitchen.roomKind ?? 'kitchen']} в стаята
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <HistoryButton
            label="Назад (⌘Z)"
            disabled={!canUndo(history)}
            onClick={() => dispatchHistory({ type: 'undo' })}
          >
            ↶ Назад
          </HistoryButton>
          <HistoryButton
            label="Напред (⌘⇧Z)"
            disabled={!canRedo(history)}
            onClick={() => dispatchHistory({ type: 'redo' })}
          >
            ↷ Напред
          </HistoryButton>
        </div>
      </header>

      {/*
        Проект от по-стари правила. Старите формули не се пазят и не
        могат да се пуснат наново — затова се казва направо, вместо
        числата да се преизчислят мълчаливо.
      */}
      {rulesNote(kitchen) && (
        <p role="status" className="well mb-5 px-4 py-3 text-sm text-muted">
          {rulesNote(kitchen)}
        </p>
      )}

      {restored && (
        <p className="well mb-5 px-4 py-3 text-sm text-muted">
          Върнахме последната ви конфигурация от този браузър.{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-accent"
            onClick={() => dispatch({ type: 'load', value: sampleKitchen() })}
          >
            Започни от примера
          </button>
        </p>
      )}

      {/* Поне колкото екрана — виж „Направи проект". */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:min-h-[calc(100dvh-5.5rem)] lg:grid-cols-[minmax(0,1fr)_360px]">
        {/*
          Работната площ стои на екрана, докато се работи отдясно. Щом
          стане по-висока от прозореца, се скролира сама: закована колона,
          по-дълга от екрана, крие долния си край — страницата се плъзга
          под нея, но тя не мърда и лентата долу не се стига.
        */}
        <div
          data-kolona="lyava"
          className="space-y-3 pb-24 lg:h-[calc(100dvh-5.5rem)] lg:overflow-y-auto"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <WallTabs
              walls={kitchen.walls}
              activeWallId={wall.id}
              onSelect={selectWall}
              onAdd={(side: WallSide) => dispatch({ type: 'addWall', side })}
              onRemove={(id) => dispatch({ type: 'removeWall', wallId: id })}
            />
            <div className="flex items-center gap-3">
              <p className="dim text-xs">
                {WALL_SIDE_LABEL[wallSide(wall, activeIndex)].toLowerCase()} стена ·{' '}
                {formatMm(wall.length)} мм
              </p>
              <div className="flex gap-1 rounded-pill bg-surface-sunken p-0.5">
                {(
                  [
                    [false, 'Чертеж'],
                    [true, 'Обем'],
                  ] as const
                ).map(([is3d, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setView3d(is3d)}
                    aria-pressed={view3d === is3d}
                    className={`rounded-pill px-3 py-1 text-[13px] transition-colors ${
                      view3d === is3d ? 'bg-surface shadow-sm' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/*
            Дошли от чертежа на жилището — стаята е празна и първото,
            което трябва да е под ръка, е връщането с готовото.
          */}
          {fromFlat && (
            <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="text-sm text-muted">
                Обзавеждате{' '}
                <strong className="font-medium text-foreground">
                  {ROOM_KIND_LABEL[kitchen.roomKind ?? 'kitchen'].toLowerCase()}
                </strong>{' '}
                от жилището. Завлечете модули от палитрата вдясно.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/proekt?staya=${kitchen.roomKind ?? 'kitchen'}&shirina=${room.width}&dalbochina=${room.depth}&stayaId=${encodeURIComponent(fromFlat)}`}
                  className="btn btn-quiet px-3 py-2 text-[13px]"
                >
                  Нека правилата я подредят
                </Link>
                <Link
                  href={`/jilishte?gotova=${encodeURIComponent(fromFlat)}&p=${encodeProject(kitchen)}`}
                  className="btn btn-primary px-3 py-2 text-[13px]"
                >
                  Готово — обратно към жилището
                </Link>
              </div>
            </div>
          )}

          <RowStatusBar
            status={status}
            onFill={(row: RowId) => wall.id && dispatch({ type: 'fill', wallId: wall.id, row })}
          />

          {notice && (
            <p role="status" className="rounded-field bg-danger/8 px-4 py-2.5 text-xs text-danger">
              {notice}
            </p>
          )}

          {view3d ? (
            <div className="card overflow-hidden bg-gradient-to-b from-surface to-surface-sunken">
              <Scene3D
                kitchen={kitchen}
                room={room}
                placed={result.placed}
                worktop={kitchen.materials.worktop}
                focusSide={wallTarget ?? undefined}
                onShelves={(id, value) => dispatch({ type: 'shelves', id, value })}
                /* Същото влачене от палитрата работи и тук — нарежда се по
                   активната стена, както в чертежа. */
                dropKind={dragKind}
                dropWallIndex={activeIndex}
                onDropModule={(kind, row, index) => {
                  if (wall.id) dispatch({ type: 'add', wallId: wall.id, row, kind, atIndex: index });
                  setDragKind(null);
                }}
                onDropCancel={() => setDragKind(null)}
                onMoveModule={(id, toIndex) => dispatch({ type: 'reorder', id, toIndex })}
                onSlideModule={(id, left) => dispatch({ type: 'slide', id, left })}
                onRemoveModule={(id) => {
                  dispatch({ type: 'remove', id });
                  setSelected((s) => s.filter((x) => x !== id));
                }}
              />
            </div>
          ) : (
          <div className="paper-grid card overflow-hidden p-3 sm:p-4">
            <KitchenDrawing
              wall={wall}
              openings={kitchenWallOpenings(kitchen, wallSide(wall, activeIndex))}
              dropKind={dragKind}
              onDropModule={(kind, row, index) => {
                if (wall.id) dispatch({ type: 'add', wallId: wall.id, row, kind, atIndex: index });
                setDragKind(null);
              }}
              onDropCancel={() => setDragKind(null)}
              placed={placed}
              status={status}
              worktop={kitchen.materials.worktop}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={(id, toIndex) => dispatch({ type: 'reorder', id, toIndex })}
              onWallLength={(value) =>
                wall.id && dispatch({ type: 'wallLength', wallId: wall.id, value })
              }
              onMoveToRow={(id, toIndex) => dispatch({ type: 'moveToRow', id, toIndex })}
              onNudgeWidth={(id, dir) => dispatch({ type: 'nudgeWidth', id, dir })}
              onHinge={(id) => {
                const m = [...placed.base, ...placed.upper].find((x) => x.id === id);
                dispatch({ type: 'hinge', id, value: m?.hingeSide === 'left' ? 'right' : 'left' });
              }}
              onDuplicate={(id) => dispatch({ type: 'duplicate', id })}
              onRemove={(id) => {
                dispatch({ type: 'remove', id });
                setSelectedId(null);
              }}
            />
          </div>
          )}

          {/* Сянката на вдигнатия модул — иначе влаченето е невидимо. */}
          {dragKind && ghost && (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-50 rounded-field bg-accent px-2.5 py-1.5 text-[12px] text-accent-contrast shadow-lg"
              style={{ left: ghost.x + 14, top: ghost.y + 14 }}
            >
              {MODULES[dragKind].label}
            </div>
          )}

          {/* Лентата: стената като пътечки с клипове. */}
          {!view3d && (
            <Timeline
              roomKind={kitchen.roomKind ?? 'kitchen'}
              side={wallSide(wall, activeIndex)}
              wallLength={wall.length}
              placed={placed}
              selected={selected}
              onSelect={setSelected}
              onReorder={(id, toIndex) => dispatch({ type: 'reorder', id, toIndex })}
              onWidth={(ids, value) => dispatch({ type: 'widthMany', ids, value })}
            />
          )}

          {/*
            Долната лента: едрите действия, винаги под ръка. Лепната
            е за дъното, затова под нея има място — иначе застава
            върху лентата с клиповете и те не се хващат.
          */}
          <ActionBar
            count={selected.length}
            onDuplicate={() => dispatch({ type: 'duplicateMany', ids: selected })}
            onWidth={(dir) => {
              for (const id of selected) dispatch({ type: 'nudgeWidth', id, dir });
            }}
            onRemove={() => {
              dispatch({ type: 'removeMany', ids: selected });
              setSelected([]);
            }}
            done={
              fromFlat
                ? `/jilishte?gotova=${encodeURIComponent(fromFlat)}&p=${encodeProject(kitchen)}`
                : null
            }
          />

          <p className="dim hidden text-[11px] leading-relaxed text-muted lg:block">
            Щракни шкаф, за да го редактираш на място. Влачи, за да го местиш — и между
            двата реда. <Key>←</Key> <Key>→</Key> местят, <Key>−</Key> <Key>+</Key> сменят
            ширината, <Key>⌘D</Key> прави копие, <Key>Delete</Key> маха, <Key>⌘Z</Key> връща.
          </p>
        </div>

        {/* Панелите: това, което се пипа рядко, стои сгънато. На широк
            екран колоната се плъзга сама и не избутва чертежа (виж
            „Направи проект"). */}
        <aside
          ref={asideRef}
          className="min-w-0 space-y-3 lg:h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:[scrollbar-width:thin]"
        >
          {/*
            Палитрата е най-горе вдясно: оттам се вземат модулите за
            тази стая и се пускат в чертежа. Едно място — преди всеки
            ред имаше и свои бутони „+" за същото.
          */}
          <section className="card p-4">
            <h2 className="font-display text-base">Модули</h2>
            <div className="mt-3">
              <ModulePalette
                room={kitchen.roomKind ?? 'kitchen'}
                dragging={dragKind}
                onGrab={(kind, e) => {
                  setDragKind(kind);
                  setGhost({ x: e.clientX, y: e.clientY });
                }}
                onAdd={(kind) =>
                  wall.id &&
                  dispatch({ type: 'add', wallId: wall.id, row: MODULES[kind].row, kind })
                }
              />
            </div>
          </section>

          <RowEditor
            row="base"
            roomKind={kitchen.roomKind}
            modules={placed.base}
            status={status.base}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />

          <RowEditor
            row="upper"
            roomKind={kitchen.roomKind}
            modules={placed.upper}
            status={status.upper}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />

          <Panel title="Стая и стени" badge={`${formatMm(room.width)} × ${formatMm(room.depth)}`}>
            <div className="px-4 py-4">
              <RoomPlan
                room={room}
                door={door}
                onDoorChange={(value) => dispatch({ type: 'door', value })}
                windows={windows}
                onWindowChange={(win) => dispatch({ type: 'window', id: win.id, value: win })}
                walls={kitchen.walls}
                plan={plan}
                activeWallId={wall.id}
                onSelect={selectWall}
                underlay={underlay}
                mode={planMode}
                points={points}
                onPickPoint={(p) => setPoints((prev) => (prev.length >= 2 ? [p] : [...prev, p]))}
                onMoveUnderlay={(dx, dy) =>
                  setUnderlay((u) => (u ? { ...u, rect: moveUnderlay(u.rect, dx, dy) } : u))
                }
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-muted">Ширина</span>
                  <span className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={ROOM.MIN}
                      max={ROOM.MAX}
                      step={ROOM.STEP}
                      value={room.width}
                      onChange={(e) =>
                        dispatch({
                          type: 'room',
                          value: { width: clampRoom(Number(e.target.value)) },
                        })
                      }
                      className="field dim w-full text-sm"
                      aria-label="Ширина на стаята в милиметри"
                    />
                    <span className="text-xs text-muted">мм</span>
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm text-muted">Дълбочина</span>
                  <span className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={ROOM.MIN}
                      max={ROOM.MAX}
                      step={ROOM.STEP}
                      value={room.depth}
                      onChange={(e) =>
                        dispatch({
                          type: 'room',
                          value: { depth: clampRoom(Number(e.target.value)) },
                        })
                      }
                      className="field dim w-full text-sm"
                      aria-label="Дълбочина на стаята в милиметри"
                    />
                    <span className="text-xs text-muted">мм</span>
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm text-muted">До тавана</span>
                  <span className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={ROOM.HEIGHT_MIN}
                      max={ROOM.HEIGHT_MAX}
                      step={ROOM.STEP}
                      value={room.height ?? ROOM.HEIGHT}
                      onChange={(e) =>
                        dispatch({ type: 'room', value: { height: Number(e.target.value) } })
                      }
                      className="field dim w-full text-sm"
                      aria-label="Височина до тавана в милиметри"
                    />
                    <span className="text-xs text-muted">мм</span>
                  </span>
                </label>
              </div>

              <label className="mt-4 block border-t border-border pt-4">
                <span className="text-sm text-muted">
                  {WALL_SIDE_LABEL[wallSide(wall, activeIndex)]} стена — дължина на участъка
                </span>
                <span className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={DIM.WALL_MIN}
                    max={DIM.WALL_MAX}
                    step={DIM.WALL_STEP}
                    value={wall.length}
                    onChange={(e) =>
                      wall.id &&
                      dispatch({
                        type: 'wallLength',
                        wallId: wall.id,
                        value: Number(e.target.value),
                      })
                    }
                    className="h-1 flex-1 accent-[var(--accent)]"
                  />
                  <input
                    type="number"
                    min={DIM.WALL_MIN}
                    max={DIM.WALL_MAX}
                    step={DIM.WALL_STEP}
                    value={wall.length}
                    onChange={(e) =>
                      wall.id &&
                      dispatch({
                        type: 'wallLength',
                        wallId: wall.id,
                        value: clampWall(Number(e.target.value)),
                      })
                    }
                    className="field dim w-24 text-sm"
                    aria-label="Дължина на стената в милиметри"
                  />
                  <span className="text-xs text-muted">мм</span>
                </span>
              </label>
            </div>
          </Panel>

          <Panel
            title="Врата и прозорци"
            badge={
              windows.length
                ? `врата + ${windows.length} прозореца`
                : `врата · ${WALL_SIDE_LABEL[door.side].toLowerCase()}`
            }
          >
            <OpeningsPanel room={room} door={door} windows={windows} dispatch={dispatch} />
          </Panel>

          <Panel title="План на жилището" badge={underlay ? 'качен' : 'няма'}>
            <UnderlayPanel
              underlay={underlay}
              mode={planMode}
              points={points}
              realMm={realMm}
              onPick={pickUnderlay}
              onRemove={removeUnderlay}
              onMode={setPlanMode}
              onOpacity={(value) =>
                setUnderlay((u) => (u ? { ...u, opacity: clampOpacity(value) } : u))
              }
              onScale={(factor) =>
                setUnderlay((u) =>
                  u
                    ? {
                        ...u,
                        rect: scaleUnderlay(u.rect, factor, {
                          x: u.rect.x + u.rect.width / 2,
                          y: u.rect.y + u.rect.height / 2,
                        }),
                      }
                    : u,
                )
              }
              onRealMm={setRealMm}
              onApplyCalibration={applyCalibration}
              onResetPoints={() => setPoints([])}
            />
          </Panel>

          <Panel title="Материали">
            <MaterialsPanel materials={kitchen.materials} dispatch={dispatch} />
          </Panel>

          {notes.length > 0 && (
            <Panel
              title="Удобство"
              badge={notes.length}
              open={notes.some((n) => n.level === 'warn')}
            >
              <div className="px-5 pt-1 pb-5">
                <ErgonomicsNotes notes={notes} />
              </div>
            </Panel>
          )}

          <Panel title="Цена">
            <div className="px-5 pt-1 pb-5">
              <PriceEstimate kitchen={kitchen} result={result} />
            </div>
          </Panel>

          <Panel title="Стени">
            <div className="px-5 pt-1 pb-5">
            <WallFinishPanel
              choice={kitchen.wallFinish}
              onChoose={(side, id) => dispatch({ type: 'wallFinish', side, id })}
              focusSide={wallSide(kitchen.walls[0])}
              onTargetChange={(t) => setWallTarget(t === 'all' ? null : t)}
            />
            </div>
          </Panel>

          <Panel title="Под">
            <div className="px-5 pt-1 pb-5">
              <FloorFinishPanel
                value={kitchen.floorFinish}
                onChoose={(id) => dispatch({ type: 'floorFinish', id })}
              />
            </div>
          </Panel>

          <section className="card p-5">
            <h2 className="font-display text-lg">Готово?</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/kontakt?konfiguraciya=1"
                className="btn btn-primary w-full py-3"
              >
                Изпрати за оферта
              </Link>
              <button
                type="button"
                onClick={() => download('pdf')}
                disabled={exporting !== null}
                className="btn btn-quiet w-full py-3 disabled:opacity-50"
              >
                {exporting === 'pdf' ? 'Подготвя се…' : 'Свали PDF с чертежа'}
              </button>
              <button
                type="button"
                onClick={() => download('xlsx')}
                disabled={exporting !== null}
                className="btn btn-quiet w-full py-3 disabled:opacity-50"
              >
                {exporting === 'xlsx' ? 'Подготвя се…' : 'Свали XLSX за цеха (4 листа)'}
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="btn btn-quiet w-full py-3"
              >
                Свали CSV ({VIEW_LABEL[view].toLowerCase()})
              </button>
              {exportError && (
                <p role="alert" className="text-xs text-danger">
                  {exportError}
                </p>
              )}
              <button
                type="button"
                onClick={() => dispatch({ type: 'reset' })}
                className="rounded-pill px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-sunken"
              >
                Изчисти всичко
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Това не е оферта. Точната цена следва след измерване на място. Правила версия{' '}
              {result.rulesVersion}.
            </p>
          </section>
          <ScrollMore target={asideRef} />
        </aside>
      </div>

      <div className="mt-5">
        <ResultTabs
          result={result}
          materials={kitchen.materials}
          view={view}
          onViewChange={setView}
        />
      </div>
    </main>
  );
}

function HistoryButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-pill bg-surface-sunken px-3.5 py-2 text-[13px] transition-colors hover:bg-border disabled:opacity-30 disabled:hover:bg-surface-sunken"
    >
      {children}
    </button>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border border-border px-1 font-mono text-[10px] text-foreground">{children}</kbd>
  );
}
