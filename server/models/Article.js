const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      'AI Models', 'AI Policy', 'AI Research', 'AI Tools',
      'AI Business', 'AI & Society', 'Quantum', 'AI Hardware',
      'Big Tech', 'Startups', 'Robotics', 'Tech'
    ],
    default: 'Tech'
  },
  source: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  imageUrl: { type: String, default: null },
  publishedAt: { type: Date, required: true },
  fetchedAt: { type: Date, default: Date.now },
  guid: { type: String, unique: true, required: true },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

articleSchema.index({ publishedAt: -1 });
articleSchema.index({ category: 1, publishedAt: -1 });

module.exports = mongoose.model('Article', articleSchema);
