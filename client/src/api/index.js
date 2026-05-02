import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export async function fetchArticles({ category = 'All', page = 1, limit = 30, search } = {}) {
  const params = { page, limit };
  if (category && category !== 'All') params.category = category;
  if (search) params.search = search;
  const { data } = await api.get('/articles', { params });
  return data;
}

export async function fetchArticleById(id) {
  const { data } = await api.get(`/articles/${id}`);
  return data;
}

export async function fetchCategories() {
  const { data } = await api.get('/articles/categories');
  return data.categories;
}

export async function toggleInteraction(sessionId, articleId, type) {
  const { data } = await api.post('/interactions', { sessionId, articleId, type });
  return data;
}

export async function fetchInteractions(sessionId) {
  const { data } = await api.get(`/interactions/${sessionId}`);
  return data;
}

export async function triggerNewsFetch() {
  const { data } = await api.post('/fetch-news');
  return data;
}

export default api;
