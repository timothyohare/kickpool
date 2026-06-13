import { describe, it, expect } from 'vitest';
import {
  FRIENDS,
  FRIEND_BY_ID,
  COUNTRY_TO_FRIEND,
  normAbbr,
  getFriendForCountry,
  getGroupForCountry,
  ESPN_ABBR_MAP,
} from '@/lib/data/friends';

describe('friends roster', () => {
  it('has 8 friends, each owning 6 countries', () => {
    expect(FRIENDS).toHaveLength(8);
    for (const f of FRIENDS) {
      expect(f.countries).toHaveLength(6);
    }
  });

  it('assigns every country to exactly one friend (no duplicates across owners)', () => {
    const all = FRIENDS.flatMap((f) => f.countries);
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
    expect(all.length).toBe(48); // full 2026 World Cup field
  });

  it('indexes friends by id', () => {
    expect(FRIEND_BY_ID['tim'].name).toBe('Tim');
    expect(FRIEND_BY_ID['nope']).toBeUndefined();
  });

  it('builds a country→friend reverse index covering every owned country', () => {
    for (const f of FRIENDS) {
      for (const c of f.countries) {
        expect(COUNTRY_TO_FRIEND[c].id).toBe(f.id);
      }
    }
  });
});

describe('normAbbr', () => {
  it('maps known ESPN aliases to canonical codes', () => {
    expect(normAbbr('KORS')).toBe('KOR');
    expect(normAbbr('BOS')).toBe('BIH');
    expect(normAbbr('NL')).toBe('NED');
  });

  it('passes through unknown / already-canonical codes unchanged', () => {
    expect(normAbbr('BRA')).toBe('BRA');
    expect(normAbbr('ZZZ')).toBe('ZZZ');
  });

  it('every alias resolves to a country someone actually owns', () => {
    const owned = new Set(FRIENDS.flatMap((f) => f.countries));
    for (const canonical of Object.values(ESPN_ABBR_MAP)) {
      expect(owned.has(canonical)).toBe(true);
    }
  });
});

describe('getFriendForCountry', () => {
  it('resolves the owner directly', () => {
    expect(getFriendForCountry('BRA')?.id).toBe('dan');
    expect(getFriendForCountry('ENG')?.id).toBe('jake');
  });

  it('resolves through the ESPN alias map', () => {
    expect(getFriendForCountry('KORS')?.id).toBe('tim'); // KORS → KOR → Tim
    expect(getFriendForCountry('NL')?.id).toBe('rob'); // NL → NED → Rob
  });

  it('returns undefined for an unowned country', () => {
    expect(getFriendForCountry('XYZ')).toBeUndefined();
  });
});

describe('getGroupForCountry', () => {
  it('returns the static group draw assignment', () => {
    expect(getGroupForCountry('MEX')).toBe('A');
    expect(getGroupForCountry('ENG')).toBe('L');
  });

  it('resolves through the alias map', () => {
    expect(getGroupForCountry('NL')).toBe('F'); // NED is in Group F
  });

  it('returns undefined for an unknown country', () => {
    expect(getGroupForCountry('XYZ')).toBeUndefined();
  });

  it('assigns all 48 owned countries to a group', () => {
    for (const f of FRIENDS) {
      for (const c of f.countries) {
        expect(getGroupForCountry(c), `${c} should have a group`).toBeDefined();
      }
    }
  });
});
