'use client';

import { useEffect, useRef } from 'react';

/**
 * Колона, която се плъзга сама и винаги се побира във видимото.
 *
 * Закованата колона с `max-height: 100vh` стига до долния ръб само щом
 * вече е залепнала горе. Дотогава — докато заглавието на страницата още
 * се вижда — долният ѝ край е под екрана, и бутонът „Напред" с него. Тук
 * височината се мери от мястото, където колоната е в момента, до дъното
 * на прозореца; при всяко превъртане и смяна на размера.
 *
 * Работи само на широк екран. На телефон колоните са една под друга и
 * страницата скролира като страница.
 */
export function useFitToViewport<T extends HTMLElement>(
  top = 72,
  bottom = 16,
  /**
   * `max` — най-много до дъното; `exact` — точно до дъното. Двете колони
   * с `exact` са еднакво високи и свършват на една линия.
   */
  mode: 'max' | 'exact' = 'max',
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia('(min-width: 64rem)');
    let frame = 0;

    const fit = () => {
      frame = 0;
      const prop = mode === 'exact' ? 'height' : 'maxHeight';
      if (!wide.matches) {
        el.style[prop] = '';
        return;
      }
      const start = Math.max(el.getBoundingClientRect().top, top);
      el.style[prop] = `${Math.max(240, Math.floor(window.innerHeight - start - bottom))}px`;
    };
    const ask = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };

    fit();
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    wide.addEventListener('change', ask);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', ask);
      window.removeEventListener('resize', ask);
      wide.removeEventListener('change', ask);
      el.style.maxHeight = '';
      el.style.height = '';
    };
  }, [top, bottom, mode]);

  return ref;
}
