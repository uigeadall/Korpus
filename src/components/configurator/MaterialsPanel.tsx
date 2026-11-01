'use client';

import type { Materials } from '@/lib/cabinet-rules';
import {
  CARCASS_COLORS,
  DRAWER_SYSTEMS,
  FACADE_COLORS,
  FACADE_TYPES,
  OPENINGS,
  WORKTOPS,
} from '@/config/materials';
import type { Action } from './state';

export function MaterialsPanel({
  materials,
  dispatch,
}: {
  materials: Materials;
  dispatch: (a: Action) => void;
}) {
  const set = (value: Partial<Materials>) => dispatch({ type: 'materials', value });

  return (
    <section className="border border-border bg-surface">
      <header className="border-b border-border px-4 py-3">
        <h3 className="font-display text-sm uppercase tracking-wide">Материали</h3>
      </header>

      <div className="space-y-5 px-4 py-4">
        <Group label="Корпус ПДЧ 18 мм">
          <div className="flex flex-wrap gap-2">
            {CARCASS_COLORS.map((c) => (
              <Chip
                key={c.id}
                active={materials.carcassColor === c.name}
                onClick={() => set({ carcassColor: c.name })}
                hex={c.hex}
              >
                {c.name}
              </Chip>
            ))}
          </div>
        </Group>

        <Group label="Фасади">
          <div className="flex flex-wrap gap-2">
            {FACADE_TYPES.map((t) => (
              <Chip
                key={t.id}
                active={materials.facade.type === t.id}
                onClick={() => set({ facade: { ...materials.facade, type: t.id } })}
                title={t.note}
              >
                {t.name}
              </Chip>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {FACADE_COLORS.map((c) => (
              <Chip
                key={c.id}
                active={materials.facade.color === c.name}
                onClick={() => set({ facade: { ...materials.facade, color: c.name } })}
                hex={c.hex}
              >
                {c.name}
              </Chip>
            ))}
          </div>
        </Group>

        <Group label="Плот">
          <div className="flex flex-wrap gap-2">
            {WORKTOPS.map((w) => (
              <Chip
                key={w.id}
                active={materials.worktop === w.id}
                onClick={() => set({ worktop: w.id })}
              >
                {w.name}
              </Chip>
            ))}
          </div>
        </Group>

        <Group label="Отваряне">
          <div className="flex flex-wrap gap-2">
            {OPENINGS.map((o) => (
              <Chip
                key={o.id}
                active={materials.opening === o.id}
                onClick={() => set({ opening: o.id })}
                title={o.note}
              >
                {o.name}
              </Chip>
            ))}
          </div>
        </Group>

        <Group label="Чекмеджета">
          <div className="flex flex-wrap gap-2">
            {DRAWER_SYSTEMS.map((d) => (
              <Chip
                key={d.id}
                active={materials.drawers === d.id}
                onClick={() => set({ drawers: d.id })}
              >
                {d.name}
              </Chip>
            ))}
          </div>
        </Group>
      </div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  hex,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  hex?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex items-center gap-2 border px-2.5 py-1.5 text-xs transition-colors ${
        active
          ? 'border-accent text-accent'
          : 'border-border text-muted hover:border-accent hover:text-accent'
      }`}
    >
      {hex && (
        <span
          aria-hidden
          className="inline-block h-3.5 w-3.5 border border-border"
          style={{ background: hex }}
        />
      )}
      {children}
    </button>
  );
}
