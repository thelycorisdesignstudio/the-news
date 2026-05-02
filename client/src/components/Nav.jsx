import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Nav() {
  const { view, showFeed, showHome } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-wordmark" onClick={showHome}>
        <span className="nav-the">The</span>
        <span className="nav-news">News</span>
      </div>
      <div className="nav-right">
        {view === 'landing' ? (
          <>
            <button className="nav-link" onClick={showFeed}>Read Now</button>
            <button className="nav-cta" onClick={showFeed}>Start Reading</button>
          </>
        ) : (
          <>
            <button className="nav-link" onClick={showHome}>Home</button>
            <button className="nav-cta" onClick={showFeed}>Feed</button>
          </>
        )}
      </div>
    </nav>
  );
}
