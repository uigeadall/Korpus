/**
 * Публичните страници: началото, как работим, продуктите, портфолиото,
 * контактите, 404 и заглавията на двата екрана за клиента.
 *
 * `[думи](/adres)` е връзка, `**думи**` е удебелено — виж `Bogat` в
 * `components/site/ui.tsx`.
 */

import { tekstove } from '../tekst';

export const STRANICI = tekstove({
  bg: {
    nachalo: {
      opisanie:
        'Кухни, гардероби и обзавеждане по индивидуален проект: измерване на място, технически проект, производство и монтаж в България.',
      eyebrow: 'Корпусна мебел по индивидуален проект',
      zaglavie1: 'Мебел по мярка на жилището.',
      zaglavie2: 'Не по каталог.',
      vavedenie:
        'Отговорете на няколко въпроса и вижте мебелта си в обем за пет минути. После измерваме на място, проектираме, произвеждаме и монтираме.',
      telefon:
        'Работи и на телефона — направете проекта, докато стоите в самата стая, и сложете мебелта върху снимка на стената си.',
      napraveteProekt: 'Направете си проект',
      kakRabotim: 'Как работим',
      tsyaloJilishte: 'Имате цяло жилище?',
      nachertaite: 'Начертайте го стая по стая',
      zashto: 'Защо при нас',
      protsesat: 'Процесът',
      osemStapki: 'От разговора до монтажа — осем стъпки',
      podrobno: 'Подробно за процеса',
      kakvoPravim: 'Какво правим',
      skoro: 'скоро',
      vsichkiProdukti: 'Всички продукти',
      kraiZaglavie: 'Направете си проекта сега. Отнема пет минути и не ви задължава с нищо.',
      kamProekta: 'Към проекта',
      zapitvane: 'Запитване',
    },

    obshto: {
      napraviProekt: 'Направи си проект',
      zapitvane: 'Запитване',
      pravni: 'Правни',
    },

    kakRabotim: {
      zaglavieStr: 'Как работим',
      opisanie:
        'Процесът в осем стъпки: консултация, измерване на място, проект, оферта, производство, монтаж и гаранция.',
      zaglavie: 'Процесът, по който се прави мебел, която пасва',
      vavedenie:
        'Не продаваме продукт, а организиран проект с отговорност тук. Ето какво се случва и кога.',
      osemteStapki: 'Осемте стъпки',
      otdelno: 'Отделно',
      izmervaneto: 'Измерването',
      izmervane1:
        'Измерваме сами, на място, след като е готов мокрият ремонт. Записваме отклоненията на стените и пода, позициите на ВиК, тока и комина. Ако мебелът се проектира по план на строителя, почти винаги се появява разлика — и тя се плаща от някого.',
      izmervane2:
        'Затова проектът, който си правите тук, е инструмент за решение и за ориентир, а не заместител на измерването. Накрая на всеки чертеж пише същото: **това не е оферта, точната цена следва след измерване на място.**',
      garantsiya: 'Гаранция и права',
      garantsiya1: (godini: number) =>
        `Всички стоки имат законова гаранция от ${godini} години. Проектът и спецификацията остават при нас — при нужда от регулиране или допълнителен детайл знаем точно какво е вложено.`,
      garantsiya2:
        'Мебелите по индивидуален проект са изключение от 14-дневното право на отказ, защото се изработват по ваши размери. Това не засяга правата ви при дефект или несъответствие. Подробно в [общите условия](/usloviya).',
    },

    produkti: {
      zaglavieStr: 'Продукти',
      opisanie:
        'Основна линия: корпусна мебел по проект. Следващи линии: готови мебели, камък, алуминиеви решения и осветление.',
      zaglavie: 'Започваме от корпусната мебел и разширяваме, когато е проверено',
      vavedenie:
        'Линия влиза в предложението чак когато имаме мостра, документи за ЕС и срок, който можем да обещаем.',
      liniite: 'Линиите',
      skoro: 'скоро',
      osnovna: 'основна линия',
      poveche: 'Повече за линията',
    },

    korpusna: {
      opisanie:
        'Кухни, гардероби, ТВ композиции и антре по индивидуален проект, с технически чертеж и спецификация.',
      eyebrow: 'Основна линия',
      obhvat: 'Обхват',
      materiali: 'Материали и механизми',
      materialiSpisak: (t: number) => [
        { title: 'Корпус', body: `ПДЧ ${t} мм, кант по видимия преден ръб, гръб HDF 3 мм.` },
        {
          title: 'Фасади',
          body: 'МДФ боядисан или фрезован, ПДЧ декор с кант 2 мм по четирите страни.',
        },
        { title: 'Плот', body: 'Ламиниран 38 мм, кварц 20 мм, синтерован 12 мм или гранит 30 мм.' },
        {
          title: 'Механизми',
          body: 'Панти с плавно затваряне, метален борд или сферични водачи, push-to-open при фасади без дръжки.',
        },
      ],
      mostri: 'Конкретните декори, цветове и марки на механизмите се избират в студиото по мостри.',
      kakvoPoluchavate: 'Какво получавате',
      chertej: 'Чертеж',
      chertejText: 'Фронтален изглед с верижни размери, височини и номера на шкафовете.',
      spetsifikatsiya: 'Спецификация',
      spetsifikatsiyaText:
        'Всеки детайл с размер, материал, кант и бележка — по нея се произвежда.',
      prosledyavane: 'Проследяване',
      prosledyavaneText: 'Виждате етапите и сами избирате деня за доставка и монтаж.',
      realizirani: 'Реализирани проекти',
      snimkaPredstoi: 'Снимка от обект — предстои',
      samoNashi:
        'Показваме само наши обекти. Докато нямаме снимки от завършени проекти, тук стоят празни места вместо чужди кадри. [Портфолио](/portfolio).',
    },

    portfolio: {
      zaglavieStr: 'Портфолио',
      opisanie: 'Реализирани проекти: кухни, гардероби и цялостно обзавеждане.',
      zaglavie: 'Реализирани проекти',
      vavedenie:
        'Тук влизат само наши обекти — със снимки, описание и материалите, които са вложени.',
      proekti: 'Проекти',
      broi: (n: number) =>
        `${n} ${n === 1 ? 'проект' : 'проекта'}. Всеки отваря страница с параметрите и материалите.`,
      prazno1:
        'Галерията още е празна. Пълни се от админския панел, когато първите обекти са готови и заснети.',
      prazno2:
        'Няма да я напълним със стокови снимки на чужди кухни. Докато нямаме свои, предпочитаме да си личи, че мястото е празно.',
      primerPred: 'Как ще изглежда един проект се вижда на',
      primerVrazka: 'примерната страница',
      kakvoShte: 'Какво ще показваме',
      zaVseki:
        'За всеки обект: няколко кадъра, габаритите, плотът, фасадите и механизмите. Без име и адрес на клиента.',
      nenameren: 'Проектът не е намерен',
      zaProekta: 'За проекта',
      parametri: 'Параметри',
      materiali: 'Материали и механизми',
      mostri: 'Конкретните декори и марки на механизмите се избират в студиото по мостри.',
      vsichki: '← Всички проекти',
      predstoiZasnemane: 'предстои заснемане',
      primerZaglavie: 'Примерен запис.',
      primerText:
        'Показва как изглежда страница на проект. Числата са от контролната кухня в спецификацията, не от завършен обект, и кадрите още не са заснети.',
    },

    kontakt: {
      zaglavieStr: 'Контакт',
      opisanie: 'Свържете се за консултация, измерване и оферта.',
      eyebrow: 'Контакт',
      zaglavie: 'Пишете или се обадете',
      vavedenie:
        'Кажете какво обзавеждате и в какъв срок. Ако имате план на жилището или снимки, пратете ги — пестят време на всички.',
      kakDaNi: 'Как да ни намерите',
      telefon: 'Телефон',
      imeil: 'Имейл',
      studio: 'Студио',
      predstoi: 'предстои',
      adresatPredstoi: 'адресът предстои',
      rabotnoVreme: 'Работно време',
      forma: 'Форма за запитване',
      forma1:
        'Формата с качване на план и снимки влиза в следващия етап от разработката, заедно със защитата от ботове и сигурното съхранение на файловете.',
      forma2:
        'Дотогава най-бързият път е обаждане или имейл. Ако вече сте направили проект, свалете PDF-а и го прикачете — в него има чертеж, размери и материали.',
      danni: 'Какво става с данните ви',
      danniText:
        'Събираме само това, което е нужно, за да отговорим и да направим оферта. Качените планове и снимки се пазят в защитено хранилище и се виждат само от екипа. Подробно в [политиката за поверителност](/poveritelnost).',
    },

    nyama: {
      zaglavieStr: 'Страницата не е намерена',
      zaglavie: 'Няма такава страница',
      vavedenie: 'Адресът е сбъркан или страницата вече не съществува.',
      kamNachaloto: 'Към началото',
      napraveteProekt: 'Направете си проект',
      kontakt: 'Контакт',
    },

    ekrani: {
      proektZaglavie: 'Направете си кухнята',
      proektOpisanie:
        'Отговорете на няколко въпроса и вижте кухнята си в обем. Ние смятаме шкафовете, размерите и обкова, а вие решавате как да изглежда.',
      jilishteZaglavie: 'Начертайте жилището',
      jilishteOpisanie:
        'Сложете стаите, коридорите и банята една до друга както са при вас, и обиколете жилището със стрелките.',
      konfiguratorZaglavie: 'Конфигуратор — вътрешен инструмент',
      konfiguratorOpisanie:
        'Нареждане по милиметър, спецификация и разбивка на детайлите за разкрой. Вътрешен инструмент.',
    },
  },

  en: {
    nachalo: {
      opisanie:
        'Kitchens, wardrobes and fitted furniture made to your design: on-site measuring, technical design, production and installation in Bulgaria.',
      eyebrow: 'Made-to-measure cabinet furniture',
      zaglavie1: 'Furniture made to fit your home.',
      zaglavie2: 'Not a catalogue.',
      vavedenie:
        'Answer a few questions and see your furniture in 3D in five minutes. Then we measure on site, design, build and install.',
      telefon:
        'It works on your phone too — design while standing in the room itself, and place the furniture on a photo of your own wall.',
      napraveteProekt: 'Design your furniture',
      kakRabotim: 'How we work',
      tsyaloJilishte: 'Furnishing a whole home?',
      nachertaite: 'Draw it room by room',
      zashto: 'Why us',
      protsesat: 'The process',
      osemStapki: 'From the first conversation to installation — eight steps',
      podrobno: 'More about the process',
      kakvoPravim: 'What we make',
      skoro: 'soon',
      vsichkiProdukti: 'All products',
      kraiZaglavie: 'Start your design now. It takes five minutes and commits you to nothing.',
      kamProekta: 'Start designing',
      zapitvane: 'Enquire',
    },

    obshto: {
      napraviProekt: 'Design your furniture',
      zapitvane: 'Enquire',
      pravni: 'Legal',
    },

    kakRabotim: {
      zaglavieStr: 'How we work',
      opisanie:
        'The process in eight steps: consultation, on-site measuring, design, quote, production, installation and warranty.',
      zaglavie: 'How furniture that truly fits gets made',
      vavedenie:
        'We don’t sell a product — we run an organised project with local accountability. Here is what happens and when.',
      osemteStapki: 'The eight steps',
      otdelno: 'In detail',
      izmervaneto: 'Measuring',
      izmervane1:
        'We take the measurements ourselves, on site, once the wet works are finished. We note how the walls and floor deviate and where the plumbing, electrics and flue are. If furniture is designed from the builder’s plan, there is almost always a discrepancy — and someone ends up paying for it.',
      izmervane2:
        'That is why the design you create here is a tool for making decisions and getting your bearings, not a substitute for measuring. Every drawing ends with the same line: **this is not a quote — the exact price follows after measuring on site.**',
      garantsiya: 'Warranty and your rights',
      garantsiya1: (godini: number) =>
        `All goods carry a ${godini}-year statutory warranty. The design and the specification stay on file with us — if something needs adjusting or an extra part, we know exactly what went into it.`,
      garantsiya2:
        'Made-to-measure furniture is exempt from the 14-day right of withdrawal because it is built to your dimensions. This does not affect your rights in case of a defect or non-conformity. Details in the [terms and conditions](/usloviya).',
    },

    produkti: {
      zaglavieStr: 'Products',
      opisanie:
        'Core line: made-to-measure cabinet furniture. Upcoming lines: ready-made furniture, stone, aluminium systems and lighting.',
      zaglavie: 'We start with cabinet furniture and expand once things are proven',
      vavedenie:
        'A line joins our offer only when we have a sample, EU documentation and a lead time we can promise.',
      liniite: 'Product lines',
      skoro: 'soon',
      osnovna: 'core line',
      poveche: 'More about this line',
    },

    korpusna: {
      opisanie:
        'Kitchens, wardrobes, TV units and hallways made to your design, with a technical drawing and specification.',
      eyebrow: 'Core line',
      obhvat: 'Scope',
      materiali: 'Materials and hardware',
      materialiSpisak: (t: number) => [
        {
          title: 'Carcass',
          body: `${t} mm chipboard, edging on the visible front edge, 3 mm HDF back panel.`,
        },
        {
          title: 'Fronts',
          body: 'Painted or routed MDF, or decor chipboard with 2 mm edging on all four sides.',
        },
        {
          title: 'Worktop',
          body: '38 mm laminate, 20 mm quartz, 12 mm sintered stone or 30 mm granite.',
        },
        {
          title: 'Hardware',
          body: 'Soft-close hinges, metal-sided drawers or ball-bearing runners, push-to-open for handleless fronts.',
        },
      ],
      mostri: 'Specific decors, colours and hardware brands are chosen at the studio from samples.',
      kakvoPoluchavate: 'What you get',
      chertej: 'Drawing',
      chertejText: 'A front elevation with chain dimensions, heights and cabinet numbers.',
      spetsifikatsiya: 'Specification',
      spetsifikatsiyaText:
        'Every part with its size, material, edging and notes — production works from it.',
      prosledyavane: 'Tracking',
      prosledyavaneText: 'You see each stage and choose the day for delivery and installation.',
      realizirani: 'Completed projects',
      snimkaPredstoi: 'Project photo — coming soon',
      samoNashi:
        'We only show our own work. Until we have photos of finished projects, these spaces stay empty rather than filled with other people’s pictures. [Portfolio](/portfolio).',
    },

    portfolio: {
      zaglavieStr: 'Portfolio',
      opisanie: 'Completed projects: kitchens, wardrobes and whole-home furnishing.',
      zaglavie: 'Completed projects',
      vavedenie:
        'Only our own projects appear here — with photos, a description and the materials that went into them.',
      proekti: 'Projects',
      broi: (n: number) =>
        `${n} ${n === 1 ? 'project' : 'projects'}. Each one opens a page with its dimensions and materials.`,
      prazno1:
        'The gallery is still empty. It will be filled from the admin panel once the first projects are finished and photographed.',
      prazno2:
        'We won’t fill it with stock photos of other people’s kitchens. Until we have our own, we prefer to show that the space is empty.',
      primerPred: 'You can see what a project will look like on the',
      primerVrazka: 'example page',
      kakvoShte: 'What we will show',
      zaVseki:
        'For each project: a few photos, the overall dimensions, the worktop, fronts and hardware. No client names or addresses.',
      nenameren: 'Project not found',
      zaProekta: 'About the project',
      parametri: 'Details',
      materiali: 'Materials and hardware',
      mostri: 'Specific decors and hardware brands are chosen at the studio from samples.',
      vsichki: '← All projects',
      predstoiZasnemane: 'photo coming soon',
      primerZaglavie: 'Example entry.',
      primerText:
        'It shows what a project page looks like. The numbers come from the reference kitchen in the specification, not from a finished project, and the photos have not been taken yet.',
    },

    kontakt: {
      zaglavieStr: 'Contact',
      opisanie: 'Get in touch for a consultation, measuring and a quote.',
      eyebrow: 'Contact',
      zaglavie: 'Write or call us',
      vavedenie:
        'Tell us what you are furnishing and by when. If you have a floor plan or photos, send them — they save everyone time.',
      kakDaNi: 'How to reach us',
      telefon: 'Phone',
      imeil: 'Email',
      studio: 'Studio',
      predstoi: 'coming soon',
      adresatPredstoi: 'address coming soon',
      rabotnoVreme: 'Opening hours',
      forma: 'Enquiry form',
      forma1:
        'The form for uploading plans and photos comes in the next stage of development, together with bot protection and secure file storage.',
      forma2:
        'Until then, the quickest way is to call or email. If you have already made a design, download the PDF and attach it — it contains the drawing, dimensions and materials.',
      danni: 'What happens to your data',
      danniText:
        'We only collect what we need to reply and prepare a quote. Uploaded plans and photos are kept in secure storage and are visible only to our team. Details in the [privacy policy](/poveritelnost).',
    },

    nyama: {
      zaglavieStr: 'Page not found',
      zaglavie: 'There is no such page',
      vavedenie: 'The address is wrong or the page no longer exists.',
      kamNachaloto: 'Back to the home page',
      napraveteProekt: 'Design your furniture',
      kontakt: 'Contact',
    },

    ekrani: {
      proektZaglavie: 'Design your kitchen',
      proektOpisanie:
        'Answer a few questions and see your kitchen in 3D. We work out the cabinets, sizes and hardware — you decide how it looks.',
      jilishteZaglavie: 'Draw your home',
      jilishteOpisanie:
        'Place the rooms, hallways and bathroom side by side as they are in your home, and walk through it with the arrow keys.',
      konfiguratorZaglavie: 'Configurator — internal tool',
      konfiguratorOpisanie:
        'Millimetre-precise layout, specification and a cutting list of all parts. Internal tool.',
    },
  },

  zh: {
    nachalo: {
      opisanie:
        '按个人设计定制的厨房、衣柜和家居：上门测量、技术设计、生产，并在保加利亚境内安装。',
      eyebrow: '量身定制的板式家具',
      zaglavie1: '量身定制家具。',
      zaglavie2: '不照目录挑选。',
      vavedenie:
        '回答几个问题，五分钟内就能看到家具的三维效果。之后我们上门测量、设计、生产并安装。',
      telefon: '手机上也能用——站在房间里就能做设计，还能把家具放到您自家墙面的照片上。',
      napraveteProekt: '开始设计',
      kakRabotim: '服务流程',
      tsyaloJilishte: '要布置整套住宅？',
      nachertaite: '逐个房间画出来',
      zashto: '为什么选择我们',
      protsesat: '流程',
      osemStapki: '从沟通到安装——共八步',
      podrobno: '详细了解流程',
      kakvoPravim: '我们的产品',
      skoro: '即将推出',
      vsichkiProdukti: '全部产品',
      kraiZaglavie: '现在就开始设计吧。只需五分钟，没有任何义务。',
      kamProekta: '开始设计',
      zapitvane: '咨询',
    },

    obshto: {
      napraviProekt: '开始设计',
      zapitvane: '咨询',
      pravni: '法律信息',
    },

    kakRabotim: {
      zaglavieStr: '服务流程',
      opisanie: '八个步骤：咨询、上门测量、设计、报价、生产、安装和质保。',
      zaglavie: '合身家具是这样做出来的',
      vavedenie:
        '我们卖的不是一件商品，而是一个有本地责任方的完整项目。以下是每一步做什么、何时做。',
      osemteStapki: '八个步骤',
      otdelno: '详细说明',
      izmervaneto: '测量',
      izmervane1:
        '我们在湿作业完成后亲自上门测量，记录墙面和地面的偏差，以及给排水、电路和烟道的位置。如果按开发商的图纸设计家具，几乎总会出现误差——而这笔代价总得有人承担。',
      izmervane2:
        '因此，您在这里做的设计是帮助决策和参考的工具，不能代替实地测量。每张图纸的结尾都写着同一句话：**这不是报价，准确价格以上门测量后为准。**',
      garantsiya: '质保与权利',
      garantsiya1: (godini: number) =>
        `所有商品均享有 ${godini} 年法定质保。设计图和规格清单保存在我们这里——如需调整或增加部件，我们清楚知道用了什么。`,
      garantsiya2:
        '按个人尺寸定制的家具不适用 14 天无理由退货，因为它是按您的尺寸制作的。这不影响您在产品存在缺陷或不符时的权利。详见[一般条款](/usloviya)。',
    },

    produkti: {
      zaglavieStr: '产品',
      opisanie: '主线：定制板式家具。后续产品线：成品家具、石材、铝制系统和照明。',
      zaglavie: '我们从板式家具做起，经过验证后再扩展',
      vavedenie: '只有在我们拿到样品、欧盟认证文件并能承诺交期之后，一条产品线才会正式推出。',
      liniite: '产品线',
      skoro: '即将推出',
      osnovna: '主线产品',
      poveche: '了解该产品线',
    },

    korpusna: {
      opisanie: '按个人设计定制的厨房、衣柜、电视柜组合和玄关柜，附技术图纸和规格清单。',
      eyebrow: '主线产品',
      obhvat: '范围',
      materiali: '材料与五金',
      materialiSpisak: (t: number) => [
        { title: '柜体', body: `${t} mm 刨花板，可见前缘封边，3 mm HDF 背板。` },
        { title: '门板', body: '烤漆或雕刻 MDF，或四边 2 mm 封边的饰面刨花板。' },
        { title: '台面', body: '38 mm 防火板、20 mm 石英石、12 mm 岩板或 30 mm 花岗岩。' },
        { title: '五金', body: '阻尼铰链、金属抽屉或钢珠滑轨，无拉手门板采用按压反弹。' },
      ],
      mostri: '具体饰面、颜色和五金品牌在工作室根据样品选定。',
      kakvoPoluchavate: '您将得到',
      chertej: '图纸',
      chertejText: '带连续尺寸、高度和柜体编号的立面图。',
      spetsifikatsiya: '规格清单',
      spetsifikatsiyaText: '每块板件的尺寸、材料、封边和备注——生产以此为准。',
      prosledyavane: '进度跟踪',
      prosledyavaneText: '您可以看到每个阶段，并自行选择配送和安装日期。',
      realizirani: '完工案例',
      snimkaPredstoi: '项目照片——即将上传',
      samoNashi:
        '我们只展示自己的作品。在有完工项目的照片之前，这里留白，而不是放别人的图片。[案例](/portfolio)。',
    },

    portfolio: {
      zaglavieStr: '案例',
      opisanie: '完工案例：厨房、衣柜和全屋定制。',
      zaglavie: '完工案例',
      vavedenie: '这里只收录我们自己的项目——附照片、介绍和所用材料。',
      proekti: '项目',
      broi: (n: number) => `共 ${n} 个项目。点击可查看尺寸和材料。`,
      prazno1: '案例库目前还是空的。首批项目完工并拍摄后，将通过后台添加。',
      prazno2: '我们不会用别人厨房的图库照片来填充。在有自己的作品之前，宁可让这里空着。',
      primerPred: '项目页面的样子可以参考',
      primerVrazka: '示例页面',
      kakvoShte: '我们将展示',
      zaVseki: '每个项目包括：若干照片、外形尺寸、台面、门板和五金。不公开客户姓名和地址。',
      nenameren: '未找到该项目',
      zaProekta: '项目介绍',
      parametri: '参数',
      materiali: '材料与五金',
      mostri: '具体饰面和五金品牌在工作室根据样品选定。',
      vsichki: '← 全部项目',
      predstoiZasnemane: '照片待拍摄',
      primerZaglavie: '示例条目。',
      primerText:
        '用于展示项目页面的样式。数据来自规格说明中的参考厨房，并非完工项目，照片也尚未拍摄。',
    },

    kontakt: {
      zaglavieStr: '联系我们',
      opisanie: '联系我们预约咨询、测量和报价。',
      eyebrow: '联系我们',
      zaglavie: '给我们写信或打电话',
      vavedenie:
        '告诉我们您要布置什么、期望什么时候完成。如有户型图或照片，请一并发来——能为大家节省时间。',
      kakDaNi: '联系方式',
      telefon: '电话',
      imeil: '邮箱',
      studio: '工作室',
      predstoi: '即将公布',
      adresatPredstoi: '地址即将公布',
      rabotnoVreme: '营业时间',
      forma: '咨询表单',
      forma1:
        '可上传户型图和照片的表单将在下一个开发阶段上线，同时加入防机器人保护和安全的文件存储。',
      forma2:
        '在此之前，最快的方式是打电话或发邮件。如果您已经做好了设计，请下载 PDF 并附上——里面有图纸、尺寸和材料。',
      danni: '您的数据如何处理',
      danniText:
        '我们只收集回复和报价所需的信息。上传的户型图和照片保存在安全的存储中，仅团队可见。详见[隐私政策](/poveritelnost)。',
    },

    nyama: {
      zaglavieStr: '页面未找到',
      zaglavie: '没有这个页面',
      vavedenie: '地址有误，或该页面已不存在。',
      kamNachaloto: '返回首页',
      napraveteProekt: '开始设计',
      kontakt: '联系我们',
    },

    ekrani: {
      proektZaglavie: '设计您的厨房',
      proektOpisanie:
        '回答几个问题，即可看到厨房的三维效果。柜体、尺寸和五金由我们计算，外观由您决定。',
      jilishteZaglavie: '画出您的住宅',
      jilishteOpisanie: '按实际情况把房间、走廊和浴室拼在一起，然后用方向键在住宅里走一走。',
      konfiguratorZaglavie: '配置器——内部工具',
      konfiguratorOpisanie: '精确到毫米的布局、规格清单和板件开料明细。内部工具。',
    },
  },
});
