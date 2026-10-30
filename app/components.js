'use client';
// Small interactive pieces used by the landing page.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ThemeToggle({ id }) {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('riff:theme', next); } catch {}
  };
  return (
    <button id={id} className="icon-btn" title="Toggle theme" aria-label="Toggle theme" onClick={toggle}>
      <svg className="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      <svg className="moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
    </button>
  );
}

/** Pressing N anywhere outside a text field starts a new pad. */
export function NewPadShortcut() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      router.push('/new');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [router]);
  return null;
}

const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

export function RecentPads() {
  const [pads, setPads] = useState([]);
  useEffect(() => {
    try { setPads(JSON.parse(localStorage.getItem('riff:recent')) || []); } catch {}
  }, []);
  if (!pads.length) return null;
  return (
    <section className="recent">
      <h2>Your recent pads</h2>
      <ol>
        {pads.map((p) => (
          <li key={p.id}>
            <a href={`/p/${p.id}`}>
              <span className="r-title">{p.title}</span>
              <span className="r-lang">{p.language}</span>
              <span className="r-time">{ago(p.at)}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
