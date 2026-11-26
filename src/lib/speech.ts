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
import type { Ezik } from '@/i18n/ezik';
import { kod, prevedi } from '@/i18n/rechnik';
import { tekstove } from '@/i18n/tekst';

const TEKST = tekstove({
  bg: {
    rafta: (n: number): string => (n === 1 ? '1 рафт' : `${n} рафта`),
    otvoren: 'отворен',
    zatvoren: 'затворен',
    ured: 'уред',
    otvorenaSektsiya: 'отворена секция',
    enter: ' Enter отваря и затваря.',
    plusMinus: ' Плюс и минус менят рафтовете.',
    delete: ' Delete го маха.',
  },
  en: {
    rafta: (n: number): string => (n === 1 ? '1 shelf' : `${n} shelves`),
    otvoren: 'open',
    zatvoren: 'closed',
    ured: 'appliance',
    otvorenaSektsiya: 'open section',
    enter: ' Enter opens and closes it.',
    plusMinus: ' Plus and minus change the shelves.',
    delete: ' Delete removes it.',
  },
  zh: {
    rafta: (n: number): string => `${n} 块层板`,
    otvoren: '已打开',
    zatvoren: '已关闭',
    ured: '电器',
    otvorenaSektsiya: '开放格',
    enter: ' 按 Enter 打开或关闭。',
    plusMinus: ' 加减号调整层板数量。',
    delete: ' 按 Delete 移除。',
  },
});

/** „1 рафт", но „0 рафта" и „2 рафта" — броят на български. */
export function shelvesPhrase(n: number, ezik: Ezik = 'bg'): string {
  return TEKST[ezik].rafta(n);
}

/**
 * Може ли клавиатурата да направи нещо с този модул. Ако не може, той
 * не е бутон — уредът се вижда и се чува, но не се натиска.
 *
 * Махането брои: уред, който не се отваря и не приема рафтове, пак е
 * бутон, щом Delete го маха.
 */
export function isOperable(kind: ModuleKind, removable = false): boolean {
  return canOpen(kind) || acceptsShelves(kind) || removable;
}

export interface SpokenModule {
  code?: string | null;
  kind: ModuleKind;
  shelves?: number;
  spec: { label: string };
}

/**
 * Цялото изречение за един модул: кой е, как стои и какво приема.
 *
 * Обещава се само това, което наистина работи. Махането го има само
 * там, където екранът го предлага — затова се подава отвън, вместо да
 * се предполага.
 */
export function moduleSpeech(
  m: SpokenModule,
  open: boolean,
  removable = false,
  ezik: Ezik = 'bg',
): string {
  const t = TEKST[ezik];
  const state = canOpen(m.kind)
    ? open
      ? t.otvoren
      : t.zatvoren
    : MODULES[m.kind].facade?.style === 'appliance'
      ? t.ured
      : t.otvorenaSektsiya;

  const name = [m.code && kod(m.code, ezik), prevedi(m.spec.label, ezik)].filter(Boolean).join(' ');
  const sep = ezik === 'zh' ? '，' : ', ';
  const end = ezik === 'zh' ? '。' : '.';

  return (
    `${name}${sep}${state}${sep}${shelvesPhrase(shelfCount(m), ezik)}${end}` +
    (canOpen(m.kind) ? t.enter : '') +
    (acceptsShelves(m.kind) ? t.plusMinus : '') +
    (removable ? t.delete : '')
  );
}
