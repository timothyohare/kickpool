import type { Match } from '@/types';
import { isMatchFinished } from '@/lib/utils/time';

/**
 * The team that wins (and, in a knockout, advances) from a finished match — by abbreviation.
 * Goals decide it first; if goals are level the penalty shootout does. Returns undefined for an
 * unfinished match or a genuine draw with no shootout (e.g. a group-stage draw has no winner).
 * Used by both the bracket (who advances) and the drama strip (who earns a sledge) so they agree.
 */
export function decisiveWinnerAbbr(m: Match): string | undefined {
  if (!isMatchFinished(m.status)) return undefined;
  const { home, away, shootoutHome, shootoutAway } = m.score;
  if (home == null || away == null) return undefined;
  if (home !== away) return home > away ? m.homeTeam.abbr : m.awayTeam.abbr;
  if (shootoutHome != null && shootoutAway != null && shootoutHome !== shootoutAway) {
    return shootoutHome > shootoutAway ? m.homeTeam.abbr : m.awayTeam.abbr;
  }
  return undefined;
}

/** True when a finished tie was settled by a penalty shootout (goals level, shootout scored). */
export function wentToPenalties(m: Match): boolean {
  const { home, away, shootoutHome, shootoutAway } = m.score;
  return home != null && home === away && shootoutHome != null && shootoutAway != null;
}
