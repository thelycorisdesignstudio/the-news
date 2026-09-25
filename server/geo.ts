import { haversineKm } from '../shared/domain';

export interface GeoPlace { area: string; city: string; region: string; country: string; lat: number; lon: number }

// Built-in gazetteer: neighbourhoods for launch cities plus major world cities. Set GEOCODER=nominatim
// to fall back to OpenStreetMap search for anything not listed here.
const G: [string, string, string, string, number, number][] = [
  ['Indiranagar', 'Bengaluru', 'Karnataka', 'IN', 12.9784, 77.6408],
  ['Koramangala', 'Bengaluru', 'Karnataka', 'IN', 12.9352, 77.6245],
  ['Whitefield', 'Bengaluru', 'Karnataka', 'IN', 12.9698, 77.75],
  ['HSR Layout', 'Bengaluru', 'Karnataka', 'IN', 12.9116, 77.6389],
  ['Jayanagar', 'Bengaluru', 'Karnataka', 'IN', 12.925, 77.5938],
  ['Malleshwaram', 'Bengaluru', 'Karnataka', 'IN', 13.0031, 77.5643],
  ['Electronic City', 'Bengaluru', 'Karnataka', 'IN', 12.8452, 77.6602],
  ['Hebbal', 'Bengaluru', 'Karnataka', 'IN', 13.0358, 77.597],
  ['Bengaluru', 'Bengaluru', 'Karnataka', 'IN', 12.9716, 77.5946],
  ['Mysuru', 'Mysuru', 'Karnataka', 'IN', 12.2958, 76.6394],
  ['Bandra', 'Mumbai', 'Maharashtra', 'IN', 19.0596, 72.8295],
  ['Andheri', 'Mumbai', 'Maharashtra', 'IN', 19.1136, 72.8697],
  ['Lower Parel', 'Mumbai', 'Maharashtra', 'IN', 18.9953, 72.8295],
  ['Mumbai', 'Mumbai', 'Maharashtra', 'IN', 19.076, 72.8777],
  ['Pune', 'Pune', 'Maharashtra', 'IN', 18.5204, 73.8567],
  ['Connaught Place', 'New Delhi', 'Delhi', 'IN', 28.6315, 77.2167],
  ['Hauz Khas', 'New Delhi', 'Delhi', 'IN', 28.5494, 77.2001],
  ['New Delhi', 'New Delhi', 'Delhi', 'IN', 28.6139, 77.209],
  ['Gurugram', 'Gurugram', 'Haryana', 'IN', 28.4595, 77.0266],
  ['Hyderabad', 'Hyderabad', 'Telangana', 'IN', 17.385, 78.4867],
  ['Chennai', 'Chennai', 'Tamil Nadu', 'IN', 13.0827, 80.2707],
  ['Kolkata', 'Kolkata', 'West Bengal', 'IN', 22.5726, 88.3639],
  ['Brooklyn', 'New York', 'New York', 'US', 40.6782, -73.9442],
  ['Manhattan', 'New York', 'New York', 'US', 40.7831, -73.9712],
  ['New York', 'New York', 'New York', 'US', 40.7128, -74.006],
  ['Mission District', 'San Francisco', 'California', 'US', 37.7599, -122.4148],
  ['San Francisco', 'San Francisco', 'California', 'US', 37.7749, -122.4194],
  ['Los Angeles', 'Los Angeles', 'California', 'US', 34.0522, -118.2437],
  ['Seattle', 'Seattle', 'Washington', 'US', 47.6062, -122.3321],
  ['Austin', 'Austin', 'Texas', 'US', 30.2672, -97.7431],
  ['Chicago', 'Chicago', 'Illinois', 'US', 41.8781, -87.6298],
  ['Boston', 'Boston', 'Massachusetts', 'US', 42.3601, -71.0589],
  ['Shoreditch', 'London', 'England', 'GB', 51.5264, -0.0781],
  ['Camden', 'London', 'England', 'GB', 51.539, -0.1426],
  ['London', 'London', 'England', 'GB', 51.5072, -0.1276],
  ['Manchester', 'Manchester', 'England', 'GB', 53.4808, -2.2426],
  ['Edinburgh', 'Edinburgh', 'Scotland', 'GB', 55.9533, -3.1883],
  ['Tiong Bahru', 'Singapore', 'Singapore', 'SG', 1.2847, 103.8321],
  ['Singapore', 'Singapore', 'Singapore', 'SG', 1.3521, 103.8198],
  ['Dubai Marina', 'Dubai', 'Dubai', 'AE', 25.0805, 55.1403],
  ['Dubai', 'Dubai', 'Dubai', 'AE', 25.2048, 55.2708],
  ['Abu Dhabi', 'Abu Dhabi', 'Abu Dhabi', 'AE', 24.4539, 54.3773],
  ['Toronto', 'Toronto', 'Ontario', 'CA', 43.6532, -79.3832],
  ['Vancouver', 'Vancouver', 'British Columbia', 'CA', 49.2827, -123.1207],
  ['Sydney', 'Sydney', 'New South Wales', 'AU', -33.8688, 151.2093],
  ['Melbourne', 'Melbourne', 'Victoria', 'AU', -37.8136, 144.9631],
  ['Berlin', 'Berlin', 'Berlin', 'DE', 52.52, 13.405],
  ['Munich', 'Munich', 'Bavaria', 'DE', 48.1351, 11.582],
  ['Paris', 'Paris', 'Île-de-France', 'FR', 48.8566, 2.3522],
  ['Tokyo', 'Tokyo', 'Tokyo', 'JP', 35.6762, 139.6503],
  ['São Paulo', 'São Paulo', 'São Paulo', 'BR', -23.5558, -46.6396],
  ['Cape Town', 'Cape Town', 'Western Cape', 'ZA', -33.9249, 18.4241],
  ['Johannesburg', 'Johannesburg', 'Gauteng', 'ZA', -26.2041, 28.0473],
  ['Lagos', 'Lagos', 'Lagos', 'NG', 6.5244, 3.3792],
  ['Nairobi', 'Nairobi', 'Nairobi', 'KE', -1.2921, 36.8219],
  ['Jakarta', 'Jakarta', 'Jakarta', 'ID', -6.2088, 106.8456],
  ['Tunis', 'Tunis', 'Tunis', 'TN', 36.8065, 10.1815],
];

export const GAZETTEER: GeoPlace[] = G.map(([area, city, region, country, lat, lon]) => ({ area, city, region, country, lat, lon }));

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export async function searchPlaces(q: string, country?: string): Promise<GeoPlace[]> {
  const n = norm(q.trim());
  if (!n) return [];
  const local = GAZETTEER.filter(p => (!country || p.country === country) && (norm(p.area).includes(n) || norm(p.city).includes(n)))
    .sort((a, b) => Number(!norm(a.area).startsWith(n)) - Number(!norm(b.area).startsWith(n)))
    .slice(0, 12);
  if (local.length || process.env.GEOCODER !== 'nominatim') return local;
  return nominatimSearch(q, country);
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoPlace> {
  let best: GeoPlace | null = null, bestKm = Infinity;
  for (const p of GAZETTEER) {
    // Prefer neighbourhoods over whole cities when both are close.
    const km = haversineKm(lat, lon, p.lat, p.lon) + (p.area === p.city ? 2 : 0);
    if (km < bestKm) { best = p; bestKm = km; }
  }
  if (best && bestKm < 25) return { ...best, lat, lon };
  if (process.env.GEOCODER === 'nominatim') {
    const r = await nominatimReverse(lat, lon).catch(() => null);
    if (r) return r;
  }
  return { area: 'Current location', city: best?.city ?? '', region: best?.region ?? '', country: best?.country ?? '', lat, lon };
}

const UA = { 'User-Agent': 'TheNews/1.0 (hello@thenews.app)' };

interface NomAddress { suburb?: string; neighbourhood?: string; city?: string; town?: string; village?: string; state?: string; country_code?: string }
const fromNom = (a: NomAddress, lat: number, lon: number): GeoPlace => {
  const city = a.city || a.town || a.village || '';
  return { area: a.suburb || a.neighbourhood || city, city, region: a.state || '', country: (a.country_code || '').toUpperCase(), lat, lon };
};

async function nominatimSearch(q: string, country?: string): Promise<GeoPlace[]> {
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.search = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '8', ...(country ? { countrycodes: country.toLowerCase() } : {}) }).toString();
  const res = await fetch(u, { headers: UA, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return [];
  const rows = (await res.json()) as { lat: string; lon: string; address: NomAddress }[];
  return rows.map(r => fromNom(r.address, Number(r.lat), Number(r.lon))).filter(p => p.city);
}

async function nominatimReverse(lat: number, lon: number): Promise<GeoPlace | null> {
  const u = new URL('https://nominatim.openstreetmap.org/reverse');
  u.search = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'jsonv2', zoom: '16', addressdetails: '1' }).toString();
  const res = await fetch(u, { headers: UA, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const r = (await res.json()) as { address?: NomAddress };
  return r.address ? fromNom(r.address, lat, lon) : null;
}
