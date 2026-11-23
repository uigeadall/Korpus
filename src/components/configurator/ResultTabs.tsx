'use client';

import { useState } from 'react';
import {
  DIM,
  FACADE_LABEL,
  type KitchenResult,
  MATERIAL_LABEL,
  type Materials,
  WORKTOP_LABEL,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import {
  CABINET_COLUMNS,
  type ExportView,
  toCabinetRows,
  toExportRows,
} from '@/lib/export-mapping';

type Tab = 'summary' | 'cutting' | 'hardware';

const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Обобщение' },
  { id: 'cutting', label: 'Разбивка за разкрой' },
  { id: 'hardware', label: 'Обков и плот' },
];

export function ResultTabs({
  result,
  materials,
  view,
  onViewChange,
}: {
  result: KitchenResult;
  materials: Materials;
  view: ExportView;
  onViewChange: (v: ExportView) => void;
}) {
  const [tab, setTab] = useState<Tab>('summary');

  return (
    <section className="border border-border bg-surface">
      <div role="tablist" className="flex flex-wrap border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs uppercase tracking-[0.1em] transition-colors ${
 tab === t.id
                ? 'border-b-2 border-accent text-accent'
                : 'border-b-2 border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'summary' && <SummaryTab result={result} materials={materials} />}
        {tab === 'cutting' && (
          <CuttingTab
            result={result}
            materials={materials}
            view={view}
            onViewChange={onViewChange}
          />
        )}
        {tab === 'hardware' && <HardwareTab result={result} materials={materials} />}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function SummaryTab({ result, materials }: { result: KitchenResult; materials: Materials }) {
  const s = result.summary;
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Шкафове" value={String(s.cabinets)} />
        <Stat label="Детайли" value={String(s.partPieces)} />
        <Stat label="Височина до плота" value={`${formatMm(s.worktopHeight)} мм`} />
        <Stat label="Дължина на плота" value={`${formatMm(s.worktopLength)} мм`} />
      </dl>

      <div>
        <Caption>
          Площ по материал и плочи {DIM.SHEET_L}×{DIM.SHEET_W} с {DIM.SHEET_WASTE * 100}% фира
        </Caption>
        <Table head={['Материал', 'Площ м²', 'С фира м²', 'Плочи']}>
          {s.materials.map((m) => (
            <tr key={m.material} className="border-t border-border">
              <Td>{MATERIAL_LABEL[m.material]}</Td>
              <Td mono>{m.areaM2.toFixed(2).replace('.', ',')}</Td>
              <Td mono>{m.areaWithWasteM2.toFixed(2).replace('.', ',')}</Td>
              <Td mono>{m.sheets}</Td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Caption>Кант по вид</Caption>
          <ul className="space-y-1 text-sm">
            {s.edges.map((e) => (
              <li key={e.thickness} className="flex justify-between gap-4">
                <span className="text-muted">{e.label}</span>
                <span className="dim">{e.meters.toFixed(2).replace('.', ',')} м</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Caption>Фасади</Caption>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between gap-4">
              <span className="text-muted">{FACADE_LABEL[materials.facade.type]}</span>
              <span className="dim">{materials.facade.color}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-muted">
                {materials.facade.type === 'pdch-decor' ? 'Площ фасади' : 'Площ за боядисване'}
              </span>
              <span className="dim">{s.paintAreaM2.toFixed(2).replace('.', ',')} м²</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function CuttingTab({
  result,
  materials,
  view,
  onViewChange,
}: {
  result: KitchenResult;
  materials: Materials;
  view: ExportView;
  onViewChange: (v: ExportView) => void;
}) {
  const rows = view === 'cabinets' ? [] : toExportRows(result, view);
  const cabinetRows = view === 'cabinets' ? toCabinetRows(result, materials) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { id: 'cabinet' as ExportView, label: 'По шкафове' },
              { id: 'material' as ExportView, label: 'По материал' },
              { id: 'cabinets' as ExportView, label: 'Заявка за шкафове' },
            ] satisfies { id: ExportView; label: string }[]
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onViewChange(o.id)}
              aria-pressed={view === o.id}
              className={`border px-3 py-1.5 text-xs transition-colors ${
 view === o.id
                  ? 'border-accent text-accent'
                  : 'border-border text-muted hover:bg-border'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="dim text-xs">{(view === 'cabinets' ? cabinetRows : rows).length} реда</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        {view === 'cabinets' ? (
          <Table head={CABINET_COLUMNS.map((c) => c.header)}>
            {cabinetRows.map((r) => (
              <tr key={r.cabinet} className="border-t border-border">
                <Td mono>{r.cabinet}</Td>
                <Td>{r.type}</Td>
                <Td>{r.carcass}</Td>
                <Td mono>{formatMm(r.width)}</Td>
                <Td mono>{formatMm(r.height)}</Td>
                <Td mono>{formatMm(r.depth)}</Td>
                <Td mono>{r.shelves}</Td>
                <Td mono>{r.fronts}</Td>
                <Td>{r.opening}</Td>
                <Td>{r.mechanisms}</Td>
                <Td>
                  <span className="text-muted">{r.note}</span>
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Table
            head={[
              '№',
              'Шкаф',
              'Детайл',
              'Материал',
              'Д',
              'Ш',
              'Бр.',
              'Кант Д',
              'Кант Ш',
              'Кант мм',
              'Бележка',
            ]}
          >
            {rows.map((r, i) => (
              <tr key={`${r.no}-${i}`} className="border-t border-border">
                <Td mono>{r.no}</Td>
                <Td mono>{r.cabinet}</Td>
                <Td>{r.part}</Td>
                <Td>{r.material}</Td>
                <Td mono>{formatMm(r.length)}</Td>
                <Td mono>{formatMm(r.width)}</Td>
                <Td mono>{r.qty}</Td>
                <Td mono>{r.edgeL}</Td>
                <Td mono>{r.edgeW}</Td>
                <Td mono>{formatMm(r.edgeMm)}</Td>
                <Td>
                  <span className="text-muted">{r.note}</span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <p className="text-xs text-muted">
        {view === 'cabinets'
          ? 'Заявка на ниво шкаф за външен цех: габарит, рафтове, чела, начин на отваряне и механизми. Детайлите се вземат от другите два изгледа.'
          : '„Кант Д“ и „Кант Ш“ са броят кантирани страни по дължината и по ширината. Номерът се лепи на детайла, за да може монтажът да стане и у дома.'}
      </p>
    </div>
  );
}

function HardwareTab({ result, materials }: { result: KitchenResult; materials: Materials }) {
  return (
    <div className="space-y-6">
      <Table head={['Позиция', 'Количество', 'Бележка']}>
        {result.hardware.map((h) => (
          <tr key={h.name} className="border-t border-border">
            <Td>{h.name}</Td>
            <Td mono>
              {formatMm(h.qty)} {h.unit}
            </Td>
            <Td>
              <span className="text-muted">{h.note ?? ''}</span>
            </Td>
          </tr>
        ))}
      </Table>

      <div>
        <Caption>Плот</Caption>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Stat label="Вид" value={WORKTOP_LABEL[materials.worktop]} />
          <Stat label="Дължина" value={`${formatMm(result.summary.worktopLength)} мм`} />
          <Stat label="Дълбочина" value={`${formatMm(result.summary.worktopDepth)} мм`} />
        </dl>
      </div>

      <p className="text-xs text-muted">
        Размерите на механизмите за чекмеджета и пантите са по работни стойности и подлежат на
        сверяване с каталога на марката, която фирмата ползва.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="dim mt-1 text-base">{value}</dd>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-sm text-muted">{children}</p>;
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              scope="col"
              className="whitespace-nowrap border-b border-border pb-2 pr-3 text-left text-xs font-normal uppercase tracking-[0.08em] text-muted"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`py-1.5 pr-3 align-top ${mono ? 'dim whitespace-nowrap' : ''}`}>{children}</td>
  );
}
