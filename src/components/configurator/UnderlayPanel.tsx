'use client';

/**
 * Планът на жилището като подложка под изгледа отгоре.
 *
 * Файлът се чете в браузъра и не тръгва никъде — няма качване, няма
 * запазване. Затова при презареждане трябва да се избере пак; така
 * остава, докато няма хранилище (план 0.2 и 3.3).
 */

import { useRef } from 'react';
import { formatMm } from '@/lib/drawing';
import { UNDERLAY, type Point, type UnderlayRect } from '@/lib/furniture/underlay';
import type { PlanMode } from './RoomPlan';

export interface UnderlayState {
  /** Адрес в браузъра (object URL). */
  src: string;
  name: string;
  aspect: number;
  rect: UnderlayRect;
  opacity: number;
}

interface Props {
  underlay: UnderlayState | null;
  mode: PlanMode;
  points: Point[];
  realMm: string;
  onPick: (file: File) => void;
  onRemove: () => void;
  onMode: (mode: PlanMode) => void;
  onOpacity: (value: number) => void;
  onScale: (factor: number) => void;
  onRealMm: (value: string) => void;
  onApplyCalibration: () => void;
  onResetPoints: () => void;
}

export function UnderlayPanel({
  underlay,
  mode,
  points,
  realMm,
  onPick,
  onRemove,
  onMode,
  onOpacity,
  onScale,
  onRealMm,
  onApplyCalibration,
  onResetPoints,
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <section className="border border-border bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="font-display text-sm ">План на жилището</h2>
        {underlay && (
          <p className="dim text-xs">
            {formatMm(Math.round(underlay.rect.width))} × {formatMm(Math.round(underlay.rect.height))}
          </p>
        )}
      </header>

      <div className="space-y-3 px-4 py-3">
        <input
          ref={input}
          type="file"
          accept="image/*"
          aria-label="Снимка или скан на плана на жилището"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = '';
          }}
        />

        {!underlay ? (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="w-full border border-border px-4 py-2.5 text-sm transition-colors hover:bg-border"
            >
              Избери снимка на плана
            </button>
            <p className="text-xs leading-relaxed text-muted">
              Снимка или скан на архитектурния план. Слага се под стаята, за да обрисувате
              стените по него. Файлът остава в този браузър — не се качва никъде и не се
              запазва след презареждане.
            </p>
          </>
        ) : (
          <>
            <p className="truncate text-xs text-muted" title={underlay.name}>
              {underlay.name}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={mode === 'move'}
                onClick={() => onMode(mode === 'move' ? 'select' : 'move')}
                className={`border px-3 py-1.5 text-xs transition-colors ${
 mode === 'move'
                    ? 'border-accent text-accent'
                    : 'border-border text-muted hover:bg-border'
                }`}
              >
                Мести
              </button>
              <button
                type="button"
                aria-pressed={mode === 'calibrate'}
                onClick={() => {
                  onResetPoints();
                  onMode(mode === 'calibrate' ? 'select' : 'calibrate');
                }}
                className={`border px-3 py-1.5 text-xs transition-colors ${
 mode === 'calibrate'
                    ? 'border-accent text-accent'
                    : 'border-border text-muted hover:bg-border'
                }`}
              >
                Калибрирай
              </button>
              <button
                type="button"
                onClick={() => onScale(1.05)}
                aria-label="Увеличи плана с 5 на сто"
                className="border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-border"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => onScale(1 / 1.05)}
                aria-label="Намали плана с 5 на сто"
                className="border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-border"
              >
                −
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="ml-auto px-2 py-1.5 text-xs text-muted underline underline-offset-2 hover:text-danger"
              >
                Махни
              </button>
            </div>

            {mode === 'calibrate' && (
              <div className="well px-3 py-3">
                <p className="text-xs leading-relaxed text-muted">
                  {points.length === 0 && 'Посочете първата точка върху известен размер в плана.'}
                  {points.length === 1 && 'Сега посочете втората точка.'}
                  {points.length === 2 && 'Колко мм са в действителност между двете точки?'}
                </p>

                {points.length === 2 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="kalibraciya">
                      Разстояние между двете точки в милиметри
                    </label>
                    <input
                      id="kalibraciya"
                      type="number"
                      min={10}
                      step={10}
                      value={realMm}
                      onChange={(e) => onRealMm(e.target.value)}
                      className="dim w-28 field py-1 text-sm"
                    />
                    <span className="text-xs text-muted">мм</span>
                    <button
                      type="button"
                      onClick={onApplyCalibration}
                      className="border border-accent bg-accent px-3 py-1.5 text-xs text-accent-contrast transition-[filter] hover:brightness-90"
                    >
                      Приложи
                    </button>
                    <button
                      type="button"
                      onClick={onResetPoints}
                      className="px-2 py-1.5 text-xs text-muted underline underline-offset-2 hover:text-accent"
                    >
                      Отначало
                    </button>
                  </div>
                )}
              </div>
            )}

            <label className="block">
              <span className="text-[11px] text-muted">
                Прозрачност
              </span>
              <input
                type="range"
                min={UNDERLAY.minOpacity * 100}
                max={UNDERLAY.maxOpacity * 100}
                step={5}
                value={Math.round(underlay.opacity * 100)}
                onChange={(e) => onOpacity(Number(e.target.value) / 100)}
                aria-label="Прозрачност на плана"
                className="mt-1 h-1 w-full accent-[var(--accent)]"
              />
            </label>

            <p className="text-xs leading-relaxed text-muted">
              Планът е само ориентир под чертежа. Не влиза в офертата и в заявката за цеха, и
              не замества измерването на място.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
