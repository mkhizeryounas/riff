'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Excalidraw is large, so it only loads the first time someone opens the board.
const Board = dynamic(() => import('./board'), { ssr: false, loading: () => <div className="board-canvas loading-board"><span className="spinner" /></div> });

// The markup is static; lib/pad.js wires the editor, realtime sync and controls into it.
export default function PadView({ padId }) {
  const [pad, setPad] = useState(null);
  const [view, setView] = useState('code');
  const [boardOpened, setBoardOpened] = useState(false);
  const [drawing, setDrawing] = useState([]);

  useEffect(() => {
    let started;
    let cancelled = false;
    const createdKey = `riff:created:${padId}`;
    const skipJoin = sessionStorage.getItem(createdKey) === '1';
    sessionStorage.removeItem(createdKey);
    import('@/lib/pad').then(({ startPad }) => {
      if (cancelled) return;
      started = startPad(padId, { skipJoin });
      setPad(started);
    });
    return () => {
      cancelled = true;
      started?.destroy();
    };
  }, [padId]);

  // Colours of the other people currently on the board, shown on its tab.
  useEffect(() => {
    if (!pad) return;
    const { awareness, ydoc } = pad;
    const update = () => {
      const colors = [...awareness.getStates()]
        .filter(([id, s]) => id !== ydoc.clientID && s.user && s.board)
        .map(([id, s]) => `${id}:${s.user.color}`);
      setDrawing((prev) => (prev.join() === colors.join() ? prev : colors));
    };
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [pad]);

  const open = (next) => {
    setView(next);
    if (next === 'board') setBoardOpened(true);
  };

  return (
    <div className="pad" data-view={view}>
      <header className="bar">
        <Link className="brand" href="/" title="Riff home"><img src="/logo.svg" alt="" width="20" height="20" /><span>riff</span></Link>
        <span className="slash">/</span>
        <input id="title" className="title" spellCheck={false} placeholder="Untitled pad" aria-label="Pad title" maxLength={80} />

        <div className="grow" />

        <div className="live" title="People in this pad">
          <span id="status" className="status" data-state="connecting" />
          <span id="live-count">Connecting</span>
        </div>
        <div id="presence" className="presence" />
        <div id="profile" className="profile" hidden>
          <span className="label">You appear as</span>
          <input id="name" maxLength={32} spellCheck={false} aria-label="Your name" />
          <div id="swatches" className="swatches" />
        </div>

        <span className="divider" />

        <label className="select">
          <i id="lang-dot" className="lang-dot" />
          <select id="language" aria-label="Language" />
        </label>
        <button id="theme" className="icon-btn" title="Toggle theme" aria-label="Toggle theme">
          <svg className="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          <svg className="moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        </button>
        <button id="share" className="btn ghost">
          <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
          <span>Share</span>
        </button>
        <button id="run" className="btn primary" title="Run (⌘/Ctrl + Enter)">
          <svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></svg>
          Run
          <kbd className="kbd-in" id="run-kbd">⌘↵</kbd>
        </button>
      </header>

      <main>
        <section className="pane editor-pane">
          <div className="tabs" role="tablist">
            <button className="tab" role="tab" aria-selected={view === 'code'} onClick={() => open('code')}>
              <i id="tab-dot" className="lang-dot" /><span id="tab-name">main.py</span>
            </button>
            <button className="tab" role="tab" aria-selected={view === 'board'} onClick={() => open('board')} title="A shared whiteboard for sketching ideas">
              <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
              <span>Board</span>
              {drawing.length > 0 && (
                <span className="tab-people" title={`${drawing.length} on the board`}>
                  {drawing.slice(0, 4).map((key) => <i key={key} style={{ '--c': key.split(':')[1] }} />)}
                </span>
              )}
            </button>
          </div>
          <div id="editor" />
          <div className="board">
            {pad && boardOpened && <Board ydoc={pad.ydoc} awareness={pad.awareness} active={view === 'board'} />}
          </div>
          <div className="loading"><span className="spinner" /></div>
        </section>
        <div id="gutter" className="gutter" role="separator" aria-orientation="vertical" aria-label="Resize panels" title="Drag to resize · double-click to reset" />
        <section className="pane output-pane">
          <div className="pane-head">
            <span className="pane-title">Console</span>
            <div id="output-meta" className="output-meta" />
            <button id="clear" className="link-btn">Clear</button>
          </div>
          <div id="output" className="output" />
        </section>
      </main>

      <footer className="statusbar">
        <span id="conn-label">Connecting…</span>
        <span id="typing" className="typing" />
        <span className="grow" />
        <span id="cursor-pos">Ln 1, Col 1</span>
        <span id="indent-label">Spaces: 4</span>
        <span id="lang-label">Python</span>
      </footer>

      <div id="join" className="join" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <form id="join-form" className="join-card">
          <h2 id="join-title">Join <span id="join-pad">this pad</span></h2>
          <p className="join-sub" id="join-sub">Pick a name so others know who&apos;s typing.</p>
          <label className="field">
            <span className="label">Name</span>
            <input id="join-name" maxLength={32} spellCheck={false} autoComplete="nickname" placeholder="Your name" required />
          </label>
          <div className="field">
            <span className="label">Colour</span>
            <div id="join-swatches" className="swatches" />
          </div>
          <button className="btn primary" type="submit">Join</button>
        </form>
      </div>

      <div id="toast" className="toast" role="status" />
    </div>
  );
}
