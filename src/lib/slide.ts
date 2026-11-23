/**
 * Шкаф, плъзнат на място по стената.
 *
 * Редът е плътен: шкафовете си допират страниците и позицията им е
 * място в редица, не свободно число. Това е вярно за мебелта, но
 * оставяше един шкаф на празна стена без къде да отиде — човек го
 * влачеше и нищо не се случваше, защото в редица от едно има само
 * едно място.
 *
 * Отговорът не е шкафът да увисне на средата на стената. В истинска
 * кухня между корпуса и ъгъла има ниша — тя се мери, плаща се и влиза
 * в разбивката. Затова плъзгането не мести шкафа в празното, а слага
 * ниши пред него. Каквото се вижда в обема, съществува и в заявката.
 *
 * Нишите са каталожни ширини, не кое да е число. Затова не всяко
 * място е достижимо и шкафът ляга на най-близкото, което се сглобява
 * от наличните — както би станало и в цеха.
 */

import {
  MODULES,
  type KitchenModule,
  type ModuleKind,
  isGap,
} from './cabinet-rules';
import { fillWidths } from './furniture/system';

/** Колко празно наистина може да се сглоби от нишите в този ред. */
export function gapWidths(gapKind: ModuleKind | null): readonly number[] {
  return gapKind ? MODULES[gapKind].widths : [];
}

/**
 * Какво празно се постига най-близо до поисканото.
 *
 * Връща ширините на нишите и колко прави това общо. Поиска ли се
 * по-малко от най-тясната ниша, се връща нищо — въздух под една ниша
 * не е изделие и не бива да влиза в заявката.
 */
export function gapFill(want: number, gapKind: ModuleKind | null): {
  widths: number[];
  total: number;
} {
  const widths = gapWidths(gapKind);
  if (!widths.length || want < Math.min(...widths)) return { widths: [], total: 0 };
  const filled = fillWidths(want, widths);
  return { widths: filled, total: filled.reduce((s, w) => s + w, 0) };
}

/**
 * Къде в редицата застава шкафът и колко празно остава пред него.
 *
 * `index` се брои само сред същинските шкафове: нишите са подвижни и
 * да се брои през тях значи мястото да се мени според това колко
 * въздух е останал отстрани.
 */
export function slideTarget(
  placed: readonly { id: string; kind: ModuleKind; x: number; width: number }[],
  id: string,
  desiredLeft: number,
  gapKind: ModuleKind | null,
): { index: number; gap: number; left: number } | null {
  const me = placed.find((m) => m.id === id);
  if (!me) return null;

  const others = placed.filter((m) => m.id !== id && !isGap(m.kind));

  /*
   * Колко шкафа остават вляво от мен. Брои се по левия ми ръб срещу
   * плътно наредените други — не по центрове: широк шкаф, влачен към
   * ъгъла, има център по-надясно от съседа си и по центрове никога не
   * можеше да стане пръв.
   */
  let packedEnd = 0;
  let index = 0;
  for (const m of others) {
    if (packedEnd + m.width > desiredLeft + 1) break;
    packedEnd += m.width;
    index += 1;
  }
  const { total } = gapFill(Math.max(0, Math.round(desiredLeft - packedEnd)), gapKind);

  return { index, gap: total, left: packedEnd + total };
}

/**
 * Редът, както ще изглежда след плъзгането.
 *
 * Нишите точно пред влачения шкаф са негови — те са това, което го е
 * изтласкало дотам — и се правят наново. Ниша другаде в реда (за
 * прозорец, за хладилник) не се пипа: тя е нечие решение, не остатък.
 */
export function slideRow(
  row: readonly KitchenModule[],
  id: string,
  index: number,
  gap: number,
  gapKind: ModuleKind | null,
  newModule: (kind: ModuleKind, width: number) => KitchenModule,
): KitchenModule[] | null {
  const at = row.findIndex((m) => m.id === id);
  if (at < 0) return null;

  // Назад през нишите точно пред него — те идват с него.
  let from = at;
  while (from > 0 && isGap(row[from - 1].kind)) from -= 1;

  const rest = [...row.slice(0, from), ...row.slice(at + 1)];

  /*
   * Мястото се намира чрез броене на същински шкафове. Нишите, които
   * са останали в `rest`, се прескачат — те вървят със своя шкаф.
   */
  let seen = 0;
  let put = rest.length;
  for (let i = 0; i < rest.length; i += 1) {
    if (seen === index && !isGap(rest[i].kind)) {
      put = i;
      break;
    }
    if (!isGap(rest[i].kind)) seen += 1;
  }
  if (seen === index && index === 0 && rest.length === 0) put = 0;

  const fill = gapFill(gap, gapKind).widths.map((w) => newModule(gapKind!, w));
  return [...rest.slice(0, put), ...fill, row[at], ...rest.slice(put)];
}
