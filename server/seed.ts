import { config } from './config';
import { openDb } from './db';
import { seedDemoStories } from './stories';

const db = openDb(config.databasePath);
seedDemoStories(db);
console.log('seeded demo stories into', config.databasePath);
