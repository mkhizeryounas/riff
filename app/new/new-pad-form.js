'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/languages';
import { COLORS, identity, setIdentity } from '@/lib/identity';
import { seedPad } from '@/lib/seed';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHABET[b % ALPHABET.length]).join('');
const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));

export default function NewPadForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  // Prefill your name and colour from last time; the pad name always starts empty.
  useEffect(() => {
    const me = identity();
    setName(me.name);
    setColor(me.color);
    titleRef.current?.focus();
  }, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Add your name so others know who is typing.');
    setBusy(true);
    setError('');
    const id = newId();
    try {
      // Save the starter before opening the pad, so anyone who follows the link sees it.
      const res = await fetch(`/api/pads/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ u: toBase64(seedPad({ title: title.trim() || 'Untitled pad', language })) }),
      });
      if (!res.ok) throw new Error();
      setIdentity({ name: name.trim(), color });
      sessionStorage.setItem(`riff:created:${id}`, '1');
      router.push(`/p/${id}`);
    } catch {
      setBusy(false);
      setError("Couldn't create the pad. Try again in a moment.");
    }
  }

  return (
    <form className="join-card new-card" onSubmit={create}>
      <Link className="brand" href="/"><img src="/logo.svg" alt="" width="20" height="20" /><span>riff</span></Link>
      <h2>New pad</h2>

      <label className="field">
        <span className="label">Pad name</span>
        <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Untitled pad" spellCheck={false} />
      </label>

      <label className="field">
        <span className="label">Language</span>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>

      <label className="field">
        <span className="label">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Your name" autoComplete="nickname" spellCheck={false} />
      </label>

      <div className="field">
        <span className="label">Colour</span>
        <div className="swatches">
          {COLORS.map((c) => (
            <button key={c} type="button" style={{ '--c': c }} className={c === color ? 'on' : ''} onClick={() => setColor(c)} aria-label={`Colour ${c}`} />
          ))}
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create pad'}</button>
    </form>
  );
}
