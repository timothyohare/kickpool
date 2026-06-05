import type { Friend } from '@/types';

export const FRIENDS: Friend[] = [
  {
    id: 'dan',
    name: 'Dan',
    colour: '#E63946',
    countries: ['MEX', 'BIH', 'BRA', 'EGY', 'IRN', 'CPV'],
  },
  {
    id: 'boris',
    name: 'Boris',
    colour: '#1565C0',
    countries: ['RSA', 'BEL', 'NZL', 'NOR', 'COL', 'PAN'],
  },
  {
    id: 'tim',
    name: 'Tim',
    colour: '#2E7D32',
    countries: ['KOR', 'CZE', 'SCO', 'FRA', 'ARG', 'ALG'],
  },
  {
    id: 'boomer',
    name: 'Boomer',
    colour: '#E65100',
    countries: ['CAN', 'QAT', 'IRQ', 'AUT', 'POR', 'URU'],
  },
  {
    id: 'rob',
    name: 'Rob',
    colour: '#6A1B9A',
    countries: ['SUI', 'ECU', 'NED', 'UZB', 'CRO', 'GHA'],
  },
  {
    id: 'ben',
    name: 'Ben',
    colour: '#00695C',
    countries: ['MAR', 'PAR', 'AUS', 'SEN', 'JOR', 'COD'],
  },
  {
    id: 'hamish',
    name: 'Hamish',
    colour: '#C62828',
    countries: ['HAI', 'USA', 'JPN', 'SWE', 'TUN', 'ESP'],
  },
  {
    id: 'jake',
    name: 'Jake',
    colour: '#37474F',
    countries: ['TUR', 'GER', 'CUW', 'CIV', 'KSA', 'ENG'],
  },
];

export const FRIEND_BY_ID: Record<string, Friend> = Object.fromEntries(
  FRIENDS.map((f) => [f.id, f])
);

export const COUNTRY_TO_FRIEND: Record<string, Friend> = {};
for (const friend of FRIENDS) {
  for (const country of friend.countries) {
    COUNTRY_TO_FRIEND[country] = friend;
  }
}

// ESPN abbreviation → canonical lookup (ESPN uses slightly different codes for some teams)
export const ESPN_ABBR_MAP: Record<string, string> = {
  'KORS': 'KOR',
  'BOS': 'BIH',
  'NL': 'NED',
  'HAI': 'HAI',
  'CUW': 'CUW',
  'CIV': 'CIV',
  'CPV': 'CPV',
  'COD': 'COD',
};

export function normAbbr(abbr: string): string {
  return ESPN_ABBR_MAP[abbr] ?? abbr;
}

export function getFriendForCountry(abbr: string): Friend | undefined {
  return COUNTRY_TO_FRIEND[normAbbr(abbr)];
}
