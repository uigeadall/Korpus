/**
 * Правните текстове — поверителност, общи условия, бисквитки.
 *
 * И трите са чернови до преглед от юрист. Преводите също: юристът гледа
 * българския, а английският и китайският го следват ред по ред. При
 * разминаване важи българският.
 */

import { tekstove } from '../tekst';

/** Един абзац от правен текст: заглавие, абзац или списък. */
export type Blok = { h: string } | { p: string } | { ul: string[] };

export interface PravenTekst {
  zaglavieStr: string;
  opisanie: string;
  zaglavie: string;
  vavedenie: string;
  bloka: (v: { ime: string; meseci: number; godini: number }) => Blok[];
}

export const PRAVNI = tekstove<{
  vazhiBalgarskiyat: string | null;
  poveritelnost: PravenTekst;
  usloviya: PravenTekst;
  biskvitki: PravenTekst;
}>({
  bg: {
    vazhiBalgarskiyat: null,

    poveritelnost: {
      zaglavieStr: 'Политика за поверителност',
      opisanie: 'Какви данни събираме, защо, колко ги пазим и какви права имате.',
      zaglavie: 'Политика за поверителност',
      vavedenie: 'Събираме малко данни и ги пазим кратко. Ето точно какви и за какво.',
      bloka: ({ ime, meseci }) => [
        { h: 'Кой обработва данните' },
        {
          p: `${ime}. Данните за връзка са на страница [Контакт](/kontakt). Фирмените данни и адресът се добавят преди пускането на сайта.`,
        },
        { h: 'Какви данни събираме и защо' },
        {
          ul: [
            '**Запитване:** име, телефон, по желание имейл и населено място, за да отговорим и да уговорим измерване.',
            '**Какво обзавеждате и ориентировъчен бюджет:** за да преценим обхвата, преди да дойдем на място.',
            '**Качени планове и снимки:** за да разберем помещението. Пазят се в защитено хранилище и се отварят само от екипа.',
            '**Конфигурация от конфигуратора:** размери и избрани модули. Докато не ни я изпратите, тя стои само във вашия браузър.',
            '**Поръчка:** адрес за монтаж и телефон, за да доставим и монтираме.',
          ],
        },
        { h: 'Правно основание' },
        {
          p: 'Обработваме данните, за да изпълним ваше искане и да подготвим или изпълним договор, а при маркетингова комуникация — само след съгласие, което можете да оттеглите.',
        },
        { h: 'Колко време ги пазим' },
        {
          ul: [
            `Запитвания, които не са довели до поръчка — до ${meseci} месеца, заедно с качените файлове.`,
            'Документи по изпълнени поръчки — за срока, в който сме длъжни по закон и в който тече гаранцията.',
          ],
        },
        { h: 'На кого ги предаваме' },
        {
          p: 'Само на доставчици, без които услугата не може да работи: хостинг и база данни в Европейския съюз, услуга за изпращане на имейли, а при поръчка — на производствения цех и превозвача, в минималния нужен обем. Не продаваме данни.',
        },
        { h: 'Вашите права' },
        {
          ul: [
            'достъп до данните, които пазим за вас;',
            'поправка на неточност;',
            'изтриване, когато вече не са нужни;',
            'ограничаване на обработката и възражение;',
            'преносимост на данните;',
            'жалба до Комисията за защита на личните данни.',
          ],
        },
        { p: 'Пишете ни и ще отговорим в законовия срок.' },
        { h: 'Сигурност' },
        {
          p: 'Връзката със сайта е криптирана. Качените файлове не са публично достъпни — отварят се само от екипа след вход.',
        },
      ],
    },

    usloviya: {
      zaglavieStr: 'Общи условия',
      opisanie:
        'Условия за поръчка на мебел по индивидуален проект, гаранция и права на потребителя.',
      zaglavie: 'Общи условия и информация за потребителя',
      vavedenie: 'Какво поръчвате, какво получавате и какви са правата ви.',
      bloka: ({ godini }) => [
        { h: 'Какво предлагаме' },
        {
          p: 'Проектиране, производство и монтаж на мебел по индивидуален проект. Всяка поръчка се изработва по размери, снети на място, и по спецификация, която одобрявате писмено преди поръчката на материали.',
        },
        { h: 'Конфигураторът не е оферта' },
        {
          p: 'Чертежите, спецификациите и визуализациите на сайта служат за ориентир и за вземане на решение. **Това не е оферта.** Точната цена следва след измерване на място и писмена оферта. Възможността за производство на конкретно решение също се потвърждава след техническо уточняване.',
        },
        { h: 'Право на отказ' },
        {
          p: 'Мебелите по индивидуална поръчка, изработени по ваши размери и изисквания, са изключение от 14-дневното право на отказ при договори от разстояние. Това е изрично предвидено в Закона за защита на потребителите.',
        },
        { p: 'Изключението не засяга правата ви при дефект или несъответствие на стоката.' },
        { h: 'Гаранция' },
        {
          p: `Всички стоки имат законова гаранция от **${godini} години**. Гаранцията тече от деня на завършен монтаж. Тя не покрива повреди от неправилна употреба, намеса от трети лица или ремонт в помещението след монтажа.`,
        },
        { h: 'Отклонения' },
        {
          p: 'Дървесните материали и боядисаните повърхности имат допустими отклонения в нюанса и структурата спрямо мострата. Конкретните допуски се описват в договора.',
        },
        { h: 'Срокове и монтаж' },
        {
          p: 'Срокът започва от одобряването на техническия проект и получаването на договореното плащане. Помещението трябва да е готово за монтаж: завършен мокър ремонт, изведени ВиК и ток по проекта, свободен достъп.',
        },
        { h: 'Рекламации' },
        {
          p: 'Рекламация се подава писмено, с описание и снимки. Отговаряме в законовия срок и предлагаме отстраняване, замяна на детайла или друго решение според случая.',
        },
      ],
    },

    biskvitki: {
      zaglavieStr: 'Бисквитки',
      opisanie: 'Какво пази сайтът в браузъра ви и защо няма банер за бисквитки.',
      zaglavie: 'Бисквитки и локално съхранение',
      vavedenie: 'Сайтът е направен така, че да не му трябват проследяващи бисквитки.',
      bloka: () => [
        { h: 'Проследяващи бисквитки' },
        {
          p: 'Не използваме рекламни или профилиращи бисквитки и не вграждаме чужди проследяващи скриптове. Затова не ви посрещаме с банер за съгласие.',
        },
        { h: 'Какво все пак се пази' },
        {
          ul: [
            '**Вашата конфигурация:** когато нареждате кухня, тя се запазва в локалното хранилище на браузъра ви, за да я заварите, ако се върнете. Не напуска устройството ви, докато вие не я изпратите.',
            '**Избраният език:** ако изберете език от менюто горе вдясно, той се помни в бисквитка korpus-ezik за една година, за да ви посреща на вашия език. В нея няма нищо друго.',
            '**Технически необходими данни:** нужни за сигурността на формите и за да работи сайтът.',
          ],
        },
        { h: 'Как да ги изтриете' },
        {
          p: 'Бутонът „Изчисти всичко“ в конфигуратора премахва запазената конфигурация. Можете и да изчистите данните за сайта от настройките на браузъра си.',
        },
        { h: 'Анализ на посещенията' },
        {
          p: 'Ако добавим статистика за посещенията, ще е решение без бисквитки и без проследяване между сайтове. Ако това се промени, страницата ще бъде обновена, преди промяната да влезе в сила.',
        },
      ],
    },
  },

  en: {
    vazhiBalgarskiyat:
      'This is a translation for convenience. If it differs from the Bulgarian text, the Bulgarian version prevails.',

    poveritelnost: {
      zaglavieStr: 'Privacy policy',
      opisanie: 'What data we collect, why, how long we keep it and what rights you have.',
      zaglavie: 'Privacy policy',
      vavedenie: 'We collect little data and keep it briefly. Here is exactly what and why.',
      bloka: ({ ime, meseci }) => [
        { h: 'Who processes the data' },
        {
          p: `${ime}. Contact details are on the [Contact](/kontakt) page. Company details and the address will be added before the site launches.`,
        },
        { h: 'What data we collect and why' },
        {
          ul: [
            '**Enquiry:** name, phone and, optionally, email and town, so we can reply and arrange a measuring visit.',
            '**What you are furnishing and an approximate budget:** so we can judge the scope before visiting.',
            '**Uploaded plans and photos:** so we understand the room. They are kept in secure storage and opened only by our team.',
            '**Configuration from the configurator:** sizes and chosen units. Until you send it to us, it stays only in your browser.',
            '**Order:** installation address and phone, so we can deliver and install.',
          ],
        },
        { h: 'Legal basis' },
        {
          p: 'We process the data to fulfil your request and to prepare or perform a contract; for marketing communication, only with consent, which you can withdraw.',
        },
        { h: 'How long we keep it' },
        {
          ul: [
            `Enquiries that did not lead to an order — up to ${meseci} months, together with the uploaded files.`,
            'Documents for completed orders — for the period required by law and for the duration of the warranty.',
          ],
        },
        { h: 'Who we share it with' },
        {
          p: 'Only with providers without whom the service cannot work: hosting and a database in the European Union, an email delivery service and, for orders, the production workshop and the carrier, to the minimum extent necessary. We do not sell data.',
        },
        { h: 'Your rights' },
        {
          ul: [
            'access to the data we hold about you;',
            'correction of inaccuracies;',
            'erasure when the data is no longer needed;',
            'restriction of processing and objection;',
            'data portability;',
            'a complaint to the Bulgarian Commission for Personal Data Protection.',
          ],
        },
        { p: 'Write to us and we will reply within the statutory deadline.' },
        { h: 'Security' },
        {
          p: 'The connection to the site is encrypted. Uploaded files are not publicly accessible — they are opened only by our team after signing in.',
        },
      ],
    },

    usloviya: {
      zaglavieStr: 'Terms and conditions',
      opisanie: 'Terms for ordering made-to-measure furniture, warranty and consumer rights.',
      zaglavie: 'Terms and conditions and consumer information',
      vavedenie: 'What you order, what you get and what your rights are.',
      bloka: ({ godini }) => [
        { h: 'What we offer' },
        {
          p: 'Design, production and installation of made-to-measure furniture. Every order is built to dimensions taken on site and to a specification that you approve in writing before materials are ordered.',
        },
        { h: 'The configurator is not a quote' },
        {
          p: 'The drawings, specifications and visualisations on the site are for guidance and decision-making. **This is not a quote.** The exact price follows after measuring on site and a written quote. Whether a specific solution can be produced is also confirmed after technical clarification.',
        },
        { h: 'Right of withdrawal' },
        {
          p: 'Custom-made furniture built to your dimensions and requirements is exempt from the 14-day right of withdrawal for distance contracts. This is expressly provided for in the Bulgarian Consumer Protection Act.',
        },
        {
          p: 'The exemption does not affect your rights in case of a defect or non-conformity of the goods.',
        },
        { h: 'Warranty' },
        {
          p: `All goods carry a statutory warranty of **${godini} years**. The warranty runs from the day installation is completed. It does not cover damage from improper use, interference by third parties or renovation work in the room after installation.`,
        },
        { h: 'Deviations' },
        {
          p: 'Wood-based materials and painted surfaces have permitted deviations in shade and texture compared to the sample. The specific tolerances are described in the contract.',
        },
        { h: 'Lead times and installation' },
        {
          p: 'The lead time starts from approval of the technical design and receipt of the agreed payment. The room must be ready for installation: wet works completed, plumbing and electrics routed according to the design, free access.',
        },
        { h: 'Complaints' },
        {
          p: 'Complaints are submitted in writing, with a description and photos. We reply within the statutory deadline and offer a repair, replacement of the part or another solution as appropriate.',
        },
      ],
    },

    biskvitki: {
      zaglavieStr: 'Cookies',
      opisanie: 'What the site stores in your browser and why there is no cookie banner.',
      zaglavie: 'Cookies and local storage',
      vavedenie: 'The site is built so that it does not need tracking cookies.',
      bloka: () => [
        { h: 'Tracking cookies' },
        {
          p: 'We do not use advertising or profiling cookies and do not embed third-party tracking scripts. That is why we don’t greet you with a consent banner.',
        },
        { h: 'What is stored' },
        {
          ul: [
            '**Your configuration:** while you lay out a kitchen, it is saved in your browser’s local storage so it is still there when you come back. It does not leave your device until you send it.',
            '**Your chosen language:** if you pick a language from the menu at the top right, it is remembered in a cookie called korpus-ezik for one year, so the site greets you in your language. It contains nothing else.',
            '**Technically necessary data:** needed for form security and for the site to work.',
          ],
        },
        { h: 'How to delete them' },
        {
          p: 'The “Clear everything” button in the configurator removes the saved configuration. You can also clear the site data from your browser settings.',
        },
        { h: 'Visitor analytics' },
        {
          p: 'If we add visitor statistics, it will be a solution without cookies and without cross-site tracking. If that changes, this page will be updated before the change takes effect.',
        },
      ],
    },
  },

  zh: {
    vazhiBalgarskiyat: '本译文仅供参考。如与保加利亚语文本不一致，以保加利亚语版本为准。',

    poveritelnost: {
      zaglavieStr: '隐私政策',
      opisanie: '我们收集哪些数据、为什么收集、保存多久，以及您享有哪些权利。',
      zaglavie: '隐私政策',
      vavedenie: '我们收集的数据很少，保存时间也很短。以下是具体内容和用途。',
      bloka: ({ ime, meseci }) => [
        { h: '数据处理方' },
        {
          p: `${ime}。联系方式见[联系我们](/kontakt)页面。公司信息和地址将在网站上线前补充。`,
        },
        { h: '我们收集哪些数据及原因' },
        {
          ul: [
            '**咨询：**姓名、电话，以及可选的邮箱和所在城市，以便回复并预约测量。',
            '**布置内容和大致预算：**以便在上门前评估工作范围。',
            '**上传的户型图和照片：**以便了解房间情况。它们保存在安全的存储中，仅团队可以打开。',
            '**配置器中的配置：**尺寸和所选模块。在您发送给我们之前，它只保存在您的浏览器中。',
            '**订单：**安装地址和电话，以便配送和安装。',
          ],
        },
        { h: '法律依据' },
        {
          p: '我们处理数据是为了满足您的请求，以及准备或履行合同；营销类沟通仅在您同意后进行，且您可以随时撤回同意。',
        },
        { h: '保存期限' },
        {
          ul: [
            `未形成订单的咨询——最长保存 ${meseci} 个月，连同上传的文件。`,
            '已完成订单的文件——在法律要求的期限内及质保期内保存。',
          ],
        },
        { h: '我们与谁共享数据' },
        {
          p: '仅限于服务运行所必需的供应商：位于欧盟境内的托管和数据库、邮件发送服务；在下单后，还包括生产工厂和承运商，且仅限最低必要范围。我们不出售数据。',
        },
        { h: '您的权利' },
        {
          ul: [
            '查阅我们保存的您的数据；',
            '更正不准确的信息；',
            '在不再需要时删除数据；',
            '限制处理及提出异议；',
            '数据可携带；',
            '向保加利亚个人数据保护委员会投诉。',
          ],
        },
        { p: '请给我们写信，我们将在法定期限内答复。' },
        { h: '安全' },
        { p: '与网站的连接经过加密。上传的文件不公开——仅团队登录后才能打开。' },
      ],
    },

    usloviya: {
      zaglavieStr: '一般条款',
      opisanie: '定制家具的订购条款、质保及消费者权利。',
      zaglavie: '一般条款与消费者须知',
      vavedenie: '您订购什么、得到什么，以及您享有哪些权利。',
      bloka: ({ godini }) => [
        { h: '我们提供什么' },
        {
          p: '按个人设计定制家具的设计、生产和安装。每份订单都按上门实测的尺寸和您在订购材料前书面确认的规格清单制作。',
        },
        { h: '配置器不构成报价' },
        {
          p: '网站上的图纸、规格清单和效果图仅供参考和决策使用。**这不是报价。**准确价格以上门测量和书面报价为准。某个具体方案能否生产，也需在技术确认后才能确定。',
        },
        { h: '退货权' },
        {
          p: '按您的尺寸和要求定制的家具，不适用远程合同的 14 天无理由退货。这在保加利亚《消费者保护法》中有明确规定。',
        },
        { p: '该例外不影响您在商品存在缺陷或不符时的权利。' },
        { h: '质保' },
        {
          p: `所有商品均享有 **${godini} 年**法定质保。质保期自安装完成之日起计算，不包括因使用不当、第三方干预或安装后房间内装修造成的损坏。`,
        },
        { h: '偏差' },
        {
          p: '木质材料和喷涂表面与样品相比，在色调和纹理上存在允许范围内的偏差。具体公差在合同中说明。',
        },
        { h: '工期与安装' },
        {
          p: '工期自技术设计确认并收到约定款项之日起计算。房间须具备安装条件：湿作业已完成，给排水和电路已按设计到位，通道畅通。',
        },
        { h: '投诉' },
        {
          p: '投诉须以书面形式提交，并附说明和照片。我们将在法定期限内答复，并视情况提供维修、更换部件或其他解决方案。',
        },
      ],
    },

    biskvitki: {
      zaglavieStr: 'Cookie',
      opisanie: '网站在您的浏览器中保存了什么，以及为什么没有 Cookie 横幅。',
      zaglavie: 'Cookie 与本地存储',
      vavedenie: '本网站的设计无需使用跟踪类 Cookie。',
      bloka: () => [
        { h: '跟踪类 Cookie' },
        {
          p: '我们不使用广告或用户画像类 Cookie，也不嵌入第三方跟踪脚本。因此不会弹出同意横幅。',
        },
        { h: '会保存哪些内容' },
        {
          ul: [
            '**您的配置：**在您布置厨房时，配置会保存在浏览器的本地存储中，方便您回来时继续。在您发送之前，它不会离开您的设备。',
            '**您选择的语言：**如果您在右上角的菜单中选择了语言，它会保存在名为 korpus-ezik 的 Cookie 中一年，以便下次用您的语言显示网站。其中不包含任何其他信息。',
            '**技术必需的数据：**用于表单安全和网站正常运行。',
          ],
        },
        { h: '如何删除' },
        {
          p: '配置器中的“全部清除”按钮可删除已保存的配置。您也可以在浏览器设置中清除本网站的数据。',
        },
        { h: '访问统计' },
        {
          p: '如果我们添加访问统计，将采用不使用 Cookie、不跨站跟踪的方案。如有变化，本页面将在变更生效前更新。',
        },
      ],
    },
  },
});
