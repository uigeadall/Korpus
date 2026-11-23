/**
 * Светла или тъмна тема — без React.
 *
 * Темата живее на `<html data-theme>` и в `localStorage`. Три състояния
 * биха били по-точни („по системата" е отделно от „светла"), но на един
 * бутон не се събират три; затова изборът е двоен и се помни, а докато
 * човек не е избрал, важи системата.
 *
 * Прочитането минава през `useSyncExternalStore` в превключвателя, а не
 * през ефект: състоянието е в документа, не в React.
 */

export type Tema = 'light' | 'dark';

export const KLYUCH = 'korpus-tema';

/**
 * Скриптът, който тича преди първото рисуване.
 *
 * Без него страницата мига в системната тема и чак след това скача в
 * избраната. Затова е вграден в `<head>`, а не в компонент.
 */
export const SKRIPT = `try{var t=localStorage.getItem('${KLYUCH}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

const slushateli = new Set<() => void>();

/** Коя тема се вижда в момента — избраната или системната. */
export function tekushta(): Tema {
  const izbrana = document.documentElement.dataset.theme;
  if (izbrana === 'light' || izbrana === 'dark') return izbrana;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** На сървъра няма как да се знае; светлата е по подразбиране. */
export function naSarvara(): Tema {
  return 'light';
}

export function abonirai(fn: () => void): () => void {
  slushateli.add(fn);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', fn);
  return () => {
    slushateli.delete(fn);
    mq.removeEventListener('change', fn);
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
