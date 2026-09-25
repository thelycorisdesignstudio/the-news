import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Story, Theme } from '../../shared/domain';
import { LogoNine, Wordmark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { BackButton, Button, Dialog, EditorialMark, FieldError, Footer, Segmented, Switch, T, TextField, Title, useStagger } from '../components/ui';
import { FeedbackDialog } from '../components/Feedback';
import { api, ApiError } from '../lib/api';
import { cachedFeed } from '../lib/feed';
import { GlassBg } from '../components/Glass';
import { disableNotifications, enableNotifications } from '../lib/device';
import { useStore } from '../lib/store';
import { ReaderSheet } from './Feed';

function Row({ label, value, onClick, children, danger }: { label: string; value?: string; onClick?: () => void; children?: ReactNode; danger?: boolean }) {
  const inner = (
    <>
      <span style={{ flex: 1, font: '500 15px/1 var(--font)', color: danger ? 'var(--alert)' : 'var(--ink)' }}>{label}</span>
      {value && <span style={{ font: '400 13px/1 var(--font)', color: 'var(--gray)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>}
      {children ?? (onClick && !danger && <Icon name="arrow-right" size={18} color="var(--gray-2)" />)}
    </>
  );
  const style = { height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '.5px solid var(--rule)', flex: 'none' } as const;
  return onClick ? <button className="row-btn" onClick={onClick} style={style}>{inner}</button> : <div style={style}>{inner}</div>;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '·';

/** Consecutive days with at least one story read, counting back from today (or yesterday). */
function streak(history: { at: number }[]) {
  const days = new Set(history.map(h => new Date(h.at).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function Section({ title }: { title: string }) {
  return <span className="eyebrow" style={{ padding: '24px 20px 8px', flex: 'none' }}>{title}</span>;
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ font: '700 22px/1 var(--font)', letterSpacing: '-0.02em', color: 'var(--ink)' }}>{v}</span>
      <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{l}</span>
    </div>
  );
}

/** 16 · Profile & settings. From the avatar, top-left of the feed. */
export function Profile() {
  const nav = useNavigate();
  const { user, prefs, library, updatePrefs, logout } = useStore();
  const [feedback, setFeedback] = useState(false);
  const home = prefs.places.find(p => p.kind === 'home') ?? prefs.places[0];
  const since = user ? new Date(user.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' }).toLowerCase() : null;
  const stagger = useStagger();
  const read = library.history.length;
  const days = streak(library.history);
  const pace = prefs.paceMs ? `${(prefs.paceMs / 1000).toFixed(1)}s a story` : 'not set';
  const muted = prefs.mutedSources?.length ?? 0;
  return (
    <div className="screen">
      <div style={{ position: 'absolute', top: T(62), left: 20, right: 20, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button className="link-btn lg lg-icon" aria-label="back" onClick={() => nav('/')} style={{ position: 'absolute', left: -6 }}><GlassBg /><Icon name="arrow-left" size={20} /></button>
        <span style={{ font: '600 15px/1 var(--font)' }}>Profile</span>
      </div>
      <div className={`no-scrollbar ${stagger}`} style={{ position: 'absolute', top: T(100), left: 0, right: 0, bottom: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', maskImage: 'linear-gradient(transparent, #000 14px)', WebkitMaskImage: 'linear-gradient(transparent, #000 14px)' }}>
        <button className="row-btn" onClick={() => nav(user ? '/profile/edit' : '/login')} aria-label={user ? 'edit profile' : 'log in'}
          style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 16, flex: 'none' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--signal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 18px/1 var(--font)', color: 'var(--signal)', flex: 'none' }}>
            {user ? initials(user.name) : <Icon name="user" size={24} color="var(--signal)" />}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ font: '700 24px/1.1 var(--font)', letterSpacing: '-0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'not signed in'}</span>
            <span style={{ font: '400 13px/1.3 var(--font)', color: 'var(--gray)' }}>{since ? `reading since ${since}` : 'log in to sync your topics, places and saves.'}</span>
          </div>
          <Icon name="arrow-right" size={18} color="var(--gray-2)" />
        </button>
        <div className="card" style={{ margin: '20px 20px 0', padding: '16px 8px', display: 'flex', alignItems: 'center', flex: 'none' }}>
          <Stat v={read >= 200 ? '200+' : read} l="stories read" />
          <div style={{ width: 1, height: 28, background: 'var(--rule)' }} />
          <Stat v={library.saved.length} l="saved" />
          <div style={{ width: 1, height: 28, background: 'var(--rule)' }} />
          <Stat v={days} l="day streak" />
        </div>

        <Section title="your feed" />
        <Row label="Topics" value={`${prefs.topics.length} followed`} onClick={() => nav('/profile/topics')} />
        <Row label="Countries" value={`${prefs.countries.length} followed`} onClick={() => nav('/profile/countries')} />
        <Row label="Places" value={home ? `${home.area}, ${home.radiusKm} km` : 'none yet'} onClick={() => nav('/places')} />
        <Row label="Sources" value={muted ? `${muted} muted` : 'all'} onClick={() => nav('/profile/sources')} />

        <Section title="reading" />
        <Row label="Reading Pace" value={pace} onClick={() => nav('/profile/pace')} />
        <Row label="Text Size">
          <Segmented label="text size" value={prefs.textSize ?? 'md'} onChange={v => updatePrefs({ textSize: v })} style={{ width: 150, padding: 2 }}
            options={[{ v: 'sm', t: 'Aa-' }, { v: 'md', t: 'Aa' }, { v: 'lg', t: 'Aa+' }]} compact />
        </Row>
        <Row label="Feed Opens In">
          <Segmented label="feed opens in" value={prefs.defaultView ?? 'swipe'} onChange={v => updatePrefs({ defaultView: v })} style={{ width: 150, padding: 2 }}
            options={[{ v: 'swipe', t: 'Swipe' }, { v: 'list', t: 'List' }]} compact />
        </Row>
        <Row label="Haptics"><Switch label="haptics" on={prefs.haptics ?? true} onChange={v => updatePrefs({ haptics: v })} /></Row>
        <Row label="Reduce Motion"><Switch label="reduce motion" on={!!prefs.reduceMotion} onChange={v => updatePrefs({ reduceMotion: v })} /></Row>
        <Row label="Appearance">
          <Segmented label="appearance" value={prefs.theme} onChange={v => updatePrefs({ theme: v })} style={{ width: 186, padding: 2 }}
            options={[{ v: 'system', t: 'System' }, { v: 'light', t: 'Light' }, { v: 'dark', t: 'Dark' }] as { v: Theme; t: string }[]} compact />
        </Row>

        <Section title="library" />
        <Row label="Saved Stories" value={String(library.saved.length)} onClick={() => nav('/saved')} />
        <Row label="Reading History" value={read ? String(read) : undefined} onClick={() => nav('/history')} />
        <Row label="Notifications" value={prefs.notifications.enabled ? `daily, ${prefs.notifications.time.replace(/^0/, '')}` : 'off'} onClick={() => nav('/profile/notifications')} />

        <Section title="account" />
        {user && <Row label="Edit Profile" value={user.email} onClick={() => nav('/profile/edit')} />}
        <Row label="Send Feedback" onClick={() => setFeedback(true)} />
        <Row label="About The News" onClick={() => nav('/about')} />
        {user
          ? <Row label="Log Out" onClick={async () => { await logout(); nav('/welcome', { replace: true }); }}><Icon name="logout" size={18} color="var(--gray-2)" /></Row>
          : <Row label="Log In" onClick={() => nav('/login')} />}
        {/* Sits at the bottom when there's room, and scrolls with the rows on short screens. */}
        <div style={{ marginTop: 'auto', paddingTop: 28, paddingBottom: 'calc(var(--sb) + 14px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 'none' }}>
          <div style={{ opacity: 0.5 }}><Wordmark size="xs" /></div>
          <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>A Lycoris Product</span>
        </div>
      </div>
      {feedback && <FeedbackDialog context="profile" onClose={() => setFeedback(false)} />}
    </div>
  );
}

/** Your name (and, read-only, your email). */
export function EditProfile() {
  const nav = useNavigate();
  const { user, setAccount, showToast } = useStore();
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!user) nav('/login', { replace: true }); }, [user, nav]);
  if (!user) return null;
  const changed = name.trim() && name.trim() !== user.name;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!changed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.updateMe({ name: name.trim() });
      setAccount(r.user);
      showToast('saved.');
      nav('/profile');
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields.name || err.message) : 'something went wrong. try again.');
      setBusy(false);
    }
  };
  return (
    <form className="screen" onSubmit={save} noValidate>
      <BackButton to="/profile" />
      <Title sub="how you appear in The News.">edit profile.</Title>
      <div style={{ position: 'absolute', top: T(212), left: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Name" autoComplete="name" value={name} maxLength={80} onChange={e => setName(e.target.value)} error={error} disabled={busy} />
        <TextField label="Email" icon="mail" value={user.email} readOnly disabled />
      </div>
      <Footer>
        <Button type="submit" disabled={!changed} loading={busy}>{busy ? 'saving…' : 'save'}</Button>
      </Footer>
    </form>
  );
}

/** Outlets in your feed. Mute one and its stories leave the queue straight away. */
export function Sources() {
  const { prefs, updatePrefs } = useStore();
  const muted = prefs.mutedSources ?? [];
  const counts = new Map<string, number>();
  for (const s of cachedFeed()?.stories ?? []) if (!s.removed) counts.set(s.source, (counts.get(s.source) ?? 0) + 1);
  for (const m of muted) if (!counts.has(m)) counts.set(m, 0);
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const toggle = (src: string, show: boolean) => updatePrefs(p => ({ mutedSources: show ? (p.mutedSources ?? []).filter(x => x !== src) : [...(p.mutedSources ?? []), src] }));
  const stagger = useStagger();
  return (
    <div className="screen">
      <BackButton to="/profile" />
      <Title sub="turn off an outlet and its stories leave your feed. turn it back on anytime.">sources.</Title>
      {rows.length ? (
        <div className={`no-scrollbar ${stagger}`} style={{ position: 'absolute', top: T(222), left: 0, right: 0, bottom: 0, overflowY: 'auto', borderTop: '.5px solid var(--rule)', paddingBottom: 'calc(var(--sb) + 16px)', display: 'flex', flexDirection: 'column' }}>
          {rows.map(([src, n]) => (
            <Row key={src} label={src} value={n ? `${n} today` : undefined}>
              <Switch label={`show ${src}`} on={!muted.includes(src)} onChange={v => toggle(src, v)} />
            </Row>
          ))}
        </div>
      ) : <EmptyList title="no sources yet." body="open your feed first; the outlets in it show up here." />}
    </div>
  );
}

function StoryList({ items, onOpen, saved }: { items: { story: Story; at: number }[]; onOpen: (s: Story) => void; saved?: boolean }) {
  const { toggleSave } = useStore();
  const stagger = useStagger();
  const when = (at: number) => {
    const d = Math.floor((Date.now() - at) / 86400_000);
    if (d <= 0 && new Date(at).getDate() === new Date().getDate()) return 'today';
    if (d <= 1) return 'yesterday';
    if (d < 7) return new Date(at).toLocaleDateString('en', { weekday: 'short' }).toLowerCase();
    return new Date(at).toLocaleDateString('en', { day: 'numeric', month: 'short' }).toLowerCase();
  };
  return (
    <div className={`no-scrollbar ${stagger}`} style={{ position: 'absolute', top: T(164), left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: '0 16px', paddingBottom: 'calc(var(--sb) + 16px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map(({ story: s, at }) => (
        <div key={s.id} className="card" style={{ position: 'relative', flex: 'none' }}>
          <button className="row-btn" onClick={() => onOpen(s)} style={{ padding: saved ? '16px 48px 16px 16px' : 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <span className="pill-cat" style={{ padding: '4px 8px', fontSize: 10 }}>{s.cat}</span>
            <h4 style={{ margin: 0, font: '700 20px/1.25 var(--font)', letterSpacing: '-0.03em', color: 'var(--headline)', textWrap: 'pretty' }}>{s.title}</h4>
            <span style={{ font: '500 12px/1 var(--font)', color: 'var(--ink)' }}>{s.source} <span style={{ color: 'var(--gray)', fontWeight: 400 }}>· {saved ? `saved ${when(at)}` : `read ${when(at)}`}</span></span>
          </button>
          {saved && (
            <button aria-label="remove from saved" className="link-btn lg lg-icon lg-soft" onClick={() => toggleSave(s)} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32 }}>
              <GlassBg /><Icon name="bookmark-check" size={18} color="var(--signal)" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ListHeader({ title, count, action }: { title: string; count: string; action?: ReactNode }) {
  return (
    <div className="rise" style={{ position: 'absolute', top: T(108), left: 20, right: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <h2 style={{ margin: 0, font: '700 28px/1.1 var(--font)', letterSpacing: '-0.03em' }}>{title}</h2>
      {action ?? <span style={{ font: '400 13px/1 var(--font)', color: 'var(--gray)' }}>{count}</span>}
    </div>
  );
}

function EmptyList({ title, body }: { title: string; body: string }) {
  return (
    <div className="rise" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      <EditorialMark />
      <h3 style={{ margin: '24px 0 0', font: '700 24px/1.25 var(--font)', letterSpacing: '-0.03em' }}>{title}</h3>
      <p style={{ margin: '8px 0 0', maxWidth: 260, font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>{body}</p>
    </div>
  );
}

/** 17 · Saved stories, and its empty state. Available offline. */
export function Saved() {
  const { library } = useStore();
  const [open, setOpen] = useState<Story | null>(null);
  const n = library.saved.length;
  return (
    <div className="screen">
      <BackButton />
      <ListHeader title="saved stories." count={`${n} ${n === 1 ? 'story' : 'stories'}`} />
      {n ? <StoryList items={library.saved} onOpen={setOpen} saved /> : <EmptyList title="nothing saved yet." body="tap the bookmark icon on any story to save it here." />}
      {open && <ReaderSheet story={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function History() {
  const { library, clearHistory } = useStore();
  const [open, setOpen] = useState<Story | null>(null);
  const n = library.history.length;
  return (
    <div className="screen">
      <BackButton />
      <ListHeader title="reading history." count="" action={n ? <button className="link-btn" onClick={() => void clearHistory()} style={{ font: '500 14px/1 var(--font)', color: 'var(--gray)' }}>clear</button> : undefined} />
      {n ? <StoryList items={library.history} onOpen={setOpen} /> : <EmptyList title="nothing read yet." body="stories you spend a few seconds on show up here." />}
      {open && <ReaderSheet story={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function NotificationSettings() {
  const { prefs, updatePrefs, user, showToast } = useStore();
  const [busy, setBusy] = useState(false);
  const n = prefs.notifications;
  const blocked = 'Notification' in window && Notification.permission === 'denied';
  const toggle = async (on: boolean) => {
    if (!on) {
      updatePrefs({ notifications: { ...n, enabled: false } });
      void disableNotifications();
      return;
    }
    setBusy(true);
    const perm = await enableNotifications(!!user);
    setBusy(false);
    if (perm === 'granted') updatePrefs({ notifications: { ...n, enabled: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
    else showToast(perm === 'unsupported' ? "this browser can't show notifications." : 'allow notifications for this site in your settings, then try again.');
  };
  return (
    <div className="screen">
      <BackButton />
      <Title sub="your most important story, once a day. nothing else.">notifications.</Title>
      <div style={{ position: 'absolute', top: T(212), left: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ font: '600 15px/1.2 var(--font)' }}>daily story</span>
            <span style={{ font: '400 12px/1.4 var(--font)', color: 'var(--gray)' }}>{busy ? 'asking for permission…' : n.enabled ? `every day at ${n.time}` : 'off'}</span>
          </span>
          <Switch label="daily story" on={n.enabled} onChange={v => void toggle(v)} />
        </div>
        {n.enabled && (
          <TextField label="Time" type="time" value={n.time} onChange={e => e.target.value && updatePrefs({ notifications: { ...n, time: e.target.value, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })} />
        )}
        {blocked && <FieldError>notifications are blocked for this site. allow them in your browser or phone settings.</FieldError>}
      </div>
    </div>
  );
}

export function About() {
  const nav = useNavigate();
  const { user, deleteAccount, showToast } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="screen">
      <BackButton />
      <div className="no-scrollbar" style={{ position: 'absolute', top: T(108), left: 24, right: 24, bottom: 0, overflowY: 'auto', paddingBottom: 'calc(var(--sb) + 24px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><LogoNine size={40} /><Wordmark size="md" /></div>
        <p style={{ margin: '8px 0 0', font: '400 15px/1.7 var(--font)', color: 'var(--body)' }}>
          The day's most important stories in AI and technology, plus what's happening where you live. One full-screen card each, edited down to what happened, why it matters and who reported it. Nine seconds a story; a finish line every day.
        </p>
        <span style={{ font: '400 13px/1.4 var(--font)', color: 'var(--gray)' }}>nine seconds. the whole picture.</span>
        <div style={{ borderTop: '.5px solid var(--rule)', marginTop: 8 }}>
          {[['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']].map(([l, to]) => (
            <Link key={to} to={to} style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '.5px solid var(--rule)', font: '500 15px/1 var(--font)', color: 'var(--ink)' }}>
              <span style={{ flex: 1 }}>{l}</span><Icon name="arrow-right" size={18} color="var(--gray-2)" />
            </Link>
          ))}
          {user && (
            <button className="row-btn" onClick={() => setConfirm(true)} style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '.5px solid var(--rule)', font: '500 15px/1 var(--font)', color: 'var(--alert)', padding: 0 }}>
              <span style={{ flex: 1 }}>Delete Account</span><Icon name="delete" size={18} color="var(--alert)" />
            </button>
          )}
        </div>
        <span style={{ marginTop: 8, font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>version {import.meta.env.VITE_APP_VERSION ?? '1.0.0'} · A Lycoris Product</span>
      </div>
      {confirm && (
        <Dialog title="delete your account?" body="this removes your account, topics, places, saved stories and history from our servers. it can't be undone." onClose={() => { if (!busy) setConfirm(false); }}>
          <Button loading={busy} onClick={async () => {
            setBusy(true);
            try { await deleteAccount(); nav('/welcome', { replace: true }); } catch { showToast("couldn't delete your account. try again."); setBusy(false); }
          }} variant="danger">delete account</Button>
          <Button variant="light" onClick={() => setConfirm(false)}>cancel</Button>
        </Dialog>
      )}
    </div>
  );
}

function Legal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="screen">
      <BackButton />
      <div className="no-scrollbar" style={{ position: 'absolute', top: T(108), left: 24, right: 24, bottom: 0, overflowY: 'auto', paddingBottom: 'calc(var(--sb) + 24px)', font: '400 14px/1.7 var(--font)', color: 'var(--body)' }}>
        <h2 style={{ margin: '0 0 16px', font: '700 28px/1.15 var(--font)', letterSpacing: '-0.03em', color: 'var(--ink)' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const H = ({ children }: { children: ReactNode }) => <h3 className="eyebrow" style={{ margin: '24px 0 8px' }}>{children}</h3>;

export function Privacy() {
  return (
    <Legal title="privacy policy.">
      <p>The News keeps only what it needs to give you your feed.</p>
      <H>what we store</H>
      <p>Your name, email address and a scrambled (hashed) password; the topics, countries, coverage levels and places you choose; the stories you save, like and read; and, if you turn them on, a push subscription for your daily notification.</p>
      <H>location</H>
      <p>We only ask for your location when you tap "use my current location". We turn it into a neighbourhood name and keep that place, not a history of where you've been. "Follow me when I travel" updates a single "current location" place.</p>
      <H>what we don't do</H>
      <p>We don't sell your data, show ads, or share your reading with publishers. Links to original articles take you to the publisher's site, where their policy applies.</p>
      <H>your control</H>
      <p>You can change or remove any preference, clear your reading history, and delete your account from Profile › About. Deleting your account removes your data from our servers.</p>
    </Legal>
  );
}

export function Terms() {
  return (
    <Legal title="terms of service.">
      <p>By using The News you agree to these terms.</p>
      <H>the service</H>
      <p>The News summarises reporting from other publishers and links to the original. Summaries are for information only; check the original source before acting on anything you read.</p>
      <H>your account</H>
      <p>Keep your password to yourself. You're responsible for activity on your account. You can delete it at any time.</p>
      <H>fair use</H>
      <p>Don't misuse the service, scrape it at scale, or try to break it. We may suspend accounts that do.</p>
      <H>changes</H>
      <p>We may update these terms; if the changes are significant we'll tell you in the app first.</p>
    </Legal>
  );
}
