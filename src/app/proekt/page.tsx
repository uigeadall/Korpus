import type { Metadata } from 'next';
import { ProjectWizard } from '@/components/proekt/ProjectWizard';

export const metadata: Metadata = {
  title: 'Направете си кухнята',
  description:
    'Отговорете на няколко въпроса и вижте кухнята си в обем. Ние смятаме шкафовете, размерите и обкова, а вие решавате как да изглежда.',
};

export default function ProektPage() {
  return <ProjectWizard />;
}
