import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NEEDS, layoutFor } from '@/lib/autolayout';
import { type RoomKind, emptyKitchen } from '@/lib/cabinet-rules';
import { defaultFlat } from '@/lib/flat';
import { encodeFlat } from '@/lib/flat-share';
import { FLAT_CODE_MAX } from '@/lib/flat-export';
import { encodeProject } from '@/lib/share';
import { POST } from './route';

function обзаведено(колко = 2): string {
  const f = defaultFlat();
  return encodeFlat({
    rooms: f.rooms.map((r, i) => {
      if (i >= колко || r.kind === 'other') return r;
      const k = emptyKitchen(3600);
      k.roomKind = r.kind as RoomKind;
      const l = layoutFor(k.roomKind, 3600, DEFAULT_ROOM_NEEDS);
      k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
      return { ...r, project: encodeProject(k) };
    }),
  });
}

function заявка(body: unknown, length?: number): Request {
  const text = JSON.stringify(body);
  return new Request('http://localhost/api/export/flat-xlsx', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(length ?? new TextEncoder().encode(text).length),
    },
    body: text,
  });
}

describe('книгата за цялото жилище', () => {
  it('сваля се като xlsx с име за днес', async () => {
    const res = await POST(заявка({ flat: обзаведено(3) }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    expect(res.headers.get('content-disposition')).toMatch(
      /filename="korpus-jilishte-\d{4}-\d{2}-\d{2}\.xlsx"/,
    );
    expect(res.headers.get('cache-control')).toBe('no-store');

    const bytes = new Uint8Array(await res.arrayBuffer());
    // ZIP: всеки xlsx започва с „PK".
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    expect(bytes.length).toBeGreaterThan(5000);
  }, 20_000);

  it('липсващо жилище се отказва', async () => {
    expect((await POST(заявка({}))).status).toBe(422);
  });

  it('нечетим запис се отказва, вместо да даде празен файл', async () => {
    const res = await POST(заявка({ flat: 'това-не-е-запис' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('не се отваря');
  });

  it('жилище без нито една обзаведена стая се отказва', async () => {
    const res = await POST(заявка({ flat: encodeFlat(defaultFlat()) }));
    expect(res.status).toBe(422);
  });

  it('отворена, но празна стая получава обяснение, не празна книга', async () => {
    const f = defaultFlat();
    const flat = encodeFlat({
      rooms: f.rooms.map((r, i) =>
        i === 0 ? { ...r, project: encodeProject(emptyKitchen(3600)) } : r,
      ),
    });
    const res = await POST(заявка({ flat }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('няма мебел');
  });

  it('прекалено дълъг запис се отказва по размер, без да се чете', async () => {
    const res = await POST(заявка({ flat: обзаведено(2) }, 64 * 1024));
    expect(res.status).toBe(413);
  });

  it('дълъг низ се отказва преди разкодиране', async () => {
    const res = await POST(заявка({ flat: 'A'.repeat(FLAT_CODE_MAX + 1) }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('голямо');
  });

  it('счупен JSON не чупи вратата', async () => {
    const res = await POST(
      new Request('http://localhost/api/export/flat-xlsx', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '3' },
        body: '{ "',
      }),
    );
    expect(res.status).toBe(400);
  });
});
