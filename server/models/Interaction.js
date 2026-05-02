const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  type: { type: String, enum: ['like', 'bookmark'], required: true },
}, {
  timestamps: true,
});

interactionSchema.index({ sessionId: 1, articleId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Interaction', interactionSchema);
