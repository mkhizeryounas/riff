// Pad storage in Supabase. Each save appends a Yjs update to `pad_updates`, so
// concurrent saves from different people can never overwrite each other.
// Loading merges every row; long logs are compacted into one row.
import * as Y from 'yjs';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const COMPACT_AFTER = 50;

// Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys only use apikey.
const headers = {
  apikey: SUPABASE_KEY,
  ...(SUPABASE_KEY?.startsWith('eyJ') && { authorization: `Bearer ${SUPABASE_KEY}` }),
  'content-type': 'application/json',
};

async function rest(pathAndQuery, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { ...headers, ...init.headers },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res;
}

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
const fromBase64 = (text) => new Uint8Array(Buffer.from(text, 'base64'));

/** Returns the pad's full Yjs state, or null if nothing has been saved yet. */
export async function loadPad(id) {
  const rows = await (await rest(`pad_updates?pad_id=eq.${id}&select=id,update&order=id`)).json();
  if (!rows.length) return null;
  const state = Y.mergeUpdates(rows.map((r) => fromBase64(r.update)));
  if (rows.length > COMPACT_AFTER) await compact(id, state, rows.at(-1).id).catch(() => {});
  return state;
}

/** Appends one Yjs update (any size, already merged by the client). */
export async function appendUpdate(id, update) {
  await rest('pad_updates', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ pad_id: id, update: toBase64(update) }),
  });
}

// Replace rows up to `lastId` with a single merged row. Rows written meanwhile
// have higher ids and are left alone, so nothing is lost.
async function compact(id, state, lastId) {
  await appendUpdate(id, state);
  await rest(`pad_updates?pad_id=eq.${id}&id=lte.${lastId}`, { method: 'DELETE' });
}
