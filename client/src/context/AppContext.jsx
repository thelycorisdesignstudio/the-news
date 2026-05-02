import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchArticles, fetchCategories, fetchInteractions, toggleInteraction } from '../api';

const AppContext = createContext(null);

function getSessionId() {
  let id = localStorage.getItem('thenews_session');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('thenews_session', id);
  }
  return id;
}

export function AppProvider({ children }) {
  const [view, setView] = useState('landing');
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentArticle, setCurrentArticle] = useState(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [likes, setLikes] = useState(new Set());
  const [bookmarks, setBookmarks] = useState(new Set());
  const sessionId = useRef(getSessionId());

  const loadArticles = useCallback(async (category = activeCategory, page = 1) => {
    setLoading(true);
    try {
      const data = await fetchArticles({ category, page });
      if (page === 1) {
        setArticles(data.articles);
      } else {
        setArticles(prev => [...prev, ...data.articles]);
      }
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      if (cats.length > 0) setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadInteractions = useCallback(async () => {
    try {
      const data = await fetchInteractions(sessionId.current);
      setLikes(new Set(data.likes));
      setBookmarks(new Set(data.bookmarks));
    } catch (err) {
      console.error('Failed to load interactions:', err);
    }
  }, []);

  const showFeed = useCallback(() => {
    setView('feed');
    loadArticles('All', 1);
    loadCategories();
    loadInteractions();
  }, [loadArticles, loadCategories, loadInteractions]);

  const showHome = useCallback(() => {
    setView('landing');
    setReaderOpen(false);
  }, []);

  const changeCategory = useCallback((cat) => {
    setActiveCategory(cat);
    loadArticles(cat, 1);
  }, [loadArticles]);

  const loadMore = useCallback(() => {
    if (pagination.page < pagination.pages && !loading) {
      loadArticles(activeCategory, pagination.page + 1);
    }
  }, [pagination, loading, activeCategory, loadArticles]);

  const openArticle = useCallback((article) => {
    setCurrentArticle(article);
    setReaderOpen(true);
  }, []);

  const closeReader = useCallback(() => {
    setReaderOpen(false);
    setTimeout(() => setCurrentArticle(null), 250);
  }, []);

  const nextArticle = useCallback(() => {
    if (!currentArticle) return;
    const idx = articles.findIndex(a => a._id === currentArticle._id);
    const next = articles[(idx + 1) % articles.length];
    setCurrentArticle(next);
  }, [currentArticle, articles]);

  const toggleLike = useCallback(async (articleId) => {
    try {
      const result = await toggleInteraction(sessionId.current, articleId, 'like');
      setLikes(prev => {
        const next = new Set(prev);
        if (result.action === 'added') next.add(articleId);
        else next.delete(articleId);
        return next;
      });
      return result.action;
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  }, []);

  const toggleBookmark = useCallback(async (articleId) => {
    try {
      const result = await toggleInteraction(sessionId.current, articleId, 'bookmark');
      setBookmarks(prev => {
        const next = new Set(prev);
        if (result.action === 'added') next.add(articleId);
        else next.delete(articleId);
        return next;
      });
      return result.action;
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  }, []);

  const value = {
    view, setView, showFeed, showHome,
    articles, loading, pagination, loadMore,
    categories, activeCategory, changeCategory,
    currentArticle, readerOpen, openArticle, closeReader, nextArticle,
    likes, bookmarks, toggleLike, toggleBookmark,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
