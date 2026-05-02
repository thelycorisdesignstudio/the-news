const s = { width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function HeartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...s} {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function ShareIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...s} {...props}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export function BookmarkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...s} {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...s} style={{ width: 18, height: 18 }} {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function RefreshIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...s} style={{ width: 16, height: 16 }} {...props}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export function NewspaperIcon3D() {
  return (
    <svg viewBox="0 0 56 56" width="56" height="56" fill="none">
      <defs>
        <linearGradient id="news-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6CB4FF" />
          <stop offset="100%" stopColor="#0055FF" />
        </linearGradient>
        <linearGradient id="news-shine" x1="8" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <filter id="news-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>
      <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#news-bg)" filter="url(#news-shadow)" />
      <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#news-shine)" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(16,16)">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" />
        <path d="M15 18h-5" />
        <rect x="8" y="6" width="10" height="4" rx="1" />
      </g>
    </svg>
  );
}

export function ZapIcon3D() {
  return (
    <svg viewBox="0 0 56 56" width="56" height="56" fill="none">
      <defs>
        <linearGradient id="zap-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD666" />
          <stop offset="100%" stopColor="#FF9500" />
        </linearGradient>
        <linearGradient id="zap-shine" x1="8" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <filter id="zap-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>
      <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#zap-bg)" filter="url(#zap-shadow)" />
      <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#zap-shine)" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(16,16)">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </g>
    </svg>
  );
}

export function ShieldIcon3D() {
  return (
    <svg viewBox="0 0 56 56" width="56" height="56" fill="none">
      <defs>
        <linearGradient id="shield-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7A0" />
          <stop offset="100%" stopColor="#00C853" />
        </linearGradient>
        <linearGradient id="shield-shine" x1="8" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <filter id="shield-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>
      <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#shield-bg)" filter="url(#shield-shadow)" />
      <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#shield-shine)" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(16,16)">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </g>
    </svg>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...s} style={{ width: 14, height: 14 }} {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
