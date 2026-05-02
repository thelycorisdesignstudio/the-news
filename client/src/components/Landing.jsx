import { useApp } from '../context/AppContext';
import { NewspaperIcon3D, ZapIcon3D, ShieldIcon3D } from './Icons';
import Footer from './Footer';

const CATEGORIES = [
  'AI Models', 'AI Policy', 'AI Research', 'AI Tools',
  'AI Business', 'AI & Society', 'Quantum', 'Robotics',
  'Big Tech', 'Startups'
];

export default function Landing() {
  const { showFeed } = useApp();

  return (
    <div className="view">
      <div className="hero">
        <div className="hero-eyebrow">a Lycoris product</div>
        <h1 className="hero-headline">be dangerously<br />well informed.</h1>
        <p className="hero-sub">
          nine seconds. the whole picture. curated AI and tech news from the
          world's most trusted sources — no ads, no algorithm, no noise.
        </p>
        <button className="hero-cta" onClick={showFeed}>start reading free</button>
        <p className="hero-note">no account required · read instantly</p>
      </div>

      <div className="section-header">what we cover</div>
      <div className="cats-strip">
        {CATEGORIES.map(cat => (
          <span key={cat} className="cat-pill-land">{cat}</span>
        ))}
      </div>

      <div className="section-header">why the news</div>
      <div className="feature-cards">
        <div className="feature-card">
          <div className="fc-icon-wrap">
            <NewspaperIcon3D />
          </div>
          <div className="fc-label">Source-First Feed</div>
          <div className="fc-title">Headlines straight from the source.</div>
          <div className="fc-body">
            Every story links directly to BBC, TechCrunch, MIT Tech Review,
            The Verge, Bloomberg, The Economist, and Reuters. We don't rewrite. We curate.
          </div>
        </div>
        <div className="feature-card">
          <div className="fc-icon-wrap">
            <ZapIcon3D />
          </div>
          <div className="fc-label">9-Second Format</div>
          <div className="fc-title">Calibrated to how your brain actually reads.</div>
          <div className="fc-body">
            Neuroscience research on reading speed informed our format.
            A title, a summary, a source. Nothing more. Nine seconds. Everything you need.
          </div>
        </div>
        <div className="feature-card">
          <div className="fc-icon-wrap">
            <ShieldIcon3D />
          </div>
          <div className="fc-label">Zero Noise</div>
          <div className="fc-title">No algorithm. No engagement trap.</div>
          <div className="fc-body">
            The News does not optimize for clicks or outrage. It optimizes for
            comprehension. The order is editorial. The selection is human.
          </div>
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-item">
          <div className="stat-num">9s</div>
          <div className="stat-label">avg. read time</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-num">12+</div>
          <div className="stat-label">trusted sources</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-num">0</div>
          <div className="stat-label">ads, ever</div>
        </div>
      </div>

      <div className="final-cta">
        <div className="final-title">start reading now.</div>
        <p className="final-sub">
          it takes four seconds to open.<br />
          it takes nine to be informed.
        </p>
        <button className="hero-cta" onClick={showFeed}>start reading free</button>
      </div>

      <Footer />
    </div>
  );
}
