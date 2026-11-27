/**
 * PDF за цялото жилище — един файл, не шест.
 *
 * Първата страница е сборът: стаи, позиции, материали, обков. След
 * нея идват страниците на всяка стая, същите като в офертата за една
 * стая — страницата се прави на едно място (`roomPages` в `offer.tsx`),
 * за да не се разминат двата файла.
 *
 * Шкафовете носят позиция през цялото жилище (`П7`), защото кодовете
 * започват отначало във всяка стая и „Д1" от кухнята и „Д1" от банята
 * са две различни врати. Сметката за това стои в `flat-export.ts`.
 */

import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { MATERIAL_LABEL, DIM } from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import { roomName } from '@/lib/flat';
import type { FlatBreakdown } from '@/lib/flat-export';
import { brand } from '@/config/brand';
import { Pair, PdfFooter, registerFonts, roomPages, s } from './offer';

const MUTED = '#6f6a62';
const WARN = '#b4342a';

/** korpus-jilishte-2026-11-27.pdf */
export function flatFileName(date = new Date()): string {
  return `korpus-jilishte-${date.toISOString().slice(0, 10)}.pdf`;
}

function Caption({ children }: { children: string }) {
  return <Text style={s.caption}>{children}</Text>;
}

function CoverPage({ flat, date }: { flat: FlatBreakdown; date: Date }) {
  const sum = flat.summary;
  const sheets = sum.materials.reduce((n, m) => n + m.sheets, 0);

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>{brand.name}</Text>
          <Text style={s.tagline}>Списък за цеха — цяло жилище</Text>
        </View>
        <View>
          <Text style={s.meta}>
            {sum.rooms} {sum.rooms === 1 ? 'стая' : 'стаи'} · {sum.cabinets} шкафа ·{' '}
            {sum.partPieces} детайла
          </Text>
          <Text style={s.meta}>{date.toLocaleDateString('bg-BG')}</Text>
          <Text style={s.meta}>Правила {flat.rooms[0]?.result.rulesVersion ?? '—'}</Text>
        </View>
      </View>

      {/*
        Нечетимата стая се казва първо и с цвят. Цехът трябва да види,
        че му е дадена непълна поръчка — иначе ще я изпълни и ще я
        сметне за цяла.
      */}
      {flat.broken.length > 0 && (
        <View style={[s.block, { borderWidth: 0.7, borderColor: WARN, padding: 7 }]}>
          <Text style={{ fontSize: 9, color: WARN }}>
            ВНИМАНИЕ: {flat.broken.length}{' '}
            {flat.broken.length === 1 ? 'стая не се разчете и ЛИПСВА' : 'стаи не се разчетоха и ЛИПСВАТ'}{' '}
            от този списък — {flat.broken.map((r) => roomName(r)).join(', ')}. Поръчката не е пълна.
          </Text>
        </View>
      )}

      <View style={s.body}>
        <View style={{ width: 400 }}>
          <View style={s.block}>
            <Caption>Стаи и позиции</Caption>
            {flat.rooms.map((r) => {
              const first = r.cabinets[0]?.pos ?? '';
              const last = r.cabinets.at(-1)?.pos ?? '';
              return (
                <View key={r.room.id} style={s.row}>
                  <Text style={[s.code, { width: 54 }]}>
                    {first === last ? first : `${first}–${last}`}
                  </Text>
                  <Text style={s.label}>{roomName(r.room)}</Text>
                  <Text style={s.value}>
                    {r.cabinets.length} шк. · {r.result.summary.partPieces} дет.
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={s.block}>
            <Caption>Обков за цялото жилище</Caption>
            {flat.hardware.map((h) => (
              <View key={`${h.name}-${h.note ?? ''}`} style={s.row}>
                <Text style={s.label}>
                  {h.name}
                  {h.note ? <Text style={{ color: MUTED }}> · {h.note}</Text> : null}
                </Text>
                <Text style={s.value}>
                  {h.unit === 'мм' ? formatMm(h.qty) : h.qty} {h.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ width: 356 }}>
          <View style={s.block}>
            <Caption>{`Разкрой наведнъж, плочи ${DIM.SHEET_L}×${DIM.SHEET_W}`}</Caption>
            {sum.materials.map((m) => (
              <View key={m.material} style={s.row}>
                <Text style={s.label}>{MATERIAL_LABEL[m.material]}</Text>
                <Text style={s.value}>
                  {m.areaWithWasteM2} м² · {m.sheets} пл.
                </Text>
              </View>
            ))}
            {/*
              Печалбата от общия разкрой. Числото е сметка, не обещание:
              недорязаните плочи на шест стаи стават едно парче.
            */}
            {sum.sheetsIfSeparate > sheets && (
              <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 4 }}>
                {sheets} плочи наведнъж вместо {sum.sheetsIfSeparate} при рязане стая по стая. С{' '}
                {DIM.SHEET_WASTE * 100}% фира.
              </Text>
            )}
          </View>

          <View style={s.block}>
            <Caption>Кант и боя</Caption>
            {sum.edges.map((e) => (
              <Pair key={e.thickness} label={e.label} value={`${e.meters} м`} />
            ))}
            <Pair label="Фасади за боядисване" value={`${sum.paintAreaM2} м²`} />
          </View>

          <View style={s.block}>
            <Caption>Плот и цокъл, мм</Caption>
            <Pair label="Дължина на плота" value={formatMm(sum.worktopLength)} />
            <Pair label="Цокъл" value={formatMm(sum.plinthLength)} />
          </View>
        </View>
      </View>

      <PdfFooter />
    </Page>
  );
}

export function FlatDocument({
  flat,
  date = new Date(),
}: {
  flat: FlatBreakdown;
  date?: Date;
}) {
  /*
   * Позиция по код и стая: кодът сам не стига, защото „Д2" го има в
   * няколко стаи. Картата се прави веднъж, а не при всяко рисуване.
   */
  const pos = new Map<string, string>();
  for (const r of flat.rooms) {
    for (const c of r.cabinets) pos.set(`${r.room.id}|${c.code}`, c.pos);
  }

  return (
    <Document title={`${brand.name} — списък за цеха, цяло жилище`} author={brand.name}>
      <CoverPage flat={flat} date={date} />
      {flat.rooms.flatMap((r) =>
        roomPages({
          kitchen: r.kitchen,
          result: r.result,
          date,
          heading: roomName(r.room),
          posOf: (code) => pos.get(`${r.room.id}|${code}`),
        }),
      )}
    </Document>
  );
}

export async function renderFlat(flat: FlatBreakdown, date = new Date()): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<FlatDocument flat={flat} date={date} />);
}
