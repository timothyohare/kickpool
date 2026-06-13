import { describe, it, expect } from 'vitest';
import { detectDrama } from '@/lib/data/drama';
import { calculateLeaderboard } from '@/lib/data/scoring';
import { final, match } from './helpers/match';
import type { Match } from '@/types';

function drama(matches: Match[]) {
  return detectDrama(matches, calculateLeaderboard(matches));
}

describe('detectDrama — eliminations', () => {
  it('flags a friend whose every team has played and has nothing upcoming', () => {
    // Tim owns KOR, CZE, SCO, FRA, ARG, ALG. Knock them all out (finished, no upcoming).
    const tim = ['KOR', 'CZE', 'SCO', 'FRA', 'ARG', 'ALG'];
    const matches = tim.map((t) => final(t, 0, 'MEX', 1));
    const events = drama(matches);
    const elim = events.filter((e) => e.type === 'eliminated');
    expect(elim.some((e) => e.headline.includes('Tim'))).toBe(true);
  });

  it('does NOT flag a friend who still has an upcoming fixture', () => {
    const matches = [
      final('KOR', 0, 'MEX', 1),
      match({ home: 'CZE', away: 'BRA', status: 'STATUS_SCHEDULED' }), // Tim's CZE still alive
    ];
    const events = drama(matches);
    expect(events.some((e) => e.type === 'eliminated' && e.headline.includes('Tim'))).toBe(false);
  });

  it('does NOT flag a friend none of whose teams have played yet', () => {
    const matches = [
      match({ home: 'KOR', away: 'MEX', status: 'STATUS_SCHEDULED' }),
    ];
    const events = drama(matches);
    expect(events.some((e) => e.type === 'eliminated')).toBe(false);
  });
});

describe('detectDrama — grudge matches', () => {
  it('flags a rematch after one friend beat another', () => {
    // Earlier: Dan's MEX beat Tim's KOR. Upcoming: Dan's BRA vs Tim's SCO → grudge.
    const matches = [
      final('MEX', 2, 'KOR', 0), // Dan beat Tim
      match({ home: 'BRA', away: 'SCO', status: 'STATUS_SCHEDULED' }), // Dan vs Tim again
    ];
    const events = drama(matches);
    const grudge = events.filter((e) => e.type === 'grudge');
    expect(grudge).toHaveLength(1);
    expect(grudge[0].headline).toMatch(/revenge/i);
  });

  it('does not raise a grudge when the two teams share an owner', () => {
    // Tim owns both KOR and CZE — an upcoming KOR vs CZE is not a friend rivalry.
    const matches = [
      final('MEX', 2, 'BRA', 0), // Dan vs Dan, ignored anyway
      match({ home: 'KOR', away: 'CZE', status: 'STATUS_SCHEDULED' }),
    ];
    const events = drama(matches);
    expect(events.some((e) => e.type === 'grudge')).toBe(false);
  });

  it('does not raise a grudge without a prior defeat between the two friends', () => {
    const matches = [
      match({ home: 'BRA', away: 'SCO', status: 'STATUS_SCHEDULED' }), // no prior clash
    ];
    const events = drama(matches);
    expect(events.some((e) => e.type === 'grudge')).toBe(false);
  });

  it('does not treat a prior draw as a grudge', () => {
    const matches = [
      final('MEX', 1, 'KOR', 1), // draw, no winner/loser
      match({ home: 'BRA', away: 'SCO', status: 'STATUS_SCHEDULED' }),
    ];
    const events = drama(matches);
    expect(events.some((e) => e.type === 'grudge')).toBe(false);
  });

  it('deduplicates: one grudge per friend pairing even with multiple rematches', () => {
    const matches = [
      final('MEX', 2, 'KOR', 0), // Dan beat Tim
      match({ home: 'BRA', away: 'SCO', status: 'STATUS_SCHEDULED' }), // Dan v Tim
      match({ home: 'EGY', away: 'FRA', status: 'STATUS_SCHEDULED' }), // Dan v Tim again
    ];
    const grudge = drama(matches).filter((e) => e.type === 'grudge');
    expect(grudge).toHaveLength(1);
  });
});

describe('detectDrama — output shape', () => {
  it('caps the output at 5 events even when more drama exists', () => {
    // Three finished matches knock out six different friends (each owner has a
    // team that has played and none upcoming) → six elimination events, which
    // must be sliced down to five.
    const matches = [
      final('MEX', 1, 'RSA', 0), // eliminates Dan + Boris
      final('KOR', 1, 'CAN', 0), // eliminates Tim + Boomer
      final('NED', 1, 'MAR', 0), // eliminates Rob + Ben
    ];
    const events = drama(matches);
    // Six eliminations are generated; without the cap the array would be length 6.
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.type === 'eliminated')).toBe(true);
  });

  it('returns no events for an empty schedule', () => {
    expect(drama([])).toEqual([]);
  });
});
