'use client';

import Link from 'next/link';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  DIM,
  type Kitchen,
  ROOM,
  WALL_SIDE_LABEL,
  type WallSide,
  clampRoom,
  computeKitchen,
  kitchenPlan,
  kitchenRoom,
  wallSide,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
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
import { KitchenDrawing } from './KitchenDrawing';
import { MaterialsPanel } from './MaterialsPanel';
import { ResultTabs } from './ResultTabs';
import { RoomPlan } from './RoomPlan';
import { RowEditor } from './RowEditor';
import { WallTabs } from './WallTabs';
import { type Action, clampWall, loadLocal, reducer, sampleKitchen, saveLocal } from './state';

const VIEW_LABEL: Record<ExportView, string> = {
  cabinet: 'По шкафове',
  material: 'По материал',
  cabinets: 'Заявка за шкафове',
};

/** Състояние на екрана: кухнята + дали е върната от браузъра. */
interface UiState {
  kitchen: Kitchen;
  restored: boolean;
}

type UiAction = Action | { type: 'restore'; value: Kitchen };

function uiReducer(state: UiState, action: UiAction): UiState {
  if (action.type === 'restore') return { kitchen: action.value, restored: true };
  return { kitchen: reducer(state.kitchen, action), restored: false };
}

export function Configurator() {
  const [{ kitchen, restored }, dispatchUi] = useReducer(uiReducer, undefined, () => ({
    kitchen: sampleKitchen(),
    restored: false,
  }));
  const dispatch: (a: Action) => void = dispatchUi;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ExportView>('cabinet');
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Връщаме последната конфигурация след mount, за да няма разминаване при SSR.
  useEffect(() => {
    const saved = loadLocal();
    if (saved) dispatchUi({ type: 'restore', value: saved });
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (hydrated.current) saveLocal(kitchen);
  }, [kitchen]);

  const result = useMemo(() => computeKitchen(kitchen), [kitchen]);
  const plan = useMemo(() => kitchenPlan(kitchen, result), [kitchen, result]);
  const room = kitchenRoom(kitchen);

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

  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Конфигуратор</p>
          <h1 className="font-display mt-1 text-2xl sm:text-3xl">Кухня в стаята</h1>
        </div>
        <p className="dim max-w-sm text-xs leading-relaxed">
          Чертежът, спецификацията и разбивката за разкрой се преизчисляват при всяка промяна.
          Правила версия {result.rulesVersion}.
        </p>
      </header>

      {restored && (
        <p className="mb-4 border border-border bg-surface-sunken px-3 py-2 text-xs text-muted">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="border border-border bg-surface px-3 py-3 sm:px-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-sm uppercase tracking-wide">Стаята отгоре</h2>
              <p className="dim text-xs">
                {formatMm(room.width)} × {formatMm(room.depth)} мм
              </p>
            </div>
            <RoomPlan
              room={room}
              walls={kitchen.walls}
              plan={plan}
              activeWallId={wall.id}
              onSelect={(id) => {
                setActiveWallId(id);
                setSelectedId(null);
              }}
            />
            <div className="mt-3 border-t border-border pt-3">
              <WallTabs
                walls={kitchen.walls}
                activeWallId={wall.id}
                onSelect={(id) => {
                  setActiveWallId(id);
                  setSelectedId(null);
                }}
                onAdd={(side: WallSide) => dispatch({ type: 'addWall', side })}
                onRemove={(id) => dispatch({ type: 'removeWall', wallId: id })}
              />
            </div>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-sm uppercase tracking-wide">
                Отпред — {WALL_SIDE_LABEL[wallSide(wall, activeIndex)].toLowerCase()} стена
              </h2>
              <p className="dim text-xs">{formatMm(wall.length)} мм</p>
            </div>
            <div className="paper-grid border border-border bg-surface p-2 sm:p-4">
              <KitchenDrawing
                wall={wall}
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
              />
            </div>
          </section>

          <ResultTabs
            result={result}
            materials={kitchen.materials}
            view={view}
            onViewChange={setView}
          />
        </div>

        <aside className="space-y-6">
          <section className="border border-border bg-surface px-4 py-4">
            <h2 className="font-display text-sm uppercase tracking-wide">Стая</h2>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-muted">Ширина</span>
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
                    className="dim w-full border border-border bg-surface px-2 py-1 text-sm"
                    aria-label="Ширина на стаята в милиметри"
                  />
                  <span className="text-xs text-muted">мм</span>
                </span>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-muted">Дълбочина</span>
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
                    className="dim w-full border border-border bg-surface px-2 py-1 text-sm"
                    aria-label="Дълбочина на стаята в милиметри"
                  />
                  <span className="text-xs text-muted">мм</span>
                </span>
              </label>
            </div>

            <label className="mt-4 block border-t border-border pt-4">
              <span className="text-xs uppercase tracking-[0.12em] text-muted">
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
                  className="dim w-24 border border-border bg-surface px-2 py-1 text-sm"
                  aria-label="Дължина на стената в милиметри"
                />
                <span className="text-xs text-muted">мм</span>
              </span>
            </label>
          </section>

          <RowEditor
            row="base"
            wallId={wall.id}
            modules={placed.base}
            status={status.base}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />

          <RowEditor
            row="upper"
            wallId={wall.id}
            modules={placed.upper}
            status={status.upper}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />

          <MaterialsPanel materials={kitchen.materials} dispatch={dispatch} />

          <section className="border border-border bg-surface px-4 py-4">
            <h2 className="font-display text-sm uppercase tracking-wide">Готово?</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/kontakt?konfiguraciya=1"
                className="border border-accent bg-accent px-4 py-2.5 text-center text-sm text-accent-contrast transition-opacity hover:opacity-90"
              >
                Изпрати за оферта
              </Link>
              <button
                type="button"
                onClick={() => download('pdf')}
                disabled={exporting !== null}
                className="border border-border px-4 py-2.5 text-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {exporting === 'pdf' ? 'Подготвя се…' : 'Свали PDF с чертежа'}
              </button>
              <button
                type="button"
                onClick={() => download('xlsx')}
                disabled={exporting !== null}
                className="border border-border px-4 py-2.5 text-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {exporting === 'xlsx' ? 'Подготвя се…' : 'Свали XLSX за цеха (4 листа)'}
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="border border-border px-4 py-2.5 text-sm transition-colors hover:border-accent hover:text-accent"
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
                className="px-4 py-2 text-xs text-muted underline underline-offset-2 hover:text-accent"
              >
                Изчисти всичко
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Това не е оферта. Точната цена следва след измерване на място. Обща дължина{' '}
              <span className="dim">{formatMm(wall.length)} мм</span>.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
