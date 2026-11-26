/**
 * Общите части на двата инструмента — „Направи проект" и конфигуратора:
 * обемът, лентата, палитрата, покритията, цената, малкият план.
 */

import type { RoomKind, RowId, WallSide } from '@/lib/cabinet-rules';
import { tekstove } from '../tekst';

export const INSTRUMENTI = tekstove({
  bg: {
    udobstvo: { vnimanie: 'Внимание: ', savet: 'Съвет: ' },

    miniPlan: {
      etiket: (
        shirina: string,
        dalbochina: string,
        stena: string,
        strana: string,
        vrata: string,
        prozortsi: number,
      ) =>
        `Стая ${shirina} на ${dalbochina}, мебел по горната стена ${stena}, врата ${vrata} на ${strana} стена` +
        (prozortsi ? `, ${prozortsi === 1 ? 'прозорец' : `${prozortsi} прозореца`}` : ''),
      strana: {
        top: 'горната',
        right: 'дясната',
        bottom: 'долната',
        left: 'лявата',
      } satisfies Record<WallSide, string>,
    },

    tsena: {
      chernova: 'примерни цени — чакат потвърждение',
      orientirovachno: 'ориентировъчно',
      primerni: '(примерни цени)',
      prazno: 'Сложете поне един шкаф в стаята и тук ще излезе ориентировъчна цена.',
      kakSmyatame:
        'Смятаме я от материалите, обкова и шкафовете във вашия проект, с изработка, монтаж и доставка, с ДДС. Точната цена идва след измерване на място.',
      kakESmetnata: 'Как е сметната',
      suma: 'Сума по сметката',
      diapazon: (pct: number) =>
        `Диапазонът е ±${pct}% около сумата: мерките още не са взети на място.`,
    },

    paleta: {
      red: { base: 'Долу', upper: 'Горе' } satisfies Record<RowId, string>,
      grupa: (red: string) => `Модули ${red.toLowerCase()}`,
      hint: 'Завлечете модул в чертежа и го пуснете където трябва. Щракване го слага в края на реда.',
      kade: 'в чертежа',
      buton: (ime: string, kade: string) =>
        `${ime}. Завлечете го ${kade} или натиснете, за да влезе в края на реда.`,
    },

    deistviya: {
      etiket: 'Действия върху избраното',
      izberete: 'Изберете модул',
      izbrani: (n: number) => (n === 1 ? '1 избран' : `${n} избрани`),
      poTyasno: 'По-тясно',
      poShiroko: 'По-широко',
      kopirai: 'Копирай',
      iztrii: 'Изтрий',
      gotovo: 'Готово',
    },

    pod: {
      izbrano: 'Избрано: ',
      kakto: 'подът както е',
      kaktoBeshe: '↺ подът както беше',
    },

    steni: {
      strana: { top: 'Горе', right: 'Вдясно', bottom: 'Долу', left: 'Вляво' } satisfies Record<
        WallSide,
        string
      >,
      kade: 'Къде',
      koyaStena: 'Коя стена',
      vsichki: 'Всички стени',
      sMebelta: 'с мебелта',
      kaktoOstanalite: '↺ като останалите стени',
      izbrano: 'Избрано: ',
      tarsene: (n: number) => `Търсене в ${n} покрития — „тухла", „метро", „дъб"…`,
      tarseneEtiket: 'Търсене на покритие',
      vid: 'Вид покритие',
      nishto: (q: string) => `Нищо не отговаря на „${q}“.`,
      svoe: 'със свое покритие',
    },

    lenta: {
      redove: {
        kitchen: { base: 'Долен ред', upper: 'Горен ред' },
        bedroom: { base: 'Гардероб', upper: 'Антресол' },
        living: { base: 'Долен ред', upper: 'Стенен ред' },
        bath: { base: 'Долен ред', upper: 'Над мивката' },
        corridor: { base: 'Шкафове', upper: 'Антресол' },
        hall: { base: 'Шкафове', upper: 'Антресол' },
      } satisfies Record<RoomKind, Record<RowId, string>>,
      etiket: (strana: string) => `Лента на ${strana} стена`,
      strana: {
        top: 'горната',
        right: 'дясната',
        bottom: 'долната',
        left: 'лявата',
      } satisfies Record<WallSide, string>,
      zaglavie: 'Лента',
      izbrani: (n: number) => `${n} избрани`,
      podskazka: 'влачи клип · хвани ръба, за да опънеш · тегли рамка за няколко',
      klip: (glava: string, mm: string, ime: string | null, i: number, ot: number) =>
        `${glava} ${mm} мм` +
        (ime ? ` — ${ime}` : '') +
        `, ${i} от ${ot}.` +
        ' Стрелките го местят, плюс и минус менят ширината.',
      prazno: 'Празно. Завлечете модул от палитрата.',
    },

    obem: {
      palen: (ime: string, n: number) => `${ime} е пълен — най-много ${n} рафта при тази височина.`,
      neVliza: (ime: string) => `В „${ime}" рафт не влиза.`,
      etiket: (w: number, d: number) =>
        `Обемен изглед в стая ${w} на ${d} мм. Стрелките въртят изгледа.`,
      reshetka: (otlyavo: number, stapka: number) => `← ${otlyavo} мм · решетка ${stapka} мм`,
      pusnete: 'Пуснете го в шкаф…',
      raft: '＋ Рафт — завлечете го в шкаф',
      zavarti: '⟳ завърти',
      mahni: '× махни',
      zatvori: 'Затвори всички',
      otvori: 'Отвори всички',
      izpravi: 'Изправи изгледа',
    },

    chertej: {
      poTesen: 'По-тесен',
      poShirok: 'По-широк',
      nalyavo: 'Премести наляво',
      nadyasno: 'Премести надясно',
      panti: (lyavo: boolean) => `Панти ${lyavo ? 'вляво' : 'вдясно'} — обърни`,
      kopie: 'Копие (⌘D)',
      premahni: 'Премахни (Delete)',
      etiket: (mm: string) => `Фронтален чертеж на кухня, стена ${mm} мм`,
      modul: (kod: string, ime: string, mm: string, mesti: boolean) =>
        `${kod} ${ime} ${mm} мм${mesti ? ', стрелките местят' : ''}`,
      dalzhina: 'Дължина на стената, стрелките я променят',
      mm: (mm: string) => `${mm} мм`,
    },
  },

  en: {
    udobstvo: { vnimanie: 'Warning: ', savet: 'Tip: ' },

    miniPlan: {
      etiket: (
        shirina: string,
        dalbochina: string,
        stena: string,
        strana: string,
        vrata: string,
        prozortsi: number,
      ) =>
        `Room ${shirina} by ${dalbochina}, furniture along the top wall ${stena}, door ${vrata} on the ${strana} wall` +
        (prozortsi ? `, ${prozortsi === 1 ? 'one window' : `${prozortsi} windows`}` : ''),
      strana: { top: 'top', right: 'right', bottom: 'bottom', left: 'left' },
    },

    tsena: {
      chernova: 'sample prices — awaiting confirmation',
      orientirovachno: 'estimated',
      primerni: '(sample prices)',
      prazno: 'Put at least one cabinet in the room and an estimated price will appear here.',
      kakSmyatame:
        'We calculate it from the materials, hardware and cabinets in your design, including workmanship, installation and delivery, with VAT. The exact price comes after measuring on site.',
      kakESmetnata: 'How it is calculated',
      suma: 'Total',
      diapazon: (pct: number) =>
        `The range is ±${pct}% around the total: the measurements have not been taken on site yet.`,
    },

    paleta: {
      red: { base: 'Base', upper: 'Upper' },
      grupa: (red: string) => `${red} units`,
      hint: 'Drag a unit into the drawing and drop it where it belongs. A click adds it at the end of the row.',
      kade: 'into the drawing',
      buton: (ime: string, kade: string) =>
        `${ime}. Drag it ${kade} or press to add it at the end of the row.`,
    },

    deistviya: {
      etiket: 'Actions on the selection',
      izberete: 'Select a unit',
      izbrani: (n: number) => `${n} selected`,
      poTyasno: 'Narrower',
      poShiroko: 'Wider',
      kopirai: 'Duplicate',
      iztrii: 'Delete',
      gotovo: 'Done',
    },

    pod: {
      izbrano: 'Selected: ',
      kakto: 'the floor as it is',
      kaktoBeshe: '↺ floor as it was',
    },

    steni: {
      strana: { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' },
      kade: 'Where',
      koyaStena: 'Which wall',
      vsichki: 'All walls',
      sMebelta: 'with furniture',
      kaktoOstanalite: '↺ same as the other walls',
      izbrano: 'Selected: ',
      tarsene: (n: number) => `Search ${n} finishes — “brick”, “metro”, “oak”…`,
      tarseneEtiket: 'Search finishes',
      vid: 'Finish type',
      nishto: (q: string) => `Nothing matches “${q}”.`,
      svoe: 'has its own finish',
    },

    lenta: {
      redove: {
        kitchen: { base: 'Base row', upper: 'Upper row' },
        bedroom: { base: 'Wardrobe', upper: 'Top boxes' },
        living: { base: 'Base row', upper: 'Wall row' },
        bath: { base: 'Base row', upper: 'Above the sink' },
        corridor: { base: 'Cabinets', upper: 'Top boxes' },
        hall: { base: 'Cabinets', upper: 'Top boxes' },
      },
      etiket: (strana: string) => `Strip for the ${strana} wall`,
      strana: { top: 'top', right: 'right', bottom: 'bottom', left: 'left' },
      zaglavie: 'Strip',
      izbrani: (n: number) => `${n} selected`,
      podskazka: 'drag a clip · grab the edge to stretch it · drag a box to select several',
      klip: (glava: string, mm: string, ime: string | null, i: number, ot: number) =>
        `${glava} ${mm} mm` +
        (ime ? ` — ${ime}` : '') +
        `, ${i} of ${ot}.` +
        ' The arrow keys move it, plus and minus change its width.',
      prazno: 'Empty. Drag a unit from the palette.',
    },

    obem: {
      palen: (ime: string, n: number) => `${ime} is full — at most ${n} shelves at this height.`,
      neVliza: (ime: string) => `A shelf does not fit in “${ime}”.`,
      etiket: (w: number, d: number) =>
        `3D view of a ${w} by ${d} mm room. The arrow keys rotate the view.`,
      reshetka: (otlyavo: number, stapka: number) => `← ${otlyavo} mm · grid ${stapka} mm`,
      pusnete: 'Drop it into a cabinet…',
      raft: '＋ Shelf — drag it into a cabinet',
      zavarti: '⟳ rotate',
      mahni: '× remove',
      zatvori: 'Close all',
      otvori: 'Open all',
      izpravi: 'Reset view',
    },

    chertej: {
      poTesen: 'Narrower',
      poShirok: 'Wider',
      nalyavo: 'Move left',
      nadyasno: 'Move right',
      panti: (lyavo: boolean) => `Hinges on the ${lyavo ? 'left' : 'right'} — flip`,
      kopie: 'Duplicate (⌘D)',
      premahni: 'Remove (Delete)',
      etiket: (mm: string) => `Front elevation of a kitchen, wall ${mm} mm`,
      modul: (kod: string, ime: string, mm: string, mesti: boolean) =>
        `${kod} ${ime} ${mm} mm${mesti ? ', arrow keys move it' : ''}`,
      dalzhina: 'Wall length, the arrow keys change it',
      mm: (mm: string) => `${mm} mm`,
    },
  },

  zh: {
    udobstvo: { vnimanie: '注意：', savet: '建议：' },

    miniPlan: {
      etiket: (
        shirina: string,
        dalbochina: string,
        stena: string,
        strana: string,
        vrata: string,
        prozortsi: number,
      ) =>
        `房间 ${shirina} × ${dalbochina}，家具沿上墙 ${stena}，门 ${vrata} 位于${strana}墙` +
        (prozortsi ? `，${prozortsi} 扇窗` : ''),
      strana: { top: '上', right: '右', bottom: '下', left: '左' },
    },

    tsena: {
      chernova: '示例价格——待确认',
      orientirovachno: '参考价',
      primerni: '（示例价格）',
      prazno: '在房间里放至少一个柜子，这里就会显示参考价格。',
      kakSmyatame:
        '根据您设计中的材料、五金和柜子计算，包括加工、安装和配送，含增值税。准确价格以上门测量后为准。',
      kakESmetnata: '计算方式',
      suma: '合计',
      diapazon: (pct: number) => `价格区间为合计的 ±${pct}%：尚未上门测量。`,
    },

    paleta: {
      red: { base: '下排', upper: '上排' },
      grupa: (red: string) => `${red}模块`,
      hint: '把模块拖到图纸中合适的位置。单击则添加到该排末尾。',
      kade: '到图纸中',
      buton: (ime: string, kade: string) => `${ime}。拖${kade}，或按下添加到该排末尾。`,
    },

    deistviya: {
      etiket: '对所选模块的操作',
      izberete: '请选择模块',
      izbrani: (n: number) => `已选 ${n} 个`,
      poTyasno: '变窄',
      poShiroko: '变宽',
      kopirai: '复制',
      iztrii: '删除',
      gotovo: '完成',
    },

    pod: {
      izbrano: '已选：',
      kakto: '保持原地面',
      kaktoBeshe: '↺ 恢复原地面',
    },

    steni: {
      strana: { top: '上', right: '右', bottom: '下', left: '左' },
      kade: '位置',
      koyaStena: '哪面墙',
      vsichki: '所有墙面',
      sMebelta: '有家具',
      kaktoOstanalite: '↺ 与其他墙相同',
      izbrano: '已选：',
      tarsene: (n: number) => `在 ${n} 种饰面中搜索——“砖”、“地铁砖”、“橡木”…`,
      tarseneEtiket: '搜索饰面',
      vid: '饰面类型',
      nishto: (q: string) => `没有与“${q}”匹配的结果。`,
      svoe: '有单独饰面',
    },

    lenta: {
      redove: {
        kitchen: { base: '下排柜', upper: '上排柜' },
        bedroom: { base: '衣柜', upper: '顶柜' },
        living: { base: '下排柜', upper: '墙面柜' },
        bath: { base: '下排柜', upper: '台盆上方' },
        corridor: { base: '柜子', upper: '顶柜' },
        hall: { base: '柜子', upper: '顶柜' },
      },
      etiket: (strana: string) => `${strana}墙时间条`,
      strana: { top: '上', right: '右', bottom: '下', left: '左' },
      zaglavie: '时间条',
      izbrani: (n: number) => `已选 ${n} 个`,
      podskazka: '拖动片段 · 拖住边缘拉伸 · 框选多个',
      klip: (glava: string, mm: string, ime: string | null, i: number, ot: number) =>
        `${glava} ${mm} mm` +
        (ime ? ` — ${ime}` : '') +
        `，第 ${i} 个，共 ${ot} 个。` +
        '方向键移动，加减号调整宽度。',
      prazno: '空。从模块面板拖入模块。',
    },

    obem: {
      palen: (ime: string, n: number) => `${ime}已满——在这个高度最多放 ${n} 块层板。`,
      neVliza: (ime: string) => `“${ime}”里放不了层板。`,
      etiket: (w: number, d: number) => `${w} × ${d} mm 房间的三维视图。方向键可旋转视角。`,
      reshetka: (otlyavo: number, stapka: number) => `← ${otlyavo} mm · 网格 ${stapka} mm`,
      pusnete: '把它放进柜子…',
      raft: '＋ 层板——拖进柜子',
      zavarti: '⟳ 旋转',
      mahni: '× 移除',
      zatvori: '全部关闭',
      otvori: '全部打开',
      izpravi: '重置视角',
    },

    chertej: {
      poTesen: '变窄',
      poShirok: '变宽',
      nalyavo: '向左移',
      nadyasno: '向右移',
      panti: (lyavo: boolean) => `铰链在${lyavo ? '左' : '右'}侧——翻转`,
      kopie: '复制 (⌘D)',
      premahni: '移除 (Delete)',
      etiket: (mm: string) => `厨房立面图，墙长 ${mm} mm`,
      modul: (kod: string, ime: string, mm: string, mesti: boolean) =>
        `${kod} ${ime} ${mm} mm${mesti ? '，方向键可移动' : ''}`,
      dalzhina: '墙长，方向键可调整',
      mm: (mm: string) => `${mm} mm`,
    },
  },
});
