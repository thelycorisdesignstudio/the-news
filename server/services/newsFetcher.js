const RSSParser = require('rss-parser');
const Article = require('../models/Article');

const parser = new RSSParser({
  timeout: 15000,
  headers: { 'User-Agent': 'TheNews/1.0' },
});

const RSS_FEEDS = [
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Ars Technica' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC News' },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', source: 'NYT' },
  { url: 'https://feeds.reuters.com/reuters/technologyNews', source: 'Reuters' },
];

const CATEGORY_RULES = [
  { keywords: ['gpt', 'claude', 'gemini', 'llama', 'llm', 'language model', 'chatgpt', 'copilot ai', 'foundation model'], category: 'AI Models' },
  { keywords: ['ai regulation', 'ai act', 'ai policy', 'ai law', 'ai governance', 'ai safety bill', 'ai ban', 'regulate ai', 'ai ethics'], category: 'AI Policy' },
  { keywords: ['ai research', 'deepmind', 'interpretability', 'alignment', 'machine learning paper', 'neural network research', 'ai breakthrough'], category: 'AI Research' },
  { keywords: ['ai tool', 'cursor', 'copilot', 'ai coding', 'ai assistant', 'ai agent', 'chatbot', 'ai app', 'generative ai'], category: 'AI Tools' },
  { keywords: ['openai revenue', 'anthropic funding', 'ai startup funding', 'ai valuation', 'ai investment', 'ai deal', 'ai acquisition', 'ai ipo'], category: 'AI Business' },
  { keywords: ['ai job', 'ai society', 'ai bias', 'ai impact', 'deepfake', 'ai content', 'ai copyright', 'ai education'], category: 'AI & Society' },
  { keywords: ['quantum', 'qubit', 'quantum computing', 'quantum processor'], category: 'Quantum' },
  { keywords: ['nvidia', 'gpu', 'chip', 'semiconductor', 'tpu', 'ai hardware', 'ai chip', 'processor'], category: 'AI Hardware' },
  { keywords: ['apple', 'google', 'microsoft', 'amazon', 'meta', 'facebook', 'alphabet'], category: 'Big Tech' },
  { keywords: ['startup', 'series a', 'series b', 'series c', 'seed round', 'venture', 'yc ', 'y combinator', 'unicorn'], category: 'Startups' },
  { keywords: ['robot', 'robotics', 'humanoid', 'boston dynamics', 'figure', 'drone'], category: 'Robotics' },
];

function categorize(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return rule.category;
    }
  }
  if (text.includes('ai') || text.includes('artificial intelligence')) {
    return 'AI Tools';
  }
  return 'Tech';
}

function cleanHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function truncateSummary(text, maxLen = 350) {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastSentence = truncated.lastIndexOf('.');
  if (lastSentence > maxLen * 0.6) return truncated.substring(0, lastSentence + 1);
  return truncated + '...';
}

async function fetchFeed(feedConfig) {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    const articles = [];

    for (const item of feed.items.slice(0, 15)) {
      const title = cleanHtml(item.title);
      const rawSummary = cleanHtml(item.contentSnippet || item.content || item.summary || '');
      const summary = truncateSummary(rawSummary);

      if (!title || summary.length < 40) continue;

      const guid = item.guid || item.link || `${feedConfig.source}-${title}`;

      articles.push({
        title,
        summary,
        category: categorize(title, rawSummary),
        source: feedConfig.source,
        sourceUrl: item.link || '',
        imageUrl: item.enclosure?.url || null,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        guid,
      });
    }

    return articles;
  } catch (err) {
    console.error(`Failed to fetch ${feedConfig.source}: ${err.message}`);
    return [];
  }
}

async function fetchAllFeeds() {
  console.log(`[NewsFetcher] Starting fetch at ${new Date().toISOString()}`);
  let totalNew = 0;

  const results = await Promise.allSettled(
    RSS_FEEDS.map(feed => fetchFeed(feed))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;

    for (const article of result.value) {
      try {
        await Article.findOneAndUpdate(
          { guid: article.guid },
          { $setOnInsert: article },
          { upsert: true, new: false }
        );
        totalNew++;
      } catch (err) {
        if (err.code !== 11000) {
          console.error(`Failed to save article: ${err.message}`);
        }
      }
    }
  }

  console.log(`[NewsFetcher] Completed. Processed ${totalNew} articles.`);
  return totalNew;
}

module.exports = { fetchAllFeeds, fetchFeed, RSS_FEEDS };
