import { describe, it, expect } from 'vitest';
import { calculateLeaderboard } from '@/lib/data/scoring';
import { final, match } from './helpers/match';

// Helper: pull one friend's aggregate from a leaderboard result.
function friend(board: ReturnType<typeof calculateLeaderboard>, id: string) {
  const f = board.find((x) => x.friendId === id);
  if (!f) throw new Error(`friend ${id} not on board`);
  return f;
}
function country(board: ReturnType<typeof calculateLeaderboard>, friendId: string, abbr: string) {
  return friend(board, friendId).countries.find((c) => c.abbr === abbr)!;
}

describe('calculateLeaderboard — FIFA points', () => {
  it('awards 3 points for a win to the winning team only', () => {
    // MEX (Dan) beats RSA (Boris) 2–0
    const board = calculateLeaderboard([final('MEX', 2, 'RSA', 0)]);
    expect(country(board, 'dan', 'MEX').points).toBe(3);
    expect(country(board, 'boris', 'RSA').points).toBe(0);
  });

  it('awards 1 point each for a draw', () => {
    // BRA (Dan) 1–1 SCO (Tim)
    const board = calculateLeaderboard([final('BRA', 1, 'SCO', 1)]);
    expect(country(board, 'dan', 'BRA').points).toBe(1);
    expect(country(board, 'tim', 'SCO').points).toBe(1);
  });

  it('accumulates points across multiple finished matches', () => {
    const board = calculateLeaderboard([
      final('MEX', 2, 'RSA', 0), // MEX +3
      final('MEX', 1, 'KOR', 1), // MEX +1, KOR +1
    ]);
    expect(country(board, 'dan', 'MEX').points).toBe(4);
    expect(country(board, 'tim', 'KOR').points).toBe(1);
  });

  it('ignores matches that are not STATUS_FINAL', () => {
    const board = calculateLeaderboard([
      match({ home: 'MEX', away: 'RSA', homeScore: 5, awayScore: 0, status: 'STATUS_IN_PROGRESS' }),
    ]);
    expect(country(board, 'dan', 'MEX').points).toBe(0);
  });

  it("sums a friend's total points from all their owned countries", () => {
    const board = calculateLeaderboard([
      final('MEX', 2, 'RSA', 0), // MEX (Dan) +3
      final('BRA', 3, 'SCO', 0), // BRA (Dan) +3
    ]);
    expect(friend(board, 'dan').points).toBe(6);
  });
});

describe('calculateLeaderboard — alive tracking', () => {
  it('marks a team alive when it has a scheduled fixture', () => {
    const board = calculateLeaderboard([
      match({ home: 'MEX', away: 'RSA', status: 'STATUS_SCHEDULED' }),
    ]);
    expect(country(board, 'dan', 'MEX').alive).toBe(true);
    expect(country(board, 'boris', 'RSA').alive).toBe(true);
  });

  it('marks a team alive when it has an in-progress fixture', () => {
    const board = calculateLeaderboard([
      match({ home: 'MEX', away: 'RSA', status: 'STATUS_IN_PROGRESS' }),
    ]);
    expect(country(board, 'dan', 'MEX').alive).toBe(true);
  });

  it('does NOT mark a team alive when its only fixtures are finished', () => {
    const board = calculateLeaderboard([final('MEX', 2, 'RSA', 0)]);
    expect(country(board, 'dan', 'MEX').alive).toBe(false);
    expect(country(board, 'boris', 'RSA').alive).toBe(false);
  });

  it('keeps a team alive if any single fixture is still upcoming', () => {
    const board = calculateLeaderboard([
      final('MEX', 2, 'RSA', 0),
      match({ home: 'MEX', away: 'KOR', status: 'STATUS_SCHEDULED' }),
    ]);
    expect(country(board, 'dan', 'MEX').alive).toBe(true);
  });
});

describe('calculateLeaderboard — furthest stage', () => {
  it('records the deepest stage a team has appeared in', () => {
    const board = calculateLeaderboard([
      match({ home: 'MEX', away: 'RSA', stage: 'GROUP_STAGE', status: 'STATUS_FINAL', homeScore: 1, awayScore: 0 }),
      match({ home: 'MEX', away: 'BRA', stage: 'QUARTER_FINAL', status: 'STATUS_SCHEDULED' }),
    ]);
    expect(country(board, 'dan', 'MEX').furthestStage).toBe('QUARTER_FINAL');
  });

  it('is null for a team that never appears in any match', () => {
    const board = calculateLeaderboard([final('MEX', 1, 'RSA', 0)]);
    // BRA (Dan) never played → null furthest stage
    expect(country(board, 'dan', 'BRA').furthestStage).toBeNull();
  });
});

describe('calculateLeaderboard — ranking & tie-breakers', () => {
  it('ranks friends by total points descending', () => {
    const board = calculateLeaderboard([
      final('MEX', 3, 'RSA', 0), // Dan +3, Boris 0
    ]);
    expect(board[0].friendId).toBe('dan');
    expect(board[board.length - 1].points).toBe(0);
  });

  it('breaks point ties on goal difference', () => {
    // Dan (MEX) and Boris (BEL) each win once → both on 3 points. Boris wins by a
    // bigger margin (GD +3 vs +1), so Boris must rank above Dan.
    const board = calculateLeaderboard([
      final('MEX', 1, 'CAN', 0), // Dan +3, GD +1
      final('BEL', 3, 'SUI', 0), // Boris +3, GD +3
    ]);
    expect(friend(board, 'dan').points).toBe(3);
    expect(friend(board, 'boris').points).toBe(3);
    const dan = board.findIndex((f) => f.friendId === 'dan');
    const boris = board.findIndex((f) => f.friendId === 'boris');
    expect(boris).toBeLessThan(dan); // higher GD ranks first
  });

  it('breaks point AND goal-difference ties on goals scored', () => {
    // Dan (MEX) wins 1–0 (GD +1, GF 1); Boris (BEL) wins 2–1 (GD +1, GF 2).
    // Equal points and equal GD → Boris ahead on goals scored.
    const board = calculateLeaderboard([
      final('MEX', 1, 'CAN', 0), // Dan: 3 pts, GD +1, GF 1
      final('BEL', 2, 'SUI', 1), // Boris: 3 pts, GD +1, GF 2
    ]);
    const dan = board.findIndex((f) => f.friendId === 'dan');
    const boris = board.findIndex((f) => f.friendId === 'boris');
    expect(boris).toBeLessThan(dan);
  });

  it('returns one row per friend regardless of match count', () => {
    const board = calculateLeaderboard([final('MEX', 1, 'RSA', 0)]);
    expect(board).toHaveLength(8);
  });
});
