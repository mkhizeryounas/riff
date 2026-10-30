'use client';
import { useEffect, useState } from 'react';
import { Excalidraw, CaptureUpdateAction, reconcileElements } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

// Local edits are written with this origin so we don't apply them back to ourselves.
const LOCAL = 'board';
// Excalidraw mutates its elements in place, so the shared map only ever holds copies.
const copies = (elements) => elements.map((el) => structuredClone(el));
const currentTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

/**
 * A shared Excalidraw board. Every element lives in the pad's Yjs map `board`,
 * keyed by id; Excalidraw's own version numbers decide which copy wins. Pointers
 * and selections travel over awareness, so everyone sees each other's cursors.
 */
export default function Board({ ydoc, awareness, active }) {
  const [api, setApi] = useState(null);
  const [theme, setTheme] = useState(currentTheme);
  const shared = ydoc.getMap('board');

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(currentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Remote edits: merge them into the scene without adding them to our undo history.
  useEffect(() => {
    if (!api) return;
    const pull = () => {
      const elements = reconcileElements(api.getSceneElementsIncludingDeleted(), copies([...shared.values()]), api.getAppState());
      api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER });
    };
    const onChange = (_, txn) => txn.origin !== LOCAL && pull();
    shared.observe(onChange);
    pull(); // in case the pad finished loading after the board mounted
    return () => shared.unobserve(onChange);
  }, [api, shared]);

  // Other people's pointers and selections.
  useEffect(() => {
    if (!api) return;
    const render = () => {
      const collaborators = new Map();
      for (const [id, s] of awareness.getStates()) {
        if (id === ydoc.clientID || !s.user || !s.board) continue;
        collaborators.set(String(id), {
          username: s.user.name,
          color: { background: s.user.color, stroke: s.user.color },
          pointer: s.board.pointer,
          button: s.board.button,
          selectedElementIds: s.board.selected,
        });
      }
      api.updateScene({ collaborators });
    };
    awareness.on('change', render);
    render();
    return () => awareness.off('change', render);
  }, [api, awareness, ydoc]);

  // A hidden board has no size; re-measure when it's shown, and drop our pointer when it isn't.
  useEffect(() => {
    if (active) api?.refresh();
    else if (awareness.getLocalState()?.board) awareness.setLocalStateField('board', null);
  }, [active, api, awareness]);
  useEffect(() => () => awareness.getLocalState() && awareness.setLocalStateField('board', null), [awareness]);

  const local = () => awareness.getLocalState()?.board ?? {};

  const push = (elements, appState) => {
    const changed = elements.filter((el) => (shared.get(el.id)?.version ?? -1) < el.version);
    if (changed.length) ydoc.transact(() => copies(changed).forEach((el) => shared.set(el.id, el)), LOCAL);

    const selected = appState.selectedElementIds;
    if (active && Object.keys(selected).join() !== Object.keys(local().selected ?? {}).join()) {
      awareness.setLocalStateField('board', { ...local(), selected });
    }
  };

  const point = ({ pointer, button }) => {
    if (active) awareness.setLocalStateField('board', { ...local(), pointer, button });
  };

  return (
    <div className="board-canvas">
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={{ elements: copies([...shared.values()]), appState: { viewBackgroundColor: '#fbfaf8' } }}
        onChange={push}
        onPointerUpdate={point}
        isCollaborating
        theme={theme}
        UIOptions={{
          // Images aren't synced, and the pad already has its own theme toggle and saving.
          tools: { image: false },
          canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: null },
        }}
      />
    </div>
  );
}
