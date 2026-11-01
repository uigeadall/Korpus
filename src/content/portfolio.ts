/**
 * Портфолио: моделът на един проект и списъкът с проекти.
 *
 * Тук стоят проектите, докато няма админ панел. В етап 5.6 същата структура
 * се пълни от базата — страниците четат само функциите отдолу, затова
 * смяната на източника не ги засяга.
 *
 * Правило от SPEC 10: без стокови снимки на чужди кухни. Проект без
 * `src` на снимките се показва с ясно маркиран заместител.
 */

export type ProjectScope = 'kitchen' | 'wardrobe' | 'tv' | 'hallway' | 'whole-home';

export const SCOPE_LABELS: Record<ProjectScope, string> = {
  kitchen: 'Кухня',
  wardrobe: 'Гардероб',
  tv: 'ТВ композиция',
  hallway: 'Антре',
  'whole-home': 'Цяло жилище',
};

export interface ProjectImage {
  /** Път до файла в /public. Празно = още няма заснет кадър. */
  src?: string;
  /** Описание за екранни четци — задължително. */
  alt: string;
  caption?: string;
}

/** Ред в таблица „параметри" или „материали": етикет и стойност. */
export interface ProjectFact {
  label: string;
  value: string;
}

export interface Project {
  /** Част от адреса: `/portfolio/<slug>`. Малки букви, цифри и тирета. */
  slug: string;
  title: string;
  scope: ProjectScope;
  /** Населено място. Без адрес и име на клиента. */
  city: string;
  /** Месец на завършване, `ГГГГ-ММ`. По него се подрежда галерията. */
  completed: string;
  lead: string;
  /** Абзаците на описанието. */
  body: string[];
  /** Габарит, брой модули, плот — числата, които хората търсят. */
  facts: ProjectFact[];
  materials: ProjectFact[];
  images: ProjectImage[];
  /**
   * Примерен запис. Показва как изглежда страница на проект, преди да има
   * наш завършен обект. Не влиза в публичната галерия и е видимо маркиран.
   */
  example?: true;
}

const MONTHS = [
  'януари',
  'февруари',
  'март',
  'април',
  'май',
  'юни',
  'юли',
  'август',
  'септември',
  'октомври',
  'ноември',
  'декември',
];

/** `2026-03` → `март 2026`. Невалиден вход се връща както е дошъл. */
export function formatCompleted(completed: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(completed);
  if (!match) return completed;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : completed;
}

/**
 * Примерът е контролната кухня от SPEC 5.2 — същата, по която са сметнати
 * тестовете на правилата. Така страницата се вижда готова, без да се прави
 * обект, който не съществува.
 */
export const EXAMPLE_PROJECT: Project = {
  slug: 'primer',
  title: 'Права кухня 3600 мм',
  scope: 'kitchen',
  city: 'София',
  completed: '2026-11',
  lead: 'Примерен запис: как изглежда страница на проект, когато има заснет обект.',
  body: [
    'Стена 3600 мм, шест долни и пет горни модула. Долу: ъглова колона 600, чекмеджета 600, фурна 600, врата 400, мивка 800 и съдомиялна 600. Горе: 600, аспиратор 600, 400, 800 и 600.',
    'Разбивката е сметната от конфигуратора: 22 панти, 22 крачета, 15 дръжки и 10 окачвача, цокъл 3600 мм и плот 3000 мм. Същите числа отиват в заявката към цеха.',
    'Текстът и снимките на реалните проекти се въвеждат от админския панел. Дотогава този запис стои тук като мостра на формата.',
  ],
  facts: [
    { label: 'Дължина на стената', value: '3600 мм' },
    { label: 'Долен ред', value: '6 модула' },
    { label: 'Горен ред', value: '5 модула' },
    { label: 'Плот', value: '3000 мм' },
    { label: 'Срок', value: 'по график от проследяването' },
  ],
  materials: [
    { label: 'Корпус', value: 'ПДЧ 18 мм, кант по видимия ръб, гръб HDF 3 мм' },
    { label: 'Фасади', value: 'МДФ боядисан, RAL 9010' },
    { label: 'Плот', value: 'Кварц 20 мм' },
    { label: 'Отваряне', value: 'Дръжки' },
    { label: 'Чекмеджета', value: 'Метален борд' },
  ],
  images: [
    { alt: 'Общ изглед на кухнята', caption: 'Общ изглед' },
    { alt: 'Долният ред с чекмеджетата', caption: 'Долен ред' },
    { alt: 'Детайл от плота и гърба', caption: 'Плот и гръб' },
  ],
  example: true,
};

/**
 * Реализираните проекти. Празно е честният отговор, докато няма наш
 * завършен и заснет обект — виж правилото в SPEC 10.
 */
export const PROJECTS: Project[] = [];

/** Публичната галерия: само реални проекти, най-новият отпред. */
export function publishedProjects(): Project[] {
  return PROJECTS.filter((p) => !p.example).sort((a, b) => b.completed.localeCompare(a.completed));
}

/** Всички адреси, които страницата на проект трябва да обслужва. */
export function projectSlugs(): string[] {
  return [...PROJECTS, EXAMPLE_PROJECT].map((p) => p.slug);
}

/** Търси и примерния запис — той има своя страница, но не е в галерията. */
export function findProject(slug: string): Project | undefined {
  return [...PROJECTS, EXAMPLE_PROJECT].find((p) => p.slug === slug);
}

/** Има ли вече с какво да се напълни галерията. */
export function hasPublishedProjects(): boolean {
  return publishedProjects().length > 0;
}
