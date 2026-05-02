require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const articleRoutes = require('./routes/articles');
const interactionRoutes = require('./routes/interactions');
const { fetchAllFeeds } = require('./services/newsFetcher');
const { buildSeedDocuments } = require('./services/seedArticles');
const Article = require('./models/Article');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/articles', articleRoutes);
app.use('/api/interactions', interactionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/fetch-news', async (_req, res) => {
  try {
    const count = await fetchAllFeeds();
    res.json({ success: true, processed: count });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

connectDB().then(async () => {
  const count = await Article.countDocuments();
  if (count === 0) {
    console.log('Database empty — seeding with curated articles...');
    const seeds = buildSeedDocuments();
    await Article.insertMany(seeds, { ordered: false }).catch(() => {});
    console.log(`Seeded ${seeds.length} articles.`);
  }

  fetchAllFeeds().catch(err => console.error('Initial fetch failed:', err.message));

  cron.schedule('*/30 * * * *', () => {
    fetchAllFeeds().catch(err => console.error('Cron fetch failed:', err.message));
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
