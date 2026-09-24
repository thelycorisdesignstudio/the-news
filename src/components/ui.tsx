import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { useStore } from '../lib/store';

/* ---------------- device ---------------- */

const FRAME_MIN_WIDTH = 600;

function useFramed() {
  const get = () => window.innerWidth >= FRAME_MIN_WIDTH && !window.matchMedia('(display-mode: standalone)').matches;
  const [framed, setFramed] = useState(get);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const on = () => { setFramed(get()); setScale(Math.min(1, (window.innerHeight - 40) / 864)); };
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { framed, scale };
}

/** Phones get the app full-bleed; wider screens get it inside the 390 × 844 device from the mockups. */
export function Device({ children }: { children: ReactNode }) {
  const { framed, scale } = useFramed();
  return (
    <div className={framed ? 'framed' : ''} style={{ height: '100%' }}>
      <div className="device-stage" style={{ minHeight: '100%' }}>
        <div className="device-bezel" style={framed ? { transform: `scale(${scale})`, margin: `${(864 * (scale - 1)) / 2}px 0` } : { display: 'contents' }}>
          <div className="device-screen">
            <div className="grad-bg" />
            {children}
            {framed && <StatusChrome />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusChrome() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(iv);
  }, []);
  const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 32px 0 44px', font: '600 16px/1 var(--font)', color: 'var(--ink)' }}>
        <span>{time}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="signal" size={18} />
          <Icon name="wifi-full" size={16} />
          <div style={{ width: 25, height: 12, border: '1px solid color-mix(in srgb, var(--ink) 40%, transparent)', borderRadius: 4, padding: 1.5 }}>
            <div style={{ width: '80%', height: '100%', background: 'var(--ink)', borderRadius: 2 }} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 122, height: 35, borderRadius: 20, background: '#0A0A0A' }} />
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 3, background: 'var(--ink)' }} />
    </div>
  );
}

/** `top` offsets in the mockups include the 50px status bar; this maps them onto real safe areas. */
export const T = (designTop: number) => `calc(var(--st) + ${designTop - 50}px)`;
export const B = (designBottom: number) => `calc(var(--sb) + ${designBottom - 34}px)`;

/* ---------------- navigation ---------------- */

export function BackButton({ onClick, to }: { onClick?: () => void; to?: string }) {
  const nav = useNavigate();
  return (
    <button aria-label="back" className="link-btn" onClick={onClick ?? (() => (to ? nav(to) : nav(-1)))}
      style={{ position: 'absolute', top: T(60), left: 12, height: 32, width: 40, display: 'flex', alignItems: 'center', paddingLeft: 4, zIndex: 3 }}>
      <Icon name="arrow-left" size={24} color="var(--ink)" />
    </button>
  );
}

/** Skip · dots · Next row used on every onboarding step. */
export function StepHeader({ step, total = 5, onSkip, onNext, nextEnabled = true, hideNext }: {
  step: number; total?: number; onSkip?: () => void; onNext?: () => void; nextEnabled?: boolean; hideNext?: boolean;
}) {
  return (
    <div style={{ position: 'absolute', top: T(62), left: 20, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 3 }}>
      <button className="link-btn" onClick={onSkip} style={{ font: '500 14px/1 var(--font)', color: 'var(--gray)', minWidth: 40, textAlign: 'left' }}>Skip</button>
      <div style={{ display: 'flex', gap: 6 }} aria-label={`step ${step} of ${total}`} role="img">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === step - 1 ? 'var(--signal)' : 'var(--rule)' }} />
        ))}
      </div>
      {hideNext ? <span style={{ width: 40 }} /> : (
        <button className="link-btn" disabled={!nextEnabled} onClick={onNext}
          style={{ font: '600 14px/1 var(--font)', color: nextEnabled ? 'var(--signal)' : 'var(--gray-2)', transition: 'color 150ms', minWidth: 40, textAlign: 'right' }}>Next</button>
      )}
    </div>
  );
}

export function Title({ children, sub, top = 108, style }: { children: ReactNode; sub?: ReactNode; top?: number; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', top: T(top), left: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <h2 style={{ margin: 0, font: '700 28px/1.15 var(--font)', letterSpacing: '-0.03em', color: 'var(--ink)' }}>{children}</h2>
      {sub && <p style={{ margin: 0, font: '400 14px/1.6 var(--font)', color: 'var(--gray)', textWrap: 'pretty' }}>{sub}</p>}
    </div>
  );
}

/** Bottom action area, pinned above the home indicator. */
export function Footer({ children, bottom = 44, gap = 12, style }: { children: ReactNode; bottom?: number; gap?: number; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', left: 20, right: 20, bottom: B(bottom), display: 'flex', flexDirection: 'column', gap, alignItems: 'stretch', zIndex: 3, ...style }}>
      {children}
    </div>
  );
}

/* ---------------- controls ---------------- */

export function Button({ variant = 'primary', loading, icon, children, style, ...rest }: {
  variant?: 'primary' | 'secondary' | 'dark' | 'light'; loading?: boolean; icon?: IconName;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined}
      className={`btn btn-${variant}${loading ? ' is-loading' : ''} ${rest.className ?? ''}`} style={style}>
      {loading ? <Icon name="loading" size={20} spin /> : icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  );
}

export function TextField({ label, icon, error, secret, disabled, inputRef, ...rest }: {
  label?: string; icon?: IconName; error?: string | null; secret?: boolean; inputRef?: React.Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label htmlFor={id} className="field-label">{label}</label>}
      <div className={`field${error ? ' is-error' : ''}${disabled ? ' is-disabled' : ''}`}>
        {icon && <Icon name={icon} size={18} color="var(--gray-2)" />}
        <input id={id} ref={inputRef} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          type={secret && !show ? 'password' : rest.type ?? 'text'} className={secret && !show ? 'is-secret' : undefined} {...rest} />
        {secret && !disabled && (
          <button type="button" className="link-btn" aria-label={show ? 'hide password' : 'show password'} onClick={() => setShow(s => !s)} style={{ display: 'flex' }}>
            <Icon name={show ? 'view-off' : 'view'} size={18} color="var(--gray-2)" />
          </button>
        )}
      </div>
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <span id={id} role="alert" className="field-error">
      <Icon name="alert-circle" size={14} color="var(--alert)" style={{ marginTop: 1 }} />{children}
    </span>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--alert-tint)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Icon name="alert-circle" size={18} color="var(--alert)" />
      <span style={{ font: '400 13px/1.5 var(--font)', color: 'var(--ink)' }}>{children}</span>
    </div>
  );
}

export function Check({ on, size = 22 }: { on: boolean; size?: number }) {
  return on ? (
    <span style={{ flex: 'none', width: size, height: size, borderRadius: '50%', background: 'var(--signal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="tick" size={14} color="#FFFFFF" />
    </span>
  ) : <span style={{ flex: 'none', width: size, height: size, borderRadius: '50%', border: '1.5px solid var(--rule-3)' }} />;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className="link-btn" onClick={() => onChange(!on)}
      style={{ flex: 'none', width: 51, height: 31, borderRadius: 16, background: on ? 'var(--signal)' : 'var(--rule-3)', position: 'relative', transition: 'background 150ms' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 2px 4px rgba(10,10,10,.2)', transition: 'left 150ms' }} />
    </button>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label, style }: {
  options: { v: T; t: string }[]; value: T; onChange: (v: T) => void; label: string; style?: CSSProperties;
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, padding: 3, borderRadius: 50, background: 'var(--rule)', ...style }}>
      {options.map(o => (
        <button key={String(o.v)} role="radio" aria-checked={o.v === value} className="link-btn" onClick={() => onChange(o.v)}
          style={{ height: 34, borderRadius: 50, background: o.v === value ? 'var(--signal)' : 'transparent', color: o.v === value ? '#FFFFFF' : 'var(--gray)', font: '600 13px/1 var(--font)', transition: 'background 150ms, color 150ms' }}>
          {o.t}
        </button>
      ))}
    </div>
  );
}

/* ---------------- feedback ---------------- */

export function Shimmer({ w, h, r = 8, style }: { w: number | string; h: number; r?: number; style?: CSSProperties }) {
  return <div className="shimmer" style={{ width: w, height: h, borderRadius: r, flex: 'none', ...style }} />;
}

export function LoaderBar({ width = 120, kind = 'load' }: { width?: number; kind?: 'load' | 'fill' }) {
  return (
    <div role="progressbar" aria-label="loading" style={{ width, height: 3, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', background: 'var(--signal)', transformOrigin: 'left', animation: kind === 'load' ? 'tnLoad 1.9s linear infinite' : 'tnFill 1.5s ease-in-out infinite' }} />
    </div>
  );
}

/** Centered icon + headline + body, used for every error and empty state. */
export function StateMessage({ icon, title, body, iconTint, pulse }: { icon: IconName; title: ReactNode; body?: ReactNode; iconTint?: boolean; pulse?: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: iconTint ? 'var(--signal-tint)' : 'var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} color={iconTint ? 'var(--signal)' : 'var(--ink)'} style={pulse ? { animation: 'tnPulse 1.2s linear infinite' } : undefined} />
      </div>
      <h3 style={{ margin: '24px 0 0', font: '700 24px/1.2 var(--font)', letterSpacing: '-0.03em' }}>{title}</h3>
      {body && <p style={{ margin: '8px 0 0', maxWidth: 280, font: '400 14px/1.6 var(--font)', color: 'var(--gray)', textWrap: 'pretty' }}>{body}</p>}
    </div>
  );
}

/** The three stacked rules: the editorial mark used on "caught up" and empty states. */
export function EditorialMark() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} aria-hidden>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--rule)' }} />
      <div style={{ width: 28, height: 4, borderRadius: 2, background: 'var(--rule)' }} />
      <div style={{ width: 16, height: 4, borderRadius: 2, background: 'var(--rule)' }} />
    </div>
  );
}

/** App-wide toast, shown under the status bar. */
export function GlobalToast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div key={toast.id} role="status" className="toast" style={{ position: 'absolute', top: T(112), left: '50%', transform: 'translateX(-50%)', zIndex: 60, animation: 'tnFade 150ms ease-out' }}>
      {toast.text}
    </div>
  );
}

/* ---------------- sheets & dialogs ---------------- */

export function Sheet({ onClose, top = 84, children, label, scroll = true }: { onClose: () => void; top?: number; children: ReactNode; label: string; scroll?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const [dy, setDy] = useState(0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  // Drag the handle (or the top of the content) down to dismiss.
  const onTouchStart = (e: React.TouchEvent) => {
    if ((ref.current?.scrollTop ?? 0) > 0) return;
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    setDy(drag.current.dy);
  };
  const onTouchEnd = () => {
    if (drag.current && drag.current.dy > 120) onClose();
    drag.current = null;
    setDy(0);
  };
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--scrim)', animation: 'tnDim 220ms ease-out' }} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="no-scrollbar"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: T(top), zIndex: 21, background: 'var(--surface)', borderRadius: '20px 20px 0 0', overflowY: scroll ? 'auto' : 'hidden', display: scroll ? 'block' : 'flex', flexDirection: 'column', animation: 'tnSheet 220ms ease-out', outline: 'none', transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? 'none' : 'transform 200ms' }}>
        <div style={{ position: scroll ? 'sticky' : 'relative', top: 0, zIndex: 2, display: 'flex', justifyContent: 'center', padding: '10px 0 12px', background: 'var(--surface)', flex: 'none' }}>
          <button onClick={onClose} aria-label="close" style={{ width: 36, height: 5, padding: 0, border: 0, borderRadius: 3, background: 'var(--rule-3)', cursor: 'pointer' }} />
        </div>
        {children}
      </div>
    </>
  );
}

export function Dialog({ icon, title, body, children }: { icon: IconName; title: string; body: string; children: ReactNode }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'var(--scrim)', animation: 'tnDim 220ms ease-out' }} />
      <div role="alertdialog" aria-modal="true" aria-label={title}
        style={{ position: 'absolute', left: 24, right: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 51, padding: 24, borderRadius: 20, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 24px 48px rgba(10,10,10,.2)', animation: 'tnFadeIn 200ms ease-out' }}>
        <Icon name={icon} size={26} color="var(--ink)" />
        <h3 style={{ margin: '8px 0 0', font: '700 20px/1.2 var(--font)', letterSpacing: '-0.03em' }}>{title}</h3>
        <p style={{ margin: '0 0 12px', font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>{body}</p>
        {children}
      </div>
    </>
  );
}
