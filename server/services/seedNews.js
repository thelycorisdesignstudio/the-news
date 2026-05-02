require('dotenv').config();
const mongoose = require('mongoose');
const { fetchAllFeeds } = require('./newsFetcher');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const count = await fetchAllFeeds();
    console.log(`Seeded ${count} articles`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
