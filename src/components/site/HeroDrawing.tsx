'use client';

/**
 * Чертежът от конфигуратора, но само за гледане — без влачене и избор.
 * Ползва същата геометрия, за да е ясно, че това е реалният инструмент.
 */

import { useMemo } from 'react';
import { computeKitchen } from '@/lib/cabinet-rules';
import { KitchenDrawing } from '@/components/configurator/KitchenDrawing';
import { sampleKitchen } from '@/components/configurator/state';

export function HeroDrawing() {
  const { kitchen, result } = useMemo(() => {
    const k = sampleKitchen();
    return { kitchen: k, result: computeKitchen(k) };
  }, []);

  return (
    <div className="paper-grid border border-border bg-surface p-2 sm:p-4">
      <KitchenDrawing
        wall={kitchen.walls[0]}
        placed={result.placed[0]}
        status={result.rowStatus[0]}
        worktop={kitchen.materials.worktop}
      />
    </div>
  );
}
