'use client';

/**
 * Ориентировъчната цена — кратко до картината и подробно накрая.
 *
 * Показва се диапазон, а под него как е сметнат: човек вижда, че
 * цената идва от неговите шкафове, а не е цифра от въздуха. Докато
 * единичните цени са примерни, това се казва с думи до самата сума.
 */

import { useMemo } from 'react';
import type { Kitchen, KitchenResult } from '@/lib/cabinet-rules';
import { CURRENCY, PRICES, PRICE_STATUS } from '@/config/prices';
import { type PriceLine, estimatePrice, formatMoney } from '@/lib/price';
import { useEzik, useT } from '@/i18n/client';
import type { Ezik } from '@/i18n/ezik';
import { prevedi } from '@/i18n/rechnik';
import { INSTRUMENTI } from '@/i18n/tekstove/instrumenti';

const GROUPS: PriceLine['group'][] = ['Материали', 'Фасади', 'Плот', 'Обков', 'Изработка'];

/**
 * Редът от сметката на езика. Имената идват от правилата на български:
 * „Фасади — МДФ боядисан", „Кант 2 мм (корпус)", „ПДЧ 18".
 */
const KANT = {
  en: { korpus: 'carcass', fasadi: 'fronts', kant: 'Edging' },
  zh: { korpus: '柜体', fasadi: '门板', kant: '封边' },
};
const MATERIAL = {
  'ПДЧ 18': { en: 'Chipboard 18', zh: '刨花板 18' },
  'ПДЧ 16': { en: 'Chipboard 16', zh: '刨花板 16' },
} as Record<string, { en: string; zh: string }>;

function red(label: string, ezik: Ezik): string {
  if (ezik === 'bg') return label;
  const kant = /^Кант (\S+) мм \((корпус|фасади)\)$/.exec(label);
  if (kant) {
    const k = KANT[ezik];
    const chast = kant[2] === 'корпус' ? k.korpus : k.fasadi;
    return ezik === 'zh' ? `${k.kant} ${kant[1]} mm（${chast}）` : `${k.kant} ${kant[1]} mm (${chast})`;
  }
  if (MATERIAL[label]) return MATERIAL[label][ezik];
  return label
    .split(' — ')
    .map((part) => prevedi(part, ezik))
    .join(' — ');
}

function Draft() {
  const t = useT(INSTRUMENTI).tsena;
  return (
    <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-[11px] text-muted ring-1 ring-border">
      {t.chernova}
    </span>
  );
}

export function PriceEstimate({
  kitchen,
  result,
  compact = false,
}: {
  kitchen: Kitchen;
  result: KitchenResult;
  /** Един ред до картината вместо цялата разбивка. */
  compact?: boolean;
}) {
  const ezik = useEzik();
  const t = useT(INSTRUMENTI).tsena;
  const e = useMemo(() => estimatePrice(kitchen, result), [kitchen, result]);
  if (PRICE_STATUS === 'скрита') return null;

  const range = `${formatMoney(e.low)} – ${formatMoney(e.high)} ${CURRENCY}`;

  if (compact) {
    if (e.total === 0) return null;
    return (
      <span data-testid="cena-kratko">
        {t.orientirovachno} <span className="dim tabular-nums text-foreground">{range}</span>
        {PRICE_STATUS === 'чернова' && <span className="ml-1">{t.primerni}</span>}
      </span>
    );
  }

  if (e.total === 0) {
    return (
      <p className="text-[13px] text-muted">{t.prazno}</p>
    );
  }

  return (
    <div className="space-y-3" data-testid="cena">
      <p className="font-display text-2xl tabular-nums">{range}</p>
      {PRICE_STATUS === 'чернова' && (
        <div>
          <Draft />
        </div>
      )}
      <p className="text-[13px] leading-relaxed text-muted">{t.kakSmyatame}</p>

      <details className="group rounded-field bg-surface-sunken px-3 py-2">
        <summary className="cursor-pointer text-[13px] marker:content-none">
          <span className="text-accent underline-offset-2 group-open:underline">
            {t.kakESmetnata}
          </span>
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <tbody>
            {GROUPS.map((group) => {
              const rows = e.lines.filter((l) => l.group === group);
              if (!rows.length) return null;
              return [
                <tr key={group}>
                  <th colSpan={3} className="pt-2 pb-1 text-left font-medium">
                    {prevedi(group, ezik)}
                  </th>
                </tr>,
                ...rows.map((l) => (
                  <tr key={`${group}-${l.label}`} className="text-muted">
                    <td className="py-0.5 pr-2">{red(l.label, ezik)}</td>
                    <td className="py-0.5 pr-2 text-right whitespace-nowrap tabular-nums">
                      {ezik === 'bg' ? String(l.qty).replace('.', ',') : String(l.qty)}{' '}
                      {prevedi(l.unit, ezik)}
                    </td>
                    <td className="py-0.5 text-right whitespace-nowrap tabular-nums">
                      {formatMoney(l.total)} {CURRENCY}
                    </td>
                  </tr>
                )),
              ];
            })}
            <tr>
              <td colSpan={2} className="border-t border-border pt-1.5 font-medium">
                {t.suma}
              </td>
              <td className="border-t border-border pt-1.5 text-right font-medium tabular-nums">
                {formatMoney(e.total)} {CURRENCY}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {t.diapazon(Math.round(PRICES.spread * 100))}
        </p>
      </details>
    </div>
  );
}
