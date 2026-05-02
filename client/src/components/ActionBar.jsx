import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { HeartIcon, ShareIcon, BookmarkIcon } from './Icons';

export default function ActionBar() {
  const { currentArticle, likes, bookmarks, toggleLike, toggleBookmark } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [bursting, setBursting] = useState(false);
  const tooltipTimer = useRef(null);

  if (!currentArticle) return null;

  const articleId = currentArticle._id;
  const isLiked = likes.has(articleId);
  const isBookmarked = bookmarks.has(articleId);

  const handleLike = async () => {
    const action = await toggleLike(articleId);
    if (action === 'added') {
      setBursting(true);
      setTimeout(() => setBursting(false), 300);
    }
    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: currentArticle.title, url: currentArticle.sourceUrl });
    } else {
      navigator.clipboard.writeText(currentArticle.sourceUrl).catch(() => {});
      setShowTooltip(true);
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => setShowTooltip(false), 1500);
    }
  };

  const handleBookmark = () => {
    toggleBookmark(articleId);
  };

  return (
    <div className="action-bar">
      <button
        className={`action-btn${isLiked ? ' liked' : ''}${bouncing ? ' like-btn bounce' : ''}`}
        onClick={handleLike}
      >
        <div className={`like-burst${bursting ? ' pop' : ''}`} />
        <HeartIcon style={isLiked ? { fill: 'var(--alert)', stroke: 'var(--alert)' } : {}} />
      </button>

      <button className="action-btn" onClick={handleShare}>
        <span className={`tooltip${showTooltip ? ' show' : ''}`}>copied.</span>
        <ShareIcon />
      </button>

      <button
        className={`action-btn${isBookmarked ? ' bookmarked' : ''}`}
        onClick={handleBookmark}
      >
        <BookmarkIcon style={isBookmarked ? { fill: 'var(--signal)', stroke: 'var(--signal)' } : {}} />
      </button>
    </div>
  );
}
