'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Кратко съобщение, което изчезва само — „няма място на стената".
 *
 * Отказано действие, което мълчи, изглежда като счупен бутон. Това
 * казва защо, за няколко секунди, и не иска затваряне.
 */
export function useFlash(ms = 3500): [string | null, (text: string) => void] {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = useCallback(
    (value: string) => {
      window.clearTimeout(timer.current);
      setText(value);
      timer.current = window.setTimeout(() => setText(null), ms);
    },
    [ms],
  );
  return [text, flash];
}
