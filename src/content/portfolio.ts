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

import { LOCALE, type Ezik } from '@/i18n/ezik';
import { tekstove } from '@/i18n/tekst';

export type ProjectScope = 'kitchen' | 'wardrobe' | 'tv' | 'hallway' | 'whole-home';

export const SCOPE_LABELS_PO_EZIK = tekstove<Record<ProjectScope, string>>({
  bg: {
    kitchen: 'Кухня',
    wardrobe: 'Гардероб',
    tv: 'ТВ композиция',
    hallway: 'Антре',
    'whole-home': 'Цяло жилище',
  },
  en: {
    kitchen: 'Kitchen',
    wardrobe: 'Wardrobe',
    tv: 'TV unit',
    hallway: 'Hallway',
    'whole-home': 'Whole home',
  },
  zh: {
    kitchen: '厨房',
    wardrobe: '衣柜',
    tv: '电视柜组合',
    hallway: '玄关',
    'whole-home': '全屋定制',
  },
});

export const SCOPE_LABELS: Record<ProjectScope, string> = SCOPE_LABELS_PO_EZIK.bg;

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
  /**
   * Текстовете на другите езици. Каквото липсва, се показва на български —
   * по-добре непреведен ред, отколкото празно място.
   */
  prevodi?: Partial<Record<Ezik, ProjectText>>;
}

/** Частите на проекта, които се четат — те се превеждат, числата не. */
export type ProjectText = Partial<
  Pick<Project, 'title' | 'city' | 'lead' | 'body' | 'facts' | 'materials' | 'images'>
>;

/** Проектът на дадения език. */
export function naEzik(project: Project, ezik: Ezik): Project {
  const prevod = ezik === 'bg' ? undefined : project.prevodi?.[ezik];
  return prevod ? { ...project, ...prevod } : project;
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

/**
 * `2026-03` → `март 2026` (`March 2026`, `2026年3月`). Невалиден вход се
 * връща както е дошъл.
 */
export function formatCompleted(completed: string, ezik: Ezik = 'bg'): string {
  const match = /^(\d{4})-(\d{2})$/.exec(completed);
  if (!match) return completed;
  const index = Number(match[2]) - 1;
  const month = MONTHS[index];
  if (!month) return completed;
  if (ezik === 'bg') return `${month} ${match[1]}`;
  return new Intl.DateTimeFormat(LOCALE[ezik], { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(Number(match[1]), index, 1)),
  );
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
  prevodi: {
    en: {
      title: 'Straight kitchen, 3600 mm',
      city: 'Sofia',
      lead: 'Example entry: what a project page looks like once a finished project has been photographed.',
      body: [
        'A 3600 mm wall with six base and five wall units. Base: corner column 600, drawers 600, oven 600, door 400, sink 800 and dishwasher 600. Wall: 600, extractor 600, 400, 800 and 600.',
        'The breakdown was calculated by the configurator: 22 hinges, 22 legs, 15 handles and 10 hangers, a 3600 mm plinth and a 3000 mm worktop. The same numbers go into the order for the workshop.',
        'The text and photos of real projects are entered from the admin panel. Until then, this entry stays here as a sample of the format.',
      ],
      facts: [
        { label: 'Wall length', value: '3600 mm' },
        { label: 'Base row', value: '6 units' },
        { label: 'Wall row', value: '5 units' },
        { label: 'Worktop', value: '3000 mm' },
        { label: 'Lead time', value: 'as scheduled in order tracking' },
      ],
      materials: [
        { label: 'Carcass', value: '18 mm chipboard, edging on the visible edge, 3 mm HDF back' },
        { label: 'Fronts', value: 'Painted MDF, RAL 9010' },
        { label: 'Worktop', value: 'Quartz 20 mm' },
        { label: 'Opening', value: 'Handles' },
        { label: 'Drawers', value: 'Metal-sided' },
      ],
      images: [
        { alt: 'Overall view of the kitchen', caption: 'Overall view' },
        { alt: 'The base row with the drawers', caption: 'Base row' },
        { alt: 'Detail of the worktop and splashback', caption: 'Worktop and splashback' },
      ],
    },
    zh: {
      title: '3600 mm 一字型厨房',
      city: '索非亚',
      lead: '示例条目：完工项目拍摄后，项目页面将是这个样子。',
      body: [
        '墙长 3600 mm，六个地柜和五个吊柜。地柜：转角高柜 600、抽屉柜 600、烤箱柜 600、单门柜 400、水槽柜 800 和洗碗机柜 600。吊柜：600、油烟机柜 600、400、800 和 600。',
        '明细由配置器计算：22 个铰链、22 个柜脚、15 个拉手和 10 个吊码，3600 mm 踢脚板和 3000 mm 台面。同样的数字会写进给工厂的订单。',
        '真实项目的文字和照片将通过后台录入。在此之前，这条记录作为格式样例保留在这里。',
      ],
      facts: [
        { label: '墙长', value: '3600 mm' },
        { label: '地柜', value: '6 个模块' },
        { label: '吊柜', value: '5 个模块' },
        { label: '台面', value: '3000 mm' },
        { label: '工期', value: '按订单跟踪中的排期' },
      ],
      materials: [
        { label: '柜体', value: '18 mm 刨花板，可见边封边，3 mm HDF 背板' },
        { label: '门板', value: '烤漆 MDF，RAL 9010' },
        { label: '台面', value: '石英石 20 mm' },
        { label: '开启方式', value: '拉手' },
        { label: '抽屉', value: '金属抽' },
      ],
      images: [
        { alt: '厨房全景', caption: '全景' },
        { alt: '带抽屉的地柜', caption: '地柜' },
        { alt: '台面和背板细节', caption: '台面与背板' },
      ],
    },
  },
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
