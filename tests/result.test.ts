import { describe, it, expect } from 'vitest';
import { decisiveWinnerAbbr, wentToPenalties } from '@/lib/data/result';
import { final, match, penaltyFinal } from './helpers/match';

describe('decisiveWinnerAbbr', () => {
  it('returns the higher scorer for a decisive result', () => {
    expect(decisiveWinnerAbbr(final('GER', 2, 'PAR', 0))).toBe('GER');
    expect(decisiveWinnerAbbr(final('GER', 0, 'PAR', 1))).toBe('PAR');
  });

  it('uses the shootout when goals are level (the Germany–Paraguay case)', () => {
    // GER 1–1 PAR, Paraguay win 4–3 on penalties → Paraguay advances.
    expect(decisiveWinnerAbbr(penaltyFinal('GER', 'PAR', 3, 4))).toBe('PAR');
    expect(decisiveWinnerAbbr(penaltyFinal('NED', 'MAR', 5, 4))).toBe('NED');
  });

  it('returns undefined for a true draw (no shootout) and for unfinished matches', () => {
    expect(decisiveWinnerAbbr(final('GER', 1, 'PAR', 1))).toBeUndefined();
    expect(decisiveWinnerAbbr(match({ home: 'GER', away: 'PAR', status: 'STATUS_SCHEDULED' }))).toBeUndefined();
  });
});

describe('wentToPenalties', () => {
  it('is true only for a level result with a shootout', () => {
    expect(wentToPenalties(penaltyFinal('GER', 'PAR', 3, 4))).toBe(true);
    expect(wentToPenalties(final('GER', 2, 'PAR', 0))).toBe(false);
    expect(wentToPenalties(final('GER', 1, 'PAR', 1))).toBe(false); // level but no shootout recorded
  });
});
