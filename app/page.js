import Link from 'next/link';
import { ThemeToggle, NewPadShortcut, RecentPads } from './components';

const RunIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></svg>
);

// Syntax-coloured lines for the product shot. k: keyword, f: function, n: number, p: punctuation.
const K = ({ children }) => <span className="s-k">{children}</span>;
const F = ({ children }) => <span className="s-f">{children}</span>;
const N = ({ children }) => <span className="s-n">{children}</span>;
const P = ({ children }) => <span className="s-p">{children}</span>;
const SHOT_CODE = [
  <><K>def</K> <F>two_sum</F><P>(</P>nums<P>,</P> target<P>):</P></>,
  <>    seen <P>=</P> <P>{'{}'}</P></>,
  <>    <K>for</K> i<P>,</P> n <K>in</K> <F>enumerate</F><P>(</P>nums<P>):</P></>,
  <>        <K>if</K> target <P>-</P> n <K>in</K> seen<P>:</P></>,
  <>            <K>return</K> <P>[</P>seen<P>[</P>target <P>-</P> n<P>],</P> i<P>]</P></>,
  <>        seen<P>[</P>n<P>]</P> <P>=</P> i</>,
  <></>,
  <><F>print</F><P>(</P>two_sum<P>([</P><N>2</N><P>,</P> <N>7</N><P>,</P> <N>11</N><P>,</P> <N>15</N><P>],</P> <N>9</N><P>))</P>
    <span className="rc" style={{ '--c': '#74ddb4' }}><em>Sam</em></span></>,
];

const DETAILS = [
  ['Languages', 'Python 3.14, JavaScript (Node 24), TypeScript (Deno), Go 1.26, Rust 1.93, Java 25, C++ (g++ 15), C (gcc 15), Ruby 4.0, PHP 8.5, Bash 5.2'],
  ['Running code', 'Runs in an isolated sandbox with no network access. Each run gets up to 30 seconds and 512 MB of memory.'],
  ['Sync', 'Every keystroke, with live cursors and name tags. The status bar shows who is typing.'],
  ['Saving', 'Pads save automatically as you type. Come back to the same link later and your code is still there.'],
  ['Accounts', 'None. You pick a name and a cursor colour when you join a pad.'],
  ['Privacy', "Anyone with a pad's link can read and edit it, so don't paste passwords or keys."],
  ['Good for', 'Technical interviews, pairing with a teammate, teaching, and sharing a snippet that someone can actually run.'],
];

export default function Home() {
  return (
    <div className="home">
      <NewPadShortcut />
      <header className="home-bar">
        <Link className="brand" href="/"><img src="/logo.svg" alt="" width="22" height="22" /><span>riff</span></Link>
        <nav className="home-links">
          <a href="#how">How it works</a>
          <a href="#details">Details</a>
          <ThemeToggle />
          <Link className="btn primary" href="/new">New pad</Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>A code pad you share with a link.</h1>
          <p className="lede">
            Open a pad, send the link, and write code with someone else in the same file at the same time. Run it in 11
            languages and you both see the output.
          </p>
          <div className="actions">
            <Link className="btn primary lg" href="/new">New pad <kbd className="kbd-in">N</kbd></Link>
            <span className="note">No account. Pick a name when you join.</span>
          </div>
        </section>

        {/* A static copy of the real pad UI, built from the same styles as the app. */}
        <section className="shot" aria-label="What a pad looks like">
          <div className="shot-frame">
            <div className="shot-bar">
              <span className="brand"><img src="/logo.svg" alt="" width="18" height="18" /></span>
              <span className="slash">/</span>
              <span className="shot-title">Two sum, warm-up</span>
              <span className="grow" />
              <span className="shot-live"><i className="status" data-state="connected" />2 here</span>
              <span className="shot-avatars"><b style={{ '--c': '#7ab8ff' }}>KY</b><b style={{ '--c': '#74ddb4' }}>SA</b></span>
              <span className="shot-lang"><i className="lang-dot" style={{ '--dot': '#ffd43b' }} />Python</span>
              <span className="btn primary shot-run"><RunIcon />Run</span>
            </div>
            <div className="shot-body">
              <div className="shot-editor">
                <div className="tabs"><div className="tab"><i className="lang-dot" style={{ '--dot': '#ffd43b' }} />main.py</div></div>
                <pre className="shot-code">
                  {SHOT_CODE.map((line, i) => (
                    <span key={i}><span className="ln">{i + 1}</span>{line}{'\n'}</span>
                  ))}
                </pre>
              </div>
              <div className="shot-console">
                <div className="pane-head">
                  <span className="pane-title">Console</span>
                  <span className="output-meta">
                    <span className="by"><i style={{ background: '#7ab8ff' }} />Khizer</span>
                    <span className="badge ok">exit 0</span>
                    <span className="time">48 ms</span>
                  </span>
                </div>
                <div className="output">
                  <div className="prompt"><b>$</b> run main.py</div>
                  <pre>[0, 1]</pre>
                </div>
              </div>
            </div>
            <div className="statusbar">
              <span>Connected · changes save automatically</span>
              <span>Sam is typing</span>
              <span className="grow" />
              <span>Ln 6, Col 20</span>
              <span>Python</span>
            </div>
          </div>
        </section>

        <section id="how" className="how">
          <h2>How it works</h2>
          <ol>
            <li>
              <span className="step">1</span>
              <h3>Open a pad</h3>
              <p>Click New pad or press <kbd>N</kbd>. Name it, pick a language, and you're in.</p>
            </li>
            <li>
              <span className="step">2</span>
              <h3>Send the link</h3>
              <p>Whoever opens it types their name and lands in the same file, with their cursor and name tag visible to you.</p>
            </li>
            <li>
              <span className="step">3</span>
              <h3>Write and run</h3>
              <p>Edits sync on every keystroke. Press <kbd>⌘</kbd><kbd>↵</kbd> and the output shows up for everyone.</p>
            </li>
          </ol>
        </section>

        <section id="details" className="details">
          <h2>Details</h2>
          <dl>
            {DETAILS.map(([term, text]) => (
              <div key={term}><dt>{term}</dt><dd>{text}</dd></div>
            ))}
          </dl>
        </section>

        <RecentPads />

        <section className="closer">
          <p>Ready when you are.</p>
          <Link className="btn primary lg" href="/new">New pad <kbd className="kbd-in">N</kbd></Link>
        </section>
      </main>

      <footer className="home-foot">
        <span className="brand small"><img src="/logo.svg" alt="" width="16" height="16" /><span>riff</span></span>
        <span>Shared code pads</span>
      </footer>
    </div>
  );
}
