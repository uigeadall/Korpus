'use client';

/**
 * `next/link`, който води на същия език.
 *
 * Всички вътрешни връзки минават оттук: пишат българския адрес
 * (`/proekt`), а човекът, който чете на английски, отива на `/en/proekt`.
 */

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { adres } from './ezik';
import { useEzik } from './client';

type Props = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string };

export default function Link({ href, ...rest }: Props) {
  return <NextLink href={adres(useEzik(), href)} {...rest} />;
}
