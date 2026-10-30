# Riff

Shared code pads. Open a pad, send the link, and edit and run code together in real time.

## Run it

```sh
make install
make env         # then fill in .env
make check-key   # confirm OnlineCompiler accepts the key
make check-db    # confirm Supabase is reachable
make start       # http://localhost:3000
```

`make dev` rebuilds the client and restarts the server on change. Run `make` to see every command.

## Layout

```
packages/shared   Language list and starter code, used by both apps
apps/server       Node http + ws: serves the web app, syncs pads (Yjs), proxies /api/run
apps/web          CodeMirror 6 + Yjs client, bundled with esbuild into public/assets
```

- Pads live at `/p/<id>`, and `/new` creates one.
- Pads are saved in a Supabase `pads` table. Create it once by running `supabase/schema.sql` in the Supabase SQL editor. Without Supabase settings, pads are saved to `apps/server/data/` instead, which is fine for local development.
- Code runs through the [OnlineCompiler.io API](https://onlinecompiler.io/docs). The key stays on the server.
- Anyone with a pad's link can read and edit it. There are no accounts.

## Environment

| Variable              | Default                 |
| --------------------- | ----------------------- |
| `ONLINECOMPILER_API_KEY` | required for Run     |
| `SUPABASE_URL`        | local disk if unset     |
| `SUPABASE_SECRET_KEY` | local disk if unset     |
| `PORT`                | `3000`                  |
| `DATA_DIR`            | `apps/server/data`      |
| `PUBLIC_DIR`          | `apps/web/public`       |
