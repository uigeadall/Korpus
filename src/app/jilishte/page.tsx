import type { Metadata } from 'next';
import { FlatEditor } from '@/components/flat/FlatEditor';

export const metadata: Metadata = {
  title: 'Начертайте жилището — Корпус',
  description:
    'Сложете стаите, коридорите и банята една до друга както са при вас, и обиколете жилището със стрелките.',
};

export default function JilishtePage() {
  return <FlatEditor />;
}
