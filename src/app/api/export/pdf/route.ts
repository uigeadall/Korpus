import { computeKitchen } from '@/lib/cabinet-rules';
import { parseKitchen } from '@/lib/kitchen-schema';
import { offerFileName, renderOffer } from '@/lib/pdf/offer';

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

  const file = await renderOffer(parsed.kitchen, computeKitchen(parsed.kitchen));

  return new Response(new Uint8Array(file), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${offerFileName()}"`,
      'cache-control': 'no-store',
    },
  });
}
