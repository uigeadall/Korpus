/**
 * Какво чува човек, който не вижда сцената.
 *
 * Обемният изглед е картинка — за екранния четец всеки шкаф е едно
 * изречение. Изречението се сглобяваше вътре в JSX-а и там сгреши на
 * две места: казваше „1 рафта" и обещаваше Enter на шкафа за фурна,
 * където Enter не прави нищо. Затова текстът слиза тук, при правилата,
 * и има тест.
 */

import {
  MODULES,
  type ModuleKind,
  acceptsShelves,
  canOpen,
  shelfCount,
} from './cabinet-rules';

/** „1 рафт", но „0 рафта" и „2 рафта" — броят на български. */
export function shelvesPhrase(n: number): string {
  return n === 1 ? '1 рафт' : `${n} рафта`;
}

/**
 * Може ли клавиатурата да направи нещо с този модул. Ако не може, той
 * не е бутон — уредът се вижда и се чува, но не се натиска.
 */
export function isOperable(kind: ModuleKind): boolean {
  return canOpen(kind) || acceptsShelves(kind);
}

export interface SpokenModule {
  code?: string | null;
  kind: ModuleKind;
  shelves?: number;
  spec: { label: string };
}

/** Цялото изречение за един модул: кой е, как стои и какво приема. */
export function moduleSpeech(m: SpokenModule, open: boolean): string {
  const state = canOpen(m.kind)
    ? open
      ? 'отворен'
      : 'затворен'
    : MODULES[m.kind].facade?.style === 'appliance'
      ? 'уред'
      : 'отворена секция';

  const name = [m.code, m.spec.label].filter(Boolean).join(' ');

  return (
    `${name}, ${state}, ${shelvesPhrase(shelfCount(m))}.` +
    (canOpen(m.kind) ? ' Enter отваря и затваря.' : '') +
    (acceptsShelves(m.kind) ? ' Плюс и минус менят рафтовете.' : '')
  );
}
