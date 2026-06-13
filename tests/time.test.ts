import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  toAEST,
  toAESTTime,
  toAESTDate,
  matchDayLabel,
  isMatchLive,
  isMatchFinished,
  isMatchUpcoming,
} from '@/lib/utils/time';

// A fixed UTC instant: 2026-06-11 19:00 UTC. Sydney is UTC+10 (no DST in June),
// so this is 2026-06-12 05:00 AEST.
const UTC = '2026-06-11T19:00Z';

describe('AEST formatting', () => {
  it('renders the full label in Sydney time', () => {
    expect(toAEST(UTC)).toBe('Fri 12 Jun, 5:00 AM AEST');
  });

  it('renders just the time', () => {
    expect(toAESTTime(UTC)).toBe('5:00 AM');
  });

  it('renders just the date', () => {
    expect(toAESTDate(UTC)).toBe('Fri 12 Jun');
  });

  it('shifts across the date boundary correctly (late-UTC → next AEST day)', () => {
    // 23:30 UTC on Jun 11 → 09:30 AEST on Jun 12
    expect(toAEST('2026-06-11T23:30Z')).toBe('Fri 12 Jun, 9:30 AM AEST');
  });
});

describe('matchDayLabel', () => {
  afterEach(() => vi.useRealTimers());

  it('says "Today" when the match falls on the current AEST day', () => {
    vi.setSystemTime(new Date('2026-06-12T01:00Z')); // 11:00 AEST Jun 12
    expect(matchDayLabel(UTC)).toBe('Today'); // match is 05:00 AEST Jun 12
  });

  it('says "Tomorrow" when the match is the next AEST day', () => {
    vi.setSystemTime(new Date('2026-06-11T01:00Z')); // 11:00 AEST Jun 11
    expect(matchDayLabel(UTC)).toBe('Tomorrow'); // match is Jun 12 AEST
  });

  it('falls back to a date for anything further out', () => {
    vi.setSystemTime(new Date('2026-06-01T01:00Z'));
    expect(matchDayLabel(UTC)).toBe('Fri 12 Jun');
  });
});

describe('status predicates', () => {
  it('isMatchLive only for in-progress and halftime', () => {
    expect(isMatchLive('STATUS_IN_PROGRESS')).toBe(true);
    expect(isMatchLive('STATUS_HALFTIME')).toBe(true);
    expect(isMatchLive('STATUS_SCHEDULED')).toBe(false);
    expect(isMatchLive('STATUS_FINAL')).toBe(false);
  });

  it('isMatchFinished only for final', () => {
    expect(isMatchFinished('STATUS_FINAL')).toBe(true);
    expect(isMatchFinished('STATUS_IN_PROGRESS')).toBe(false);
  });

  it('isMatchUpcoming only for scheduled', () => {
    expect(isMatchUpcoming('STATUS_SCHEDULED')).toBe(true);
    expect(isMatchUpcoming('STATUS_POSTPONED')).toBe(false);
  });
});
