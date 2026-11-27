/**
 * `POST /api/export/flat-pdf` — списъкът за цеха от цялото жилище.
 *
 * Пристига записът на жилището (същият, който пътува в линк), а не
 * шест отделни проекта: едно жилище, една заявка, един файл.
 */

import { flatBreakdown, parseFlatBody } from '@/lib/flat-export';
import { flatFileName, renderFlat } from '@/lib/pdf/flat';

/** Записът на жилището е под 8 KB; толкова плюс обвивката. */
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
    /*
     * Стаите са отворени, но в нито една няма шкаф. Казва се, вместо
     * да се свали PDF с една празна страница.
     */
    return Response.json({ error: 'В стаите още няма мебел.' }, { status: 422 });
  }

  const file = await renderFlat(flat);

  return new Response(new Uint8Array(file), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${flatFileName()}"`,
      'cache-control': 'no-store',
    },
  });
}
