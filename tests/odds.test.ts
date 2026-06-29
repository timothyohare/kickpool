import { describe, it, expect } from 'vitest';
import { parseOddsSnapshot } from '@/lib/api/odds';

const raw = {
  generatedAt: new Date().toISOString(),
  sims: 100000,
  teams: [
    { team: 'ARG', champion: 0.25, runnerUp: 0.11, reachFinal: 0.396, reachSemi: 0.55, escapeGroup: 0.99 },
    { team: 'KORS', reachFinal: 0.04 }, // ESPN variant abbr → normalised to KOR
  ],
};

describe('parseOddsSnapshot', () => {
  it('normalises team abbreviations and exposes reach-final odds', () => {
    const snap = parseOddsSnapshot(raw)!;
    expect(snap.sims).toBe(100000);
    expect(snap.byAbbr.ARG.reachFinal).toBeCloseTo(0.396);
    // KORS is mapped to KOR via normAbbr; missing fields default to 0.
    expect(snap.byAbbr.KOR.reachFinal).toBeCloseTo(0.04);
    expect(snap.byAbbr.KOR.champion).toBe(0);
    expect(snap.byAbbr.KORS).toBeUndefined();
  });

  it('returns null for missing or empty payloads', () => {
    expect(parseOddsSnapshot({})).toBeNull();
    expect(parseOddsSnapshot({ teams: [] })).toBeNull();
    expect(parseOddsSnapshot({ teams: [{ champion: 0.5 }] })).toBeNull(); // no team id → nothing usable
  });

  it('flags a snapshot older than the max age as stale (unless forced fresh)', () => {
    const old = { ...raw, generatedAt: '2026-01-01T00:00:00Z' };
    const now = new Date('2026-06-29T00:00:00Z').getTime();
    expect(parseOddsSnapshot(old, false, now)!.stale).toBe(true);
    // Committed fixtures pass fresh=true so the offline demo always renders odds.
    expect(parseOddsSnapshot(old, true, now)!.stale).toBe(false);
  });

  it('treats a recent snapshot as fresh', () => {
    const now = new Date('2026-06-29T00:00:00Z').getTime();
    const recent = { ...raw, generatedAt: '2026-06-28T00:00:00Z' };
    expect(parseOddsSnapshot(recent, false, now)!.stale).toBe(false);
  });
});
