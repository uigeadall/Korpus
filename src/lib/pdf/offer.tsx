/**
 * PDF за клиента: чертеж, модули, материали и задължителният текст,
 * че това не е оферта.
 */

import path from 'node:path';
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import {
  FACADE_LABEL,
  type Kitchen,
  type KitchenResult,
  MODULES,
  OPENING_LABEL,
  DRAWER_SYSTEM_LABEL,
  WALL_SIDE_LABEL,
  WORKTOP_LABEL,
  kitchenWallOpenings,
  kitchenRoom,
  wallSide,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import { brand } from '@/config/brand';
import { PdfDrawing } from './drawing';

export { offerFileName } from './names';

/** Текстът е задължителен по SPEC 5.1 и 10.10. */
export const DISCLAIMER =
  'Това не е оферта. Точната цена следва след измерване на място.';

let fontsReady = false;

/** Шрифтовете се вграждат — иначе кирилицата изпада. */
function registerFonts(): void {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), 'src', 'assets', 'fonts');
  Font.register({ family: 'Korpus', src: path.join(dir, 'Onest-var.ttf') });
  Font.register({ family: 'KorpusMono', src: path.join(dir, 'JetBrainsMono-var.ttf') });
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const INK = '#1c1d1f';
const BRASS = '#9a7636';
const MUTED = '#6b6e74';
const BORDER = '#e2dfd7';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Korpus',
    fontSize: 9,
    color: INK,
    paddingTop: 30,
    paddingBottom: 34,
    paddingHorizontal: 34,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 0.7,
    borderBottomColor: BORDER,
    paddingBottom: 8,
    marginBottom: 14,
  },
  brand: { fontSize: 16 },
  tagline: { fontSize: 8, color: MUTED, marginTop: 2 },
  meta: { fontSize: 8, color: BRASS, fontFamily: 'KorpusMono', textAlign: 'right' },
  body: { flexDirection: 'row', gap: 18 },
  drawing: { width: 520 },
  side: { width: 236 },
  block: { marginBottom: 12 },
  caption: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2.5,
    borderBottomWidth: 0.4,
    borderBottomColor: BORDER,
    fontSize: 8,
  },
  code: { fontFamily: 'KorpusMono', color: BRASS, width: 22, flexShrink: 0 },
  label: { flex: 1, paddingRight: 6 },
  value: { fontFamily: 'KorpusMono', flexShrink: 0, textAlign: 'right' },
  footer: {
    marginTop: 'auto',
    paddingTop: 8,
    borderTopWidth: 0.7,
    borderTopColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  disclaimer: { fontSize: 8, color: MUTED, maxWidth: 360 },
  contacts: { fontSize: 8, color: MUTED, textAlign: 'right' },
});

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={[s.label, { color: MUTED }]}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

export function OfferDocument({
  kitchen,
  result,
  date = new Date(),
}: {
  kitchen: Kitchen;
  result: KitchenResult;
  date?: Date;
}) {
  const m = kitchen.materials;
  const summary = result.summary;
  const room = kitchenRoom(kitchen);

  return (
    <Document title={`${brand.name} — конфигурация на кухня`} author={brand.name}>
      {/* Всяка стена е на отделна страница — чертежът трябва да е едър. */}
      {kitchen.walls.map((wall, i) => {
        const placed = result.placed[i];
        const named = [...placed.base, ...placed.upper].filter((x) => x.code);
        const side = WALL_SIDE_LABEL[wallSide(wall, i)].toLowerCase();

        return (
      <Page key={wall.id ?? i} size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{brand.name}</Text>
            <Text style={s.tagline}>{brand.tagline}</Text>
          </View>
          <View>
            <Text style={s.meta}>
              {kitchen.walls.length > 1
                ? `${side} стена — ${i + 1} от ${kitchen.walls.length}`
                : 'Права кухня на една стена'}
            </Text>
            <Text style={s.meta}>
              Стена {formatMm(wall.length)} мм · стая {formatMm(room.width)} ×{' '}
              {formatMm(room.depth)} · {date.toLocaleDateString('bg-BG')}
            </Text>
            <Text style={s.meta}>Правила {result.rulesVersion}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.drawing}>
            <PdfDrawing
              wall={wall}
              openings={kitchenWallOpenings(kitchen, wallSide(wall))}
              placed={placed}
              worktop={m.worktop}
              maxWidthPt={520}
              maxHeightPt={450}
            />
          </View>

          <View style={s.side}>
            <View style={s.block}>
              <Text style={s.caption}>Модули</Text>
              {named.map((mod) => (
                <View key={mod.id} style={s.row}>
                  <Text style={s.code}>{mod.code}</Text>
                  <Text style={s.label}>{MODULES[mod.kind].label}</Text>
                  <Text style={s.value}>{formatMm(mod.width)}</Text>
                </View>
              ))}
            </View>

            <View style={s.block}>
              <Text style={s.caption}>Материали</Text>
              <Pair label="Корпус" value={`ПДЧ 18, ${m.carcassColor}`} />
              <Pair label="Фасади" value={FACADE_LABEL[m.facade.type]} />
              <Pair label="Цвят" value={m.facade.color} />
              <Pair label="Плот" value={WORKTOP_LABEL[m.worktop]} />
              <Pair label="Отваряне" value={OPENING_LABEL[m.opening]} />
              <Pair label="Чекмеджета" value={DRAWER_SYSTEM_LABEL[m.drawers]} />
            </View>

            <View style={s.block}>
              <Text style={s.caption}>Обобщение за цялата кухня, мм</Text>
              <Pair label="Шкафове" value={String(summary.cabinets)} />
              <Pair label="Височина до плота" value={formatMm(summary.worktopHeight)} />
              <Pair label="Дължина на плота" value={formatMm(summary.worktopLength)} />
              <Pair label="Дълбочина на плота" value={formatMm(summary.worktopDepth)} />
              <Pair label="Цокъл" value={formatMm(summary.plinthLength)} />
            </View>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          <Text style={s.contacts}>
            {[brand.contacts.phone, brand.contacts.email].filter(Boolean).join(' · ') ||
              'Контактите следват'}
          </Text>
        </View>
      </Page>
        );
      })}
    </Document>
  );
}

export async function renderOffer(kitchen: Kitchen, result: KitchenResult): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<OfferDocument kitchen={kitchen} result={result} />);
}
