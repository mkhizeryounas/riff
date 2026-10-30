// Runs code through the OnlineCompiler.io API. The key stays on the server.
const API_URL = 'https://api.onlinecompiler.io/api/run-code-sync/';
const API_KEY = process.env.ONLINECOMPILER_API_KEY;
const TIMED_OUT = 124;


export async function run(lang, code) {
  if (!API_KEY) throw new Error('Code execution is not configured. Set ONLINECOMPILER_API_KEY in .env.local.');

  const started = performance.now();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: API_KEY },
    body: JSON.stringify({ compiler: lang.api, code, input: '' }),
    signal: AbortSignal.timeout(40_000),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 429) throw new Error('Too many runs right now. Try again in a few seconds.');
    if (/api key/i.test(body.error ?? '')) throw new Error('The OnlineCompiler API key was rejected.');
    throw new Error(body.error || `OnlineCompiler returned ${res.status}`);
  }

  const seconds = parseFloat(body.total ?? body.time);
  return {
    stdout: body.output || '',
    stderr: (body.error || '') + (body.truncated ? '\n… output truncated' : ''),
    exitCode: body.exit_code ?? 0,
    timedOut: body.exit_code === TIMED_OUT,
    timeMs: Number.isFinite(seconds) ? Math.round(seconds * 1000) : Math.round(performance.now() - started),
  };
}
