import type { Metadata } from 'next';
import { PravnaStranica } from '@/components/site/PravnaStranica';
import { getEzik } from '@/i18n/server';
import { PRAVNI } from '@/i18n/tekstove/pravni';

export async function generateMetadata(): Promise<Metadata> {
  const t = PRAVNI[await getEzik()].poveritelnost;
  return { title: t.zaglavieStr, description: t.opisanie };
}

export default function Page() {
  return <PravnaStranica koya="poveritelnost" />;
}
