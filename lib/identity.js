// Your name and cursor colour, remembered per browser. No accounts needed.
export const COLORS = ['#ff9b85', '#7ab8ff', '#ffcf7a', '#b9a3ff', '#74ddb4', '#ff9ec9', '#6fd3e0', '#e3b5ff'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const KEY = 'riff:identity';

// The name stays empty until the person types one on the join screen.
export function identity() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.name) return COLORS.includes(saved.color) ? saved : { ...saved, color: pick(COLORS) };
  } catch {}
  return { name: '', color: pick(COLORS) };
}

export function setIdentity(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
  return value;
}
