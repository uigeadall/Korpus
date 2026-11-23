/**
 * Светла или тъмна тема — без React.
 *
 * Сайтът е светъл по подразбиране, независимо от системата. Мебелта се
 * продава на бял лист; човек с тъмна система не иска кухнята си в
 * полумрак, а и повечето хора не знаят, че системата им е тъмна.
 * Тъмната тема си остава — но по избор, не по подразбиране.
 *
 * Темата живее на `<html data-theme>` и в `localStorage`. Прочитането
 * минава през `useSyncExternalStore` в превключвателя, а не през ефект:
 * състоянието е в документа, не в React.
 */

export type Tema = 'light' | 'dark';

export const KLYUCH = 'korpus-tema';

/**
 * Скриптът, който тича преди първото рисуване.
 *
 * Без него страницата мига в системната тема и чак след това скача в
 * избраната. Затова е вграден в `<head>`, а не в компонент.
 */
export const SKRIPT = `try{var t=localStorage.getItem('${KLYUCH}');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}`;

const slushateli = new Set<() => void>();

/** Коя тема се вижда в момента. */
export function tekushta(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** На сървъра няма как да се знае; светлата е по подразбиране. */
export function naSarvara(): Tema {
  return 'light';
}

export function abonirai(fn: () => void): () => void {
  slushateli.add(fn);
  return () => {
    slushateli.delete(fn);
  };
}

export function zadai(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  try {
    localStorage.setItem(KLYUCH, tema);
  } catch {
    // Частен прозорец или забранено хранилище: темата важи за сесията.
  }
  for (const fn of slushateli) fn();
}
