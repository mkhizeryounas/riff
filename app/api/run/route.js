import { run } from '@/lib/server/runner';
import { LANGUAGES } from '@/lib/languages';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const MAX_CODE = 100 * 1024;

export async function POST(req) {
  try {
    const { language, code } = await req.json();
    const lang = LANGUAGES.find((l) => l.id === language);
    if (!lang) return Response.json({ error: 'Unknown language' }, { status: 400 });
    if (typeof code !== 'string' || code.length > MAX_CODE) return Response.json({ error: 'Code is too large' }, { status: 400 });
    return Response.json(await run(lang, code));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
