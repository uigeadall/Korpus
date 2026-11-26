import type { Metadata } from 'next';
import { FlatEditor } from '@/components/flat/FlatEditor';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  const t = STRANICI[await getEzik()].ekrani;
  return { title: t.jilishteZaglavie, description: t.jilishteOpisanie };
}

export default function JilishtePage() {
  return <FlatEditor />;
}
