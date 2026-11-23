'use client';

/**
 * „Как ще стои у мен" — мебелта, положена върху снимка на стената.
 *
 * Човек снима стената, посочва четирите ѝ ъгъла и чертежът отпред се
 * изкривява в същата перспектива. Не е AR и не иска приложение: снимката
 * е обикновен файл, ъглите се местят с пръст, а сметката е в
 * `lib/homography.ts`.
 *
 * Снимката не напуска браузъра. Чете се като локален адрес и изчезва,
 * щом страницата се затвори — както подложката с плана в конфигуратора.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Kitchen, PlacedModule } from '@/lib/cabinet-rules';
import { elevation } from '@/lib/elevation';
import { type P, type Quad, cssMatrix3d, homography } from '@/lib/homography';
import { capturePointer } from '@/components/pointer';
import { paletteFor } from '@/components/configurator/Scene3D';

/** Ширината, в която се рисува чертежът, преди да се изкриви. */
const BASE_W = 1000;

const CORNER_LABEL = ['горе вляво', 'горе вдясно', 'долу вдясно', 'долу вляво'] as const;

/** Начални ъгли — малко навътре от ръба на снимката, в дялове от нея. */
const START: Quad = [
  { x: 0.12, y: 0.1 },
  { x: 0.88, y: 0.1 },
  { x: 0.88, y: 0.9 },
  { x: 0.12, y: 0.9 },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function PhotoOverlay({
  kitchen,
  rows,
  wallLength,
}: {
  kitchen: Kitchen;
  rows: { base: PlacedModule[]; upper: PlacedModule[] };
  wallLength: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [corners, setCorners] = useState<Quad>(START);
  const [opacity, setOpacity] = useState(0.9);
  // Таванът на стаята — човек го е казал в „Размери".
  const [ceiling, setCeiling] = useState(kitchen.room?.height ?? 2600);
  const [boxWidth, setBoxWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const dragging = useRef<number | null>(null);

  // Локалният адрес се освобождава, щом снимката се смени или махне.
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(el);
    setBoxWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [url]);

  const rects = useMemo(
    () =>
      elevation(rows, {
        room: kitchen.roomKind ?? 'kitchen',
        worktop: kitchen.materials.worktop,
        opening: kitchen.materials.opening,
      }),
    [rows, kitchen.roomKind, kitchen.materials.worktop, kitchen.materials.opening],
  );
  const palette = paletteFor(kitchen);

  const boxHeight = natural && boxWidth ? (boxWidth * natural.h) / natural.w : 0;
  // Докато човек пише числото, то минава през „2", „26"… — сметката
  // взема разумна височина, а полето не му скача под пръстите.
  const height = ceiling >= 2000 && ceiling <= 4000 ? ceiling : 2600;
  const baseH = (BASE_W * height) / wallLength;

  const px = (q: P): P => ({ x: q.x * boxWidth, y: q.y * boxHeight });
  const target = corners.map(px) as Quad;
  const H =
    boxWidth && boxHeight
      ? homography(
          [
            { x: 0, y: 0 },
            { x: BASE_W, y: 0 },
            { x: BASE_W, y: baseH },
            { x: 0, y: baseH },
          ],
          target,
        )
      : null;

  const pick = (file: File | undefined) => {
    if (!file) return;
    setNatural(null);
    setCorners(START);
    setUrl(URL.createObjectURL(file));
  };

  const moveTo = (i: number, clientX: number, clientY: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setCorners((c) => {
      const next = [...c] as Quad;
      next[i] = { x: clamp01((clientX - r.left) / r.width), y: clamp01((clientY - r.top) / r.height) };
      return next;
    });
  };

  const nudge = (i: number, dx: number, dy: number) =>
    setCorners((c) => {
      const next = [...c] as Quad;
      next[i] = { x: clamp01(c[i].x + dx), y: clamp01(c[i].y + dy) };
      return next;
    });

  const color = (role: string) =>
    role === 'handle' ? '#8e8a84' : (palette[role] ?? palette.carcass);

  return (
    <div className="space-y-3">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Снимка на стената"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {!url ? (
        <>
          <p className="text-[13px] leading-relaxed text-muted">
            Снимайте стената, на която ще стои мебелта, отпред и така, че да се виждат подът и
            таванът. После посочете четирите ѝ ъгъла и ще видите шкафовете върху нея.
          </p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="btn btn-quiet w-full py-3"
          >
            Изберете снимка
          </button>
        </>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-muted">
            Завлечете четирите точки в ъглите на стената — долу при пода, горе при тавана, така
            че между тях да е стената с мебелта ({(wallLength / 1000).toFixed(2).replace('.', ',')}{' '}
            м).
          </p>

          <div
            ref={box}
            className="relative w-full touch-none overflow-hidden rounded-field bg-surface-sunken select-none"
            style={boxHeight ? { height: boxHeight } : undefined}
            onPointerMove={(e) => {
              if (dragging.current !== null) moveTo(dragging.current, e.clientX, e.clientY);
            }}
            onPointerUp={() => (dragging.current = null)}
            onPointerCancel={() => (dragging.current = null)}
          >
            {/* Снимката е на клиента и не излиза оттук. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Вашата снимка на стената"
              className="absolute inset-0 h-full w-full"
              onLoad={(e) =>
                setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
              }
            />

            {H && (
              <div
                data-testid="mebel-varhu-snimkata"
                className="pointer-events-none absolute top-0 left-0"
                style={{
                  width: BASE_W,
                  height: baseH,
                  transformOrigin: '0 0',
                  transform: cssMatrix3d(H),
                  opacity,
                }}
              >
                <svg
                  width={BASE_W}
                  height={baseH}
                  viewBox={`0 0 ${wallLength} ${height}`}
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  {rects.map((r, i) => (
                    <rect
                      key={i}
                      x={r.x}
                      y={height - r.y - r.height}
                      width={r.width}
                      height={r.height}
                      fill={color(r.role)}
                      stroke="rgba(0,0,0,0.22)"
                      strokeWidth={4}
                    />
                  ))}
                </svg>
              </div>
            )}

            {boxHeight > 0 && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${boxWidth} ${boxHeight}`}
                aria-hidden
              >
                <polygon
                  points={target.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
              </svg>
            )}

            {boxHeight > 0 &&
              corners.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ъгъл ${CORNER_LABEL[i]} — стрелките го местят`}
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-accent shadow-md active:cursor-grabbing"
                  style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dragging.current = i;
                    capturePointer(box.current, e.pointerId);
                  }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 0.02 : 0.005;
                    const move: Record<string, [number, number]> = {
                      ArrowLeft: [-step, 0],
                      ArrowRight: [step, 0],
                      ArrowUp: [0, -step],
                      ArrowDown: [0, step],
                    };
                    if (move[e.key]) {
                      e.preventDefault();
                      nudge(i, ...move[e.key]);
                    }
                  }}
                />
              ))}
          </div>

          {!H && boxHeight > 0 && (
            <p role="status" className="text-[13px] text-danger">
              Ъглите са се разбъркали — подредете ги по реда горе вляво, горе вдясно, долу вдясно,
              долу вляво.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <label className="block">
              <span className="text-muted">Плътност на мебелта</span>
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-1 block w-full accent-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-muted">Височина до тавана, мм</span>
              <input
                type="number"
                min={2200}
                max={3600}
                step={10}
                value={ceiling || ''}
                onChange={(e) => setCeiling(Number(e.target.value))}
                className="mt-1 block w-full rounded-field border border-border bg-surface px-2 py-1.5 tabular-nums"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className="btn btn-quiet flex-1 py-2.5">
              Друга снимка
            </button>
            <button
              type="button"
              onClick={() => {
                setUrl(null);
                setNatural(null);
                if (input.current) input.current.value = '';
              }}
              className="btn btn-quiet flex-1 py-2.5"
            >
              Махнете снимката
            </button>
          </div>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Снимката остава във вашия браузър — не се изпраща никъде и не се пази.
      </p>
    </div>
  );
}
