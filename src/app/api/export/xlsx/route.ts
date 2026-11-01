import { computeKitchen } from '@/lib/cabinet-rules';
import { parseKitchen } from '@/lib/kitchen-schema';
import { workbookFileName } from '@/lib/export-mapping';
import { kitchenWorkbook } from '@/lib/xlsx';

// Node е подразбиращата се среда за route handlers в Next 16; изричният
// `runtime` не се съчетава с cacheComponents.

/** Най-голямото тяло, което приемаме. */
const MAX_BODY = 256 * 1024;

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY) {
    return Response.json({ error: 'Конфигурацията е твърде голяма.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Невалиден JSON.' }, { status: 400 });
  }

  const parsed = parseKitchen(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 422 });
  }

  const result = computeKitchen(parsed.kitchen);
  const file = await kitchenWorkbook(result, parsed.kitchen.materials);
  const name = workbookFileName();

  return new Response(new Uint8Array(file), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store',
    },
  });
}
