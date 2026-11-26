import type { Metadata } from 'next';
import { ProjectWizard } from '@/components/proekt/ProjectWizard';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  const t = STRANICI[await getEzik()].ekrani;
  return { title: t.proektZaglavie, description: t.proektOpisanie };
}

export default function ProektPage() {
  return <ProjectWizard />;
}
