import type { Metadata } from 'next';
import { Configurator } from '@/components/configurator/Configurator';

export const metadata: Metadata = {
  title: 'Конфигуратор на кухня',
  description:
    'Нареди кухнята по стените на стаята: план отгоре, чертеж с размери, спецификация и разбивка на детайлите за разкрой.',
};

export default function KonfiguratorPage() {
  return <Configurator />;
}
