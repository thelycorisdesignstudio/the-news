import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import FilterBar from './FilterBar';
import ArticleCard from './ArticleCard';
import Footer from './Footer';

export default function Feed() {
  const { articles, loading, pagination, loadMore } = useApp();
  const sentinelRef = useRef(null);

  const onIntersect = useCallback(([entry]) => {
    if (entry.isIntersecting && !loading) loadMore();
  }, [loading, loadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(onIntersect, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect]);

  return (
    <div className="view">
      <FilterBar />
      <div className="feed-list">
        {articles.map(article => (
          <ArticleCard key={article._id} article={article} />
        ))}

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">loading stories...</div>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <div className="empty-line" style={{ width: 40, height: 3 }} />
              <div className="empty-line" style={{ width: 28, height: 3 }} />
              <div className="empty-line" style={{ width: 34, height: 3 }} />
            </div>
            <div className="empty-title">nothing here yet.</div>
            <div className="empty-sub">check back soon or read another section.</div>
          </div>
        )}

        {pagination.page < pagination.pages && (
          <div ref={sentinelRef} style={{ height: 1 }} />
        )}
      </div>
      <Footer />
    </div>
  );
}
