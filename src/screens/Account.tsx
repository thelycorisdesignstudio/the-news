import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { EMAIL_RE, isValidPassword, PASSWORD_RULE, passwordStrength } from '../../shared/domain';
import { Wordmark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { BackButton, Banner, Button, FieldError, Footer, T, TextField, Title } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useStore } from '../lib/store';
import { Splash } from './Launch';

const OAUTH_ERRORS: Record<string, string> = {
  google_unavailable: "sign in with Google isn't set up yet. use email for now.",
  apple_unavailable: "sign in with Apple isn't set up yet. use email for now.",
  state: 'that sign-in took too long. try again.',
  exchange: "we couldn't finish signing you in. try again.",
  email: 'we need a verified email address to create your account.',
};

function useOAuth() {
  const { showToast } = useStore();
  const [providers, setProviders] = useState<{ google: boolean; apple: boolean } | null>(null);
  useEffect(() => { api.providers().then(setProviders).catch(() => setProviders({ google: false, apple: false })); }, []);
  return (p: 'google' | 'apple') => {
    if (providers && !providers[p]) return showToast(OAUTH_ERRORS[`${p}_unavailable`]);
    window.location.href = `/api/auth/oauth/${p}/start`;
  };
}

/** Where to go once someone is signed in. */
function useAfterAuth() {
  const nav = useNavigate();
  const { signedIn } = useStore();
  return async (user: Parameters<typeof signedIn>[0]) => {
    // An existing account may bring its onboarding with it.
    const onboarded = await signedIn(user);
    nav(onboarded ? '/' : '/onboarding/welcome', { replace: true });
  };
}

/** C1 · Account welcome. */
export function Welcome() {
  const nav = useNavigate();
  const oauth = useOAuth();
  const [params] = useSearchParams();
  const { showToast } = useStore();
  useEffect(() => {
    const e = params.get('oauth_error');
    if (e) showToast(OAUTH_ERRORS[e] ?? OAUTH_ERRORS.exchange);
  }, [params, showToast]);
  return (
    <div className="screen">
      <div style={{ position: 'absolute', top: T(120), left: 24 }}><Wordmark size="md" /></div>
      <Title top={196} sub="sign in to keep your topics, places and saved stories in sync.">your feed, on every device.</Title>
      <Footer bottom={40}>
        <Button variant="dark" icon="apple" onClick={() => oauth('apple')}>Continue with Apple</Button>
        <Button variant="light" icon="google" onClick={() => oauth('google')}>Continue with Google</Button>
        <Button icon="mail" onClick={() => nav('/signup')}>Continue with email</Button>
        <span style={{ marginTop: 8, textAlign: 'center', font: '400 13px/1 var(--font)', color: 'var(--gray)' }}>
          already have an account? <Link to="/login" style={{ fontWeight: 600, color: 'var(--ink)' }}>log in</Link>
        </span>
        <span style={{ textAlign: 'center', font: '400 11px/1.5 var(--font)', color: 'var(--gray)' }}>
          by continuing you agree to our <Link to="/terms" style={{ color: 'var(--gray)', textDecoration: 'underline' }}>Terms</Link> and <Link to="/privacy" style={{ color: 'var(--gray)', textDecoration: 'underline' }}>Privacy Policy</Link>.
        </span>
      </Footer>
    </div>
  );
}

export function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const n = passwordStrength(password);
  const ok = isValidPassword(password);
  const label = ['', '', 'okay password', 'strong password', 'very strong password'][n];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: -6 }} aria-label={ok ? label : 'weak password'}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map(i => <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < n ? (ok ? 'var(--ink)' : 'var(--alert)') : 'var(--rule)' }} />)}
      </div>
      {ok && <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{label}</span>}
    </div>
  );
}

/** C2 / C5 · Sign up. Errors appear on blur; submit stays disabled until everything is valid. */
export function SignUp() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', terms: false });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errs = {
    name: !f.name.trim() ? 'enter your name.' : null,
    email: !EMAIL_RE.test(f.email.trim()) ? 'enter a full email address, like name@example.com.' : null,
    password: !isValidPassword(f.password) ? PASSWORD_RULE : null,
  };
  const valid = !errs.name && !errs.email && !errs.password && f.terms;
  const show = (k: keyof typeof errs) => server[k] || (touched[k] ? errs[k] : null);
  const set = (k: keyof typeof f, v: string | boolean) => { setF(s => ({ ...s, [k]: v })); setServer(s => ({ ...s, [k]: '' })); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setBanner(null);
    try {
      const r = await api.signup({ name: f.name.trim(), email: f.email.trim(), password: f.password, terms: true });
      nav('/verify', { state: { email: r.email, resendIn: r.resendIn } });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setServer(err.fields);
      else setBanner(err instanceof ApiError ? err.message : 'something went wrong. try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <BackButton to="/welcome" />
      <Title>create your account.</Title>
      <div className="no-scrollbar" style={{ position: 'absolute', top: T(168), left: 20, right: 20, bottom: 'calc(var(--sb) + 110px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
        {banner && <Banner>{banner}</Banner>}
        <TextField label="Name" autoComplete="name" value={f.name} disabled={busy} onChange={e => set('name', e.target.value)} onBlur={() => setTouched(t => ({ ...t, name: true }))} error={show('name')} />
        <TextField label="Email" icon="mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.email} disabled={busy}
          onChange={e => set('email', e.target.value)} onBlur={() => setTouched(t => ({ ...t, email: true }))} error={show('email')} />
        <TextField label="Password" icon="lock" secret autoComplete="new-password" value={f.password} disabled={busy}
          onChange={e => set('password', e.target.value)} onBlur={() => setTouched(t => ({ ...t, password: true }))} error={show('password')} />
        <StrengthMeter password={f.password} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" className="sr-only" checked={f.terms} onChange={e => set('terms', e.target.checked)} />
          <span style={{ flex: 'none', width: 20, height: 20, borderRadius: 6, background: f.terms ? 'var(--signal)' : 'var(--card)', border: f.terms ? 0 : '1.5px solid var(--rule-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {f.terms && <Icon name="tick" size={13} color="#FFFFFF" />}
          </span>
          <span style={{ font: '400 13px/1.4 var(--font)', color: 'var(--ink)' }}>
            I agree to the <Link to="/terms" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Terms</Link> and <Link to="/privacy" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Privacy Policy</Link>
          </span>
        </label>
      </div>
      <Footer>
        <Button type="submit" disabled={!valid} loading={busy}>{busy ? 'creating account…' : 'create account'}</Button>
        <span style={{ textAlign: 'center', font: '400 13px/1 var(--font)', color: 'var(--gray)' }}>
          already have an account? <Link to="/login" style={{ fontWeight: 600, color: 'var(--ink)' }}>log in</Link>
        </span>
      </Footer>
    </form>
  );
}

/** C8 · Verify email. Six boxes backed by one input, so paste and SMS autofill both work. */
export function Verify() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { email?: string; resendIn?: number } };
  const [params] = useSearchParams();
  const email = loc.state?.email ?? params.get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(loc.state?.resendIn ?? 30);
  const [focused, setFocused] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const after = useAfterAuth();
  const { showToast } = useStore();

  useEffect(() => { if (!email) nav('/signup', { replace: true }); }, [email, nav]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait(w => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function verify(c = code) {
    if (c.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.verify(email, c);
      await after(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'something went wrong. try again.');
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      const r = await api.resend(email);
      setWait(r.resendIn);
      setError(null);
      showToast('new code sent.');
    } catch (e) {
      if (e instanceof ApiError && typeof e.body.resendIn === 'number') setWait(e.body.resendIn);
      else showToast(e instanceof ApiError ? e.message : "couldn't send a new code.");
    }
  }

  return (
    <div className="screen">
      <BackButton />
      <div style={{ position: 'absolute', top: T(116), left: 24, width: 56, height: 56, borderRadius: '50%', background: 'var(--signal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="mail-open" size={26} color="var(--signal)" />
      </div>
      <Title top={196} sub={`we sent a 6-digit code to ${email}.`}>check your inbox.</Title>
      <div style={{ position: 'absolute', top: T(310), left: 20, right: 20 }} onClick={() => input.current?.focus()}>
        <input ref={input} value={code} autoFocus inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" maxLength={6} disabled={busy}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(v);
            setError(null);
            if (v.length === 6) void verify(v);
          }}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: 60, border: 0, fontSize: 16, zIndex: 1 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }} aria-hidden>
          {Array.from({ length: 6 }, (_, i) => {
            const active = focused && !busy && i === Math.min(code.length, 5) && code.length < 6;
            return (
              <div key={i} style={{ height: 60, borderRadius: 12, background: 'var(--card)', border: active ? '1.5px solid var(--signal)' : error ? '1px solid var(--alert)' : '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 24px/1 var(--font)' }}>
                {code[i] ?? (active ? <span style={{ width: 1.5, height: 24, background: 'var(--signal)', animation: 'tnPulse 1s steps(1) infinite' }} /> : '')}
              </div>
            );
          })}
        </div>
        {error && <div style={{ marginTop: 12 }}><FieldError>{error}</FieldError></div>}
      </div>
      <div style={{ position: 'absolute', top: error ? T(430) : T(394), left: 24 }}>
        {wait > 0
          ? <span style={{ font: '400 13px/1 var(--font)', color: 'var(--gray)' }}>resend code in 0:{String(wait).padStart(2, '0')}</span>
          : <button className="link-btn" onClick={resend} style={{ font: '600 13px/1 var(--font)', color: 'var(--ink)' }}>resend code</button>}
      </div>
      <Footer>
        <Button disabled={code.length !== 6} loading={busy} onClick={() => verify()}>{busy ? 'verifying…' : 'verify'}</Button>
      </Footer>
    </div>
  );
}

/** C3 / C4 / C6 · Log in, the wrong-password state, and the submitting state. */
export function LogIn() {
  const nav = useNavigate();
  const oauth = useOAuth();
  const after = useAfterAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const local: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) local.email = 'enter a full email address, like name@example.com.';
    if (!password) local.password = 'enter your password.';
    setFields(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    setBanner(null);
    try {
      const r = await api.login(email.trim(), password);
      await after(r.user);
    } catch (err) {
      if (!(err instanceof ApiError)) { setBanner('something went wrong. try again.'); return; }
      if (err.code === 'needs_verification') return nav('/verify', { state: { email: err.body.email, resendIn: err.body.resendIn } });
      setLocked(err.code === 'locked');
      setBanner(err.offline ? "you're offline. check your connection and try again." : err.message);
      setFields(err.fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <BackButton to="/welcome" />
      <Title>welcome back.</Title>
      <div className="no-scrollbar" style={{ position: 'absolute', top: T(168), left: 20, right: 20, bottom: 0, paddingBottom: 'calc(var(--sb) + 16px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {banner && <Banner>{banner}</Banner>}
        <TextField label="Email" icon="mail" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" value={email} disabled={busy}
          onChange={e => { setEmail(e.target.value); setFields(f => ({ ...f, email: '' })); }} error={fields.email || null} />
        <TextField label="Password" icon="lock" secret autoComplete="current-password" value={password} disabled={busy}
          onChange={e => { setPassword(e.target.value); setFields(f => ({ ...f, password: '' })); }} error={fields.password || null} />
        <Link to="/forgot" state={{ email }} style={{ alignSelf: 'flex-end', font: '600 13px/1 var(--font)', color: busy ? 'var(--gray-2)' : 'var(--ink)', pointerEvents: busy ? 'none' : undefined }}>forgot password?</Link>
        <Button type="submit" loading={busy} disabled={locked}>{busy ? 'logging in…' : 'log in'}</Button>
        {!busy && !banner && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>or</span>
              <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="button" variant="dark" icon="apple" onClick={() => oauth('apple')}>Apple</Button>
              <Button type="button" variant="light" icon="google" onClick={() => oauth('google')}>Google</Button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}

/** C7 · Forgot password. One field, one action. */
export function Forgot() {
  const loc = useLocation() as { state?: { email?: string } };
  const nav = useNavigate();
  const [email, setEmail] = useState(loc.state?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError('enter a full email address, like name@example.com.');
    setBusy(true);
    try {
      await api.forgot(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'something went wrong. try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="screen">
        <BackButton to="/login" />
        <div style={{ position: 'absolute', top: T(116), left: 24, width: 56, height: 56, borderRadius: '50%', background: 'var(--signal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail-open" size={26} color="var(--signal)" />
        </div>
        <Title top={196} sub={`if there's an account for ${email.trim()}, a reset link is on its way. it expires in 30 minutes.`}>check your inbox.</Title>
        <Footer>
          <Button onClick={() => nav('/login')}>back to log in</Button>
        </Footer>
      </div>
    );
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <BackButton />
      <Title sub="we'll email you a link. it expires in 30 minutes.">reset your password.</Title>
      <div style={{ position: 'absolute', top: T(236), left: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Email" icon="mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoFocus value={email} disabled={busy}
          onChange={e => { setEmail(e.target.value); setError(null); }} error={error} />
        <Button type="submit" loading={busy}>{busy ? 'sending…' : 'send reset link'}</Button>
      </div>
    </form>
  );
}

/** Target of the emailed reset link. */
export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const after = useAfterAuth();
  const token = params.get('token') ?? '';
  const [pw, setPw] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(token ? null : 'this reset link is incomplete. request a new one.');
  const valid = isValidPassword(pw);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      const r = await api.reset(token, pw);
      await after(r.user);
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'something went wrong. try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <BackButton to="/login" />
      <Title sub="use at least 8 characters, including a number.">choose a new password.</Title>
      <div style={{ position: 'absolute', top: T(236), left: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {banner && <Banner>{banner}</Banner>}
        <TextField label="New password" icon="lock" secret autoComplete="new-password" autoFocus value={pw} disabled={busy}
          onChange={e => setPw(e.target.value)} onBlur={() => setTouched(true)} error={touched && pw && !valid ? PASSWORD_RULE : null} />
        <StrengthMeter password={pw} />
        {banner && !token ? <Button type="button" onClick={() => nav('/forgot')}>request a new link</Button>
          : <Button type="submit" disabled={!valid || !token} loading={busy}>{busy ? 'saving…' : 'save password'}</Button>}
      </div>
    </form>
  );
}

/** Landing point after Google or Apple sign-in. */
export function AuthComplete() {
  const nav = useNavigate();
  const after = useAfterAuth();
  useEffect(() => {
    api.me().then(r => (r.user ? after(r.user) : nav('/welcome?oauth_error=exchange', { replace: true })))
      .catch(() => nav('/welcome?oauth_error=exchange', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Splash />;
}
