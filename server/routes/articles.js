const express = require('express');
const Article = require('../models/Article');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 30, search } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const [articles, total] = await Promise.all([
      Article.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limitNum).lean(),
      Article.countDocuments(filter),
    ]);

    res.json({
      articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const categories = await Article.distinct('category');
    res.json({ categories: ['All', ...categories.sort()] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

module.exports = router;
