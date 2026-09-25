#!/usr/bin/env node
// Pushes collected news into a running server's pipeline (dedupe, write-up, publish).
// Usage: APP_ORIGIN=https://your.app ADMIN_TOKEN=… node scripts/push-items.mjs file.json
// The file is { batches: [{ source: { name, level?, country?, beat? }, items: [{ title, url, excerpt, publishedAt, outlet? }] }] }.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/push-items.mjs <file.json>'); process.exit(1); }
const origin = (process.env.APP_ORIGIN || 'http://localhost:8787').replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN;
if (!token) { console.error('set ADMIN_TOKEN'); process.exit(1); }

const { batches } = JSON.parse(readFileSync(file, 'utf8'));
let published = 0, merged = 0, skipped = 0;
for (const b of batches) {
  const res = await fetch(`${origin}/api/admin/ingest/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(b),
  });
  const r = await res.json();
  if (!res.ok) { console.error(`${b.source.name}: ${res.status} ${r.error ?? ''} ${(r.issues ?? []).join('; ')}`); continue; }
  published += r.published.length; merged += r.merged; skipped += r.skipped;
  console.log(`${b.source.name}: ${r.published.length} published, ${r.merged} merged, ${r.skipped} skipped`);
}
console.log(`done: ${published} published, ${merged} merged, ${skipped} skipped`);
