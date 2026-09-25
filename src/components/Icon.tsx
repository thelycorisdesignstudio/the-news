import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon, AlertCircleIcon, AppleIcon, ArrowLeft01Icon, ArrowRight01Icon, ArrowUp01Icon, Bookmark02Icon, BookmarkCheck02Icon,
  Building03Icon, CancelCircleIcon, Cancel01Icon, City01Icon, CloudOffIcon, EarthIcon, FavouriteIcon, FilterHorizontalIcon, Flag01Icon,
  GoogleIcon, Gps01Icon, Home01Icon, Layers01Icon, LeftToRightListBulletIcon, Loading03Icon, Location01Icon, LocationOffline01Icon,
  LocationUser01Icon, LockPasswordIcon, Mail01Icon, MailOpen01Icon, MapsLocation01Icon, News01Icon, Radar01Icon, Search01Icon,
  SearchRemoveIcon, Share08Icon, SignalFull02Icon, SquareLock02Icon, Tick02Icon, UserIcon, ViewIcon, ViewOffIcon, WifiDisconnected01Icon,
  WifiFullSignalIcon, WifiOff01Icon, Delete02Icon, Notification01Icon, Clock01Icon, Logout01Icon,
} from '@hugeicons/core-free-icons';
import type { CSSProperties } from 'react';

const ICONS = {
  add: Add01Icon, 'alert-circle': AlertCircleIcon, apple: AppleIcon, 'arrow-left': ArrowLeft01Icon, 'arrow-right': ArrowRight01Icon,
  'arrow-up': ArrowUp01Icon, bookmark: Bookmark02Icon, 'bookmark-check': BookmarkCheck02Icon, building: Building03Icon,
  'cancel-circle': CancelCircleIcon, cancel: Cancel01Icon, city: City01Icon, 'cloud-off': CloudOffIcon, earth: EarthIcon,
  favourite: FavouriteIcon, filter: FilterHorizontalIcon, flag: Flag01Icon, google: GoogleIcon, gps: Gps01Icon, home: Home01Icon,
  layers: Layers01Icon, list: LeftToRightListBulletIcon, loading: Loading03Icon, location: Location01Icon,
  'location-off': LocationOffline01Icon, 'location-user': LocationUser01Icon, lock: LockPasswordIcon, mail: Mail01Icon,
  'mail-open': MailOpen01Icon, 'maps-location': MapsLocation01Icon, news: News01Icon, radar: Radar01Icon, search: Search01Icon,
  'search-remove': SearchRemoveIcon, share: Share08Icon, signal: SignalFull02Icon, 'square-lock': SquareLock02Icon, tick: Tick02Icon,
  user: UserIcon, view: ViewIcon, 'view-off': ViewOffIcon, 'wifi-disconnected': WifiDisconnected01Icon, 'wifi-full': WifiFullSignalIcon,
  'wifi-off': WifiOff01Icon, delete: Delete02Icon, bell: Notification01Icon, clock: Clock01Icon, logout: Logout01Icon,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, color = 'currentColor', style, spin, className }: {
  name: IconName; size?: number; color?: string; style?: CSSProperties; spin?: boolean; className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={ICONS[name]}
      size={size}
      color={color}
      strokeWidth={1.5}
      className={className}
      aria-hidden
      style={{ display: 'block', flex: 'none', ...(spin ? { animation: 'tnSpin 900ms linear infinite' } : null), ...style }}
    />
  );
}
