import * as Y from 'yjs';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit, StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { LANGUAGES, byId } from './languages.js';
import { identity, setIdentity, COLORS } from './identity.js';
import { PadProvider } from './provider.js';

const $ = (sel) => document.querySelector(sel);

const EDITOR_LANG = {
  python: () => python(),
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  go: () => go(),
  rust: () => rust(),
  java: () => java(),
  cpp: () => cpp(),
  c: () => cpp(),
  ruby: () => StreamLanguage.define(ruby),
  php: () => php(),
  bash: () => StreamLanguage.define(shell),
};
const INDENT = { go: '\t', javascript: '  ', typescript: '  ', ruby: '  ', bash: '  ' };
const LANG_COLOR = {
  python: '#ffd43b', javascript: '#f7df1e', typescript: '#3178c6', go: '#00add8', rust: '#dea584',
  java: '#f89820', cpp: '#659ad2', c: '#a8b9cc', ruby: '#e0115f', php: '#8892bf', bash: '#89e051',
};

/**
 * Wires up a pad page whose markup is already in the DOM (see app/p/[id]/pad-view.js).
 * Returns a cleanup function.
 */
export function startPad(padId, { skipJoin = false } = {}) {
  // ── Shared document ─────────────────────────────────────────────
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const root = $('.pad');
  // Everything registered on document/window is removed when the pad unmounts.
  const lifetime = new AbortController();
  const { signal } = lifetime;

  const ydoc = new Y.Doc();
  const ytext = ydoc.getText('code');
  const meta = ydoc.getMap('meta');
  const runs = ydoc.getMap('run');

  const provider = new PadProvider(padId, ydoc);
  const { awareness } = provider;

  // You only appear to others once you've confirmed your name on the join screen.
  let me = identity();
  let joined = false;
  const publishMe = () =>
    joined && awareness.setLocalStateField('user', { name: me.name, color: me.color, colorLight: me.color + '33' });

  // ── Editor ──────────────────────────────────────────────────────
  const highlight = HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: 'var(--syn-keyword)' },
    { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--syn-string)' },
    { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--syn-number)' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: 'var(--syn-function)' },
    { tag: [t.typeName, t.className, t.namespace, t.standard(t.variableName)], color: 'var(--syn-type)' },
    { tag: [t.propertyName, t.attributeName], color: 'var(--syn-property)' },
    { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--syn-punct)' },
    { tag: [t.meta, t.processingInstruction], color: 'var(--syn-meta)' },
    { tag: t.definition(t.variableName), color: 'var(--text)' },
  ]);

  const theme = EditorView.theme({
    '&': { height: '100%', color: 'var(--text)', backgroundColor: 'transparent', fontSize: '14px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.7' },
    '.cm-content': { padding: '18px 0', caretColor: 'var(--accent)' },
    '.cm-line': { padding: '0 20px 0 12px' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--faint)', border: 'none', paddingLeft: '10px' },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '28px' },
    '.cm-activeLine': { backgroundColor: 'var(--active-line)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
    '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid var(--accent)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      { backgroundColor: 'var(--selection) !important' },
    '.cm-matchingBracket': { backgroundColor: 'var(--selection)', outline: 'none' },
    '.cm-foldPlaceholder': { background: 'var(--elev)', border: 'none', color: 'var(--muted)' },
    '.cm-tooltip': { background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { background: 'var(--accent-soft)', color: 'var(--text)' },
    '.cm-panels': { background: 'var(--elev)', color: 'var(--text)', borderColor: 'var(--border)' },
    // Remote carets: a slim bar with a name tag that shows while they type.
    '.cm-ySelectionCaret': { borderLeftWidth: '1px', borderRightWidth: '1px' },
    '.cm-ySelectionCaretDot': { display: 'none' },
    '.cm-ySelectionInfo': {
      fontFamily: 'var(--sans)', fontSize: '11px', fontWeight: '500', lineHeight: '16px', padding: '0 5px',
      borderRadius: '3px 3px 3px 0', color: '#17151b', top: '-16px', left: '-1px',
      transition: 'opacity .2s', transitionDelay: '.4s',
    },
    '.cm-ySelectionCaret.is-active > .cm-ySelectionInfo': { opacity: '1', transitionDelay: '0s' },
  });

  const cursorPos = EditorView.updateListener.of((update) => {
    if (!update.selectionSet && !update.docChanged) return;
    const head = update.state.selection.main.head;
    const line = update.state.doc.lineAt(head);
    $('#cursor-pos').textContent = `Ln ${line.number}, Col ${head - line.from + 1}`;
  });

  const langCompartment = new Compartment();
  const langExtensions = (id) => [EDITOR_LANG[id](), indentUnit.of(INDENT[id] ?? '    ')];

  const view = new EditorView({
    parent: $('#editor'),
    state: EditorState.create({
      doc: ytext.toString(),
      extensions: [
        Prec.highest(keymap.of([
          { key: 'Mod-Enter', run: () => (runCode(), true) },
          { key: 'Mod-s', run: () => (toast('Pads save automatically'), true) },
        ])),
        keymap.of([...yUndoManagerKeymap, indentWithTab]),
        basicSetup,
        theme,
        cursorPos,
        syntaxHighlighting(highlight),
        langCompartment.of(langExtensions(byId(meta.get('language')).id)),
        yCollab(ytext, awareness, { undoManager: new Y.UndoManager(ytext) }),
      ],
    }),
  });

  // ── Language & title ────────────────────────────────────────────
  const select = $('#language');
  select.innerHTML = LANGUAGES.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
  let currentLang = null;

  select.addEventListener('change', () => {
    const prev = byId(meta.get('language'));
    const next = byId(select.value);
    ydoc.transact(() => {
      // Swap in the new starter only if the pad still holds an untouched starter.
      const code = ytext.toString();
      if (!code.trim() || code === prev.template) {
        ytext.delete(0, ytext.length);
        ytext.insert(0, next.template);
      }
      meta.set('language', next.id);
    });
    view.focus();
  });

  const titleInput = $('#title');
  titleInput.addEventListener('input', () => meta.set('title', titleInput.value));
  titleInput.addEventListener('keydown', (e) => e.key === 'Enter' && view.focus());

  function renderMeta() {
    const lang = byId(meta.get('language'));
    if (lang.id !== currentLang) {
      currentLang = lang.id;
      select.value = lang.id;
      view.dispatch({ effects: langCompartment.reconfigure(langExtensions(lang.id)) });
      for (const dot of ['#lang-dot', '#tab-dot']) $(dot).style.setProperty('--dot', LANG_COLOR[lang.id]);
      $('#tab-name').textContent = lang.file;
      $('#lang-label').textContent = lang.name;
      const indent = INDENT[lang.id] ?? '    ';
      $('#indent-label').textContent = indent === '\t' ? 'Tabs' : `Spaces: ${indent.length}`;
    }
    const title = meta.get('title') ?? '';
    if (document.activeElement !== titleInput) titleInput.value = title;
    $('#join-pad').textContent = `“${title || 'Untitled pad'}”`;
    rememberPad();
    document.title = `${title || 'Untitled pad'} · Riff`;
  }
  meta.observe(renderMeta);

  // The home page lists pads you've joined, newest first.
  function rememberPad() {
    if (!joined) return;
    try {
      const list = JSON.parse(localStorage.getItem('riff:recent') || '[]').filter((p) => p.id !== padId);
      list.unshift({ id: padId, title: meta.get('title') || 'Untitled pad', language: byId(meta.get('language')).name, at: Date.now() });
      localStorage.setItem('riff:recent', JSON.stringify(list.slice(0, 8)));
    } catch {}
  }

  // ── Running code ────────────────────────────────────────────────
  let running = false;
  const runBtn = $('#run');
  runBtn.addEventListener('click', runCode);

  async function runCode() {
    if (running || !joined) return;
    running = true;
    runBtn.classList.add('busy');
    const lang = byId(meta.get('language'));
    const base = { by: me.name, color: me.color, language: lang.id, at: Date.now() };
    runs.set('last', { ...base, status: 'running' });
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language: lang.id, code: ytext.toString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Run failed');
      runs.set('last', { ...base, status: 'done', ...data });
    } catch (err) {
      runs.set('last', { ...base, status: 'error', stderr: err.message });
    } finally {
      running = false;
      runBtn.classList.remove('busy');
    }
  }

  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

  function renderOutput() {
    const out = $('#output');
    const info = $('#output-meta');
    const r = runs.get('last');
    if (!r) {
      info.innerHTML = '';
      out.innerHTML = `<div class="empty">
        <p>No output yet.</p>
        <p class="hint">Press <kbd>${isMac ? '⌘' : 'Ctrl'}</kbd><kbd>↵</kbd> to run. Everyone in the pad sees the result.</p>
      </div>`;
      return;
    }
    const who = `<span class="by"><i style="background:${r.color}"></i>${esc(r.by)}</span>`;
    const prompt = `<div class="prompt"><b>$</b> run ${byId(r.language).file}</div>`;
    if (r.status === 'running') {
      info.innerHTML = who;
      out.innerHTML = `${prompt}<div class="running"><span class="spinner"></span>Running…</div>`;
      return;
    }
    const ok = r.status === 'done' && r.exitCode === 0 && !r.timedOut;
    const badge = r.status === 'error' ? 'error' : r.timedOut ? 'timed out' : `exit ${r.exitCode}`;
    info.innerHTML = `${who}<span class="badge ${ok ? 'ok' : 'bad'}">${badge}</span>${r.timeMs != null ? `<span class="time">${r.timeMs} ms</span>` : ''}`;
    const stdout = r.stdout ? `<pre class="stdout">${esc(r.stdout)}</pre>` : '';
    const stderr = r.stderr ? `<pre class="stderr">${esc(r.stderr)}</pre>` : '';
    out.innerHTML = prompt + (stdout || stderr ? stdout + stderr : `<pre class="quiet">Finished with no output.</pre>`);
  }
  runs.observe(renderOutput);
  $('#clear').addEventListener('click', () => runs.delete('last'));

  // ── Presence ────────────────────────────────────────────────────
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  function renderPresence() {
    const people = [...awareness.getStates()]
      .filter(([, s]) => s.user)
      .sort(([a], [b]) => (a === ydoc.clientID ? -1 : b === ydoc.clientID ? 1 : a - b));
    const shown = people.slice(0, 5);
    $('#presence').innerHTML =
      shown.map(([id, { user }]) => `
        <button class="avatar${id === ydoc.clientID ? ' self' : ''}" style="--c:${user.color}" data-id="${id}"
          title="${esc(user.name)}${id === ydoc.clientID ? ' (you)' : ' · jump to cursor'}" ${id === ydoc.clientID ? 'data-self' : ''}>
          ${initials(user.name)}
        </button>`).join('') +
      (people.length > 5 ? `<span class="avatar more">+${people.length - 5}</span>` : '');
    if (provider.connected) $('#live-count').textContent = people.length === 1 ? 'Just you' : `${people.length} here`;
    if (!joined) {
      const names = people.map(([, s]) => s.user.name);
      $('#join-sub').textContent = names.length
        ? `${names.slice(0, 2).join(' and ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''} ${names.length === 1 ? 'is' : 'are'} already here.`
        : "Pick a name so others know who's typing.";
    }
  }
  awareness.on('change', renderPresence);

  // ── Activity: who is typing right now ───────────────────────────
  // A collaborator counts as active for a moment after their cursor or text
  // changes. Active people get their name tag shown and a ring on their avatar.
  const ACTIVE_MS = 2500;
  const lastActive = new Map();

  awareness.on('change', ({ added, updated }) => {
    const now = Date.now();
    for (const id of [...added, ...updated]) if (id !== ydoc.clientID) lastActive.set(id, now);
    renderActivity();
  });
  const activityTimer = setInterval(renderActivity, 500);

  function renderActivity() {
    const now = Date.now();
    const active = [...awareness.getStates()].filter(
      ([id, s]) => id !== ydoc.clientID && s.user && s.cursor && now - (lastActive.get(id) ?? 0) < ACTIVE_MS,
    );
    const names = new Set(active.map(([, s]) => s.user.name));
    const ids = new Set(active.map(([id]) => String(id)));

    // Carets are redrawn by CodeMirror, so tag them after its next paint.
    requestAnimationFrame(() => {
      view.dom.querySelectorAll('.cm-ySelectionCaret').forEach((caret) =>
        caret.classList.toggle('is-active', names.has(caret.querySelector('.cm-ySelectionInfo')?.textContent)),
      );
    });
    document.querySelectorAll('.avatar[data-id]').forEach((a) => a.classList.toggle('typing', ids.has(a.dataset.id)));

    const list = [...names];
    $('#typing').textContent = !list.length ? ''
      : list.length === 1 ? `${list[0]} is typing`
      : list.length === 2 ? `${list[0]} and ${list[1]} are typing`
      : `${list.length} people are typing`;
  }

  // Clicking someone else's avatar scrolls to their cursor.
  $('#presence').addEventListener('click', (e) => {
    const avatar = e.target.closest('.avatar[data-id]:not([data-self])');
    const cursor = avatar && awareness.getStates().get(Number(avatar.dataset.id))?.cursor;
    if (!cursor) return avatar && toast("They haven't placed a cursor yet");
    const pos = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(cursor.head), ydoc);
    if (!pos) return;
    view.dispatch({ effects: EditorView.scrollIntoView(pos.index, { y: 'center' }) });
    lastActive.set(Number(avatar.dataset.id), Date.now());
    renderActivity();
  });

  const swatchesHtml = COLORS.map((c) => `<button type="button" style="--c:${c}" data-color="${c}" aria-label="Colour ${c}"></button>`).join('');
  const markSwatch = (root, color) =>
    root.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('on', b.dataset.color === color));

  // Join screen: confirm a name (prefilled from last time) before entering.
  const joinName = $('#join-name');
  const joinSwatches = $('#join-swatches');
  let joinColor = me.color;
  joinSwatches.innerHTML = swatchesHtml;
  markSwatch(joinSwatches, joinColor);
  joinName.value = me.name;
  joinName.focus();
  joinSwatches.addEventListener('click', (e) => {
    if (!e.target.dataset?.color) return;
    joinColor = e.target.dataset.color;
    markSwatch(joinSwatches, joinColor);
    joinName.focus();
  });
  $('#join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = joinName.value.trim();
    if (!name) return joinName.focus();
    join(name, joinColor);
  });

  function join(name, color) {
    joined = true;
    updateMe({ name, color });
    rememberPad();
    $('#join').classList.add('done');
    view.focus();
  }

  // Clicking your own avatar opens a small profile editor.
  const profile = $('#profile');
  const nameInput = $('#name');
  $('#swatches').innerHTML = swatchesHtml;

  function openProfile() {
    nameInput.value = me.name;
    markSwatch(profile, me.color);
    profile.hidden = false;
    nameInput.select();
  }
  function updateMe(patch) {
    me = setIdentity({ ...me, ...patch });
    publishMe();
  }
  $('#presence').addEventListener('click', (e) => e.target.closest('[data-self]') && openProfile());
  nameInput.addEventListener('input', () => nameInput.value.trim() && updateMe({ name: nameInput.value.trim() }));
  nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && (profile.hidden = true));
  $('#swatches').addEventListener('click', (e) => {
    const color = e.target.dataset?.color;
    if (!color) return;
    updateMe({ color });
    markSwatch(profile, color);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!profile.hidden && !profile.contains(e.target) && !e.target.closest('[data-self]')) profile.hidden = true;
  }, { signal });

  // ── Chrome: share, theme, status, splitter, toast ───────────────
  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  $('#share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied — anyone with it can join');
    } catch {
      toast(location.href);
    }
  });

  $('#theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('riff:theme', next); } catch {}
  });

  const CONN_LABEL = { connected: 'Connected · changes save automatically', connecting: 'Connecting…', disconnected: 'Offline · reconnecting…' };
  provider.on('status', ({ status }) => {
    $('#status').dataset.state = status;
    $('#conn-label').textContent = CONN_LABEL[status];
    if (status === 'connected') renderPresence();
    else $('#live-count').textContent = status === 'connecting' ? 'Connecting' : 'Offline';
  });
  $('#run-kbd').textContent = isMac ? '⌘↵' : 'Ctrl↵';
  provider.on('sync', (synced) => synced && root.classList.add('ready'));

  const main = $('main');
  const DEFAULT_SPLIT = '60%';
  try { main.style.setProperty('--split', localStorage.getItem('riff:split') || DEFAULT_SPLIT); } catch {}
  $('#gutter').addEventListener('dblclick', () => {
    main.style.setProperty('--split', DEFAULT_SPLIT);
    try { localStorage.removeItem('riff:split'); } catch {}
  });
  $('#gutter').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const gutter = e.currentTarget;
    gutter.setPointerCapture(e.pointerId);
    root.classList.add('resizing');
    const rect = main.getBoundingClientRect();
    const move = (ev) => {
      const pct = Math.min(80, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100));
      main.style.setProperty('--split', `${pct.toFixed(1)}%`);
    };
    const up = () => {
      root.classList.remove('resizing');
      gutter.removeEventListener('pointermove', move);
      try { localStorage.setItem('riff:split', main.style.getPropertyValue('--split')); } catch {}
    };
    gutter.addEventListener('pointermove', move);
    gutter.addEventListener('pointerup', up, { once: true });
    gutter.addEventListener('pointercancel', up, { once: true });
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !view.hasFocus) {
      e.preventDefault();
      runCode();
    }
  }, { signal });

  renderMeta();
  renderOutput();
  renderPresence();

  // Whoever just created the pad already picked a name on the New pad form.
  if (skipJoin && me.name) join(me.name, me.color);

  return () => {
    lifetime.abort();
    clearInterval(activityTimer);
    clearTimeout(toastTimer);
    provider.destroy();
    view.destroy();
    ydoc.destroy();
  };
}
