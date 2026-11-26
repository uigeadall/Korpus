import type { Metadata } from 'next';
import { Configurator } from '@/components/configurator/Configurator';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

/**
 * Техническият инструмент — за нас, не за клиента.
 *
 * Клиентът минава по „Жилището" и „Направи проект": там се пита на
 * човешки език и правилата подреждат. Тук се мери в милиметри, сменят
 * се панти и излиза разбивката за цеха. Затова го няма в менюто и не
 * се индексира — отваря се с адреса от онзи, който знае за него.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = STRANICI[await getEzik()].ekrani;
  return {
    title: t.konfiguratorZaglavie,
    description: t.konfiguratorOpisanie,
    robots: { index: false, follow: false },
  };
}

export default function KonfiguratorPage() {
  return <Configurator />;
}
