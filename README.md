# Riff

Shared code pads. Open a pad, send the link, and edit and run code together in real time.

## Run it

```sh
make install
make env         # then fill in .env.local
make check-key   # confirm OnlineCompiler accepts the key
make check-db    # confirm Supabase is reachable
make dev         # http://localhost:3000
```

Run `make` to see every command.

## How it works

Everything runs on free tiers: Vercel, Supabase and OnlineCompiler.io.

```
app/                 Next.js App Router
  page.js            Landing page
  new/               New pad form (name, language, your name)
  p/[id]/            The pad: markup wired up by lib/pad.js, plus the Excalidraw board
  api/run/           Runs code through OnlineCompiler.io (key stays on the server)
  api/pads/[id]/     Loads and saves pads in Supabase (secret key stays on the server)
lib/
  pad.js             Editor (CodeMirror + Yjs), presence, console, controls
  provider.js        Syncs the Yjs doc over Supabase Realtime and saves it via /api/pads
  languages.js       Languages, starter code and OnlineCompiler ids
  server/            Server-only code for the API routes
supabase/schema.sql  Database table
```

- **Live editing** uses a Supabase Realtime broadcast channel per pad. Browsers send each other edits and cursors directly, and a browser that joins asks the others for anything it's missing.
- **Whiteboard**: the Board tab is [Excalidraw](https://github.com/excalidraw/excalidraw), loaded the first time someone opens it. Its elements live in the same Yjs doc as the code (map `board`, keyed by element id), so it syncs and saves the same way; Excalidraw's element versions decide which edit wins. Pointers and selections travel over awareness.
- **Saving**: each browser posts its own edits to `/api/pads/[id]`, which appends them to the `pad_updates` table. Because saves only ever add rows, two people saving at once never overwrite each other. Loading merges the rows and compacts long logs into one row.
- Anyone with a pad's link can read and edit it. There are no accounts.

## Set up Supabase

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy the project URL, publishable key and secret key into `.env.local`.

## Deploy to Vercel

1. Import the repo in Vercel. The defaults for Next.js work as they are.
2. Add the five variables from `.env.example` in Project Settings → Environment Variables.
3. Deploy, or run `make deploy` from your machine.

## Environment

| Variable                               | Where it's used      |
| -------------------------------------- | -------------------- |
| `ONLINECOMPILER_API_KEY`               | Server: running code |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`  | Server: saving pads  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser: live sync   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser: live sync   |
