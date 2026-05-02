const express = require('express');
const Interaction = require('../models/Interaction');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { sessionId, articleId, type } = req.body;
    if (!sessionId || !articleId || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await Interaction.findOne({ sessionId, articleId, type });
    if (existing) {
      await Interaction.deleteOne({ _id: existing._id });
      return res.json({ action: 'removed' });
    }

    await Interaction.create({ sessionId, articleId, type });
    res.json({ action: 'added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save interaction' });
  }
});

router.get('/:sessionId', async (req, res) => {
  try {
    const interactions = await Interaction.find({ sessionId: req.params.sessionId }).lean();
    const likes = new Set();
    const bookmarks = new Set();

    for (const i of interactions) {
      if (i.type === 'like') likes.add(i.articleId.toString());
      if (i.type === 'bookmark') bookmarks.add(i.articleId.toString());
    }

    res.json({ likes: [...likes], bookmarks: [...bookmarks] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

module.exports = router;
