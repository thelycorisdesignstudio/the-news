import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import ActionBar from './ActionBar';
import { ArrowLeftIcon, ExternalLinkIcon } from './Icons';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export default function Reader() {
  const { currentArticle, readerOpen, closeReader, nextArticle } = useApp();
  const timerRef = useRef(null);
  const fillRef = useRef(null);
  const [promptVisible, setPromptVisible] = useState(false);

  useEffect(() => {
    if (readerOpen && currentArticle) {
      setPromptVisible(false);
      const fill = fillRef.current;
      if (fill) {
        fill.classList.remove('running');
        fill.style.transition = 'none';
        fill.style.width = '100%';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fill.classList.add('running');
            fill.style.width = '0%';
          });
        });
      }

      timerRef.current = setTimeout(() => setPromptVisible(true), 9000);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [readerOpen, currentArticle]);

  const handleClose = () => {
    closeReader();
    document.body.style.overflow = '';
    const fill = fillRef.current;
    if (fill) {
      fill.classList.remove('running');
      fill.style.transition = 'none';
      fill.style.width = '100%';
    }
  };

  if (!currentArticle) return null;

  return (
    <div className={`reader-overlay${readerOpen ? ' open' : ''}`}>
      <div className="reader-nav">
        <button className="nav-back" onClick={handleClose}>
          <ArrowLeftIcon style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Feed
        </button>
        <span className="reader-cat-label">{currentArticle.category}</span>
      </div>

      <div className="timer-bar">
        <div className="timer-fill" ref={fillRef} />
      </div>

      <div className="reader-body">
        <span className="reader-pill">{currentArticle.category}</span>
        <div className="reader-title">{currentArticle.title}</div>
        <div className="reader-divider" />
        <div className="reader-summary">{currentArticle.summary}</div>
        <div className="reader-source">
          <div className="source-dot" />
          <span className="source-name">{currentArticle.source}</span>
          <span className="source-sep">·</span>
          <span className="source-time">{timeAgo(currentArticle.publishedAt)}</span>
        </div>
        <a
          className="read-link"
          href={currentArticle.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read full article <ExternalLinkIcon style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
        <div className={`timer-prompt${promptVisible ? ' visible' : ''}`}>
          nine seconds. that's it. keep reading? →
        </div>
        <button className="next-btn" onClick={nextArticle}>next story →</button>
      </div>

      <ActionBar />
    </div>
  );
}
