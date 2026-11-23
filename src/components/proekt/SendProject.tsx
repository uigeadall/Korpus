'use client';

/**
 * Краят на потока: проектът да стигне до нас.
 *
 * Дотук клиентът строеше мебел, натискаше „изпрати" и попадаше на
 * страница без форма, без телефон и без имейл. Фунията свършваше в
 * нищото.
 *
 * Истинската форма с качване на план и съхранение на файлове чака
 * акаунтите (план 0.2). Дотогава проектът пътува по трите начина,
 * които не искат никакъв сървър: линк, писмо и PDF.
 */

import { useState } from 'react';
import Link from 'next/link';
import type { Kitchen } from '@/lib/cabinet-rules';
import {
  ROOM_KIND_LABEL,
  WALL_SIDE_LABEL,
  kitchenDoor,
  kitchenWindows,
} from '@/lib/cabinet-rules';
import { FURNISHINGS } from '@/lib/furnishings';
import { offerFileName } from '@/lib/pdf/names';
import { projectLink } from '@/lib/share';
import {
  DAY_LABEL,
  OGLED_DAYS,
  OGLED_TIMES,
  type Ogled,
  TIME_LABEL,
  ogledText,
  parseOgled,
} from '@/lib/ogled';
import { brand } from '@/config/brand';
import { ceilingOf } from '@/lib/furniture/room';
import { finishById } from '@/config/wall-finishes';
import { floorById } from '@/config/floor-finishes';

const metres = (mm: number) => (mm / 1000).toFixed(2).replace('.', ',');

/** Какво пише в писмото — четимо и без да се отваря линкът. */
export function summaryText(kitchen: Kitchen, link: string, ogled: Ogled | null = null): string {
  const wall = kitchen.walls[0];
  const door = kitchenDoor(kitchen);
  const windows = kitchenWindows(kitchen);
  const things = (kitchen.furnishings ?? [])
    .map((f) => FURNISHINGS[f.kind].label.toLowerCase())
    .join(', ');

  return [
    `Здравейте,`,
    ``,
    `Направих си проект на сайта и бих искал оферта.`,
    ``,
    `Стая: ${ROOM_KIND_LABEL[kitchen.roomKind ?? 'kitchen']}`,
    `Стена: ${metres(wall.length)} м`,
    `До тавана: ${metres(ceilingOf(kitchen.room))} м`,
    `Врата: ${WALL_SIDE_LABEL[door.side].toLowerCase()} стена, ${door.width} мм, ` +
      `на ${door.x} мм от ъгъла`,
    ...(windows.length
      ? [
          `Прозорци: ${windows
            .map(
              (w) =>
                `${WALL_SIDE_LABEL[w.side].toLowerCase()} стена, ${w.width}×${w.height} мм, ` +
                `парапет ${w.sill} мм`,
            )
            .join('; ')}`,
        ]
      : []),
    `Модули: ${wall.base.length + wall.upper.length} броя`,
    `Фасади: ${kitchen.materials.facade.color}`,
    `Корпус: ${kitchen.materials.carcassColor}`,
    ...(kitchen.wallFinish ? [`Стени: ${finishById(kitchen.wallFinish.all).name}`] : []),
    ...(floorById(kitchen.floorFinish) ? [`Под: ${floorById(kitchen.floorFinish)!.name}`] : []),
    ...(things ? [`Обзавеждане: ${things}`] : []),
    ``,
    `Проектът се отваря тук:`,
    link,
    ``,
    `Моите данни:`,
    `Име:`,
    `Телефон:`,
    `Град:`,
    `Кога ви е удобно за измерване: ${ogledText(ogled)}`,
  ].join('\n');
}

export function SendProject({ kitchen }: { kitchen: Kitchen }) {
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const ogled = parseOgled({ days, times });
  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = () =>
    projectLink(typeof window === 'undefined' ? '' : window.location.origin, '/proekt', kitchen);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Браузърът не позволи копиране. Отворете линка и го копирайте от адреса.');
    }
  };

  /** PDF-ът се прави на сървъра — със същите правила, с които се реже. */
  const downloadPdf = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(kitchen),
      });
      if (!response.ok) throw new Error(`Грешка ${response.status}`);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = offerFileName();
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Нещо се обърка.');
    } finally {
      setBusy(false);
    }
  };

  const mailto = () => {
    const subject = `Запитване за ${ROOM_KIND_LABEL[
      kitchen.roomKind ?? 'kitchen'
    ].toLowerCase()} — проект от сайта`;
    return `mailto:${brand.contacts.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(summaryText(kitchen, link(), ogled))}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/*
        Огледът е задължителен — цената идва след него. Удобното време,
        казано отсега, спестява едно обаждане само за да се уговорим.
      */}
      <fieldset className="mb-2 rounded-field bg-surface-sunken p-3">
        <legend className="sr-only">Кога ви е удобно за оглед</legend>
        <p aria-hidden className="mb-2 text-[13px] font-medium">
          Кога ви е удобно за оглед?
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Дни">
          {OGLED_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => toggle(days, setDays, d)}
              className={`min-w-9 rounded-pill px-2.5 py-1 text-[12px] transition-colors ${
                days.includes(d) ? 'bg-accent text-accent-contrast' : 'bg-surface text-muted hover:bg-border/60'
              }`}
            >
              <span aria-hidden>{DAY_LABEL[d].short}</span>
              <span className="sr-only">{DAY_LABEL[d].long}</span>
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Часове">
          {OGLED_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={times.includes(t)}
              onClick={() => toggle(times, setTimes, t)}
              className={`rounded-pill px-2.5 py-1 text-[12px] transition-colors ${
                times.includes(t) ? 'bg-accent text-accent-contrast' : 'bg-surface text-muted hover:bg-border/60'
              }`}
            >
              {TIME_LABEL[t].name} <span className="tabular-nums">{TIME_LABEL[t].hours}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted" aria-live="polite">
          {ogled
            ? `Ще го напишем в запитването: ${ogledText(ogled)}.`
            : 'По желание — ако не изберете, ще уговорим по телефона.'}
        </p>
      </fieldset>

      {brand.contacts.email ? (
        <a href={mailto()} className="btn btn-primary w-full py-3">
          Изпратете го по имейл
        </a>
      ) : (
        <Link href="/kontakt" className="btn btn-primary w-full py-3">
          Изпратете го за оферта
        </Link>
      )}

      <button type="button" onClick={copy} className="btn btn-quiet w-full py-3">
        {copied ? '✓ Линкът е копиран' : 'Копирайте линк към проекта'}
      </button>

      <button
        type="button"
        onClick={downloadPdf}
        disabled={busy}
        className="btn btn-quiet w-full py-3 disabled:opacity-50"
      >
        {busy ? 'Подготвя се…' : 'Свалете PDF с чертежа'}
      </button>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <p className="text-[13px] leading-relaxed text-muted">
        Линкът носи целия проект в себе си — отворите ли го, мебелта е както сте я оставили.
        {brand.contacts.email
          ? ' Писмото се отваря в пощата ви; допишете си данните и го пратете.'
          : ' Сложете го в писмо или го пратете по телефона.'}
      </p>
    </div>
  );
}
