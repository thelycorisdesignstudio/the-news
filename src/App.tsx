import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom';
import { Button, Device, Dialog, GlobalToast } from './components/ui';
import { api } from './lib/api';
import { currentPosition } from './lib/device';
import { storage } from './lib/storage';
import { StoreProvider, useStore } from './lib/store';
import { AuthComplete, Forgot, LogIn, ResetPassword, SignUp, Verify, Welcome } from './screens/Account';
import { Feed } from './screens/Feed';
import { Landing, Splash } from './screens/Launch';
import { Countries, Coverage, FindingLocal, LocationOff, Notifications, Pace, Topics, Transition } from './screens/Onboarding';
import { AddCountries, AddPlace, PlaceDetail, Places } from './screens/Places';
import { About, History, NotificationSettings, Privacy, Profile, Saved, Terms } from './screens/Profile';

function Home() {
  const { prefs, user } = useStore();
  if (prefs.onboarded) return <Feed />;
  if (user) return <Navigate to="/onboarding/welcome" replace />;
  return <Navigate to={storage.get('seenLanding', false) ? '/welcome' : '/landing'} replace />;
}

/** Onboarding happens after an account exists. */
function RequireUser({ children }: { children: ReactNode }) {
  const { user } = useStore();
  return user ? <>{children}</> : <Navigate to="/welcome" replace />;
}

/** The feed and its settings need finished onboarding (signed in or not: a lapsed session keeps reading). */
function RequireOnboarded({ children }: { children: ReactNode }) {
  const { prefs } = useStore();
  return prefs.onboarded ? <>{children}</> : <Navigate to="/" replace />;
}

/** E8 · Session expired. Content stays behind the dialog. */
function SessionExpired() {
  const { sessionExpired, dismissExpired } = useStore();
  const nav = useNavigate();
  if (!sessionExpired) return null;
  return (
    <Dialog title="you've been signed out." body="for your security, log in again to keep syncing your topics and places." onClose={dismissExpired}>
      <Button onClick={() => { dismissExpired(); nav('/login'); }}>log in</Button>
      <Button variant="light" onClick={dismissExpired}>not now</Button>
    </Dialog>
  );
}

/** "Follow me when I travel": refresh the current-location place once per launch. */
function useFollowTravel() {
  const { prefs, updatePrefs, booting } = useStore();
  useEffect(() => {
    if (booting || !prefs.followTravel || !prefs.onboarded) return;
    currentPosition()
      .then(pos => api.reverse(pos.lat, pos.lon))
      .then(({ place }) => updatePrefs(p => {
        const prev = p.places.find(x => x.kind === 'current');
        if (prev && prev.area === place.area && prev.city === place.city) return {};
        const cur = { ...place, id: 'current', kind: 'current' as const, label: 'Current location', radiusKm: prev?.radiusKm ?? 1 };
        return { places: [...p.places.filter(x => x.kind !== 'current'), cur] };
      }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting, prefs.followTravel]);
}

const feedish = (p: string) => p === '/' || p === '/filters';

/**
 * Screen-to-screen transitions: the old screen fades out (160ms) and the new one rises in (280ms)
 * over the living gradient. The feed and its filter sheet share a screen, so they don't fade.
 */
function RouteFade({ children }: { children: (location: Location) => ReactNode }) {
  const location = useLocation();
  const [shown, setShown] = useState(location);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  useEffect(() => {
    if (location.pathname === shown.pathname || (feedish(location.pathname) && feedish(shown.pathname))
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(location);
      setPhase('in');
      return;
    }
    setPhase('out');
    const t = window.setTimeout(() => { setShown(location); setPhase('in'); }, 160);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
  const key = feedish(shown.pathname) ? '/' : shown.pathname;
  return (
    <div key={key} className={phase === 'out' ? 'route-out' : 'route-in'} style={{ position: 'absolute', inset: 0 }}>
      {children(shown)}
    </div>
  );
}

function Shell() {
  const { booting } = useStore();
  useFollowTravel();
  if (booting) return <Splash />;
  const o = (el: ReactNode) => <RequireOnboarded>{el}</RequireOnboarded>;
  const u = (el: ReactNode) => <RequireUser>{el}</RequireUser>;
  return (
    <>
      <RouteFade>{location => (
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/filters" element={o(<Feed filtersOpen />)} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/complete" element={<AuthComplete />} />
        <Route path="/onboarding/welcome" element={u(<Transition />)} />
        <Route path="/onboarding/topics" element={u(<Topics />)} />
        <Route path="/onboarding/countries" element={u(<Countries />)} />
        <Route path="/onboarding/coverage" element={u(<Coverage />)} />
        <Route path="/onboarding/pace" element={u(<Pace />)} />
        <Route path="/onboarding/notifications" element={u(<Notifications />)} />
        <Route path="/onboarding/finding" element={<FindingLocal />} />
        <Route path="/location-off" element={<LocationOff />} />
        <Route path="/countries/add" element={<AddCountries />} />
        <Route path="/places" element={<Places />} />
        <Route path="/places/add" element={<AddPlace />} />
        <Route path="/places/:id" element={<PlaceDetail />} />
        <Route path="/profile" element={o(<Profile />)} />
        <Route path="/profile/topics" element={o(<Topics edit />)} />
        <Route path="/profile/countries" element={o(<AddCountries />)} />
        <Route path="/profile/notifications" element={o(<NotificationSettings />)} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/history" element={<History />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      )}</RouteFade>
      <SessionExpired />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Device>
          <Shell />
          <GlobalToast />
        </Device>
      </StoreProvider>
    </BrowserRouter>
  );
}
