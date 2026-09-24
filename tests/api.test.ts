import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { openDb, type DB } from '../server/db';
import { createApp } from '../server/app';
import { seedDemoStories } from '../server/stories';
import type { Mail } from '../server/mailer';
import { defaultPrefs, filtersFromPrefs, type Place, type Prefs } from '../shared/domain';
import { config } from '../server/config';

const HOME: Place = { id: 'home', kind: 'home', label: 'Home', area: 'Indiranagar', city: 'Bengaluru', region: 'Karnataka', country: 'IN', lat: 12.9784, lon: 77.6408, radiusKm: 3 };

let db: DB;
let sent: Mail[];
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDb(':memory:');
  seedDemoStories(db);
  sent = [];
  app = createApp({ db, mail: async m => { sent.push(m); } });
});

const codeFrom = (m: Mail) => /(\d{6})/.exec(m.subject)![1];

async function signUp(agent: ReturnType<typeof request.agent>, email = 'maya.chen@gmail.com') {
  await agent.post('/api/auth/signup').send({ name: 'Maya Chen', email, password: 'longpass123', terms: true }).expect(201);
  const code = codeFrom(sent.at(-1)!);
  const res = await agent.post('/api/auth/verify').send({ email, code }).expect(200);
  return res.body.user;
}

describe('accounts', () => {
  it('signs up, verifies by emailed code, and keeps a session', async () => {
    const agent = request.agent(app);
    const user = await signUp(agent);
    expect(user).toMatchObject({ name: 'Maya Chen', email: 'maya.chen@gmail.com', verified: true });
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe('maya.chen@gmail.com');
  });

  it('validates sign-up fields with the copy from the design', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Maya', email: 'maya.chen@gmail', password: 'short', terms: true }).expect(400);
    expect(res.body.fields.email).toBe('enter a full email address, like name@example.com.');
    expect(res.body.fields.password).toBe('use at least 8 characters, including a number.');
  });

  it('rejects a wrong code and an unverified login asks for verification', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({ name: 'A', email: 'a@b.co', password: 'longpass123', terms: true }).expect(201);
    const wrong = await agent.post('/api/auth/verify').send({ email: 'a@b.co', code: '000000' === codeFrom(sent[0]) ? '111111' : '000000' }).expect(400);
    expect(wrong.body.code).toBe('code_wrong');
    const login = await agent.post('/api/auth/login').send({ email: 'a@b.co', password: 'longpass123' }).expect(403);
    expect(login.body.code).toBe('needs_verification');
  });

  it('counts down attempts, then pauses for 15 minutes', async () => {
    const agent = request.agent(app);
    await signUp(agent);
    const bad = () => request(app).post('/api/auth/login').send({ email: 'maya.chen@gmail.com', password: 'wrongpass1' });
    const r1 = await bad();
    expect(r1.status).toBe(401);
    expect(r1.body.error).toBe("that email and password don't match. check them and try again.");
    expect(r1.body.fields.password).toBe('incorrect password. 2 attempts left before a 15-minute pause.');
    expect((await bad()).body.attemptsLeft).toBe(1);
    const r3 = await bad();
    expect(r3.status).toBe(423);
    const good = await request(app).post('/api/auth/login').send({ email: 'maya.chen@gmail.com', password: 'longpass123' });
    expect(good.status).toBe(423);
  });

  it('resets a password from the emailed link and signs out other sessions', async () => {
    const agent = request.agent(app);
    await signUp(agent);
    await request(app).post('/api/auth/forgot').send({ email: 'maya.chen@gmail.com' }).expect(200);
    const token = /token=([\w-]+)/.exec(sent.at(-1)!.text)![1];
    const fresh = request.agent(app);
    await fresh.post('/api/auth/reset').send({ token, password: 'newpass456' }).expect(200);
    expect((await agent.get('/api/auth/me')).body.sessionExpired).toBe(true);
    await request(app).post('/api/auth/login').send({ email: 'maya.chen@gmail.com', password: 'newpass456' }).expect(200);
    await fresh.post('/api/auth/reset').send({ token, password: 'another789' }).expect(400);
  });

  it('forgot-password answers the same for unknown emails', async () => {
    await request(app).post('/api/auth/forgot').send({ email: 'nobody@example.com' }).expect(200);
    expect(sent).toHaveLength(0);
  });

  it('reports a stale session cookie as expired on protected routes', async () => {
    const res = await request(app).get('/api/prefs').set('Cookie', 'tn_session=stale').expect(401);
    expect(res.body.code).toBe('session_expired');
  });
});

describe('feed', () => {
  const prefs = (over: Partial<Prefs> = {}): Prefs => ({
    ...defaultPrefs(), topics: ['AI Models', 'AI Policy'], countries: ['IN', 'US', 'GB'], coverage: ['global', 'national', 'city', 'hyper'], places: [HOME], ...over,
  });

  it('matches topics, countries, city and hyperlocal radius', async () => {
    const p = prefs();
    const res = await request(app).post('/api/feed').send({ filters: filtersFromPrefs(p), places: p.places }).expect(200);
    const ids = res.body.stories.map((s: { id: string }) => s.id);
    expect(ids[0]).toBe('brk');
    expect(ids).toEqual(expect.arrayContaining(['gpt5', 'eu', 'metro', 'fest', 'in-gpu', 'uk-aisi']));
    expect(ids).not.toContain('wf-water'); // Whitefield is ~11 km from Indiranagar, outside 3 km
    expect(ids).not.toContain('mum-road'); // different city
    expect(ids).not.toContain('sg-ai'); // Singapore not followed
    const fest = res.body.stories.find((s: { id: string }) => s.id === 'fest');
    expect(fest.distanceKm).toBeCloseTo(1.2, 1);
  });

  it('widening the radius brings in more hyperlocal stories', async () => {
    const p = prefs({ places: [{ ...HOME, radiusKm: 10 }] });
    const res = await request(app).post('/api/feed/count').send({ filters: filtersFromPrefs(p), places: p.places }).expect(200);
    const narrow = await request(app).post('/api/feed/count').send({ filters: filtersFromPrefs(prefs()), places: [HOME] });
    expect(res.body.count).toBeGreaterThan(narrow.body.count);
  });

  it('empty filter groups mean "any"', async () => {
    const all = await request(app).post('/api/feed/count').send({ filters: { cov: [], cty: [], plc: [], top: [], typ: [] }, places: [] }).expect(200);
    const typed = await request(app).post('/api/feed/count').send({ filters: { cov: [], cty: [], plc: [], top: [], typ: ['Opinion'] }, places: [] });
    expect(all.body.count).toBeGreaterThan(10);
    expect(typed.body.count).toBe(1);
  });

  it('removed stories become tombstones only for readers who already had them', async () => {
    config.adminToken = 'test-admin';
    await request(app).delete('/api/admin/stories/eu').set('Authorization', 'Bearer test-admin').expect(200);
    const f = { cov: [], cty: [], plc: [], top: [], typ: [] };
    const kept = await request(app).post('/api/feed').send({ filters: f, keep: ['eu'] });
    expect(kept.body.stories.find((s: { id: string }) => s.id === 'eu')).toMatchObject({ removed: true, title: '' });
    const fresh = await request(app).post('/api/feed').send({ filters: f });
    expect(fresh.body.stories.find((s: { id: string }) => s.id === 'eu')).toBeUndefined();
    await request(app).get('/api/stories/eu').expect(410);
    await request(app).delete('/api/admin/stories/eu').set('Authorization', 'Bearer wrong-token').expect(401);
  });

  it('serves the full story with context paragraphs', async () => {
    const res = await request(app).get('/api/stories/gpt5').expect(200);
    expect(res.body.story.more).toHaveLength(3);
  });
});

describe('sync', () => {
  it('stores preferences with last-write-wins', async () => {
    const agent = request.agent(app);
    await signUp(agent);
    const p = { ...defaultPrefs(), topics: ['Robotics'], updatedAt: 200 };
    await agent.put('/api/prefs').send({ prefs: p }).expect(200);
    const older = await agent.put('/api/prefs').send({ prefs: { ...p, topics: ['Space'], updatedAt: 100 } }).expect(200);
    expect(older.body.prefs.topics).toEqual(['Robotics']);
    expect((await agent.get('/api/prefs')).body.prefs.topics).toEqual(['Robotics']);
  });

  it('saves, likes, history and guest merge', async () => {
    const agent = request.agent(app);
    await signUp(agent);
    await agent.put('/api/saved/gpt5').expect(200);
    await agent.put('/api/liked/nv').expect(200);
    await agent.post('/api/history').send({ ids: ['gpt5', 'eu'] }).expect(200);
    const merged = await agent.post('/api/library/merge').send({ saved: [{ id: 'metro', at: 1 }], liked: ['qc'], history: [] }).expect(200);
    expect(merged.body.saved.map((s: { story: { id: string } }) => s.story.id).sort()).toEqual(['gpt5', 'metro']);
    expect(merged.body.liked.sort()).toEqual(['nv', 'qc']);
    expect(merged.body.history).toHaveLength(2);
    await agent.delete('/api/saved/gpt5').expect(200);
    expect((await agent.get('/api/library')).body.saved).toHaveLength(1);
  });

  it('geocodes from the built-in gazetteer', async () => {
    const s = await request(app).get('/api/geo/search?q=indira').expect(200);
    expect(s.body.places[0]).toMatchObject({ area: 'Indiranagar', city: 'Bengaluru', region: 'Karnataka', country: 'IN' });
    const r = await request(app).get('/api/geo/reverse?lat=12.936&lon=77.625').expect(200);
    expect(r.body.place.area).toBe('Koramangala');
  });
});
