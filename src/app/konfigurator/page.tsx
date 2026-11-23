import type { Metadata } from 'next';
import { Configurator } from '@/components/configurator/Configurator';

/**
 * Техническият инструмент — за нас, не за клиента.
 *
 * Клиентът минава по „Жилището" и „Направи проект": там се пита на
 * човешки език и правилата подреждат. Тук се мери в милиметри, сменят
 * се панти и излиза разбивката за цеха. Затова го няма в менюто и не
 * се индексира — отваря се с адреса от онзи, който знае за него.
 */
export const metadata: Metadata = {
  title: 'Конфигуратор — вътрешен инструмент',
  description:
    'Нареждане по милиметър, спецификация и разбивка на детайлите за разкрой. Вътрешен инструмент.',
  robots: { index: false, follow: false },
};

export default function KonfiguratorPage() {
  return <Configurator />;
}
