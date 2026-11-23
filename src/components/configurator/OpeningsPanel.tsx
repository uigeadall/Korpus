'use client';

/**
 * Отворите в стаята — тук се мерят в милиметри.
 *
 * В „Направи проект" вратата и прозорците се посочват с пръст по плана;
 * това стига на клиента. Конфигураторът е техническият проект, затова
 * тук са всички числа: коя стена, на колко от ъгъла, широко, високо,
 * накъде се отваря, на какъв парапет. Планът отляво показва същото и
 * приема влачене.
 *
 * Едно място, не две: преди прозорците се закачаха за стената с
 * мебелта и живееха отделно от вратата. Сега и двете са на стаята.
 */

import {
  DOOR,
  WINDOW,
  type Room,
  type RoomDoor,
  type RoomWindow,
  WALL_SIDES,
  WALL_SIDE_LABEL,
  sideLength,
} from '@/lib/cabinet-rules';
import {
  DOOR_HINGE_LABEL,
  DOOR_SWING_LABEL,
  type DoorHinge,
  type DoorSwing,
} from '@/lib/openings';
import type { Action } from './state';

interface Props {
  room: Room;
  door: RoomDoor;
  windows: RoomWindow[];
  dispatch: (a: Action) => void;
}

function Field({
  label,
  value,
  min,
  max,
  step = DOOR.STEP,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dim mt-1 w-full field py-1 text-sm"
      />
    </label>
  );
}

function Pills<T extends string>({
  legend,
  options,
  value,
  label,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[11px] text-muted">{legend}</legend>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={`rounded-pill px-3 py-1.5 text-[13px] transition-colors ${
              option === value
                ? 'bg-accent text-accent-contrast'
                : 'bg-surface-sunken text-muted hover:bg-border/60'
            }`}
          >
            {label(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function DoorSection({ room, door, dispatch }: Omit<Props, 'windows'>) {
  const wall = sideLength(room, door.side);
  const edit = (value: Partial<RoomDoor>) => dispatch({ type: 'door', value });

  return (
    <section className="space-y-4 px-4 py-3">
      <h3 className="text-sm font-medium">Врата</h3>

      <Pills
        legend="На коя стена"
        options={WALL_SIDES}
        value={door.side}
        label={(side) => WALL_SIDE_LABEL[side]}
        onChange={(side) => edit({ side })}
      />

      <div className="grid grid-cols-4 gap-2">
        <Field
          label="От ляво"
          value={door.x}
          min={0}
          max={Math.max(0, wall - door.width)}
          onChange={(x) => edit({ x })}
        />
        <Field
          label="Ширина"
          value={door.width}
          min={DOOR.MIN_WIDTH}
          max={Math.min(DOOR.MAX_WIDTH, wall)}
          onChange={(width) => edit({ width })}
        />
        <Field
          label="Височина"
          value={door.height}
          min={DOOR.MIN_HEIGHT}
          max={DOOR.MAX_HEIGHT}
          onChange={(height) => edit({ height })}
        />
        <div className="flex items-end">
          <p className="pb-1 text-[11px] leading-tight text-muted">
            свободно
            <br />
            <span className="dim">{wall - door.width} мм</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Pills
          legend="Панти"
          options={['left', 'right'] as const}
          value={door.hinge as DoorHinge}
          label={(hinge) => DOOR_HINGE_LABEL[hinge]}
          onChange={(hinge) => edit({ hinge })}
        />
        <Pills
          legend="Отваря се"
          options={['in', 'out'] as const}
          value={door.swing as DoorSwing}
          label={(swing) => DOOR_SWING_LABEL[swing]}
          onChange={(swing) => edit({ swing })}
        />
      </div>
    </section>
  );
}

function WindowRow({
  room,
  win,
  index,
  dispatch,
}: {
  room: Room;
  win: RoomWindow;
  index: number;
  dispatch: (a: Action) => void;
}) {
  const wall = sideLength(room, win.side);
  const edit = (value: Partial<RoomWindow>) => dispatch({ type: 'window', id: win.id, value });

  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm">
          Прозорец {index + 1}{' '}
          <span className="dim text-xs">
            {win.width} × {win.height}
          </span>
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'removeWindow', id: win.id })}
          aria-label={`Премахни прозорец ${index + 1}`}
          className="border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
        >
          ×
        </button>
      </div>

      <Pills
        legend="На коя стена"
        options={WALL_SIDES}
        value={win.side}
        label={(side) => WALL_SIDE_LABEL[side]}
        onChange={(side) => edit({ side })}
      />

      <div className="grid grid-cols-4 gap-2">
        <Field
          label="От ляво"
          value={win.x}
          min={0}
          max={Math.max(0, wall - win.width)}
          step={WINDOW.STEP}
          onChange={(x) => edit({ x })}
        />
        <Field
          label="Ширина"
          value={win.width}
          min={WINDOW.MIN_WIDTH}
          max={Math.min(WINDOW.MAX_WIDTH, wall)}
          step={WINDOW.STEP}
          onChange={(width) => edit({ width })}
        />
        <Field
          label="Парапет"
          value={win.sill}
          min={WINDOW.MIN_SILL}
          max={WINDOW.MAX_SILL}
          step={WINDOW.STEP}
          onChange={(sill) => edit({ sill })}
        />
        <Field
          label="Височина"
          value={win.height}
          min={WINDOW.MIN_HEIGHT}
          max={WINDOW.MAX_HEIGHT}
          step={WINDOW.STEP}
          onChange={(height) => edit({ height })}
        />
      </div>
    </li>
  );
}

export function OpeningsPanel({ room, door, windows, dispatch }: Props) {
  return (
    <div>
      <DoorSection room={room} door={door} dispatch={dispatch} />

      <div className="border-t border-border">
        <div className="flex items-baseline justify-between gap-2 px-4 pt-3">
          <h3 className="text-sm font-medium">Прозорци</h3>
          <p className="text-xs text-muted">{windows.length ? `${windows.length} бр.` : 'няма'}</p>
        </div>

        <ul className="divide-y divide-border">
          {windows.map((win, i) => (
            <WindowRow key={win.id} room={room} win={win} index={i} dispatch={dispatch} />
          ))}
        </ul>

        {!windows.length && (
          <p className="px-4 pt-2 text-xs leading-relaxed text-muted">
            Няма прозорци. Сложите ли, горният ред шкафове ще ги заобиколи сам, а ако парапетът
            е нисък — и долният.
          </p>
        )}

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'addWindow' })}
            disabled={windows.length >= WINDOW.MAX_COUNT}
            className="rounded-pill bg-surface-sunken px-3.5 py-2 text-[13px] transition-colors hover:bg-border disabled:opacity-50"
          >
            + Прозорец
          </button>
        </div>
      </div>

      <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted">
        И вратата, и прозорците се местят с влачене по плана. Мебел в обхвата на крилото се
        обажда сама — вратата не се отваря през шкаф.
      </p>
    </div>
  );
}
