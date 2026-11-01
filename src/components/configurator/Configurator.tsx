'use client';

import Link from 'next/link';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DIM, type Kitchen, computeKitchen } from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import {
  CABINET_COLUMNS,
  EXPORT_COLUMNS,
  type ExportView,
  exportFileName,
  toCabinetRows,
  toCsv,
  toExportRows,
} from '@/lib/export-mapping';
import { KitchenDrawing } from './KitchenDrawing';
import { MaterialsPanel } from './MaterialsPanel';
import { ResultTabs } from './ResultTabs';
import { RowEditor } from './RowEditor';
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
  const wall = kitchen.walls[0];
  const placed = result.placed[0];
  const status = result.rowStatus[0];

  const downloadCsv = () => {
    const csv =
      view === 'cabinets'
        ? toCsv(toCabinetRows(result, kitchen.materials), CABINET_COLUMNS)
        : toCsv(toExportRows(result, view), EXPORT_COLUMNS);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(view, 'csv');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Конфигуратор</p>
          <h1 className="font-display mt-1 text-2xl sm:text-3xl">Права кухня на една стена</h1>
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
          <div className="paper-grid border border-border bg-surface p-2 sm:p-4">
            <KitchenDrawing
              wall={wall}
              placed={placed}
              status={status}
              worktop={kitchen.materials.worktop}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={(id, toIndex) => dispatch({ type: 'reorder', id, toIndex })}
              onWallLength={(value) => dispatch({ type: 'wallLength', value })}
            />
          </div>

          <ResultTabs
            result={result}
            materials={kitchen.materials}
            view={view}
            onViewChange={setView}
          />
        </div>

        <aside className="space-y-6">
          <section className="border border-border bg-surface px-4 py-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-muted">
                Дължина на стената
              </span>
              <span className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={DIM.WALL_MIN}
                  max={DIM.WALL_MAX}
                  step={DIM.WALL_STEP}
                  value={wall.length}
                  onChange={(e) =>
                    dispatch({ type: 'wallLength', value: Number(e.target.value) })
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
                    dispatch({ type: 'wallLength', value: clampWall(Number(e.target.value)) })
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
            modules={placed.base}
            status={status.base}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />

          <RowEditor
            row="upper"
            modules={placed.upper}
            status={status.upper}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
          />

          <MaterialsPanel materials={kitchen.materials} dispatch={dispatch} />

          <section className="border border-border bg-surface px-4 py-4">
            <h3 className="font-display text-sm uppercase tracking-wide">Готово?</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/kontakt?konfiguraciya=1"
                className="border border-accent bg-accent px-4 py-2.5 text-center text-sm text-accent-contrast transition-opacity hover:opacity-90"
              >
                Изпрати за оферта
              </Link>
              <button
                type="button"
                onClick={downloadCsv}
                className="border border-border px-4 py-2.5 text-sm transition-colors hover:border-accent hover:text-accent"
              >
                Свали CSV за цеха ({VIEW_LABEL[view].toLowerCase()})
              </button>
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
    </div>
  );
}
