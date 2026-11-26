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
import Link from '@/i18n/Link';
import { useEzik, useT } from '@/i18n/client';
import { MERKI, metri } from '@/i18n/chisla';
import type { Ezik } from '@/i18n/ezik';
import { prevedi } from '@/i18n/rechnik';
import { izbroi } from '@/i18n/tekst';
import { IZPRASHTANE } from '@/i18n/tekstove/izprashtane';
import { type Kitchen, computeKitchen, kitchenRoom } from '@/lib/cabinet-rules';
import { DEFAULT_CAMERA, sceneFor } from '@/lib/scene3d';
import { renderScene } from '@/lib/render';
import { describeProject } from '@/lib/opisanie';
import {
  downloadBlob,
  imageName,
  svgToPng,
} from '@/components/configurator/iznasyane';
import { ROOM_KIND_LABEL, kitchenDoor, kitchenWindows } from '@/lib/cabinet-rules';
import { FURNISHINGS } from '@/lib/furnishings';
import { offerFileName } from '@/lib/pdf/names';
import { projectLink } from '@/lib/share';
import {
  OGLED_DAYS,
  OGLED_TEKST,
  OGLED_TIMES,
  type Ogled,
  ogledText,
  parseOgled,
} from '@/lib/ogled';
import { brand } from '@/config/brand';
import { ceilingOf } from '@/lib/furniture/room';
import { finishById } from '@/config/wall-finishes';
import { floorById } from '@/config/floor-finishes';

/**
 * Какво пише в писмото — четимо и без да се отваря линкът. Писмото е
 * на езика на човека, който го праща: той го допълва и подписва.
 */
export function summaryText(
  kitchen: Kitchen,
  link: string,
  ogled: Ogled | null = null,
  ezik: Ezik = 'bg',
): string {
  const t = IZPRASHTANE[ezik].pismo;
  const ime = (bg: string) => prevedi(bg, ezik);
  const m = (mm: number) => `${metri(mm, ezik)} ${MERKI[ezik].m}`;
  const red = (term: string, value: string) => `${term}${ezik === 'zh' ? '：' : ': '}${value}`;
  const wall = kitchen.walls[0];
  const door = kitchenDoor(kitchen);
  const windows = kitchenWindows(kitchen);
  const things = izbroi(
    (kitchen.furnishings ?? []).map((f) => ime(FURNISHINGS[f.kind].label).toLowerCase()),
    ezik,
  );

  return [
    t.zdraveite,
    ``,
    t.napravih,
    ``,
    red(t.staya, ime(ROOM_KIND_LABEL[kitchen.roomKind ?? 'kitchen'])),
    red(t.stena, m(wall.length)),
    red(t.doTavana, m(ceilingOf(kitchen.room))),
    red(t.vrataTerm, t.vrata(t.strana[door.side], door.width, door.x)),
    ...(windows.length
      ? [
          red(
            t.prozortsi,
            windows
              .map((w) => t.prozorec(t.strana[w.side], w.width, w.height, w.sill))
              .join(ezik === 'zh' ? '；' : '; '),
          ),
        ]
      : []),
    red(t.moduli, t.broi(wall.base.length + wall.upper.length)),
    red(t.fasadi, ime(kitchen.materials.facade.color)),
    red(t.korpus, ime(kitchen.materials.carcassColor)),
    ...(kitchen.wallFinish ? [red(t.steni, ime(finishById(kitchen.wallFinish.all).name))] : []),
    ...(floorById(kitchen.floorFinish) ? [red(t.pod, ime(floorById(kitchen.floorFinish)!.name))] : []),
    ...(things ? [red(t.obzavezhdane, things)] : []),
    ``,
    t.otvaryaSe,
    link,
    ``,
    t.moiteDanni,
    t.ime,
    t.telefon,
    t.grad,
    `${t.kogaIzmervane} ${ogledText(ogled, ezik)}`,
  ].join('\n');
}

export function SendProject({
  kitchen,
  view,
}: {
  kitchen: Kitchen;
  /**
   * Откъде е гледана стаята. Картинката тръгва оттам: иначе човек
   * нагласява изгледа, сваля — и получава чужд кадър.
   */
  view?: { yaw: number; pitch: number; distance: number };
}) {
  const ezik = useEzik();
  const t = useT(IZPRASHTANE).izprati;
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
      setError(t.kopiraneNe);
    }
  };

  /**
   * Картинката се прави в браузъра: сцената е SVG и платното я рисува.
   * Сървър не ѝ трябва — няма какво да смята, което вече не е сметнато.
   */
  const downloadImage = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = kitchenRoom(kitchen);
      const cam = { ...DEFAULT_CAMERA(room), ...view };
      const boxes = sceneFor(
        kitchen,
        room,
        computeKitchen(kitchen).placed,
        kitchen.materials.worktop,
        kitchen.materials.opening,
      );
      const rendered = renderScene(boxes, cam, kitchen, {
        width: 1920,
        room,
        title: describeProject(kitchen).summaryBg,
      });
      downloadBlob(await svgToPng(rendered), imageName(kitchen.roomKind ?? 'kitchen', 'izgled'));
    } catch {
      setError(t.kartinkaNe);
    } finally {
      setBusy(false);
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
      if (!response.ok) throw new Error(t.greshka(response.status));
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = offerFileName();
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.neshtoSeObarka);
    } finally {
      setBusy(false);
    }
  };

  const mailto = () => {
    const subject = IZPRASHTANE[ezik].pismo.tema(
      prevedi(ROOM_KIND_LABEL[kitchen.roomKind ?? 'kitchen'], ezik),
    );
    return `mailto:${brand.contacts.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(summaryText(kitchen, link(), ogled, ezik))}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/*
        Огледът е задължителен — цената идва след него. Удобното време,
        казано отсега, спестява едно обаждане само за да се уговорим.
      */}
      <fieldset className="mb-2 rounded-field bg-surface-sunken p-3">
        <legend className="sr-only">{t.kogaOgled}</legend>
        <p aria-hidden className="mb-2 text-[13px] font-medium">
          {t.kogaOgledVapros}
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.dni}>
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
              <span aria-hidden>{OGLED_TEKST[ezik].dni[d].short}</span>
              <span className="sr-only">{OGLED_TEKST[ezik].dni[d].long}</span>
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={t.chasove}>
          {OGLED_TIMES.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={times.includes(x)}
              onClick={() => toggle(times, setTimes, x)}
              className={`rounded-pill px-2.5 py-1 text-[12px] transition-colors ${
                times.includes(x) ? 'bg-accent text-accent-contrast' : 'bg-surface text-muted hover:bg-border/60'
              }`}
            >
              {OGLED_TEKST[ezik].chasove[x].name}{' '}
              <span className="tabular-nums">{OGLED_TEKST[ezik].chasove[x].hours}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted" aria-live="polite">
          {ogled ? t.shteGoNapishem(ogledText(ogled, ezik)) : t.poZhelanie}
        </p>
      </fieldset>

      {brand.contacts.email ? (
        <a href={mailto()} className="btn btn-primary w-full py-3">
          {t.poImeil}
        </a>
      ) : (
        <Link href="/kontakt" className="btn btn-primary w-full py-3">
          {t.zaOferta}
        </Link>
      )}

      <button type="button" onClick={copy} className="btn btn-quiet w-full py-3">
        {copied ? t.kopiran : t.kopiraiLink}
      </button>

      <button
        type="button"
        onClick={downloadPdf}
        disabled={busy}
        className="btn btn-quiet w-full py-3 disabled:opacity-50"
      >
        {busy ? t.podgotvya : t.pdf}
      </button>

      <button
        type="button"
        onClick={downloadImage}
        disabled={busy}
        className="btn btn-quiet w-full py-3 disabled:opacity-50"
      >
        {busy ? t.podgotvya : t.kartinka}
      </button>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <p className="text-[13px] leading-relaxed text-muted">
        {t.linkatNosi}
        {brand.contacts.email ? t.pismotoSeOtvarya : t.slozheteGo}
      </p>
      {t.pdfNaBalgarski && (
        <p className="text-[12px] leading-relaxed text-muted">{t.pdfNaBalgarski}</p>
      )}
    </div>
  );
}
