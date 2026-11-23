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

const GROUPS: PriceLine['group'][] = ['Материали', 'Фасади', 'Плот', 'Обков', 'Изработка'];

function Draft() {
  return (
    <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-[11px] text-muted ring-1 ring-border">
      примерни цени — чакат потвърждение
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
  const e = useMemo(() => estimatePrice(kitchen, result), [kitchen, result]);
  if (PRICE_STATUS === 'скрита') return null;

  const range = `${formatMoney(e.low)} – ${formatMoney(e.high)} ${CURRENCY}`;

  if (compact) {
    if (e.total === 0) return null;
    return (
      <span data-testid="cena-kratko">
        ориентировъчно <span className="dim tabular-nums text-foreground">{range}</span>
        {PRICE_STATUS === 'чернова' && <span className="ml-1">(примерни цени)</span>}
      </span>
    );
  }

  if (e.total === 0) {
    return (
      <p className="text-[13px] text-muted">
        Сложете поне един шкаф в стаята и тук ще излезе ориентировъчна цена.
      </p>
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
      <p className="text-[13px] leading-relaxed text-muted">
        Смятаме я от материалите, обкова и шкафовете във вашия проект, с изработка, монтаж и
        доставка, с ДДС. Точната цена идва след измерване на място.
      </p>

      <details className="group rounded-field bg-surface-sunken px-3 py-2">
        <summary className="cursor-pointer text-[13px] marker:content-none">
          <span className="text-accent underline-offset-2 group-open:underline">Как е сметната</span>
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <tbody>
            {GROUPS.map((group) => {
              const rows = e.lines.filter((l) => l.group === group);
              if (!rows.length) return null;
              return [
                <tr key={group}>
                  <th colSpan={3} className="pt-2 pb-1 text-left font-medium">
                    {group}
                  </th>
                </tr>,
                ...rows.map((l) => (
                  <tr key={`${group}-${l.label}`} className="text-muted">
                    <td className="py-0.5 pr-2">{l.label}</td>
                    <td className="py-0.5 pr-2 text-right whitespace-nowrap tabular-nums">
                      {String(l.qty).replace('.', ',')} {l.unit}
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
                Сума по сметката
              </td>
              <td className="border-t border-border pt-1.5 text-right font-medium tabular-nums">
                {formatMoney(e.total)} {CURRENCY}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Диапазонът е ±{Math.round(PRICES.spread * 100)}% около сумата: мерките още не са взети на място.
        </p>
      </details>
    </div>
  );
}
