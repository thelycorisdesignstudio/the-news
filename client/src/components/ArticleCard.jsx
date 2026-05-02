import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

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

export default function ArticleCard({ article }) {
  const { openArticle } = useApp();
  const [barWidth, setBarWidth] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setBarWidth(100), 2000);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const summary = article.summary.length > 120
    ? article.summary.substring(0, 120) + '...'
    : article.summary;

  return (
    <div className="art-card" ref={ref} onClick={() => openArticle(article)}>
      <span className="art-cat">{article.category}</span>
      <div className="art-title">{article.title}</div>
      <div className="art-summary">{summary}</div>
      <div className="art-meta">{article.source} · {timeAgo(article.publishedAt)}</div>
      <div className="art-bar">
        <div className="art-bar-fill" style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}
