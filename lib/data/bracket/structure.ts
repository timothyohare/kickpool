// The fixed FIFA World Cup 26 knockout slot tree (Regulations §12.6–12.11): which group
// places and prior-match winners feed each of matches M73–M104. The R32 slot list and the
// later-round TREE are vendored from the sibling FifaWorldCupMonteCarloSim project
// (src/engine/bracket-2026.ts); the structure was cross-checked against ESPN's published
// 2026 bracket (e.g. Match 89 = winner of M74 vs winner of M77 == ESPN "RD32 W2 / RD32 W5").
//
// Static data, framework-free, so the bracket builder (lib/data/bracket.ts) stays pure.
import type { TournamentStage } from '@/types';

/** A round-of-32 slot: the group winner, group runner-up, or a best-third assigned via Annex C. */
export type Slot = { winner: string } | { runner: string } | { third: string };

export interface R32SlotDef {
  match: number;
  a: Slot;
  b: Slot;
}

/** Round of 32 (M73–M88), §12.6. `third: X` = the best-third assigned to face winner of group X. */
export const R32: R32SlotDef[] = [
  { match: 73, a: { runner: 'A' }, b: { runner: 'B' } },
  { match: 74, a: { winner: 'E' }, b: { third: 'E' } },
  { match: 75, a: { winner: 'F' }, b: { runner: 'C' } },
  { match: 76, a: { winner: 'C' }, b: { runner: 'F' } },
  { match: 77, a: { winner: 'I' }, b: { third: 'I' } },
  { match: 78, a: { runner: 'E' }, b: { runner: 'I' } },
  { match: 79, a: { winner: 'A' }, b: { third: 'A' } },
  { match: 80, a: { winner: 'L' }, b: { third: 'L' } },
  { match: 81, a: { winner: 'D' }, b: { third: 'D' } },
  { match: 82, a: { winner: 'G' }, b: { third: 'G' } },
  { match: 83, a: { runner: 'K' }, b: { runner: 'L' } },
  { match: 84, a: { winner: 'H' }, b: { runner: 'J' } },
  { match: 85, a: { winner: 'B' }, b: { third: 'B' } },
  { match: 86, a: { winner: 'J' }, b: { runner: 'H' } },
  { match: 87, a: { winner: 'K' }, b: { third: 'K' } },
  { match: 88, a: { runner: 'D' }, b: { runner: 'G' } },
];

/** A later-round match: takes the winner (or, for the 3rd-place play-off, the loser) of two prior matches. */
export interface TreeNode {
  match: number;
  a: number;
  b: number;
  takes: 'W' | 'L';
}

// Round of 16 → Final (§12.7–12.11). M103 is the 3rd-place play-off: the two semifinal LOSERS.
export const TREE: TreeNode[] = [
  { match: 89, a: 74, b: 77, takes: 'W' }, { match: 90, a: 73, b: 75, takes: 'W' },
  { match: 91, a: 76, b: 78, takes: 'W' }, { match: 92, a: 79, b: 80, takes: 'W' },
  { match: 93, a: 83, b: 84, takes: 'W' }, { match: 94, a: 81, b: 82, takes: 'W' },
  { match: 95, a: 86, b: 88, takes: 'W' }, { match: 96, a: 85, b: 87, takes: 'W' },
  { match: 97, a: 89, b: 90, takes: 'W' }, { match: 98, a: 93, b: 94, takes: 'W' },
  { match: 99, a: 91, b: 92, takes: 'W' }, { match: 100, a: 95, b: 96, takes: 'W' },
  { match: 101, a: 97, b: 98, takes: 'W' }, { match: 102, a: 99, b: 100, takes: 'W' },
  { match: 103, a: 101, b: 102, takes: 'L' }, // 3rd-place play-off (semifinal losers)
  { match: 104, a: 101, b: 102, takes: 'W' }, // Final
];

/** First/last match number per knockout round, in match-number order. */
const ROUND_BOUNDS: { stage: TournamentStage; first: number; last: number }[] = [
  { stage: 'ROUND_OF_32', first: 73, last: 88 },
  { stage: 'ROUND_OF_16', first: 89, last: 96 },
  { stage: 'QUARTER_FINAL', first: 97, last: 100 },
  { stage: 'SEMI_FINAL', first: 101, last: 102 },
  { stage: 'THIRD_PLACE', first: 103, last: 103 },
  { stage: 'FINAL', first: 104, last: 104 },
];

export function roundOf(matchNo: number): TournamentStage {
  const b = ROUND_BOUNDS.find((r) => matchNo >= r.first && matchNo <= r.last);
  if (!b) throw new Error(`roundOf: no knockout round for match ${matchNo}`);
  return b.stage;
}

/** 1-based position of a match within its round (Match 74 → 2 in the round of 32). */
export function ordinalInRound(matchNo: number): number {
  const b = ROUND_BOUNDS.find((r) => matchNo >= r.first && matchNo <= r.last)!;
  return matchNo - b.first + 1;
}

const FEEDER_PREFIX: Partial<Record<TournamentStage, string>> = {
  ROUND_OF_32: 'RD32',
  ROUND_OF_16: 'RD16',
  QUARTER_FINAL: 'QF',
  SEMI_FINAL: 'SF',
};

/** ESPN-style placeholder for an undecided feeder, e.g. winner of M74 → "RD32 W2", SF loser → "SF L1". */
export function feederLabel(childMatch: number, takes: 'W' | 'L'): string {
  const prefix = FEEDER_PREFIX[roundOf(childMatch)] ?? 'M';
  return `${prefix} ${takes}${ordinalInRound(childMatch)}`;
}

// Card order within each round so adjacent pairs feed the same next-round match and the
// connector lines stay clean — taken from ESPN's rendered bracket.
export const DISPLAY_ORDER: Record<TournamentStage, number[]> = {
  GROUP_STAGE: [],
  ROUND_OF_32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  ROUND_OF_16: [89, 90, 93, 94, 91, 92, 95, 96],
  QUARTER_FINAL: [97, 98, 99, 100],
  SEMI_FINAL: [101, 102],
  THIRD_PLACE: [103],
  FINAL: [104],
};
