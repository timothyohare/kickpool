import type { Friend } from '@/types';

export const FRIENDS: Friend[] = [
  {
    id: 'dan',
    name: 'Dan',
    colour: '#00843D', // Brazil/Mexico vivid green
    countries: ['MEX', 'BIH', 'BRA', 'EGY', 'IRN', 'CPV'],
  },
  {
    id: 'boris',
    name: 'Boris',
    colour: '#E6A817', // Belgium/Colombia amber-gold
    countries: ['RSA', 'BEL', 'NZL', 'NOR', 'COL', 'PAN'],
  },
  {
    id: 'tim',
    name: 'Tim',
    colour: '#1565C0', // France/South Korea royal blue
    countries: ['KOR', 'CZE', 'SCO', 'FRA', 'ARG', 'ALG'],
  },
  {
    id: 'boomer',
    name: 'Boomer',
    colour: '#E65100', // Canada/Portugal orange
    countries: ['CAN', 'QAT', 'IRQ', 'AUT', 'POR', 'URU'],
  },
  {
    id: 'rob',
    name: 'Rob',
    colour: '#8E24AA', // Netherlands/Croatia violet-purple
    countries: ['SUI', 'ECU', 'NED', 'UZB', 'CRO', 'GHA'],
  },
  {
    id: 'ben',
    name: 'Ben',
    colour: '#0097A7', // Morocco/Australia bright teal
    countries: ['MAR', 'PAR', 'AUS', 'SEN', 'JOR', 'COD'],
  },
  {
    id: 'hamish',
    name: 'Hamish',
    colour: '#C8102E', // Spain/Japan crimson
    countries: ['HAI', 'USA', 'JPN', 'SWE', 'TUN', 'ESP'],
  },
  {
    id: 'jake',
    name: 'Jake',
    colour: '#455A64', // Germany/England steel
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

// Static group assignments from the 2026 World Cup draw
export const COUNTRY_GROUP: Record<string, string> = {
  // Group A
  MEX: 'A', RSA: 'A', KOR: 'A', CZE: 'A',
  // Group B
  CAN: 'B', BIH: 'B', QAT: 'B', SUI: 'B',
  // Group C
  BRA: 'C', MAR: 'C', HAI: 'C', SCO: 'C',
  // Group D
  USA: 'D', PAR: 'D', AUS: 'D', TUR: 'D',
  // Group E
  GER: 'E', CUW: 'E', CIV: 'E', ECU: 'E',
  // Group F
  NED: 'F', JPN: 'F', SWE: 'F', TUN: 'F',
  // Group G
  BEL: 'G', EGY: 'G', IRN: 'G', NZL: 'G',
  // Group H
  ESP: 'H', CPV: 'H', KSA: 'H', URU: 'H',
  // Group I
  FRA: 'I', SEN: 'I', IRQ: 'I', NOR: 'I',
  // Group J
  ARG: 'J', ALG: 'J', AUT: 'J', JOR: 'J',
  // Group K
  POR: 'K', COD: 'K', UZB: 'K', COL: 'K',
  // Group L
  ENG: 'L', CRO: 'L', GHA: 'L', PAN: 'L',
};

export function getGroupForCountry(abbr: string): string | undefined {
  return COUNTRY_GROUP[normAbbr(abbr)];
}
