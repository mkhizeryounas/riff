// Syncs a Yjs document through Supabase Realtime (broadcast) and saves it via
// /api/pads/[id]. Peers exchange edits and cursors directly over the channel;
// each browser saves only the edits it made itself.
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { createClient } from '@supabase/supabase-js';
import { seedPad } from './seed.js';

const SEND_EVERY_MS = 40; // batch keystrokes into one message
const SAVE_EVERY_MS = 1000;
const MAX_MESSAGE = 200 * 1024; // stay under Realtime's broadcast payload limit

const toBase64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

let client;
const supabase = () =>
  (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));

export class PadProvider {
  constructor(padId, doc) {
    this.padId = padId;
    this.doc = doc;
    this.awareness = new awarenessProtocol.Awareness(doc);
    this.connected = false;
    this.handlers = {};
    this.outgoing = [];
    this.unsaved = [];
    this.changedClients = new Set();

    this.onDocUpdate = (update, origin) => {
      if (origin === this || origin === 'db') return; // came from a peer or from storage
      this.outgoing.push(update);
      this.unsaved.push(update);
      this.scheduleSend();
      this.saveTimer ??= setTimeout(() => this.save(), SAVE_EVERY_MS);
    };
    this.onAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin !== 'local') return;
      for (const id of [...added, ...updated, ...removed]) this.changedClients.add(id);
      this.scheduleSend();
    };
    this.onPageHide = () => {
      awarenessProtocol.removeAwarenessStates(this.awareness, [doc.clientID], 'local');
      this.flush();
      this.save({ beacon: true });
    };
    doc.on('update', this.onDocUpdate);
    this.awareness.on('update', this.onAwarenessUpdate);
    window.addEventListener('pagehide', this.onPageHide);

    this.start();
  }

  on(event, handler) {
    (this.handlers[event] ??= []).push(handler);
  }

  emit(event, ...args) {
    for (const handler of this.handlers[event] ?? []) handler(...args);
  }

  setStatus(status) {
    this.connected = status === 'connected';
    this.emit('status', { status });
  }

  async start() {
    this.setStatus('connecting');

    // 1. Load what's saved. A pad nobody has saved yet gets the default starter.
    try {
      const res = await fetch(`/api/pads/${this.padId}`, { cache: 'no-store' });
      const { state, error } = await res.json();
      if (!res.ok) throw new Error(error);
      if (state) Y.applyUpdate(this.doc, fromBase64(state), 'db');
      else Y.applyUpdate(this.doc, seedPad(), 'seed');
    } catch (err) {
      console.error('Could not load pad', err);
      this.setStatus('disconnected');
    }
    if (this.destroyed) return;
    this.emit('sync', true);

    // 2. Join the live channel for this pad.
    this.channel = supabase().channel(`pad:${this.padId}`, { config: { broadcast: { self: false } } });
    this.channel
      .on('broadcast', { event: 'update' }, ({ payload }) => Y.applyUpdate(this.doc, fromBase64(payload.u), this))
      .on('broadcast', { event: 'awareness' }, ({ payload }) =>
        awarenessProtocol.applyAwarenessUpdate(this.awareness, fromBase64(payload.u), this),
      )
      .on('broadcast', { event: 'hello' }, ({ payload }) => this.answerHello(payload))
      .subscribe((status) => {
        if (this.destroyed) return;
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected');
          // Ask peers for anything we're missing; they ask us back.
          this.send('hello', { sv: toBase64(Y.encodeStateVector(this.doc)), reply: true });
          this.sendAwareness([...this.awareness.getStates().keys()]);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.setStatus('disconnected');
        }
      });
  }

  answerHello({ sv, reply }) {
    const diff = Y.encodeStateAsUpdate(this.doc, fromBase64(sv));
    if (diff.length > 2) this.sendUpdate(diff);
    this.sendAwareness([this.doc.clientID]);
    if (reply) this.send('hello', { sv: toBase64(Y.encodeStateVector(this.doc)), reply: false });
  }

  send(event, payload) {
    if (!this.channel || !this.connected) return;
    this.channel.send({ type: 'broadcast', event, payload });
  }

  sendUpdate(update) {
    // Oversized diffs are skipped; peers still get them by reloading from storage.
    if (update.length <= MAX_MESSAGE) this.send('update', { u: toBase64(update) });
  }

  sendAwareness(clients) {
    const known = clients.filter((id) => this.awareness.getStates().has(id) || id === this.doc.clientID);
    if (known.length) this.send('awareness', { u: toBase64(awarenessProtocol.encodeAwarenessUpdate(this.awareness, known)) });
  }

  scheduleSend() {
    this.sendTimer ??= setTimeout(() => this.flush(), SEND_EVERY_MS);
  }

  flush() {
    clearTimeout(this.sendTimer);
    this.sendTimer = null;
    if (this.outgoing.length) {
      this.sendUpdate(Y.mergeUpdates(this.outgoing));
      this.outgoing = [];
    }
    if (this.changedClients.size) {
      this.sendAwareness([...this.changedClients]);
      this.changedClients.clear();
    }
  }

  async save({ beacon = false } = {}) {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.unsaved.length) return;
    const batch = this.unsaved;
    this.unsaved = [];
    const body = JSON.stringify({ u: toBase64(Y.mergeUpdates(batch)) });
    const url = `/api/pads/${this.padId}`;
    if (beacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) return;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
      if (!res.ok) throw new Error(`save returned ${res.status}`);
    } catch (err) {
      console.error('Could not save pad', err);
      this.unsaved.unshift(...batch); // keep it for the next attempt
      this.saveTimer ??= setTimeout(() => this.save(), SAVE_EVERY_MS * 3);
    }
  }

  destroy() {
    this.onPageHide();
    this.destroyed = true;
    this.connected = false;
    this.handlers = {}; // the page is gone; nobody is listening any more
    window.removeEventListener('pagehide', this.onPageHide);
    this.doc.off('update', this.onDocUpdate);
    this.awareness.off('update', this.onAwarenessUpdate);
    this.awareness.destroy();
    if (this.channel) supabase().removeChannel(this.channel);
  }
}
