/**
 * `POST /api/export/flat-xlsx` — работната книга за цялото жилище.
 *
 * Същият вход като при PDF-а: записът на жилището. Листовете са
 * четири, не шест по стая — цехът иска един разкрой и една заявка.
 */

import { flatBreakdown, parseFlatBody } from '@/lib/flat-export';
import { flatWorkbookFileName } from '@/lib/export-mapping';
import { flatWorkbook } from '@/lib/xlsx';

const MAX_BODY = 32 * 1024;

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY) {
    return Response.json({ error: 'Жилището е твърде голямо.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Невалиден JSON.' }, { status: 400 });
  }

  const parsed = parseFlatBody(body);
  if (!parsed.ok) return Response.json({ error: parsed.said }, { status: 422 });

  const flat = flatBreakdown(parsed.flat);
  if (!flat.rooms.length) {
    return Response.json({ error: 'В стаите още няма мебел.' }, { status: 422 });
  }

  const file = await flatWorkbook(flat);

  return new Response(new Uint8Array(file), {
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${flatWorkbookFileName()}"`,
      'cache-control': 'no-store',
    },
  });
}
