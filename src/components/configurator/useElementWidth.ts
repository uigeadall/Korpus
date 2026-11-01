'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Ширината на елемента в пиксели. Чертежите са в милиметри, а шрифтът
 * в тях трябва да остане четим на телефон — затова им трябва мащабът.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
