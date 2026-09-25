# The News

The day's most important stories in AI and technology, plus local and hyperlocal news, one full-screen card at a time. Nine seconds a story, and a finish line every day.

This is the production implementation of the Claude Design handoff in `project/` (primary design: `project/The News v2.dc.html`; the conversation behind it is in `chats/`, and the handoff notes are in `HANDOFF.md`).

## Run it

```bash
npm install
cp .env.example .env        # optional; sensible defaults work out of the box
npm run dev                 # API on :8787, app on http://localhost:5173
```

The app needs both halves. If log in says "we couldn't reach The News server", the API isn't running: start it with `npm run dev` (not `npm run dev:web` or `vite` alone) and check its output for errors. For a deployment, run `npm run build && npm start` on one Node host; a static host serving only `dist/` has no API behind it.

Sign-up codes and password-reset links are printed in the API log until `SMTP_URL` is set.

**Log in and sign up are dummies for now** (`DUMMY_AUTH`, on unless set to `0`): any email and password signs straight in. An unknown email gets an account on the spot, and there's no verification code and no lockout. Both screens say so in a small note.

**Auth is also in demo mode by default** (`DEMO_AUTH`, on unless set to `0`), so testing needs no inbox or OAuth setup:
- with `DUMMY_AUTH=0`, the verify screen shows your 6-digit code with a one-tap "fill it in";
- forgot-password offers the reset link right on screen;
- "Continue with Apple / Google" signs you straight in as a ready-made demo reader.

Set `DUMMY_AUTH=0` and `DEMO_AUTH=0` before launch; everything else (hashing, sessions, lockout) is already the production path.

Production:

```bash
npm run build               # typecheck + client build into dist/
npm start                   # one Node process serves the API and the built app on $PORT
```

Tests:

```bash
npm test                    # domain + API tests (Vitest, in-memory SQLite)
npm run build && npm run test:e2e   # full journey in an emulated iPhone (Playwright)
```

If Playwright can't download browsers in your environment, point it at an existing Chromium with `CHROMIUM_PATH=/path/to/chrome`.

## What's in the app

Every screen in the v2 design is built and wired to real data (see all of them in the screen gallery):

| Design | Where |
| --- | --- |
| Logo (wordmark + Nine symbol), signature gradient | `src/components/Brand.tsx`, `.grad-bg` in `src/styles.css`, app icons in `public/` |
| Live swipe feed, 07–13 card states | `src/screens/Feed.tsx`, `src/components/FeedCard.tsx` |
| C1–C8 account screens | `src/screens/Account.tsx` (+ reset-password and OAuth return) |
| 01–06, 04b, 04c onboarding | `src/screens/Launch.tsx`, `src/screens/Onboarding.tsx` |
| F1 filters, F2 add countries, F3 places | `Feed.tsx` (`FilterSheet`), `src/screens/Places.tsx` |
| L1–L6 loading and skeletons | `FeedSkeleton`, `ListSkeleton`, reader sheet, pull to refresh, `FindingLocal` |
| E1–E8 error and empty states | `Feed.tsx` (offline, didn't load, removed, nothing nearby), `LocationOff`, search no-results, `SessionExpired` in `App.tsx` |
| 14–17 list, reader, profile, saved | `Feed.tsx`, `src/screens/Profile.tsx` |

Brand rules from the design are kept: Rethink Sans only (self-hosted via `@fontsource-variable/rethink-sans`), Hugeicons free stroke icons only (`@hugeicons/react`), Ink & Signal colours, and the drifting gradient behind every screen. On phones the app runs full-bleed and respects safe areas; on wider screens it renders inside the 390 × 844 device from the mockups.

## Look and feel

- **Font:** Rethink Sans everywhere (self-hosted variable font, including the italic "The" of the wordmark).
- **Icons:** Hugeicons free stroke set only.
- **Logo:** one system: The News wordmark plus the "Nine" symbol (app icon, favicon).
- **Gradient:** the design's six-stop signature gradient drifts underneath; a peach field (upper right) and a blue field (lower left) orbit on separate clocks above it, so the two colours keep blending and shifting but are always both on screen. Transforms only, so it's cheap on the GPU; it stops for "reduce motion".
- **Theme:** light by default for every reader; Profile › Dark Mode still offers System / Light / Dark as in the design.
- **Feed:** full-screen, one story per gesture. Phones use native snap (like TikTok/Reels); wheel, trackpad, keyboard and mouse-drag glide exactly one story per flick, swallowing momentum so fast flicks never skip. Light haptic ticks on supporting devices; double-tap anywhere to like with a heart pop.
- **Motion:** screens fade out and rise in between steps; onboarding lists and account forms enter with a soft stagger.
- **Nine-second summaries:** every summary is at most 45 words (about nine seconds of reading). The ingest API rejects longer ones.

## How it works

- **Client**: React + TypeScript + Vite, installable as a PWA (`public/manifest.webmanifest`, `public/sw.js` for offline shell and push).
- **Server**: Express + SQLite (`better-sqlite3`), in `server/`. Schema migrations live in `server/db.ts`.
- **Shared domain**: `shared/domain.ts` holds the taxonomy, the full ISO country list, coverage levels, and `matchesFilters`, the one filtering rule used by both the feed API and the client.

### Accounts

- Email sign-up with a 6-digit code (10-minute expiry, 30-second resend cooldown, 5 tries per code).
- Passwords hashed with scrypt; sessions are random tokens stored hashed, sent as `httpOnly`, `SameSite=Lax` cookies, sliding 60-day expiry.
- Three wrong passwords trigger a 15-minute pause (the exact copy from C4); rate limiting per IP on all auth routes.
- Password reset by emailed link (30 minutes), which signs out every other session.
- Sign in with Google and Apple are implemented and switch on when their env vars are set; until then the buttons explain that email is the way in.
- Account deletion lives under Profile › About.

### Feed and preferences

- Preferences (topics, countries, coverage levels, places with per-place radius, filters, theme, notifications) are local-first and sync to the account with last-write-wins. If a session expires, reading continues and the E8 dialog offers to log back in.
- Saves, likes and reading history work offline: changes queue locally and flush when you're back online or signed in, and anything saved while signed out merges into the account.
- The day's queue stays stable while you read. It refreshes on pull-to-refresh, when filters change, or at launch after 30 minutes. Stories removed by the publisher become "no longer available" cards for readers who already had them.
- Hyperlocal stories are matched by distance from each saved place; "widen to N km" and "show {city} stories" fix an empty neighbourhood.
- Daily notification: web push at the reader's chosen local time, sent by the server once VAPID keys are configured.

## Deploy

One Node process serves the API and the built app. With Docker:

```bash
docker build -t the-news .
docker run -p 8787:8787 -v the-news-data:/data --env-file .env the-news
```

Or on any Node 22 host: `npm ci && npm run build && npm start`. Keep `DATABASE_PATH` on a persistent disk, and put it behind HTTPS with `APP_ORIGIN` set to the public URL. At startup the server warns about anything still in testing mode (dummy log in, demo helpers, a non-https origin, no Claude key). CI (`.github/workflows/ci.yml`) typechecks, runs the unit and browser tests, and builds on every push.

## Configuration

See `.env.example`. The ones that matter for production:

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Public URL, used in emails and OAuth redirects |
| `DATABASE_PATH` | SQLite file (put it on a persistent volume) |
| `SMTP_URL`, `MAIL_FROM` | Verification and reset emails |
| `GOOGLE_CLIENT_ID/SECRET` | Sign in with Google (redirect URI: `$APP_ORIGIN/api/auth/oauth/google/callback`) |
| `APPLE_*` | Sign in with Apple (redirect URI: `$APP_ORIGIN/api/auth/oauth/apple/callback`) |
| `VAPID_PUBLIC_KEY/PRIVATE_KEY` | Daily push notifications (`npx web-push generate-vapid-keys`) |
| `ADMIN_TOKEN` | Enables the story ingest API |
| `SEED_DEMO` | `1` re-stamps the bundled demo stories to today on boot. Defaults to off while live news is on |
| `LIVE_NEWS` | Real-time ingestion, on by default; `0` turns it off |
| `ANTHROPIC_API_KEY` | Claude writes each card (headline, nine-second summary, context, topic, level). Without it, a rule-based extractive writer is used |
| `NEWS_MODEL` | Model for write-ups, default `claude-opus-5` |
| `INGEST_MAX_PER_CYCLE` | Most articles written up per one-minute cycle (default 40) |
| `NEWS_FEEDS` | Extra feeds: `Name\|https://…/feed,https://…` |
| `READER`, `JINA_API_KEY` | Full-text reading via Jina Reader; `READER=0` disables it |
| `EXA`, `EXA_API_KEY`, `EXA_MCP_URL` | Exa news search: on by default through the free MCP endpoint; a key switches to the Exa API; `EXA=0` turns it off |
| `AGENT_REACH_BIN` | Path to the agent-reach CLI; its `doctor --json` report joins `/api/admin/sources` |
| `GEOCODER=nominatim` | Falls back to OpenStreetMap search for places outside the built-in gazetteer |

## Live news

`server/ingest/` gathers news through the channels [agent-reach](https://github.com/Panniantong/agent-reach) sets up for agents:

- **RSS** (agent-reach's web/RSS channel): 44 feeds. They cover world desks (BBC, Al Jazeera, The Guardian, NPR, DW, France 24, NHK, SCMP, The Straits Times, ABC), wires via Google News (Reuters, AP, Bloomberg), markets (Yahoo Finance, WSJ, CNBC, MarketWatch, The Economic Times), technology (TechCrunch, The Verge, Ars Technica, WIRED, MIT Technology Review, VentureBeat, NYT, Hacker News), science and health (Nature, ScienceDaily, NASA, WHO, STAT, BBC Health), security, robotics and quantum desks, and city desks for Bengaluru, Mumbai, London and San Francisco.
- **Exa search** (agent-reach's search channel): eight standing news searches (AI, chips, AI policy, startups, world, markets, science, health) catch what no feed carries. It speaks MCP to Exa's free endpoint (`mcp.exa.ai`, the one agent-reach registers with mcporter), so no key is needed; with `EXA_API_KEY` it uses the Exa API instead.
- **Jina Reader** (agent-reach's web channel): full article text when a feed only carries a teaser.

`scripts/setup-agent-reach.sh` installs the agent-reach CLI itself. With `AGENT_REACH_BIN` set, its `doctor --json` report shows up in `/api/admin/sources`. Its Twitter, Reddit and YouTube channels need a logged-in session on the machine; they're not used automatically.

- Each feed is polled on its own interval with conditional GET (`ETag`/`Last-Modified`). A failing feed backs off exponentially.
- The same article from several feeds is written up once. The same story from several outlets folds into one card, which moves up, and becomes breaking when three outlets carry it within three hours.
- Topics run from AI and technology to World, Markets, Science and Health. Sport results, celebrity gossip, lifestyle, horoscopes and deals are skipped. Summaries are held to 45 words and headlines to 90 characters whatever the writer returns.
- Open apps get new stories over `GET /api/stream` (server-sent events). New stories join the end of the reader's queue, so the card on screen never moves.

`GET /api/admin/sources` shows per-feed health, and `POST /api/admin/ingest` runs a cycle now (both need `ADMIN_TOKEN`).

## Content

The stories in `server/seed-data.ts` are the design's sample stories plus extra local, national, explainer and opinion stories so every filter has something to show. They are sample content, not real reporting. Feed real stories through the ingest API:

```bash
curl -X POST $APP_ORIGIN/api/admin/stories \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"stories":[{"id":"...","cat":"AI Models","topic":"AI Models","title":"...","summary":"...","source":"...","url":"https://...","publishedAt":"2026-09-24T08:00:00Z","level":"global","type":"news"}]}'

curl -X DELETE $APP_ORIGIN/api/admin/stories/<id> -H "Authorization: Bearer $ADMIN_TOKEN"   # publisher removed it
```

`level` is one of `global | national | state | city | hyper`; local stories also take `country`, `region`, `city`, `area`, `lat`, `lon`.

## Decisions to confirm

- **Logo**: one logo system: The News wordmark plus the "Nine" symbol (`LogoNine`), used for the app icon and favicon. Regenerate icons from `public/icon*.svg` with `node scripts/render-icons.mjs`.
- **Launch market**: sample places are in Bengaluru (as in the design), and the gazetteer in `server/geo.ts` also covers major cities in the other followed countries.
- **Additions the design didn't draw** but production needs: a log-out row, account deletion, reset-password page, privacy and terms pages, per-place range screen, notification time setting and reading history. They reuse the design's components.
- **Legal copy** on `/privacy` and `/terms` describes what the app actually stores, but it needs review before launch.
