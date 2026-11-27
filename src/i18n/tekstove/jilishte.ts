/**
 * „Жилището" — чертежът на цялото жилище, макетът и ходенето в него.
 */

import { tekstove } from '../tekst';

export const JILISHTE = tekstove({
  bg: {
    zaglavie: 'Начертайте жилището',
    vavedenie:
      'Сложете стаите една до друга както са при вас. Влачете ги, опъвайте ги за долния десен ъгъл — лепят се сами. Стрелките ви водят от стая в стая.',
    otLink: (n: number) => `Отворено жилище от линк: ${n} помещения.`,
    gotova: 'Стаята е готова и е отметната в схемата.',
    vlezeNova: (ime: string, w: string, d: string) =>
      `„${ime}" влезе като нова стая: ${w} × ${d} м, с мебелта си. Отметната е като готова.`,
    zamenena: (ime: string, w: string, d: string) =>
      `„${ime}" е заменена с проекта: ${w} × ${d} м, с мебелта си. Отметната е като готова.`,
    palno: 'Жилището е пълно — махнете помещение, за да влезе ново.',
    linkKopiran: 'Линкът към жилището е копиран.',
    kopiraneNe: 'Копирането не стана. Вземете адреса от лентата горе.',
    neSePobira: (ime: string, w: string, d: string) =>
      `Мебелта в „${ime}" не се побира в ${w} × ${d} м. За по-малка стая махнете шкаф от проекта ѝ.`,
    kraya: (posoka: string) => `${posoka} няма накъде — това е краят на жилището.`,
    posoka: { up: 'Нагоре', down: 'Надолу', left: 'Наляво', right: 'Надясно' },
    posokaMalko: { up: 'нагоре', down: 'надолу', left: 'наляво', right: 'надясно' },
    tuk: (ime: string, kv: string) => `${ime}, ${kv} квадрата.`,
    promenete: (ime: string) => `Променете ${ime}`,
    obzavedete: (ime: string) => `Обзаведете ${ime}`,
    dobavete: 'Добавете помещение',
    broi: (n: number, max: number, plosht: string) =>
      `${n} от ${max} помещения · ${plosht} м² общо`,
    obzavedeni: (done: number, total: number) =>
      `Обзаведени: ${done} от ${total}${done === total ? ' — цялото жилище е готово' : ''}`,
    linkatEKopiran: 'Линкът е копиран',
    kopiraiLink: 'Копирайте линк към жилището',
    linkatNosi:
      'Линкът носи целия чертеж и обзаведените стаи. Отваря се на друго устройство и може да се прати на нас.',
    spisak: {
      zaglavie: 'Списък за цеха',
      nishto: 'Обзаведете поне една стая и списъкът става за сваляне.',
      edna: 'Една обзаведена стая в един файл, с общ разкрой.',
      mnogo: (n: number) => `Всички ${n} обзаведени стаи в един файл, с общ разкрой.`,
      pdf: 'Свалете списък за цеха (PDF)',
      pdfPod: 'Корица със сбора, после чертеж на всяка стена.',
      xlsx: 'Свалете таблица за цеха (XLSX)',
      xlsxPod: 'Разкрой, заявка по шкафове и легенда на позициите.',
      chaka: 'Сглобява се…',
      ne: 'Файлът не се получи.',
      greshka: (kod: number) => `Грешка ${kod}`,
      neEOferta: 'Това не е оферта. Точната цена следва след измерване на място.',
    },
    hodene: 'Ходене',
    natisnete: 'Натиснете стрелка, за да минете в съседната стая.',
    tazi: 'Тази стая',
    ime: 'Име',
    vid: 'Вид',
    shirina: 'Ширина',
    dalbochina: 'Дълбочина',
    granichi: (s: string) => `граничи с ${s}`,
    negranichi: 'не граничи с нищо — долепете я до друга стая',
    gotovaE: 'Готова е. Отворете я пак, за да я промените.',
    oshteNe: 'Още не е обзаведена. Бутонът е долу вдясно.',
    nezavarshena: 'Отметнете я като незавършена',
    nyamaPravila: (vid: string) =>
      `За ${vid} още нямаме правила за мебел. Влиза в плана, за да са верни размерите на съседните стаи.`,
    iztriite: (ime: string) => `Изтрийте ${ime} от чертежа`,
    dveNaEdno: (spisak: string) =>
      `Две помещения стоят на едно място: ${spisak}. Разделете ги — жилището не се строи така.`,
    i: (a: string, b: string) => `${a} и ${b}`,
    otmeni: 'Отмени',
    povtori: 'Повтори',
    otnachalo: 'Отначало',
    idi: (posoka: string) => `Иди ${posoka}`,

    lenta: {
      etiket: 'Действия върху маркираните помещения',
      izberete: 'Изберете помещение',
      broi: (n: number) => (n === 1 ? '1 помещение' : `${n} помещения`),
      kopirai: 'Копирай',
      iztrii: 'Изтрий',
    },

    plan: {
      etiket: (n: number) => `План на жилището — ${n} помещения`,
      staya: (
        ime: string,
        w: string,
        d: string,
        kv: string,
        done: boolean,
        mozhe: boolean,
        tuk: boolean,
      ) =>
        `${ime}, ${w} на ${d} метра, ${kv} квадрата` +
        (done ? ', обзаведена' : mozhe ? ', може да се обзаведе' : '') +
        (tuk ? '. Тук сте. Стрелките водят в съседна стая.' : ''),
      opanete: (ime: string) => `Опънете ${ime}. Стрелките менят размера.`,
    },

    maket: {
      prazno: 'Още няма нито едно помещение. Добавете първото отдясно.',
      etiket: (ime: string, shtrak: boolean) =>
        `Макет на жилището. Сега сте в: ${ime}.` +
        (shtrak ? ' Щракнете по помещение, за да отидете в него.' : ''),
      otgore: 'Макет на жилището отгоре.',
      tukSte: (ime: string, vid: string | null) => `Тук сте: ${ime}${vid ? ` (${vid})` : ''}`,
      izberete: 'Изберете стая от плана',
      zidove: 'Зидовете са снижени, за да се вижда вътре. Готовите стаи са с мебелта си.',
      shtraknete: ' Щракнете по помещение, за да отидете в него.',
    },
  },

  en: {
    zaglavie: 'Draw your home',
    vavedenie:
      'Place the rooms next to each other as they are in your home. Drag them, stretch them by the bottom-right corner — they snap together. The arrow keys take you from room to room.',
    otLink: (n: number) => `Opened a home from a link: ${n} rooms.`,
    gotova: 'The room is done and ticked off on the plan.',
    vlezeNova: (ime: string, w: string, d: string) =>
      `“${ime}” was added as a new room: ${w} × ${d} m, with its furniture. It is ticked off as done.`,
    zamenena: (ime: string, w: string, d: string) =>
      `“${ime}” was replaced with the design: ${w} × ${d} m, with its furniture. It is ticked off as done.`,
    palno: 'The home is full — remove a room to add a new one.',
    linkKopiran: 'The link to your home has been copied.',
    kopiraneNe: 'Copying didn’t work. Take the address from the bar at the top.',
    neSePobira: (ime: string, w: string, d: string) =>
      `The furniture in “${ime}” does not fit in ${w} × ${d} m. For a smaller room, remove a cabinet from its design.`,
    kraya: (posoka: string) => `There is nowhere to go ${posoka} — this is the edge of the home.`,
    posoka: { up: 'up', down: 'down', left: 'left', right: 'right' },
    posokaMalko: { up: 'up', down: 'down', left: 'left', right: 'right' },
    tuk: (ime: string, kv: string) => `${ime}, ${kv} square metres.`,
    promenete: (ime: string) => `Change ${ime}`,
    obzavedete: (ime: string) => `Furnish ${ime}`,
    dobavete: 'Add a room',
    broi: (n: number, max: number, plosht: string) =>
      `${n} of ${max} rooms · ${plosht} m² in total`,
    obzavedeni: (done: number, total: number) =>
      `Furnished: ${done} of ${total}${done === total ? ' — the whole home is done' : ''}`,
    linkatEKopiran: 'Link copied',
    kopiraiLink: 'Copy a link to your home',
    linkatNosi:
      'The link carries the whole plan and the furnished rooms. It opens on another device and can be sent to us.',
    spisak: {
      zaglavie: 'Workshop list',
      nishto: 'Furnish at least one room and the list becomes downloadable.',
      edna: 'One furnished room in a single file, cut as one job.',
      mnogo: (n: number) => `All ${n} furnished rooms in a single file, cut as one job.`,
      pdf: 'Download the workshop list (PDF)',
      pdfPod: 'A cover with the totals, then a drawing of every wall.',
      xlsx: 'Download the workshop table (XLSX)',
      xlsxPod: 'Cutting list, cabinet order and a legend of the positions.',
      chaka: 'Assembling…',
      ne: 'The file did not come through.',
      greshka: (kod: number) => `Error ${kod}`,
      neEOferta: 'This is not a quote. The exact price follows an on-site measurement.',
    },
    hodene: 'Walking',
    natisnete: 'Press an arrow to move into the next room.',
    tazi: 'This room',
    ime: 'Name',
    vid: 'Type',
    shirina: 'Width',
    dalbochina: 'Depth',
    granichi: (s: string) => `next to ${s}`,
    negranichi: 'not next to anything — attach it to another room',
    gotovaE: 'It is done. Open it again to change it.',
    oshteNe: 'Not furnished yet. The button is at the bottom right.',
    nezavarshena: 'Mark it as not done',
    nyamaPravila: (vid: string) =>
      `We don’t have furniture rules for a ${vid} yet. It stays on the plan so the sizes of the neighbouring rooms are right.`,
    iztriite: (ime: string) => `Delete ${ime} from the plan`,
    dveNaEdno: (spisak: string) =>
      `Two rooms are in the same place: ${spisak}. Separate them — a home isn’t built like that.`,
    i: (a: string, b: string) => `${a} and ${b}`,
    otmeni: 'Undo',
    povtori: 'Redo',
    otnachalo: 'Start over',
    idi: (posoka: string) => `Go ${posoka}`,

    lenta: {
      etiket: 'Actions on the selected rooms',
      izberete: 'Select a room',
      broi: (n: number) => (n === 1 ? '1 room' : `${n} rooms`),
      kopirai: 'Duplicate',
      iztrii: 'Delete',
    },

    plan: {
      etiket: (n: number) => `Plan of the home — ${n} rooms`,
      staya: (
        ime: string,
        w: string,
        d: string,
        kv: string,
        done: boolean,
        mozhe: boolean,
        tuk: boolean,
      ) =>
        `${ime}, ${w} by ${d} metres, ${kv} square metres` +
        (done ? ', furnished' : mozhe ? ', can be furnished' : '') +
        (tuk ? '. You are here. The arrow keys lead to the next room.' : ''),
      opanete: (ime: string) => `Stretch ${ime}. The arrow keys change the size.`,
    },

    maket: {
      prazno: 'There are no rooms yet. Add the first one on the right.',
      etiket: (ime: string, shtrak: boolean) =>
        `Model of the home. You are in: ${ime}.` + (shtrak ? ' Click a room to go into it.' : ''),
      otgore: 'Model of the home from above.',
      tukSte: (ime: string, vid: string | null) => `You are here: ${ime}${vid ? ` (${vid})` : ''}`,
      izberete: 'Choose a room on the plan',
      zidove: 'The walls are lowered so you can see inside. Finished rooms show their furniture.',
      shtraknete: ' Click a room to go into it.',
    },
  },

  zh: {
    zaglavie: '画出您的住宅',
    vavedenie:
      '按实际情况把房间一个挨一个放好。拖动它们，或拖住右下角拉伸——它们会自动吸附。方向键带您从一个房间走到另一个房间。',
    otLink: (n: number) => `已从链接打开住宅：${n} 个房间。`,
    gotova: '房间已完成，并在平面图上打勾。',
    vlezeNova: (ime: string, w: string, d: string) =>
      `“${ime}”已作为新房间加入：${w} × ${d} m，连同家具。已标记为完成。`,
    zamenena: (ime: string, w: string, d: string) =>
      `“${ime}”已替换为该设计：${w} × ${d} m，连同家具。已标记为完成。`,
    palno: '住宅已满——请先移除一个房间再添加。',
    linkKopiran: '住宅链接已复制。',
    kopiraneNe: '复制失败。请从顶部地址栏获取链接。',
    neSePobira: (ime: string, w: string, d: string) =>
      `“${ime}”里的家具放不进 ${w} × ${d} m。如需缩小房间，请从设计中移除一个柜子。`,
    kraya: (posoka: string) => `${posoka}没有路了——这是住宅的尽头。`,
    posoka: { up: '向上', down: '向下', left: '向左', right: '向右' },
    posokaMalko: { up: '向上', down: '向下', left: '向左', right: '向右' },
    tuk: (ime: string, kv: string) => `${ime}，${kv} 平方米。`,
    promenete: (ime: string) => `修改${ime}`,
    obzavedete: (ime: string) => `布置${ime}`,
    dobavete: '添加房间',
    broi: (n: number, max: number, plosht: string) => `${n} / ${max} 个房间 · 共 ${plosht} m²`,
    obzavedeni: (done: number, total: number) =>
      `已布置：${done} / ${total}${done === total ? '——整套住宅已完成' : ''}`,
    linkatEKopiran: '链接已复制',
    kopiraiLink: '复制住宅链接',
    linkatNosi: '链接包含整张平面图和已布置的房间。可在其他设备上打开，也可以发给我们。',
    spisak: {
      zaglavie: '工厂清单',
      nishto: '至少布置一个房间，清单即可下载。',
      edna: '一个已布置的房间，一份文件，统一开料。',
      mnogo: (n: number) => `全部 ${n} 个已布置的房间，一份文件，统一开料。`,
      pdf: '下载工厂清单（PDF）',
      pdfPod: '首页为汇总，随后是每面墙的图纸。',
      xlsx: '下载工厂表格（XLSX）',
      xlsxPod: '开料单、柜体订单和位号对照表。',
      chaka: '正在生成…',
      ne: '文件未能生成。',
      greshka: (kod: number) => `错误 ${kod}`,
      neEOferta: '此非报价。确切价格以现场测量为准。',
    },
    hodene: '漫游',
    natisnete: '按方向键进入相邻的房间。',
    tazi: '当前房间',
    ime: '名称',
    vid: '类型',
    shirina: '宽度',
    dalbochina: '进深',
    granichi: (s: string) => `与${s}相邻`,
    negranichi: '没有相邻的房间——请把它贴到另一个房间旁',
    gotovaE: '已完成。再次打开即可修改。',
    oshteNe: '尚未布置。按钮在右下角。',
    nezavarshena: '标记为未完成',
    nyamaPravila: (vid: string) =>
      `我们还没有${vid}的家具规则。它保留在平面图中，以确保相邻房间的尺寸正确。`,
    iztriite: (ime: string) => `从平面图中删除${ime}`,
    dveNaEdno: (spisak: string) => `两个房间重叠了：${spisak}。请把它们分开——住宅不能这样建。`,
    i: (a: string, b: string) => `${a}和${b}`,
    otmeni: '撤销',
    povtori: '重做',
    otnachalo: '重新开始',
    idi: (posoka: string) => `${posoka}走`,

    lenta: {
      etiket: '对所选房间的操作',
      izberete: '请选择房间',
      broi: (n: number) => `${n} 个房间`,
      kopirai: '复制',
      iztrii: '删除',
    },

    plan: {
      etiket: (n: number) => `住宅平面图——${n} 个房间`,
      staya: (
        ime: string,
        w: string,
        d: string,
        kv: string,
        done: boolean,
        mozhe: boolean,
        tuk: boolean,
      ) =>
        `${ime}，${w} × ${d} 米，${kv} 平方米` +
        (done ? '，已布置' : mozhe ? '，可以布置' : '') +
        (tuk ? '。您在这里。方向键可进入相邻房间。' : ''),
      opanete: (ime: string) => `拉伸${ime}。方向键调整尺寸。`,
    },

    maket: {
      prazno: '还没有任何房间。请在右侧添加第一个。',
      etiket: (ime: string, shtrak: boolean) =>
        `住宅模型。您当前在：${ime}。` + (shtrak ? '单击房间即可进入。' : ''),
      otgore: '住宅俯视模型。',
      tukSte: (ime: string, vid: string | null) => `您在这里：${ime}${vid ? `（${vid}）` : ''}`,
      izberete: '请在平面图中选择房间',
      zidove: '墙体已降低，便于看到内部。已完成的房间会显示家具。',
      shtraknete: '单击房间即可进入。',
    },
  },
});
