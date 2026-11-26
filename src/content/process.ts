/**
 * Процесът в 8 стъпки. Текстовете идват от бизнес плана, раздел 5.1 —
 * клиентът не купува продукт, а организиран проект с местна отговорност.
 */

import { tekstove } from '@/i18n/tekst';

export interface Step {
  n: number;
  title: string;
  short: string;
  detail: string;
}

export interface Obeshtanie {
  title: string;
  body: string;
}

export const STEPS = tekstove<Step[]>({
  bg: [
    {
      n: 1,
      title: 'Консултация',
      short: 'Разбираме какво ви трябва и в какъв бюджет.',
      detail:
        'Срещаме се в студиото или онлайн. Говорим за помещението, за начина, по който го ползвате, и за бюджета. Още тук става ясно кое е реалистично и кое не.',
    },
    {
      n: 2,
      title: 'Измерване',
      short: 'Снемаме помещението на място, с всички отклонения.',
      detail:
        'Идваме при вас и измерваме сами. Записваме къде са ВиК, токът, комина и радиаторите, проверяваме отвесите на стените и нивото на пода. Проектът стъпва на тези числа, не на плана на строителя.',
    },
    {
      n: 3,
      title: 'Концепция',
      short: 'Разпределение, стил, материали.',
      detail:
        'Показваме разпределение и варианти за стил. Тук се избират цветовете на корпуса и фасадите, видът на плота и начинът на отваряне.',
    },
    {
      n: 4,
      title: 'Технически проект',
      short: 'Чертеж с размери и пълна спецификация.',
      detail:
        'Всеки шкаф получава номер, всеки детайл — размер и кант. Това е документът, по който се произвежда и по който се монтира. Вие го виждате, преди да е поръчан материал.',
    },
    {
      n: 5,
      title: 'Оферта и договор',
      short: 'Цена по спецификация, срок и условия.',
      detail:
        'Офертата следва от спецификацията, не от „на око". В договора влизат размери, материали, механизми, допустими отклонения, срок и условия за монтаж.',
    },
    {
      n: 6,
      title: 'Производство',
      short: 'Разкрой, кантиране, сглобяване, контрол.',
      detail:
        'Произвежда се в проверени цехове. Детайлите се номерират по спецификацията, проверяват се и се опаковат за транспорт.',
    },
    {
      n: 7,
      title: 'Доставка и монтаж',
      short: 'Вие избирате деня и часовия интервал.',
      detail:
        'Проследявате поръчката на всеки етап и сами избирате кога да дойдем. Монтираме, подравняваме и предаваме чисто.',
    },
    {
      n: 8,
      title: 'След монтажа',
      short: 'Гаранция и реакция при нужда.',
      detail:
        'Законовата гаранция е 2 години. Ако нещо се нуждае от регулиране или допълнение, идваме — проектът и спецификацията остават при нас.',
    },
  ],

  en: [
    {
      n: 1,
      title: 'Consultation',
      short: 'We find out what you need and what your budget is.',
      detail:
        'We meet at the studio or online. We talk about the room, how you use it, and your budget. Right from the start it becomes clear what is realistic and what is not.',
    },
    {
      n: 2,
      title: 'Measuring',
      short: 'We survey the room on site, with every deviation.',
      detail:
        'We come to you and take the measurements ourselves. We note where the plumbing, electrics, flue and radiators are, and check how plumb the walls and how level the floor are. The design is based on these numbers, not on the builder’s plan.',
    },
    {
      n: 3,
      title: 'Concept',
      short: 'Layout, style, materials.',
      detail:
        'We show you a layout and style options. This is where the carcass and front colours, the worktop and the way the doors open are chosen.',
    },
    {
      n: 4,
      title: 'Technical design',
      short: 'A dimensioned drawing and a full specification.',
      detail:
        'Every cabinet gets a number, every part a size and edging. This is the document it is produced and installed from. You see it before any material is ordered.',
    },
    {
      n: 5,
      title: 'Quote and contract',
      short: 'A price from the specification, a deadline and terms.',
      detail:
        'The quote follows from the specification, not from guesswork. The contract covers sizes, materials, hardware, permitted tolerances, the deadline and the installation terms.',
    },
    {
      n: 6,
      title: 'Production',
      short: 'Cutting, edging, assembly, quality control.',
      detail:
        'Production takes place in vetted workshops. Parts are numbered according to the specification, checked and packed for transport.',
    },
    {
      n: 7,
      title: 'Delivery and installation',
      short: 'You choose the day and the time slot.',
      detail:
        'You follow the order through every stage and choose when we come. We install, level everything and leave the place clean.',
    },
    {
      n: 8,
      title: 'After installation',
      short: 'Warranty and support when needed.',
      detail:
        'The statutory warranty is 2 years. If anything needs adjusting or adding, we come back — the design and the specification stay on file with us.',
    },
  ],

  zh: [
    {
      n: 1,
      title: '咨询',
      short: '了解您的需求和预算。',
      detail:
        '我们在工作室或线上与您见面，聊聊房间、您的使用习惯以及预算。从一开始就明确哪些可行、哪些不可行。',
    },
    {
      n: 2,
      title: '测量',
      short: '上门实地测量，记录所有偏差。',
      detail:
        '我们亲自上门测量，记录给排水、电路、烟道和暖气片的位置，检查墙面垂直度和地面水平度。设计以这些实测数据为准，而不是开发商的图纸。',
    },
    {
      n: 3,
      title: '方案',
      short: '布局、风格、材料。',
      detail: '我们为您展示布局和风格方案。在这一步选定柜体和门板颜色、台面类型以及开启方式。',
    },
    {
      n: 4,
      title: '技术设计',
      short: '带尺寸的图纸和完整的规格清单。',
      detail:
        '每个柜子都有编号，每块板件都有尺寸和封边。生产和安装都以这份文件为准。在订购材料之前，您就能看到它。',
    },
    {
      n: 5,
      title: '报价与合同',
      short: '按规格报价，明确工期和条款。',
      detail:
        '报价来自规格清单，而不是凭感觉估算。合同包括尺寸、材料、五金、允许误差、工期和安装条件。',
    },
    {
      n: 6,
      title: '生产',
      short: '开料、封边、组装、质检。',
      detail: '在经过考察的工厂生产。板件按规格清单编号，经检验后包装运输。',
    },
    {
      n: 7,
      title: '配送与安装',
      short: '由您选择日期和时间段。',
      detail: '您可以跟踪订单的每个阶段，并自行选择上门时间。我们负责安装、调平并清理干净后交付。',
    },
    {
      n: 8,
      title: '安装之后',
      short: '质保与及时响应。',
      detail: '法定质保期为 2 年。如需调整或增补，我们会上门处理——设计图和规格清单都保存在我们这里。',
    },
  ],
});

/** Трите неща, които казваме на началната страница. */
export const PROMISES = tekstove<Obeshtanie[]>({
  bg: [
    {
      title: 'Проект, не каталог',
      body: 'Измерваме на място и проектираме по вашето помещение, с неговите отклонения.',
    },
    {
      title: 'Виждате чертежа',
      body: 'Преди да е поръчан материал, държите чертежа с размерите и спецификацията.',
    },
    {
      title: 'Знаете докъде е стигнало',
      body: 'Следите поръчката по етапи и сами избирате деня за доставка и монтаж.',
    },
  ],
  en: [
    {
      title: 'A design, not a catalogue',
      body: 'We measure on site and design for your room, deviations and all.',
    },
    {
      title: 'You see the drawing',
      body: 'Before any material is ordered, you hold the drawing with its dimensions and specification.',
    },
    {
      title: 'You know where it stands',
      body: 'You follow the order stage by stage and choose the day for delivery and installation.',
    },
  ],
  zh: [
    {
      title: '量身设计，而非目录选购',
      body: '我们上门测量，按照您房间的实际情况（包括所有偏差）进行设计。',
    },
    {
      title: '图纸一目了然',
      body: '在订购材料之前，您就能拿到带尺寸和规格清单的图纸。',
    },
    {
      title: '进度随时掌握',
      body: '您可以分阶段跟踪订单，并自行选择配送和安装日期。',
    },
  ],
});
