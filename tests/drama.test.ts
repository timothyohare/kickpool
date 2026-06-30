import { describe, it, expect } from 'vitest';
import { detectDrama, recentDecisiveFriendClashes } from '@/lib/data/drama';
import { calculateLeaderboard } from '@/lib/data/scoring';
import { match, penaltyFinal } from './helpers/match';
import type { Match } from '@/types';

// Fixed "now" so lifespans are deterministic. hrs(-3) = kicked off 3h ago, hrs(24) = in 24h.
const NOW = new Date('2026-06-29T12:00:00Z');
const hrs = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();
const lb = (m: Match[]) => calculateLeaderboard(m);
const run = (m: Match[], sledges: Record<string, string> = {}) => detectDrama(m, lb(m), NOW, sledges);

// MEX→Dan, KOR→Tim, BRA→Dan, SCO→Tim, CZE→Tim, CAN→Boomer, RSA→Boris (lib/data/friends.ts)
const finished = (id: string, home: string, hs: number, away: string, as: number, at: string): Match =>
  match({ id, home, away, homeScore: hs, awayScore: as, status: 'STATUS_FINAL', utcDate: at });
const scheduled = (id: string, home: string, away: string, at: string): Match =>
  match({ id, home, away, status: 'STATUS_SCHEDULED', utcDate: at });

describe('recentDecisiveFriendClashes', () => {
  it('captures a recent decisive friend-vs-friend result with winner/loser', () => {
    const m = [finished('k1', 'MEX', 2, 'KOR', 0, hrs(-3))]; // Dan's Mexico beat Tim's Korea
    const c = recentDecisiveFriendClashes(m, lb(m), NOW);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({
      matchId: 'k1', winnerFriend: 'Dan', loserFriend: 'Tim',
      winnerScore: 2, loserScore: 0,
    });
    expect(c[0].loserEliminated).toBe(true); // Tim has no other upcoming team here
  });

  it('does not mark the loser eliminated while they still have an upcoming team', () => {
    const m = [
      finished('k1', 'MEX', 2, 'KOR', 0, hrs(-3)),
      scheduled('u1', 'CZE', 'USA', hrs(20)), // Tim's Czechia is still to play
    ];
    expect(recentDecisiveFriendClashes(m, lb(m), NOW)[0].loserEliminated).toBe(false);
  });

  it('counts a penalty-shootout result as decisive (the Germany–Paraguay case)', () => {
    // BRA(Dan) 1–1 SCO(Tim), Scotland win 5–4 on pens → Tim beat Dan, flagged as penalties.
    const m = [{ ...penaltyFinal('BRA', 'SCO', 4, 5), id: 'k1', utcDate: hrs(-3) }];
    const c = recentDecisiveFriendClashes(m, lb(m), NOW);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ winnerFriend: 'Tim', loserFriend: 'Dan', penalties: true });
  });

  it('ignores draws, same-owner games, and anything older than 24h', () => {
    const m = [
      finished('d1', 'MEX', 1, 'KOR', 1, hrs(-3)),   // draw
      finished('s1', 'KOR', 1, 'CZE', 0, hrs(-3)),   // both Tim's
      finished('o1', 'BRA', 1, 'SCO', 0, hrs(-30)),  // decisive but 30h ago
    ];
    expect(recentDecisiveFriendClashes(m, lb(m), NOW)).toHaveLength(0);
  });
});

describe('detectDrama — post-game sledges', () => {
  it('shows a sledge within 24h carrying the pre-cached text', () => {
    const m = [finished('k1', 'MEX', 2, 'KOR', 0, hrs(-2))];
    const post = run(m, { k1: 'Tim, maybe stick to the cricket.' }).filter((e) => e.window === 'post');
    expect(post).toHaveLength(1);
    expect(post[0]).toMatchObject({ type: 'sledge', matchId: 'k1', detail: 'Tim, maybe stick to the cricket.' });
    expect(post[0].emoji).toBe('💀'); // this knocked Tim out
  });

  it('drops the sledge once the game is older than 24h', () => {
    const m = [finished('k1', 'MEX', 2, 'KOR', 0, hrs(-26))];
    expect(run(m, { k1: 'gone by now' }).some((e) => e.window === 'post')).toBe(false);
  });

  it('shows nothing for an in-window result that has no cached sledge yet', () => {
    const m = [finished('k1', 'MEX', 2, 'KOR', 0, hrs(-2))];
    expect(run(m, {}).some((e) => e.window === 'post')).toBe(false);
  });
});

describe('detectDrama — pre-game notices', () => {
  it('raises a grudge for an upcoming rematch within 48h after a prior defeat', () => {
    const m = [
      finished('p1', 'MEX', 2, 'KOR', 0, hrs(-60)), // Dan beat Tim earlier (out of the 24h sledge window)
      scheduled('r1', 'BRA', 'SCO', hrs(24)),       // Dan vs Tim again, within 48h
    ];
    const pre = run(m).filter((e) => e.window === 'pre');
    expect(pre).toHaveLength(1);
    expect(pre[0].type).toBe('grudge');
    expect(pre[0].headline).toMatch(/revenge/i);
  });

  it('raises a clash for an upcoming friend match with no prior history', () => {
    const pre = run([scheduled('r1', 'BRA', 'SCO', hrs(10))]).filter((e) => e.window === 'pre');
    expect(pre).toHaveLength(1);
    expect(pre[0].type).toBe('clash');
  });

  it('ignores upcoming games beyond the 48h horizon', () => {
    expect(run([scheduled('r1', 'BRA', 'SCO', hrs(60))]).some((e) => e.window === 'pre')).toBe(false);
  });

  it('does not raise a clash when both teams share an owner', () => {
    expect(run([scheduled('r1', 'KOR', 'CZE', hrs(10))]).some((e) => e.window === 'pre')).toBe(false);
  });
});

describe('detectDrama — output shape', () => {
  it('caps the strip at 5 events', () => {
    const m = [
      finished('a', 'MEX', 1, 'KOR', 0, hrs(-2)), // Dan v Tim
      finished('b', 'CAN', 1, 'RSA', 0, hrs(-3)), // Boomer v Boris
      finished('c', 'BRA', 1, 'SCO', 0, hrs(-4)), // Dan v Tim (same pair as a, still its own match)
      scheduled('d', 'USA', 'ENG', hrs(6)),       // Hamish v Jake
      scheduled('e', 'NED', 'POR', hrs(8)),       // Rob v Boomer
      scheduled('f', 'ESP', 'FRA', hrs(10)),      // Hamish v Tim
    ];
    const sledges = { a: 'x', b: 'y', c: 'z' };
    expect(run(m, sledges).length).toBeLessThanOrEqual(5);
  });

  it('returns nothing for an empty schedule', () => {
    expect(detectDrama([], [], NOW, {})).toEqual([]);
  });
});
