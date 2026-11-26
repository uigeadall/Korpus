/**
 * Речникът на имената: модулите, материалите, покритията, стаите.
 *
 * Тези имена живеят в правилата (`lib/`, `config/`) на български и
 * пътуват в линковете и в разбивката за цеха — там са ключ, не текст.
 * Затова правилата не се пипат: каквото се показва на човека, минава
 * през `prevedi()` на път към екрана.
 *
 * Тест (`rechnik.test.ts`) пази всяко име от каталозите да има превод.
 * Име, което липсва, излиза на български — личи си, но нищо не чупи.
 */

import type { Ezik } from './ezik';

type Prevod = { en: string; zh: string };

const R: Record<string, Prevod> = {
  /* --- Стаи ----------------------------------------------------------- */
  Кухня: { en: 'Kitchen', zh: '厨房' },
  Спалня: { en: 'Bedroom', zh: '卧室' },
  Всекидневна: { en: 'Living room', zh: '客厅' },
  Баня: { en: 'Bathroom', zh: '浴室' },
  Коридор: { en: 'Corridor', zh: '走廊' },
  Антре: { en: 'Entrance hall', zh: '玄关' },
  Стая: { en: 'Room', zh: '房间' },
  Гардероб: { en: 'Wardrobe', zh: '衣柜' },

  /* --- Стени, врати, посоки -------------------------------------------- */
  Горна: { en: 'Top', zh: '上' },
  Дясна: { en: 'Right', zh: '右' },
  Долна: { en: 'Bottom', zh: '下' },
  Лява: { en: 'Left', zh: '左' },
  Отляво: { en: 'Left', zh: '左侧' },
  Отдясно: { en: 'Right', zh: '右侧' },
  Навътре: { en: 'Inward', zh: '向内' },
  Навън: { en: 'Outward', zh: '向外' },
  Врата: { en: 'Door', zh: '门' },
  Прозорец: { en: 'Window', zh: '窗' },
  Ъгъл: { en: 'Corner', zh: '转角' },
  нагоре: { en: 'up', zh: '向上' },
  надолу: { en: 'down', zh: '向下' },
  наляво: { en: 'left', zh: '向左' },
  надясно: { en: 'right', zh: '向右' },

  /* --- Модули ------------------------------------------------------------ */
  'Колона за хладилник': { en: 'Fridge column', zh: '冰箱高柜' },
  'Долен с врата': { en: 'Base unit with door', zh: '单门地柜' },
  'Долен с 3 чекмеджета': { en: 'Base unit, 3 drawers', zh: '三抽地柜' },
  'Шкаф за мивка': { en: 'Sink unit', zh: '水槽柜' },
  'Шкаф за фурна': { en: 'Oven unit', zh: '烤箱柜' },
  'Панел за вградена съдомиялна': { en: 'Integrated dishwasher panel', zh: '嵌入式洗碗机门板' },
  'Свободна ниша': { en: 'Free niche', zh: '空位' },
  'Горен шкаф': { en: 'Wall unit', zh: '吊柜' },
  'Горен над аспиратор': { en: 'Wall unit above extractor', zh: '油烟机上方吊柜' },
  'Празно (прозорец)': { en: 'Empty (window)', zh: '留空（窗户）' },
  'Гардероб с лост': { en: 'Wardrobe with rail', zh: '挂衣杆衣柜' },
  'Гардероб с рафтове': { en: 'Wardrobe with shelves', zh: '层板衣柜' },
  'Скрин с чекмеджета': { en: 'Chest of drawers', zh: '斗柜' },
  'Отворена секция': { en: 'Open section', zh: '开放格' },
  Антресол: { en: 'Top box', zh: '顶柜' },
  'Свободно място': { en: 'Free space', zh: '空位' },
  'ТВ шкаф с чекмеджета': { en: 'TV unit with drawers', zh: '带抽屉电视柜' },
  'Нисък шкаф с врата': { en: 'Low cabinet with door', zh: '单门矮柜' },
  Библиотека: { en: 'Bookcase', zh: '书柜' },
  'Стенен шкаф': { en: 'Wall cabinet', zh: '墙柜' },
  'Стенен рафт': { en: 'Wall shelf', zh: '墙面搁板' },
  'Шкаф с мивка': { en: 'Vanity unit', zh: '台盆柜' },
  'Шкаф с чекмеджета': { en: 'Drawer unit', zh: '抽屉柜' },
  'Колона за баня': { en: 'Bathroom tall unit', zh: '浴室高柜' },
  'Ниша за пералня': { en: 'Washing machine niche', zh: '洗衣机位' },
  'Огледален шкаф': { en: 'Mirror cabinet', zh: '镜柜' },
  'Отворен рафт': { en: 'Open shelf', zh: '开放搁板' },
  'Шкаф за връхни дрехи': { en: 'Coat cupboard', zh: '外套柜' },
  'Шкаф за обувки': { en: 'Shoe cabinet', zh: '鞋柜' },
  'Закачалка с рафт': { en: 'Coat rack with shelf', zh: '带搁板挂衣架' },
  'Пейка за събуване': { en: 'Shoe bench', zh: '换鞋凳' },

  /* --- Редове ------------------------------------------------------------ */
  'Долен ред': { en: 'Base row', zh: '下排柜' },
  'Горен ред': { en: 'Upper row', zh: '上排柜' },
  'Стенен ред': { en: 'Wall row', zh: '墙面柜' },
  'Над мивката': { en: 'Above the sink', zh: '台盆上方' },
  Шкафове: { en: 'Cabinets', zh: '柜子' },

  /* --- Обков и детайли --------------------------------------------------- */
  'Алуминиев C-профил': { en: 'Aluminium C-profile', zh: '铝制 C 型拉手' },
  'Алуминиев L-профил': { en: 'Aluminium L-profile', zh: '铝制 L 型拉手' },
  Бленда: { en: 'Filler panel', zh: '封板' },
  Дръжки: { en: 'Handles', zh: '拉手' },
  Клапа: { en: 'Flap', zh: '翻门' },
  Крака: { en: 'Legs', zh: '柜脚' },
  'Лост за гардероб': { en: 'Wardrobe rail', zh: '挂衣杆' },
  'Механизъм за чекмедже': { en: 'Drawer runners', zh: '抽屉滑轨' },
  Окачвачи: { en: 'Cabinet hangers', zh: '吊码' },
  'Панел съдомиялна': { en: 'Dishwasher panel', zh: '洗碗机门板' },
  'Панти с плавно затваряне': { en: 'Soft-close hinges', zh: '阻尼铰链' },
  Плот: { en: 'Worktop', zh: '台面' },
  'Подемен механизъм': { en: 'Lift-up mechanism', zh: '上翻支撑' },
  'Рафт над нишата': { en: 'Shelf above the niche', zh: '空位上方层板' },
  'Фиксиран рафт под фурната': { en: 'Fixed shelf under the oven', zh: '烤箱下固定层板' },
  Цокъл: { en: 'Plinth', zh: '踢脚板' },
  Чело: { en: 'Drawer front', zh: '抽面' },

  /* --- Обзавеждане (готови изделия) -------------------------------------- */
  'Маса за хранене': { en: 'Dining table', zh: '餐桌' },
  Стол: { en: 'Chair', zh: '椅子' },
  Диван: { en: 'Sofa', zh: '沙发' },
  Фотьойл: { en: 'Armchair', zh: '扶手椅' },
  'Холна маса': { en: 'Coffee table', zh: '茶几' },
  Легло: { en: 'Bed', zh: '床' },
  'Нощно шкафче': { en: 'Bedside table', zh: '床头柜' },

  /* --- Материали ---------------------------------------------------------- */
  Бял: { en: 'White', zh: '白色' },
  'Светъл дъб': { en: 'Light oak', zh: '浅橡木' },
  'Светло сив': { en: 'Light grey', zh: '浅灰' },
  Антрацит: { en: 'Anthracite', zh: '炭灰' },
  'RAL 9010 чисто бяло': { en: 'RAL 9010 pure white', zh: 'RAL 9010 纯白' },
  'RAL 9001 кремаво': { en: 'RAL 9001 cream', zh: 'RAL 9001 奶油白' },
  'RAL 7035 светло сиво': { en: 'RAL 7035 light grey', zh: 'RAL 7035 浅灰' },
  'RAL 7016 антрацит': { en: 'RAL 7016 anthracite', zh: 'RAL 7016 炭灰' },
  'RAL 6013 тръстика': { en: 'RAL 6013 reed green', zh: 'RAL 6013 芦苇绿' },
  'RAL 5008 сиво синьо': { en: 'RAL 5008 grey blue', zh: 'RAL 5008 灰蓝' },
  'МДФ боядисан': { en: 'Painted MDF', zh: '烤漆 MDF' },
  'МДФ фрезован': { en: 'Routed MDF', zh: '雕刻 MDF' },
  'ПДЧ декор': { en: 'Decor chipboard', zh: '饰面刨花板' },
  'гладък, без кант': { en: 'smooth, no edging', zh: '平板，无封边' },
  'рамка, боядисан': { en: 'frame, painted', zh: '框式，烤漆' },
  'кант 2 мм по 4-те страни': { en: '2 mm edging on all 4 sides', zh: '四边 2 mm 封边' },
  'Ламиниран 38 мм': { en: 'Laminate 38 mm', zh: '防火板 38 mm' },
  'Кварц 20 мм': { en: 'Quartz 20 mm', zh: '石英石 20 mm' },
  'Синтерован 12 мм': { en: 'Sintered stone 12 mm', zh: '岩板 12 mm' },
  'Гранит 30 мм': { en: 'Granite 30 mm', zh: '花岗岩 30 mm' },
  'Push-to-open': { en: 'Push-to-open', zh: '按压反弹' },
  'Алуминиев профил': { en: 'Aluminium profile', zh: '铝型材拉手' },
  'без дръжки': { en: 'handleless', zh: '无拉手' },
  'Метален борд': { en: 'Metal-sided drawer', zh: '金属抽' },
  'Сферични водачи': { en: 'Ball-bearing runners', zh: '钢珠滑轨' },

  /* --- Стени: групи -------------------------------------------------------- */
  Боя: { en: 'Paint', zh: '涂料' },
  Мазилка: { en: 'Plaster', zh: '灰泥' },
  Бетон: { en: 'Concrete', zh: '混凝土' },
  Тухла: { en: 'Brick', zh: '砖' },
  Камък: { en: 'Stone', zh: '石材' },
  Плочки: { en: 'Tiles', zh: '瓷砖' },
  Мозайка: { en: 'Mosaic', zh: '马赛克' },
  Мрамор: { en: 'Marble', zh: '大理石' },
  Дърво: { en: 'Wood', zh: '木材' },
  Ламинат: { en: 'Laminate', zh: '复合板' },
  Тапет: { en: 'Wallpaper', zh: '壁纸' },
  Панели: { en: 'Panels', zh: '墙板' },

  /* --- Стени: покрития ----------------------------------------------------- */
  'Топло бяло': { en: 'Warm white', zh: '暖白' },
  Грейж: { en: 'Greige', zh: '灰米色' },
  'Перлено сиво': { en: 'Pearl grey', zh: '珍珠灰' },
  'Декоративна мазилка бяла': { en: 'White decorative plaster', zh: '白色装饰灰泥' },
  'Венецианска мазилка пясъчна': { en: 'Sand Venetian plaster', zh: '沙色威尼斯灰泥' },
  'Микроцимент сив': { en: 'Grey microcement', zh: '灰色微水泥' },
  'Кофражен бетон светъл': { en: 'Light board-formed concrete', zh: '浅色清水混凝土' },
  'Кофражен бетон среден': { en: 'Medium board-formed concrete', zh: '中灰清水混凝土' },
  'Шлайфан бетон светъл': { en: 'Light polished concrete', zh: '浅色抛光混凝土' },
  'Червена тухла': { en: 'Red brick', zh: '红砖' },
  'Боядисана бяла тухла': { en: 'Painted white brick', zh: '白漆砖' },
  'Стара тухла': { en: 'Reclaimed brick', zh: '老砖' },
  Травертин: { en: 'Travertine', zh: '洞石' },
  Пясъчник: { en: 'Sandstone', zh: '砂岩' },
  'Шисти на ивици': { en: 'Slate strips', zh: '条形板岩' },
  'Метро плочки бели': { en: 'White metro tiles', zh: '白色地铁砖' },
  'Зелиж бели': { en: 'White zellige', zh: '白色摩洛哥手工砖' },
  'Плочки 60×30 грейж': { en: 'Greige tiles 60×30', zh: '60×30 灰米色瓷砖' },
  'Мозайка бяла': { en: 'White mosaic', zh: '白色马赛克' },
  'Мозайка сива': { en: 'Grey mosaic', zh: '灰色马赛克' },
  'Мозайка басейн': { en: 'Pool mosaic', zh: '泳池马赛克' },
  'Мрамор Карара': { en: 'Carrara marble', zh: '卡拉拉大理石' },
  'Мрамор Калаката': { en: 'Calacatta marble', zh: '卡拉卡塔大理石' },
  'Мрамор Неро Маркина': { en: 'Nero Marquina marble', zh: '黑白根大理石' },
  'Дъб, ламели': { en: 'Oak slats', zh: '橡木格栅' },
  'Орех, ламели': { en: 'Walnut slats', zh: '胡桃木格栅' },
  'Дъб, хоризонтална обшивка': { en: 'Oak, horizontal cladding', zh: '橡木横向护墙板' },
  'Ламинат натурален дъб': { en: 'Laminate, natural oak', zh: '天然橡木复合板' },
  'Ламинат сив дъб': { en: 'Laminate, grey oak', zh: '灰橡木复合板' },
  'Ламинат скандинавски дъб': { en: 'Laminate, Scandinavian oak', zh: '北欧橡木复合板' },
  'Ламинат тъмен орех': { en: 'Laminate, dark walnut', zh: '深胡桃木复合板' },
  'Тапет: дамаска кремава': { en: 'Wallpaper: cream damask', zh: '壁纸：奶油色大马士革纹' },
  'Тапет: ивици бяло и сиво': { en: 'Wallpaper: white and grey stripes', zh: '壁纸：白灰条纹' },
  'Тапет: листа зелени на кремаво': {
    en: 'Wallpaper: green leaves on cream',
    zh: '壁纸：奶油底绿叶',
  },
  'Ламперия бяла': { en: 'White tongue-and-groove panelling', zh: '白色企口护墙板' },
  'Ребрест панел дъб': { en: 'Fluted oak panel', zh: '橡木凹槽板' },
  'Обемни панели бели': { en: 'White 3D panels', zh: '白色立体墙板' },

  /* --- Подове -------------------------------------------------------------- */
  Паркет: { en: 'Parquet', zh: '实木地板' },
  Килим: { en: 'Carpet', zh: '地毯' },
  'Паркет на ленти, светъл дъб': { en: 'Plank parquet, light oak', zh: '浅橡木条形实木地板' },
  'Паркет рибена кост, дъб': { en: 'Herringbone parquet, oak', zh: '橡木人字拼地板' },
  'Паркет рибена кост, орех': { en: 'Herringbone parquet, walnut', zh: '胡桃木人字拼地板' },
  'Килим бежов': { en: 'Beige carpet', zh: '米色地毯' },
  'Килим сив': { en: 'Grey carpet', zh: '灰色地毯' },
  'Килим тъмносин': { en: 'Navy carpet', zh: '深蓝地毯' },

  /* --- Цена: групи и мерни единици ----------------------------------------- */
  Материали: { en: 'Materials', zh: '材料' },
  Фасади: { en: 'Fronts', zh: '门板' },
  Обков: { en: 'Hardware', zh: '五金' },
  Изработка: { en: 'Workmanship', zh: '加工' },
  Монтаж: { en: 'Installation', zh: '安装' },
  Доставка: { en: 'Delivery', zh: '配送' },
  'бр.': { en: 'pcs', zh: '件' },
  м: { en: 'm', zh: 'm' },
  'м²': { en: 'm²', zh: 'm²' },
  мм: { en: 'mm', zh: 'mm' },
  'компл.': { en: 'sets', zh: '套' },
  плочи: { en: 'boards', zh: '张板' },
  шкафа: { en: 'cabinets', zh: '个柜' },
  проект: { en: 'project', zh: '项' },

  /* --- Съобщения на правилата ---------------------------------------------- */
  'Стената не стига за съдомиялната — махнахме я.': {
    en: 'The wall is too short for the dishwasher — we left it out.',
    zh: '墙不够长，放不下洗碗机——已去掉。',
  },
  'Стената не стига за фурната — махнахме я.': {
    en: 'The wall is too short for the oven — we left it out.',
    zh: '墙不够长，放不下烤箱——已去掉。',
  },
  'Стената не стига за колоната за хладилник — махнахме я.': {
    en: 'The wall is too short for the fridge column — we left it out.',
    zh: '墙不够长，放不下冰箱高柜——已去掉。',
  },
  'Аспираторът иска горен шкаф над себе си — без горен ред отпада.': {
    en: 'The extractor needs a wall unit above it — without an upper row it is left out.',
    zh: '油烟机上方需要吊柜——没有上排柜就无法安装。',
  },
  'Стената не стига за скрин с чекмеджета — махнахме го.': {
    en: 'The wall is too short for a chest of drawers — we left it out.',
    zh: '墙不够长，放不下斗柜——已去掉。',
  },
  'Стената не стига за отворена секция — махнахме я.': {
    en: 'The wall is too short for an open section — we left it out.',
    zh: '墙不够长，放不下开放格——已去掉。',
  },
  'Стената не стига за библиотека — махнахме я.': {
    en: 'The wall is too short for a bookcase — we left it out.',
    zh: '墙不够长，放不下书柜——已去掉。',
  },
  'Стената не стига за ТВ шкаф — махнахме го.': {
    en: 'The wall is too short for a TV unit — we left it out.',
    zh: '墙不够长，放不下电视柜——已去掉。',
  },
  'Стената не стига за шкаф с мивка.': {
    en: 'The wall is too short for a vanity unit.',
    zh: '墙不够长，放不下台盆柜。',
  },
  'Не остана ниша за пералня — махнахме я.': {
    en: 'There was no room left for a washing machine niche — we left it out.',
    zh: '没有空间留给洗衣机位——已去掉。',
  },
  'Не остана място за колона — махнахме я.': {
    en: 'There was no room left for a tall unit — we left it out.',
    zh: '没有空间放高柜——已去掉。',
  },
  'Стената не стига за шкаф за връхни дрехи.': {
    en: 'The wall is too short for a coat cupboard.',
    zh: '墙不够长，放不下外套柜。',
  },
  'Не остана място за закачалка — махнахме я.': {
    en: 'There was no room left for a coat rack — we left it out.',
    zh: '没有空间放挂衣架——已去掉。',
  },
  'Не остана място за шкаф за обувки — махнахме го.': {
    en: 'There was no room left for a shoe cabinet — we left it out.',
    zh: '没有空间放鞋柜——已去掉。',
  },
  'Не остана място за пейка — махнахме я.': {
    en: 'There was no room left for a bench — we left it out.',
    zh: '没有空间放换鞋凳——已去掉。',
  },
  'Няма място на стената — махнете или стеснете шкаф, за да влезе още.': {
    en: 'There is no room left on the wall — remove or narrow a cabinet to fit another one.',
    zh: '墙上没有空间了——请移除或缩窄一个柜子再添加。',
  },
};

/** Името на езика на страницата. Непознато име се връща както е дошло. */
export function prevedi(bg: string, ezik: Ezik): string {
  if (ezik === 'bg') return bg;
  return R[bg]?.[ezik] ?? bg;
}

/** Има ли превод — за теста, който пази каталозите. */
export function imaPrevod(bg: string): boolean {
  return bg in R;
}

/**
 * Номерът на шкаф, както е на чертежа: `Д2`, `Г5`. На другите езици
 * буквата се пише на латиница (`D2`, `G5`) — същият номер като в
 * разбивката за цеха, само прочетен.
 */
const LATINICA: Record<string, string> = {
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Е: 'E',
  Ж: 'Zh',
  З: 'Z',
  И: 'I',
  Й: 'Y',
  К: 'K',
  Л: 'L',
  М: 'M',
  Н: 'N',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  У: 'U',
  Ф: 'F',
  Х: 'H',
  Ц: 'Ts',
  Ч: 'Ch',
  Ш: 'Sh',
  Щ: 'Sht',
  Ъ: 'A',
  Ю: 'Yu',
  Я: 'Ya',
};

export function kod(code: string, ezik: Ezik): string {
  if (ezik === 'bg') return code;
  return code.replace(/[А-Я]/g, (b) => LATINICA[b] ?? b);
}
