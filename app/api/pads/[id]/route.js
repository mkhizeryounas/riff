import { loadPad, appendUpdate } from '@/lib/server/pads';
import { PAD_ID } from '@/lib/languages';

export const dynamic = 'force-dynamic';

const MAX_UPDATE = 512 * 1024;

export async function GET(_req, { params }) {
  const { id } = await params;
  if (!PAD_ID.test(id)) return Response.json({ error: 'Bad pad id' }, { status: 400 });
  try {
    const state = await loadPad(id);
    return Response.json({ state: state ? Buffer.from(state).toString('base64') : null });
  } catch (err) {
    console.error('load failed', id, err.message);
    return Response.json({ error: 'Could not load pad' }, { status: 502 });
  }
}

// Accepts { u: base64 Yjs update }. Also used by navigator.sendBeacon on page exit.
export async function POST(req, { params }) {
  const { id } = await params;
  if (!PAD_ID.test(id)) return Response.json({ error: 'Bad pad id' }, { status: 400 });
  try {
    const { u } = JSON.parse(await req.text());
    const update = Buffer.from(String(u), 'base64');
    if (!update.length || update.length > MAX_UPDATE) return Response.json({ error: 'Bad update' }, { status: 400 });
    await appendUpdate(id, update);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('save failed', id, err.message);
    return Response.json({ error: 'Could not save pad' }, { status: 502 });
  }
}
