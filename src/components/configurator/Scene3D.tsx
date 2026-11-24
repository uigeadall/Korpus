'use client';

/**
 * Обемният изглед. Рисува се със същите средства като чертежа — SVG и
 * малко тригонометрия — защото мебелта е от правоъгълни обеми и не ѝ
 * трябва нито WebGL, нито библиотека от половин мегабайт.
 *
 * Тук се и работи, не само се гледа: всяка врата се отваря сама, а
 * рафтове се влачат вътре. Рафтът не е картинка — влиза в разкроя.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  acceptsShelves,
  canOpen,
  type Kitchen,
  type ModuleKind,
  type PlacedModule,
  type RowId,
  type WorktopType,
  kitchenDoor,
  kitchenWallOpenings,
  moduleGeometry,
  shelfCount,
  maxShelves,
  wallSide,
} from '@/lib/cabinet-rules';
import { type DropTarget, dropTargetAt, moveTargetAt, slideTargetAt } from '@/lib/drop3d';
import { gridStep, wallPoint } from '@/lib/slide';
import { footprint, type Room, type WallSide } from '@/lib/furniture/room';
import {
  type Box,
  type Camera,
  type Face,
  DEFAULT_CAMERA,
  boxFaces,
  floorPointAt,
  project,
  cameraFacing,
  paintOrder,
  sceneFor,
  shade,
  tint,
  VIEW_ASPECT,
  viewBoxFor,
  visibleFaces,
} from '@/lib/scene3d';
import { finishById } from '@/config/wall-finishes';
import { finishIdFor, floorSurface, innerWallPlane, isFloorTop, wallSurface } from '@/lib/wall-finish';
import { floorById } from '@/config/floor-finishes';
import { WallSurface } from './WallSurface';
import { roomFor } from '@/lib/fit';
import { useFlash } from '@/components/useFlash';
import {
  type Zoom,
  closestWidth,
  deltaForScale,
  parseViewBox,
  settle,
  zoomAmount,
  zoomStep,
  zoomedViewBox,
} from '@/lib/zoom';
import { FURNISHINGS, halfExtent } from '@/lib/furnishings';
import { isOperable, moduleSpeech } from '@/lib/speech';
import { SHADE_STEPS, gradientsFor, litColor, paletteFor } from '@/lib/render';

export { litColor, paletteFor } from '@/lib/render';

export function Scene3D({
  kitchen,
  room,
  placed,
  worktop,
  className,
  fill = false,
  onShelves,
  onMoveFurnishing,
  onRotateFurnishing,
  onRemoveFurnishing,
  focusSide,
  dropKind = null,
  dropWallIndex = 0,
  onDropModule,
  onDropCancel,
  onMoveModule,
  onSlideModule,
  onRemoveModule,
  view,
  onView,
}: {
  kitchen: Kitchen;
  room: Room;
  placed: { base: PlacedModule[]; upper: PlacedModule[] }[];
  worktop: WorktopType;
  className?: string;
  /**
   * Картината изпълва кутията, в която стои, вместо да е с постоянна
   * форма. Кадърът се прави по формата на кутията — без празни ленти.
   */
  fill?: boolean;
  /** Нов брой рафтове за този модул. Без него рафтовете не се пипат. */
  onShelves?: (moduleId: string, shelves: number) => void;
  /** Преместване на готово изделие по пода. Без него то не се влачи. */
  onMoveFurnishing?: (id: string, x: number, z: number) => void;
  onRotateFurnishing?: (id: string) => void;
  onRemoveFurnishing?: (id: string) => void;
  /**
   * Коя стена да се вижда. По подразбиране тази с вратата; потокът
   * подава стената на отвора, който човекът в момента мести.
   */
  focusSide?: WallSide;
  /** Модулът, вдигнат от палитрата. Докато го има, се чака пускане. */
  dropKind?: ModuleKind | null;
  /** По коя стена се нарежда — индекс в `kitchen.walls`. */
  dropWallIndex?: number;
  onDropModule?: (kind: ModuleKind, row: RowId, index: number) => void;
  onDropCancel?: () => void;
  /** Разместване на готов шкаф по стената. Без него той само се отваря. */
  onMoveModule?: (moduleId: string, toIndex: number) => void;
  /**
   * Плъзгане на шкаф до точно място по стената — левият ръб в мм. С него
   * шкафът ляга, където го пуснеш, по решетка; без него само се разменя.
   */
  onSlideModule?: (moduleId: string, left: number) => void;
  /** Махане на шкаф. Без него щракнатият шкаф няма какво да предложи. */
  onRemoveModule?: (moduleId: string) => void;
  /**
   * Запомнена камера на стаята.
   *
   * Без нея всяко връщане в стаята дава друг кадър и шестте стаи на едно
   * жилище изглеждат като снимани от шестима различни. Подаде ли се,
   * изгледът тръгва оттам и се обажда, щом човек я завърти.
   */
  view?: { yaw: number; pitch: number; distance: number };
  onView?: (view: { yaw: number; pitch: number; distance: number }) => void;
}) {
  const [camera, setCameraState] = useState<Camera>(() =>
    view ? { ...DEFAULT_CAMERA(room), ...view } : DEFAULT_CAMERA(room),
  );

  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const setCamera = (next: Camera | ((c: Camera) => Camera)) => {
    const value = typeof next === 'function' ? next(cameraRef.current) : next;
    cameraRef.current = value;
    setCameraState(value);
  };

  /*
   * Запомня се УСТАНОВЕНАТА камера, не всеки кадър от движението.
   *
   * При въртене окото се мести по шейсет пъти в секунда; обаждане на
   * всяко от тях залива записа в браузъра и пренарежда цялата страница
   * без нужда. Затова се обажда в края на жеста и при единичните
   * действия — бутона и стрелките.
   *
   * Пази се само накъде гледа: целта е на стаята и се смята наново.
   */
  const reportView = () => {
    const c = cameraRef.current;
    onView?.({ yaw: c.yaw, pitch: c.pitch, distance: c.distance });
  };

  /*
   * Премести ли някой вратата на зид, който стои между окото и стаята,
   * тя изчезва от картината — човекът е направил нещо и нищо не се е
   * случило. Затова изгледът се обръща към нея. Нагласява се при
   * рендер, а не в ефект: ефектът би изчакал един излишен кадър и
   * вратата щеше да мигне.
   */
  const wanted = focusSide ?? kitchenDoor(kitchen).side;
  const [shownSide, setShownSide] = useState(wanted);
  if (shownSide !== wanted) {
    setShownSide(wanted);
    setCamera((c) => cameraFacing(room, wanted, wallSide(kitchen.walls[0]), c));
  }

  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  /*
   * Какво е натиснато. Щракането не може да се хване на самия
   * многоъгълник: `setPointerCapture` върху <svg> пренасочва
   * събитията към него и потомъкът не получава клик. Затова се пази
   * какво е било под показалеца при натискането и ако той не се е
   * помръднал до пускането, това брои за щракване.
   */
  const press = useRef<{ x: number; y: number; id: string | null; role: string | null } | null>(
    null,
  );

  /* --- Кой шкаф е отворен ------------------------------------------- */

  const [targets, setTargets] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const amountsRef = useRef<Record<string, number>>({});

  /*
   * Отварянето е плавно, защото скокът не се чете: окото не разбира
   * кое накъде се е завъртяло. Всеки шкаф догонва своята цел сам,
   * затова няколко могат да се отварят и затварят едновременно.
   * Кадрите идват от браузъра — точките на многоъгълник не се
   * анимират със стилове.
   */
  useEffect(() => {
    let frame = 0;
    const step = () => {
      const current = amountsRef.current;
      const next = { ...current };
      let moving = false;

      for (const id of new Set([...Object.keys(current), ...Object.keys(targets)])) {
        const to = targets[id] ? 1 : 0;
        const from = current[id] ?? 0;
        if (Math.abs(to - from) < 0.004) {
          if (from !== to) next[id] = to;
          continue;
        }
        next[id] = from + (to - from) * 0.2;
        moving = true;
      }

      amountsRef.current = next;
      setAmounts(next);
      if (moving) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [targets]);

  const toggle = (id: string) => setTargets((t) => ({ ...t, [id]: !t[id] }));
  const anyOpen = Object.values(targets).some(Boolean);

  const allModules = placed.flatMap((p) => [...p.base, ...p.upper]);
  const moduleById = new Map(allModules.map((m) => [m.id, m]));
  const setAll = (on: boolean) =>
    setTargets(Object.fromEntries(allModules.map((m) => [m.id, on])));

  /* --- Влачене на рафт ----------------------------------------------- */

  const [carrying, setCarrying] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  /** Какво стои под показалеца. */
  const under = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as Element | null;
    return { id: el?.getAttribute('data-module') ?? null, role: el?.getAttribute('data-role') ?? null };
  };

  /** Кой шкаф е под показалеца — само такъв, в който рафт има смисъл. */
  const moduleUnder = (x: number, y: number): string | null => {
    const { id } = under(x, y);
    if (!id) return null;
    const m = moduleById.get(id);
    // Пълен шкаф не светва — в него рафт няма къде да влезе.
    return m && acceptsShelves(m.kind) && shelfCount(m) < maxShelves(m.kind) ? id : null;
  };

  /** Защо рафтът не влезе — пълен шкаф или място, където рафт няма. */
  const [shelfNote, noteShelf] = useFlash(2800);
  const whyNoShelf = (x: number, y: number) => {
    const { id } = under(x, y);
    const m = id ? moduleById.get(id) : undefined;
    if (!m) return;
    noteShelf(
      acceptsShelves(m.kind)
        ? `${m.code ?? m.spec.label} е пълен — най-много ${maxShelves(m.kind)} рафта при тази височина.`
        : `В „${m.spec.label}" рафт не влиза.`,
    );
  };

  const carryMove = (e: React.PointerEvent) => {
    if (carrying) setHover(moduleUnder(e.clientX, e.clientY));
  };

  const carryDrop = (e: React.PointerEvent) => {
    if (!carrying) return;
    const id = moduleUnder(e.clientX, e.clientY);
    setCarrying(false);
    setHover(null);
    const m = id ? moduleById.get(id) : undefined;
    if (!id || !m) {
      whyNoShelf(e.clientX, e.clientY);
      return;
    }
    onShelves?.(id, shelfCount(m) + 1);
    // Отваряме го, за да се види какво е влязло вътре.
    setTargets((t) => ({ ...t, [id]: true }));
  };

  /* --- Влачене на готово изделие по пода ------------------------------ */

  const furnishings = kitchen.furnishings ?? [];
  const furnishingById = new Map(furnishings.map((f) => [f.id, f]));
  const [picked, setPicked] = useState<string | null>(null);
  /*
   * Избраното се разрешава до самия предмет, а не се вярва на
   * запомнения идентификатор: предметът може да е махнат от списъка
   * или да е отпаднал при смяна на стаята, а изборът да е останал да
   * сочи към него.
   */
  const pickedItem = picked ? furnishingById.get(picked) : undefined;
  const moving = useRef<{ id: string; dx: number; dz: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /** Екранна точка → място на пода, в милиметри от ъгъла на стаята. */
  const floorAt = (clientX: number, clientY: number) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return floorPointAt(p.x, p.y, cam);
  };

  /* --- Камерата ------------------------------------------------------ */

  const cam: Camera = { ...camera, target: { ...DEFAULT_CAMERA(room).target } };
  /*
   * Избран под носи своята шарка; фугите на подразбиращия се под тогава
   * са излишни и само биха минали през паркета.
   */
  const floor = floorById(kitchen.floorFinish);
  const scene = sceneFor(kitchen, room, placed, worktop, kitchen.materials.opening, amounts);
  const boxes = floor ? scene.filter((b) => b.role !== 'seam') : scene;
  const faces = visibleFaces(boxes, cam);
  const palette = paletteFor(kitchen);
  const gradients = gradientsFor(faces, palette);

  /* --- Пускане на модул от палитрата -------------------------------- */

  /*
   * Мястото, на което ще падне вдигнатият модул. Пази се в състояние,
   * за да се нарисува прозрачната сянка: без нея човек пуска на сляпо
   * и се надява.
   */
  const [dropAt, setDropAt] = useState<DropTarget | null>(null);

  /*
   * Шкаф, хванат в обема. `carried` помни кога и откъде е хванат —
   * докато показалецът не се е отместил достатъчно, това още е
   * щракване и шкафът се отваря, вместо да се мести.
   */
  const carried = useRef<{ id: string; x: number; y: number } | null>(null);
  const [carriedId, setCarriedId] = useState<string | null>(null);

  /*
   * Щракнатият шкаф. Пази се само името му; самият шкаф се разрешава
   * при всеки рендер, защото може да е махнат или преподреден — както
   * и при готовите изделия.
   */
  const [chosenId, setChosenId] = useState<string | null>(null);
  /*
   * Избраният шкаф се разрешава наново при всеки рендер: може да е
   * махнат или преподреден и запомненото име да сочи в празното.
   */
  const chosen = chosenId ? moduleById.get(chosenId) : undefined;

  const dropWall = kitchen.walls[dropWallIndex];
  const dropRows = placed[dropWallIndex];

  /** Стената, по която се нарежда — една и съща за пускане и за местене. */
  const dropSide = dropWall ? wallSide(dropWall, dropWallIndex) : null;
  const dropScene = useMemo(
    () =>
      dropWall && dropRows && dropSide
        ? {
            room,
            roomKind: kitchen.roomKind ?? 'kitchen',
            side: dropSide,
            wall: dropWall,
            openings: kitchenWallOpenings(kitchen, dropSide),
            placed: dropRows,
          }
        : null,
    [dropWall, dropRows, dropSide, room, kitchen],
  );

  /** Екранна точка → точка в кадъра на сцената, или нищо извън нея. */
  const inScene = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const box = svg.getBoundingClientRect();
      if (clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom) {
        return null;
      }
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    },
    [],
  );

  useEffect(() => {
    if (!dropKind || !dropScene) return;

    // Камерата се сглобява тук, а не отвън: отвън тя е нов обект при
    // всеки рендер и следенето би се пренавързвало без причина.
    const at: Camera = { ...camera, target: { ...DEFAULT_CAMERA(room).target } };

    const where = (clientX: number, clientY: number) => {
      const p = inScene(clientX, clientY);
      return p ? dropTargetAt(dropScene, dropKind, p.x, p.y, at) : null;
    };

    const onMove = (e: PointerEvent) => setDropAt(where(e.clientX, e.clientY));
    const onUp = (e: PointerEvent) => {
      const target = where(e.clientX, e.clientY);
      if (target) onDropModule?.(dropKind, target.row, target.index);
      else onDropCancel?.();
      setDropAt(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dropKind, dropScene, inScene, room, camera, onDropModule, onDropCancel]);

  /**
   * Сянката на модула, който ще падне — истински обем на мястото си, не
   * правоъгълник върху картината. Само така се вижда, че шкафът ще
   * застане до съседа си, а не пред него.
   */
  const ghostFaces: Face[] = (() => {
    if (!dropAt || !dropWall) return [];
    // Призрак има и при двете влачения: нов модул от палитрата и
    // готов шкаф, хванат в самата стая.
    const kind = dropKind ?? (carriedId ? moduleById.get(carriedId)?.kind : undefined);
    if (!kind) return [];
    const side = wallSide(dropWall, dropWallIndex);
    const g = moduleGeometry(kind);
    const rect = footprint(room, side, dropAt.left, dropAt.width, g.depth);
    const box: Box = {
      x: rect.x,
      y: g.y,
      z: rect.y,
      width: rect.width,
      height: g.height,
      depth: rect.height,
      role: 'carcass',
      facing: side,
    };
    return paintOrder(boxFaces(box), cam);
  })();

  /** Решетката при влачене на шкаф и колко далеч от ъгъла ще легне. */
  const grid = (() => {
    if (!carriedId || !dropScene || !dropAt?.slide) return null;
    const m = moduleById.get(carriedId);
    if (!m) return null;
    const { wall, side } = dropScene;
    const step = gridStep(wall.length);
    const near = moduleGeometry('door').depth + 40;
    const far = near + 420;
    const lines: { a: { x: number; y: number }; b: { x: number; y: number }; major: boolean }[] = [];
    for (let a = 0, i = 0; a <= wall.length + 0.5; a += step, i++) {
      lines.push({
        a: project(wallPoint(room, side, a, near, 2), cam),
        b: project(wallPoint(room, side, a, far, 2), cam),
        major: i % 5 === 0,
      });
    }
    const at = project(wallPoint(room, side, dropAt.left, far + 60, 2), cam);
    return { lines, at, left: dropAt.left, step };
  })();

  /** Вдигнатият от палитрата модул няма къде да влезе — сянката е червена. */
  const noRoom = Boolean(dropKind && dropAt && !roomFor(kitchen, dropWallIndex, dropKind));

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        // Втори пръст: щипане. Каквото първият е започнал, се отменя.
        drag.current = null;
        carried.current = null;
        moving.current = null;
        press.current = null;
        setCarriedId(null);
        setDropAt(null);
        pinch.current = spread();
        return;
      }
    }
    if (carrying) return;
    const hit = under(e.clientX, e.clientY);
    press.current = { x: e.clientX, y: e.clientY, ...hit };
    e.currentTarget.setPointerCapture(e.pointerId);

    // Натиснато върху готово изделие: влачи се то, не се върти стаята.
    const f = hit.id ? furnishingById.get(hit.id) : undefined;
    if (f && onMoveFurnishing) {
      const at = floorAt(e.clientX, e.clientY);
      moving.current = at ? { id: f.id, dx: at.x - f.x, dz: at.z - f.z } : null;
      setPicked(f.id);
      return;
    }

    /*
     * Натиснато върху шкаф: взема се наум, но още не се мести. Ако
     * показалецът не помръдне, това си е щракване и шкафът ще се
     * отвори; помръдне ли — почва местене, не въртене на стаята.
     */
    if (hit.id && moduleById.has(hit.id) && (onMoveModule || onSlideModule) && dropScene) {
      carried.current = { id: hit.id, x: e.clientX, y: e.clientY };
      return;
    }

    drag.current = { x: e.clientX, y: e.clientY, yaw: camera.yaw, pitch: camera.pitch };
  };

  /** Докосване без влачене: отваря шкаф или маха рафт. */
  const tap = (e: React.PointerEvent) => {
    const start = press.current;
    press.current = null;
    // Щракване по празното отменя избора — иначе лентата на избрания
    // стои и след като човек е погледнал другаде.
    if (!start?.id) {
      setChosenId(null);
      return;
    }
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;

    if (furnishingById.has(start.id)) {
      setPicked(start.id);
      setChosenId(null);
      return;
    }
    setPicked(null);

    const m = moduleById.get(start.id);
    if (!m) {
      setChosenId(null);
      return;
    }
    setChosenId(m.id);
    if (start.role === 'shelf' && acceptsShelves(m.kind)) {
      onShelves?.(m.id, Math.max(0, shelfCount(m) - 1));
    } else if (canOpen(m.kind)) {
      /*
       * Щрака се по кое да е лице на шкафа, не само по вратата му.
       * Иначе библиотеката и стенният рафт изобщо не се хващат, а
       * шкаф с отворена врата се хваща само докато вратата гледа
       * насам.
       */
      toggle(m.id);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && touches.current.size >= 2) {
        e.preventDefault();
        const now = spread();
        if (pinch.current.dist > 0) zoomAt.current(deltaForScale(now.dist / pinch.current.dist), now.x, now.y);
        pinch.current = now;
        return;
      }
    }
    carryMove(e);
    // Посочването е само с мишка и само когато нищо не се влачи.
    if (
      e.pointerType === 'mouse' &&
      !drag.current &&
      !carried.current &&
      !moving.current &&
      !dropKind &&
      !carrying
    ) {
      pointAt(e.clientX, e.clientY);
    }

    const grabbed = carried.current;
    if (grabbed && dropScene) {
      // Шест пиксела: под тях пръстът трепери, а не влачи.
      if (!carriedId && Math.hypot(e.clientX - grabbed.x, e.clientY - grabbed.y) < 6) return;
      e.preventDefault();
      setCarriedId(grabbed.id);
      const p = inScene(e.clientX, e.clientY);
      // Първо свободно място по решетката; заето ли е — разместване.
      const slid = p && onSlideModule ? slideTargetAt(dropScene, grabbed.id, p.x, p.y, cam) : null;
      setDropAt(slid ?? (p && onMoveModule ? moveTargetAt(dropScene, grabbed.id, p.x, p.y, cam) : null));
      return;
    }

    const held = moving.current;
    if (held) {
      e.preventDefault();
      const at = floorAt(e.clientX, e.clientY);
      const f = furnishingById.get(held.id);
      if (at && f) {
        /*
         * Ограничава се целият предмет, не центърът му — иначе
         * диванът опира с центъра си в зида и половината му излиза
         * извън стаята. Завъртеният заема друго място по осите.
         */
        const half = halfExtent(f.kind, f.rotation);
        const clamp = (v: number, half: number, limit: number) =>
          Math.max(Math.min(half, limit / 2), Math.min(limit - half, v));

        onMoveFurnishing?.(
          held.id,
          clamp(at.x - held.dx, half.x, room.width),
          clamp(at.z - held.dz, half.z, room.depth),
        );
      }
      return;
    }

    const start = drag.current;
    if (!start) return;
    e.preventDefault();
    setCamera((c) => ({
      ...c,
      yaw: start.yaw + (e.clientX - start.x) * 0.006,
      // Не се обръща надолу с главата и не пада под пода.
      pitch: Math.max(-0.12, Math.min(1.1, start.pitch + (e.clientY - start.y) * 0.004)),
    }));
  };

  /** Пускане на носения шкаф: разместване само ако мястото му е друго. */
  const dropCarried = () => {
    const grabbed = carried.current;
    carried.current = null;
    if (!grabbed) return false;

    const moved = Boolean(carriedId);
    const target = dropAt;
    setCarriedId(null);
    setDropAt(null);
    if (!moved) return false;

    /*
     * И двата пътя се сверяват дали мястото наистина е друго: иначе
     * всяко докосване влиза в историята и ⌘Z почва да връща нищо.
     */
    if (target?.slide) {
      const now = dropScene?.placed[target.row].find((m) => m.id === grabbed.id);
      if (now && now.x !== target.left) onSlideModule?.(grabbed.id, target.left);
    } else if (target) {
      const row = dropScene?.placed[target.row] ?? [];
      const me = row.find((m) => m.id === grabbed.id);
      if (!me || me.x !== target.left) onMoveModule?.(grabbed.id, target.index);
    }
    // Вярно значи „това беше влачене": щракването да не отваря шкафа.
    return true;
  };

  const endDrag = () => {
    // Въртяло ли се е окото, тук то вече е спряло и мястото му се помни.
    if (drag.current) reportView();
    drag.current = null;
    moving.current = null;
  };

  /* --- Посочване и приближаване с колелцето ----------------------------
   *
   * Посоченият с мишката шкаф светва. Колелцето над него приближава към
   * него, а щом е достатъчно близо, вратите му се отварят сами — за да се
   * види какво има вътре. Колелцето обратно отдалечава и затваря каквото
   * приближаването е отворило. Над празно място колелцето си скролира
   * страницата, както винаги.
   *
   * Кадърът се стеснява, окото не се мести: щракането, рафтовете и
   * местенето работят и отблизо, защото проекцията е същата.
   */
  const [pointed, setPointed] = useState<string | null>(null);
  const pointAt = (clientX: number, clientY: number) => {
    const { id } = under(clientX, clientY);
    const next = id && moduleById.has(id) ? id : null;
    if (next !== pointed) setPointed(next);
  };
  const leaveScene = () => setPointed(null);

  /** Коя стена — за да се намери шкафът в стаята. */
  const sideOf = new Map<string, WallSide>();
  placed.forEach((rows, i) => {
    const side = wallSide(kitchen.walls[i] ?? kitchen.walls[0], i);
    for (const m of [...rows.base, ...rows.upper]) sideOf.set(m.id, side);
  });

  /*
   * Формата на кутията, когато картината я изпълва. Мери се, а не се
   * гадае: колоната с модули до нея и височината на екрана решават.
   */
  const [boxAspect, setBoxAspect] = useState<number | null>(null);
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!fill || !el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBoxAspect(Math.max(0.9, Math.min(2.8, width / height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);
  const full = parseViewBox(
    viewBoxFor(boxes, cam, 220, fill && boxAspect ? boxAspect : VIEW_ASPECT),
  );
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const shownView = zoomedViewBox(zoom, full);
  const shownRef = useRef(shownView);
  useEffect(() => {
    shownRef.current = shownView;
  });

  /*
   * Колелцето дава целта, а кадърът я догонва за няколко кадъра — иначе
   * всяко щракване на колелцето е скок с петнайсет процента.
   */
  const goal = useRef<Zoom | null>(null);
  const live = useRef<Zoom | null>(null);
  const frame = useRef(0);
  const fullWidth = useRef(full[2]);
  const fullView = useRef(full);
  /** Към кой шкаф е приближението и дали той е от отварящите се. */
  const aim = useRef<{ id: string; opens: boolean } | null>(null);
  /** Шкафовете, които приближаването е отворило — само тях затваря. */
  const openedByZoom = useRef<Set<string>>(new Set());
  const minWidth = useRef(full[2]);
  /** Кога колелцето е спряло — тогава пружината връща кадъра. */
  const restTimer = useRef<number | undefined>(undefined);

  /** Отваря шкафа отблизо и затваря отвореното, щом човек се отдалечи. */
  const syncOpen = (z: Zoom | null) => {
    const amount = zoomAmount(z, fullWidth.current);
    const opened = openedByZoom.current;
    const target = aim.current;
    const close = [...opened].filter((id) => amount < 0.3 || id !== target?.id);
    const open = amount > 0.45 && target?.opens && !opened.has(target.id) ? target.id : null;
    if (!close.length && !open) return;
    for (const id of close) opened.delete(id);
    if (open) opened.add(open);
    setTargets((t) => ({
      ...t,
      ...Object.fromEntries(close.map((id) => [id, false])),
      ...(open ? { [open]: true } : {}),
    }));
  };

  const glide = () => {
    if (frame.current) return;
    const step = () => {
      const [fx, fy, fw, fh] = fullView.current;
      const whole: Zoom = { width: fw, cx: fx + fw / 2, cy: fy + fh / 2 };
      const to = goal.current;
      const from = live.current ?? (to ? whole : null);
      if (!from) {
        frame.current = 0;
        return;
      }
      const end = to ?? whole;
      // Бързо догонване — колелцето да се усеща под пръста, не след него.
      const k = 0.42;
      const next: Zoom = {
        width: from.width + (end.width - from.width) * k,
        cx: from.cx + (end.cx - from.cx) * k,
        cy: from.cy + (end.cy - from.cy) * k,
      };
      const done =
        Math.abs(next.width - end.width) < fw * 0.002 &&
        Math.abs(next.cx - end.cx) < fw * 0.002 &&
        Math.abs(next.cy - end.cy) < fw * 0.002;
      const value = done ? to : next;
      live.current = value;
      setZoom(value);
      syncOpen(value);
      frame.current = done ? 0 : requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  const resetZoom = (smooth: boolean) => {
    window.clearTimeout(restTimer.current);
    goal.current = null;
    aim.current = null;
    if (smooth) {
      glide();
      return;
    }
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    live.current = null;
    setZoom(null);
    syncOpen(null);
  };

  /**
   * Едно приближаване или отдалечаване в точка от екрана — от колелцето,
   * от щипането на тъчпада и от два пръста на телефона. Точката под
   * мишката остава под мишката; шкафът там се отваря отблизо.
   * Обработката се подменя при всеки рендер, за да вижда днешната стая.
   */
  const zoomAt = useRef<(deltaY: number, clientX: number, clientY: number) => void>(() => {});
  useEffect(() => {
    fullWidth.current = full[2];
    fullView.current = full;
    zoomAt.current = (deltaY, clientX, clientY) => {
      if (dropKind || carrying || carried.current) return;
      const p = inScene(clientX, clientY);
      if (!p) return;

      // Мястото на мишката като дял от показания кадър, пренесено в кадъра,
      // към който вече се движим — така и бързите поредни завъртания
      // държат точката под мишката.
      const [sx, sy, sw, sh] = parseViewBox(shownRef.current);
      const [gx, gy, gw, gh] = parseViewBox(zoomedViewBox(goal.current ?? live.current, full));
      const at = { x: gx + ((p.x - sx) / sw) * gw, y: gy + ((p.y - sy) / sh) * gh };

      // Шкафът под мишката се отваря, щом приближението стигне до него.
      if (deltaY < 0) {
        const { id } = under(clientX, clientY);
        const m = id ? moduleById.get(id) : undefined;
        aim.current = m ? { id: m.id, opens: canOpen(m.kind) } : null;
      }

      minWidth.current = closestWidth(full);
      goal.current = zoomStep(goal.current ?? live.current, {
        deltaY,
        at,
        full,
        minWidth: minWidth.current,
      });
      glide();

      // Колелцето спря: каквото е минало отвъд края, се връща.
      window.clearTimeout(restTimer.current);
      restTimer.current = window.setTimeout(() => {
        goal.current = settle(goal.current, fullView.current, minWidth.current);
        if (!goal.current) aim.current = null;
        glide();
      }, 140);
    };
  });

  /*
   * Над стаята всичко, което браузърът би направил с колелцето и
   * щипането — скролиране, мащабиране на целия сайт, — приближава само
   * стаята. Слуша се направо, не през React: там слушателят на колелцето
   * е пасивен и не може да спре браузъра.
   */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      // Щипането на тъчпада идва като колелце с Ctrl — ситно, затова по-силно.
      const step = (e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY) * (e.ctrlKey ? 3 : 1);
      zoomAt.current(step, e.clientX, e.clientY);
    };
    // Safari праща щипането като жест, не като колелце.
    let lastScale = 1;
    const gestureStart = (e: Event) => {
      e.preventDefault();
      lastScale = 1;
    };
    const gestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      zoomAt.current(deltaForScale(g.scale / lastScale), g.clientX, g.clientY);
      lastScale = g.scale;
    };
    const gestureEnd = (e: Event) => e.preventDefault();
    svg.addEventListener('wheel', wheel, { passive: false });
    svg.addEventListener('gesturestart', gestureStart);
    svg.addEventListener('gesturechange', gestureChange);
    svg.addEventListener('gestureend', gestureEnd);
    return () => {
      svg.removeEventListener('wheel', wheel);
      svg.removeEventListener('gesturestart', gestureStart);
      svg.removeEventListener('gesturechange', gestureChange);
      svg.removeEventListener('gestureend', gestureEnd);
      cancelAnimationFrame(frame.current);
      window.clearTimeout(restTimer.current);
    };
  }, []);

  /*
   * Два пръста на телефона. Вторият пръст прави от докосването щипане —
   * то не върти стаята, не мести шкаф и не отваря нищо.
   */
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; x: number; y: number } | null>(null);
  const spread = () => {
    const [a, b] = [...touches.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  /** Пръст, който е бил част от щипане, не завършва с щракване. */
  const endTouch = (e: React.PointerEvent): boolean => {
    if (e.pointerType !== 'touch') return false;
    touches.current.delete(e.pointerId);
    if (!pinch.current) return false;
    if (touches.current.size < 2) pinch.current = null;
    press.current = null;
    drag.current = null;
    return true;
  };

  /*
   * Друга стая — друг кадър. Приближение, останало от предишната, би
   * гледало в празно място на новата.
   */
  const roomShape = `${kitchen.roomKind ?? 'kitchen'}|${room.width}|${room.depth}`;
  const [shapeSeen, setShapeSeen] = useState(roomShape);
  if (shapeSeen !== roomShape) {
    setShapeSeen(roomShape);
    goal.current = null;
    live.current = null;
    aim.current = null;
    setZoom(null);
  }

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetZoom(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 0.3 : 0.1;
    const turn: Record<string, Partial<Camera>> = {
      ArrowLeft: { yaw: camera.yaw - step },
      ArrowRight: { yaw: camera.yaw + step },
      ArrowUp: { pitch: Math.min(1.1, camera.pitch + step) },
      ArrowDown: { pitch: Math.max(-0.12, camera.pitch - step) },
    };
    if (turn[e.key]) {
      e.preventDefault();
      setCamera((c) => ({ ...c, ...turn[e.key] }));
      reportView();
    }
  };

  /*
   * Една спирка на Tab за шкаф, не за всяка стена на всеки обем —
   * иначе само кухнята дава над сто спирки.
   *
   * Възелът е отделен и невидим, а не закачен за някое от нарисуваните
   * лица. Лицата се отрязват и пренареждат при всяко движение; закачен
   * за тях, възелът се размонтира и фокусът от клавиатурата изчезва
   * точно когато отвориш вратата. Този стои, а само очертанието му се
   * мени — затова фокусът оцелява.
   *
   * Мишката не минава през него: тя си работи по самите лица.
   */
  const outlines = new Map<string, { x: number; y: number }[]>();
  for (const face of faces) {
    const id = face.moduleId;
    if (!id || !moduleById.has(id)) continue;
    const corners = face.corners.map((c) => project(c, cam));
    const box = outlines.get(id);
    if (!box) outlines.set(id, corners);
    else box.push(...corners);
  }

  /** Правоъгълник около всичко видимо от един модул. */
  const outlineOf = (points: { x: number; y: number }[]) => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    return `${x0},${y0} ${x1},${y0} ${x1},${y1} ${x0},${y1}`;
  };

  return (
    <div className={`relative ${fill ? 'h-full min-h-[260px]' : ''} ${className ?? ''}`}>
      <svg
        ref={svgRef}
        viewBox={shownView}
        className={`${fill ? 'absolute inset-0 h-full' : 'block h-auto'} w-full touch-none select-none ${
          carrying ? 'cursor-copy' : 'cursor-grab active:cursor-grabbing'
        }`}
        role="group"
        aria-label={`Обемен изглед в стая ${room.width} на ${room.depth} мм. Стрелките въртят изгледа.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={leaveScene}
        onPointerUp={(e) => {
          if (endTouch(e)) return;
          const wasCarrying = dropCarried();
          endDrag();
          if (carrying) carryDrop(e);
          else if (!wasCarrying) tap(e);
          else press.current = null;
        }}
        onPointerCancel={(e) => {
          endTouch(e);
          carried.current = null;
          setCarriedId(null);
          setDropAt(null);
          endDrag();
        }}
        onKeyDown={onKeyDown}
      >
        <defs>
          {gradients.defs.map((g) => (
            <linearGradient key={g.id} id={`g-${g.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={g.top} />
              <stop offset="1" stopColor={g.bottom} />
            </linearGradient>
          ))}
          {/* Дръжките са метал: светва по средата, тъмно в двата края. */}
          <linearGradient id="g-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6f6d69" />
            <stop offset="0.45" stopColor="#d8d5d0" />
            <stop offset="0.62" stopColor="#9a9792" />
            <stop offset="1" stopColor="#5d5b58" />
          </linearGradient>
          {/* Сянката е размазана, а не изрязана с ножица. */}
          <filter id="f-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
        </defs>

        {faces.map((face) => {
          /*
           * Вътрешното лице на стената носи покритието ѝ. Останалите
           * лица на зида — горният ръб, челата до отворите — са както
           * преди: те са самият зид, не облицовката му.
           */
          if (floor && isFloorTop(face.role, face.normal)) {
            const amount = Math.round(shade(face.normal) * SHADE_STEPS) / SHADE_STEPS;
            const warmth = tint(face.normal);
            return (
              <WallSurface
                key={face.key}
                face={face}
                surface={floorSurface(face.corners)}
                finish={floor}
                cam={cam}
                top={litColor(floor.hex, Math.min(1.2, amount * 1.07), warmth)}
                bottom={litColor(floor.hex, amount * 0.9, warmth)}
                light={(hex) => litColor(hex, amount, warmth)}
              />
            );
          }
          const plane = face.role === 'wall' ? innerWallPlane(face.corners, face.normal, room) : null;
          if (plane) {
            const finish = finishById(finishIdFor(kitchen.wallFinish, plane.side));
            const amount = Math.round(shade(face.normal) * SHADE_STEPS) / SHADE_STEPS;
            const warmth = tint(face.normal);
            return (
              <WallSurface
                key={face.key}
                face={face}
                surface={wallSurface(plane, face.corners)}
                finish={finish}
                cam={cam}
                top={litColor(finish.hex, Math.min(1.2, amount * 1.07), warmth)}
                bottom={litColor(finish.hex, amount * 0.9, warmth)}
                light={(hex) => litColor(hex, amount, warmth)}
              />
            );
          }
          const m = face.moduleId ? moduleById.get(face.moduleId) : undefined;
          return (
            <Polygon
              key={face.key}
              face={face}
              cam={cam}
              palette={palette}
              highlight={Boolean(
                face.moduleId &&
                  (face.moduleId === hover ||
                    // Посоченият светва — над него колелцето приближава.
                    face.moduleId === pointed ||
                    face.moduleId === pickedItem?.id ||
                    face.moduleId === carriedId ||
                    face.moduleId === chosen?.id),
              )}
              module={m}
              gradientId={gradients.idOf(face)}
            />
          );
        })}

        {/*
          Сянката на вдигнатия модул се рисува последна — тя стои пред
          всичко, както стои и пръстът, който я държи.
        */}
        {/*
          Решетката, по която ляга влаченият шкаф — на пода пред реда.
          Стъпката е по дължината на стената; всяка пета черта е по-ясна.
        */}
        {grid && (
          <g pointerEvents="none">
            {grid.lines.map((l, i) => (
              <line
                key={i}
                x1={l.a.x}
                y1={l.a.y}
                x2={l.b.x}
                y2={l.b.y}
                stroke="var(--accent)"
                strokeOpacity={l.major ? 0.55 : 0.22}
                strokeWidth={l.major ? 1.4 : 0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* Колко далеч от началото на стената ще застане левият ръб. */}
            <text
              x={grid.at.x}
              y={grid.at.y}
              fontSize={parseViewBox(shownView)[2] * 0.02}
              fill="var(--accent)"
              stroke="var(--background)"
              strokeWidth={parseViewBox(shownView)[2] * 0.004}
              paintOrder="stroke"
              className="font-mono"
            >
              {`← ${grid.left} мм · решетка ${grid.step} мм`}
            </text>
          </g>
        )}

        {ghostFaces.map((face) => (
          // Червена сянка: в този ред няма място — пуснат, модулът няма да влезе.
          <polygon
            key={`ghost-${face.key}`}
            points={face.corners
              .map((c) => {
                const p = project(c, cam);
                return `${p.x},${p.y}`;
              })
              .join(' ')}
            fill={noRoom ? 'var(--danger)' : 'var(--accent)'}
            fillOpacity={0.26}
            stroke={noRoom ? 'var(--danger)' : 'var(--accent)'}
            strokeWidth={6}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}

        {[...outlines].map(([id, points]) => {
          const m = moduleById.get(id)!;
          const open = (amounts[id] ?? 0) > 0.5;
          return (
            <polygon
              key={id}
              points={outlineOf(points)}
              fill="none"
              pointerEvents="none"
              role={isOperable(m.kind, Boolean(onRemoveModule)) ? 'button' : 'img'}
              tabIndex={0}
              aria-label={moduleSpeech(m, open, Boolean(onRemoveModule))}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && canOpen(m.kind)) {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(m.id);
                } else if (onShelves && acceptsShelves(m.kind) && (e.key === '+' || e.key === '=')) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (shelfCount(m) < maxShelves(m.kind)) onShelves(m.id, shelfCount(m) + 1);
                } else if (onShelves && acceptsShelves(m.kind) && e.key === '-') {
                  e.preventDefault();
                  e.stopPropagation();
                  onShelves(m.id, Math.max(0, shelfCount(m) - 1));
                } else if (onRemoveModule && (e.key === 'Delete' || e.key === 'Backspace')) {
                  // Същото, което прави „× махни" — но без мишка.
                  e.preventDefault();
                  e.stopPropagation();
                  setChosenId(null);
                  onRemoveModule(m.id);
                }
              }}
            />
          );
        })}
      </svg>

      {shelfNote && (
        <p
          role="status"
          className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 rounded-pill bg-surface/95 px-3 py-1.5 text-[12px] text-danger shadow-sm ring-1 ring-border"
        >
          {shelfNote}
        </p>
      )}

      {onShelves && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            setCarrying(true);
          }}
          onClick={() => setCarrying((v) => !v)}
          aria-pressed={carrying}
          className={`absolute top-3 left-3 rounded-pill px-3 py-1.5 text-[11px] shadow-sm backdrop-blur transition-colors ${
            carrying
              ? 'bg-accent text-accent-contrast'
              : 'bg-surface/90 text-muted ring-1 ring-border hover:text-foreground'
          }`}
        >
          {carrying ? 'Пуснете го в шкаф…' : '＋ Рафт — завлечете го в шкаф'}
        </button>
      )}

      {/*
        Долният ред е един и е гъвкав: отляво какво е избрано, отдясно
        изгледът. Поотделно и закотвени, двете групи се застъпваха на
        тесен екран и „× махни" оставаше под „Затвори всички".
      */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {pickedItem && (onRotateFurnishing || onRemoveFurnishing) && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-pill bg-surface/95 px-3 py-1.5 shadow-sm ring-1 ring-accent backdrop-blur">
              <span className="text-[11px] text-muted">{FURNISHINGS[pickedItem.kind].label}</span>
              {onRotateFurnishing && (
                <button
                  type="button"
                  onClick={() => onRotateFurnishing(pickedItem.id)}
                  className="rounded-pill bg-surface-sunken px-2.5 py-1 text-[11px] transition-colors hover:bg-border"
                >
                  ⟳ завърти
                </button>
              )}
              {onRemoveFurnishing && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveFurnishing(pickedItem.id);
                    setPicked(null);
                  }}
                  className="rounded-pill bg-surface-sunken px-2.5 py-1 text-[11px] transition-colors hover:bg-danger hover:text-accent-contrast"
                >
                  × махни
                </button>
              )}
            </div>
          )}

          {chosen && onRemoveModule && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-pill bg-surface/95 px-3 py-1.5 shadow-sm ring-1 ring-accent backdrop-blur">
              <span className="text-[11px] text-muted">
                {[chosen.code, chosen.spec.label].filter(Boolean).join(' ')}
              </span>
              <button
                type="button"
                onClick={() => {
                  onRemoveModule(chosen.id);
                  setChosenId(null);
                }}
                className="rounded-pill bg-surface-sunken px-2.5 py-1 text-[11px] transition-colors hover:bg-danger hover:text-accent-contrast"
              >
                × махни
              </button>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => setAll(!anyOpen)}
            className="rounded-pill bg-surface/90 px-3 py-1.5 text-[11px] text-muted shadow-sm ring-1 ring-border backdrop-blur transition-colors hover:text-foreground"
          >
            {anyOpen ? 'Затвори всички' : 'Отвори всички'}
          </button>
          <button
            type="button"
            onClick={() => {
              resetZoom(false);
              setCamera(DEFAULT_CAMERA(room));
              reportView();
            }}
            className="rounded-pill bg-surface/90 px-3 py-1.5 text-[11px] text-muted shadow-sm ring-1 ring-border backdrop-blur transition-colors hover:text-foreground"
          >
            Изправи изгледа
          </button>
        </div>
      </div>

    </div>
  );
}

function Polygon({
  face,
  cam,
  palette,
  highlight,
  module: m,
  gradientId,
}: {
  face: Face;
  cam: Camera;
  palette: Record<string, string>;
  highlight: boolean;
  module?: PlacedModule;
  gradientId: string;
}) {
  const points = face.corners
    .map((corner) => {
      const p = project(corner, cam);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  // Петното на пода е единственото полупрозрачно нещо в сцената.
  if (face.role === 'shadow') {
    return (
      <polygon points={points} fill={palette.shadow} opacity="0.17" filter="url(#f-shadow)" />
    );
  }

  const flat =
    face.role === 'floor' ||
    face.role === 'wall' ||
    face.role === 'seam' ||
    // Отвъд отвора няма светлина, която да ги моделира.
    face.role === 'doorway' ||
    face.role === 'glass';
  const opens = Boolean(m && canOpen(m.kind));
  const removes = face.role === 'shelf';

  const fill = highlight
    ? litColor(palette[face.role] ?? palette.carcass, Math.min(1.15, shade(face.normal) * 1.25))
    : face.role === 'handle'
      ? 'url(#g-metal)'
      : `url(#g-${gradientId})`;

  /*
   * Самоличността идва от самото лице. Преди се търсеше в списъка с
   * шкафове — обзавеждането го няма там и затова не се хващаше нито с
   * щракване, нито с влачене.
   */
  return (
    <polygon
      points={points}
      data-module={face.moduleId}
      data-role={face.role}
      fill={fill}
      stroke={highlight ? 'var(--accent)' : flat ? 'none' : 'rgba(0,0,0,0.13)'}
      strokeWidth={highlight ? 2 : 0.75}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className={opens || removes ? 'cursor-pointer' : undefined}
    />
  );
}
