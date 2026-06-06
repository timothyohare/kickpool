import type { Match, FriendScore } from '@/types';
import { normAbbr } from './friends';

export interface DramaEvent {
  type: 'eliminated' | 'grudge';
  emoji: string;
  headline: string;
  detail: string;
}

export function detectDrama(allMatches: Match[], leaderboard: FriendScore[]): DramaEvent[] {
  const events: DramaEvent[] = [];

  // Teams that still have upcoming matches
  const hasUpcoming = new Set<string>();
  for (const m of allMatches) {
    if (m.status === 'STATUS_SCHEDULED' || m.status === 'STATUS_POSTPONED') {
      hasUpcoming.add(normAbbr(m.homeTeam.abbr));
      hasUpcoming.add(normAbbr(m.awayTeam.abbr));
    }
  }

  // Teams that have appeared in at least one completed match
  const hasPlayed = new Set<string>();
  for (const m of allMatches) {
    if (m.status === 'STATUS_FINAL') {
      hasPlayed.add(normAbbr(m.homeTeam.abbr));
      hasPlayed.add(normAbbr(m.awayTeam.abbr));
    }
  }

  // Eliminated friends: all their teams have played but none have upcoming fixtures
  for (const friend of leaderboard) {
    const anyPlayed = friend.countries.some((c) => hasPlayed.has(c.abbr));
    const noneUpcoming = friend.countries.every((c) => !hasUpcoming.has(c.abbr));
    if (anyPlayed && noneUpcoming) {
      const ROASTS = [
        `${friend.friendName}'s teams have all packed their bags and gone home. A bold strategy.`,
        `Every single one of ${friend.friendName}'s teams is out. The football gods have spoken.`,
        `${friend.friendName} is now a neutral supporter. A humbling experience.`,
        `${friend.friendName}'s World Cup is officially over. At least they got the group stage experience.`,
      ];
      const roast = ROASTS[friend.friendId.charCodeAt(0) % ROASTS.length];
      events.push({
        type: 'eliminated',
        emoji: '💀',
        headline: `${friend.friendName} has been eliminated!`,
        detail: roast,
      });
    }
  }

  // Grudge matches: upcoming match between two different friends where they've clashed before
  const beatRecord: Map<string, { winTeam: string; loseTeam: string }> = new Map();
  for (const m of allMatches) {
    if (m.status !== 'STATUS_FINAL') continue;
    const hs = m.score.home ?? 0;
    const as = m.score.away ?? 0;
    if (hs === as) continue;
    const winner = hs > as ? m.homeTeam : m.awayTeam;
    const loser = hs > as ? m.awayTeam : m.homeTeam;
    if (winner.friendId !== loser.friendId && winner.friendId !== 'unknown' && loser.friendId !== 'unknown') {
      const key = `${winner.friendId}:${loser.friendId}`;
      if (!beatRecord.has(key)) {
        beatRecord.set(key, { winTeam: winner.name, loseTeam: loser.name });
      }
    }
  }

  const seenGrudges = new Set<string>();
  for (const m of allMatches) {
    if (m.status !== 'STATUS_SCHEDULED') continue;
    const hf = m.homeTeam.friendId;
    const af = m.awayTeam.friendId;
    if (hf === af || hf === 'unknown' || af === 'unknown') continue;

    const grudgeKey = [hf, af].sort().join(':');
    if (seenGrudges.has(grudgeKey)) continue;

    const homeWasBeaten = beatRecord.get(`${af}:${hf}`);
    const awayWasBeaten = beatRecord.get(`${hf}:${af}`);

    if (homeWasBeaten) {
      seenGrudges.add(grudgeKey);
      events.push({
        type: 'grudge',
        emoji: '⚔️',
        headline: `${m.homeTeam.friendName} gets their shot at revenge on ${m.awayTeam.friendName}`,
        detail: `${m.homeTeam.friendName}'s ${homeWasBeaten.loseTeam} fell to ${m.awayTeam.friendName}'s ${homeWasBeaten.winTeam} earlier. Now ${m.homeTeam.name} faces ${m.awayTeam.name}. Settle the score.`,
      });
    } else if (awayWasBeaten) {
      seenGrudges.add(grudgeKey);
      events.push({
        type: 'grudge',
        emoji: '⚔️',
        headline: `${m.awayTeam.friendName} gets their shot at revenge on ${m.homeTeam.friendName}`,
        detail: `${m.awayTeam.friendName}'s ${awayWasBeaten.loseTeam} fell to ${m.homeTeam.friendName}'s ${awayWasBeaten.winTeam} earlier. Now ${m.awayTeam.name} faces ${m.homeTeam.name}. Settle the score.`,
      });
    }
  }

  return events.slice(0, 5);
}
