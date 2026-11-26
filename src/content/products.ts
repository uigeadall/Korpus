import type { Ezik } from '@/i18n/ezik';
import { tekstove } from '@/i18n/tekst';

/**
 * Продуктовите линии. Основната е корпусната мебел по проект; останалите
 * влизат след проверка на доставчици и документи (бизнес план, раздел 9).
 */

export interface ProductLine {
  slug: string | null;
  title: string;
  lead: string;
  items: string[];
  /** Линията още не се предлага активно. */
  soon?: boolean;
  note?: string;
}

export const PRODUCTS_PO_EZIK = tekstove<ProductLine[]>({
  bg: [
    {
      slug: 'korpusna-mebel',
      title: 'Корпусна мебел по проект',
      lead: 'Ядрото на работата ни: кухни, гардероби и обзавеждане по мярка на жилището.',
      items: [
        'Кухни, включително острови, високи колони и специални фасади',
        'Гардероби, вградени системи и гардеробни помещения',
        'ТВ композиции, библиотеки, конзоли и бюра',
        'Антре и обзавеждане на цели жилища',
      ],
    },
    {
      slug: null,
      title: 'Готови мебели',
      lead: 'Допълват проекта: диван към дневната, легло към гардеробната, маса и столове към кухнята.',
      items: ['Среден клас', 'Висок клас със съвременна дизайнерска визия'],
      soon: true,
    },
    {
      slug: null,
      title: 'Камък',
      lead: 'Плотове, кухненски гръб, облицовки и интериорни детайли.',
      items: ['Естествен камък', 'Технически и агломериран', 'Синтеровани материали'],
      soon: true,
    },
    {
      slug: null,
      title: 'Алуминиеви решения',
      lead: 'Рамки, стъклени врати, декоративни и honeycomb панели.',
      items: ['Рамки и профили', 'Мебели за влажни помещения', 'Комбинации с камък и осветление'],
      soon: true,
      note: 'Влиза след тарифна и регулаторна проверка.',
    },
    {
      slug: null,
      title: 'Осветление',
      lead: 'Декоративни тела и интегрирано осветление в шкафове и панели.',
      items: ['Над кухненския остров', 'LED линии в шкафове и гардероби', 'Осветени панели'],
      soon: true,
      note: 'Електрически продукти — влизат само с документи за съответствие за ЕС.',
    },
  ],

  en: [
    {
      slug: 'korpusna-mebel',
      title: 'Made-to-measure cabinet furniture',
      lead: 'The core of our work: kitchens, wardrobes and fitted furniture made to fit your home.',
      items: [
        'Kitchens, including islands, tall columns and special fronts',
        'Wardrobes, built-in systems and walk-in closets',
        'TV units, bookcases, consoles and desks',
        'Hallways and furnishing of whole homes',
      ],
    },
    {
      slug: null,
      title: 'Ready-made furniture',
      lead: 'To complete the design: a sofa for the living room, a bed for the bedroom, a table and chairs for the kitchen.',
      items: ['Mid-range', 'High-end with a contemporary designer look'],
      soon: true,
    },
    {
      slug: null,
      title: 'Stone',
      lead: 'Worktops, kitchen splashbacks, cladding and interior details.',
      items: ['Natural stone', 'Engineered and agglomerate stone', 'Sintered materials'],
      soon: true,
    },
    {
      slug: null,
      title: 'Aluminium systems',
      lead: 'Frames, glass doors, decorative and honeycomb panels.',
      items: ['Frames and profiles', 'Furniture for damp rooms', 'Combinations with stone and lighting'],
      soon: true,
      note: 'Coming after a tariff and regulatory review.',
    },
    {
      slug: null,
      title: 'Lighting',
      lead: 'Decorative fittings and lighting integrated into cabinets and panels.',
      items: ['Above the kitchen island', 'LED strips in cabinets and wardrobes', 'Illuminated panels'],
      soon: true,
      note: 'Electrical products — offered only with EU declarations of conformity.',
    },
  ],

  zh: [
    {
      slug: 'korpusna-mebel',
      title: '定制板式家具',
      lead: '我们的核心业务：按您家尺寸定制的厨房、衣柜和家居。',
      items: [
        '厨房，包括岛台、高柜和特殊门板',
        '衣柜、嵌入式系统和衣帽间',
        '电视柜组合、书柜、玄关桌和书桌',
        '玄关柜及全屋定制',
      ],
    },
    {
      slug: null,
      title: '成品家具',
      lead: '与设计相配：客厅的沙发、卧室的床、厨房的餐桌椅。',
      items: ['中端', '高端，现代设计风格'],
      soon: true,
    },
    {
      slug: null,
      title: '石材',
      lead: '台面、厨房背板、墙面饰面和室内细节。',
      items: ['天然石材', '人造石和复合石', '岩板'],
      soon: true,
    },
    {
      slug: null,
      title: '铝制系统',
      lead: '框架、玻璃门、装饰板和蜂窝板。',
      items: ['框架和型材', '适用于潮湿空间的家具', '与石材和照明的组合'],
      soon: true,
      note: '待完成关税和法规审核后推出。',
    },
    {
      slug: null,
      title: '照明',
      lead: '装饰灯具，以及集成在柜体和面板中的照明。',
      items: ['厨房岛台上方', '柜体和衣柜内的 LED 灯带', '发光面板'],
      soon: true,
      note: '电气产品——仅在具备欧盟符合性文件后提供。',
    },
  ],
});

export const PRODUCTS: ProductLine[] = PRODUCTS_PO_EZIK.bg;

export function produkti(ezik: Ezik): ProductLine[] {
  return PRODUCTS_PO_EZIK[ezik];
}

/** Основната линия — корпусната мебел. */
export function glavnaLiniya(ezik: Ezik): ProductLine {
  return PRODUCTS_PO_EZIK[ezik][0];
}

export const MAIN_LINE = PRODUCTS[0];
