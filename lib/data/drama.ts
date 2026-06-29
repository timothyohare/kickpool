import type { Match, FriendScore } from '@/types';
import { normAbbr } from './friends';

// A drama notice is always anchored to a specific match and a time window, so the strip stays
// live: pre-game notices fall off at kickoff (the match is no longer scheduled) and post-game
// sledges expire ~24h after kickoff. `detectDrama` is pure/synchronous — the (Claude-generated)
// sledge text is passed in pre-cached, so selection + lifespan are fully deterministic.
export interface DramaEvent {
  type: 'grudge' | 'clash' | 'sledge';
  window: 'pre' | 'post';
  matchId: string;
  at: string; // kickoff, UTC ISO — drives ordering + expiry
  emoji: string;
  headline: string;
  detail: string;
}

/** A finished friend-vs-friend result that warrants a post-game sledge. */
export interface SledgeCandidate {
  matchId: string;
  at: string;
  winnerName: string;
  loserName: string;
  winnerFriend: string;
  loserFriend: string;
  winnerFriendId: string;
  loserFriendId: string;
  winnerScore: number;
  loserScore: number;
  /** True when this defeat knocked the losing friend's last remaining team out. */
  loserEliminated: boolean;
}

const HOUR = 60 * 60 * 1000;
const PRE_HORIZON_MS = 48 * HOUR; // upcoming games within the next 48h
const POST_WINDOW_MS = 24 * HOUR; // results from the last 24h (since kickoff)

function teamsByFriend(leaderboard: FriendScore[]): Map<string, string[]> {
  return new Map(leaderboard.map((f) => [f.friendId, f.countries.map((c) => normAbbr(c.abbr))]));
}

function upcomingTeams(allMatches: Match[]): Set<string> {
  const s = new Set<string>();
  for (const m of allMatches) {
    if (m.status === 'STATUS_SCHEDULED' || m.status === 'STATUS_POSTPONED') {
      s.add(normAbbr(m.homeTeam.abbr));
      s.add(normAbbr(m.awayTeam.abbr));
    }
  }
  return s;
}

/**
 * Finished, decisive, friend-vs-friend matches whose kickoff was within the last 24h — the set
 * that earns a sledge. Shared by the page (to warm the cache) and `detectDrama` (to render),
 * so the two never disagree about which games qualify.
 */
export function recentDecisiveFriendClashes(
  allMatches: Match[],
  leaderboard: FriendScore[],
  now: Date = new Date(),
): SledgeCandidate[] {
  const nowMs = now.getTime();
  const byFriend = teamsByFriend(leaderboard);
  const upcoming = upcomingTeams(allMatches);

  const out: SledgeCandidate[] = [];
  for (const m of allMatches) {
    if (m.status !== 'STATUS_FINAL') continue;
    const at = new Date(m.utcDate).getTime();
    const age = nowMs - at;
    if (age < 0 || age >= POST_WINDOW_MS) continue; // only the last 24h

    const hs = m.score.home ?? 0;
    const as = m.score.away ?? 0;
    if (hs === as) continue; // a draw has no winner to crow about

    const homeWon = hs > as;
    const winner = homeWon ? m.homeTeam : m.awayTeam;
    const loser = homeWon ? m.awayTeam : m.homeTeam;
    if (
      winner.friendId === loser.friendId ||
      winner.friendId === 'unknown' ||
      loser.friendId === 'unknown'
    ) {
      continue;
    }

    const loserTeams = byFriend.get(loser.friendId) ?? [];
    const loserEliminated = loserTeams.length > 0 && loserTeams.every((a) => !upcoming.has(a));

    out.push({
      matchId: m.id,
      at: m.utcDate,
      winnerName: winner.name,
      loserName: loser.name,
      winnerFriend: winner.friendName,
      loserFriend: loser.friendName,
      winnerFriendId: winner.friendId,
      loserFriendId: loser.friendId,
      winnerScore: homeWon ? hs : as,
      loserScore: homeWon ? as : hs,
      loserEliminated,
    });
  }
  // Most recent first.
  out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return out;
}

// Index prior friend-vs-friend defeats so an upcoming rematch reads as a grudge, not a fresh clash.
function priorDefeats(allMatches: Match[]): Map<string, { winTeam: string; loseTeam: string }> {
  const beat = new Map<string, { winTeam: string; loseTeam: string }>();
  for (const m of allMatches) {
    if (m.status !== 'STATUS_FINAL') continue;
    const hs = m.score.home ?? 0;
    const as = m.score.away ?? 0;
    if (hs === as) continue;
    const winner = hs > as ? m.homeTeam : m.awayTeam;
    const loser = hs > as ? m.awayTeam : m.homeTeam;
    if (winner.friendId !== loser.friendId && winner.friendId !== 'unknown' && loser.friendId !== 'unknown') {
      const key = `${winner.friendId}:${loser.friendId}`;
      if (!beat.has(key)) beat.set(key, { winTeam: winner.name, loseTeam: loser.name });
    }
  }
  return beat;
}

function preGameEvents(allMatches: Match[], nowMs: number): DramaEvent[] {
  const beat = priorDefeats(allMatches);
  const seen = new Set<string>(); // one notice per friend pairing
  const events: DramaEvent[] = [];

  const upcoming = allMatches
    .filter((m) => m.status === 'STATUS_SCHEDULED')
    .map((m) => ({ m, at: new Date(m.utcDate).getTime() }))
    .filter(({ at }) => at - nowMs >= 0 && at - nowMs <= PRE_HORIZON_MS)
    .sort((a, b) => a.at - b.at); // soonest first

  for (const { m } of upcoming) {
    const hf = m.homeTeam.friendId;
    const af = m.awayTeam.friendId;
    if (hf === af || hf === 'unknown' || af === 'unknown') continue;

    const pairKey = [hf, af].sort().join(':');
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const homeRevenge = beat.get(`${af}:${hf}`); // away friend previously beat home friend
    const awayRevenge = beat.get(`${hf}:${af}`);

    if (homeRevenge) {
      events.push({
        type: 'grudge', window: 'pre', matchId: m.id, at: m.utcDate, emoji: '⚔️',
        headline: `${m.homeTeam.friendName} gets a shot at revenge on ${m.awayTeam.friendName}`,
        detail: `${m.homeTeam.friendName}'s ${homeRevenge.loseTeam} fell to ${m.awayTeam.friendName}'s ${homeRevenge.winTeam} earlier. Now ${m.homeTeam.name} faces ${m.awayTeam.name}. Settle the score.`,
      });
    } else if (awayRevenge) {
      events.push({
        type: 'grudge', window: 'pre', matchId: m.id, at: m.utcDate, emoji: '⚔️',
        headline: `${m.awayTeam.friendName} gets a shot at revenge on ${m.homeTeam.friendName}`,
        detail: `${m.awayTeam.friendName}'s ${awayRevenge.loseTeam} fell to ${m.homeTeam.friendName}'s ${awayRevenge.winTeam} earlier. Now ${m.awayTeam.name} faces ${m.homeTeam.name}. Settle the score.`,
      });
    } else {
      events.push({
        type: 'clash', window: 'pre', matchId: m.id, at: m.utcDate, emoji: '🤝',
        headline: `${m.homeTeam.friendName} vs ${m.awayTeam.friendName} — bragging rights on the line`,
        detail: `${m.homeTeam.friendName}'s ${m.homeTeam.name} take on ${m.awayTeam.friendName}'s ${m.awayTeam.name}. Loser buys the next round.`,
      });
    }
  }
  return events;
}

function postGameEvents(
  candidates: SledgeCandidate[],
  sledges: Record<string, string>,
): DramaEvent[] {
  const events: DramaEvent[] = [];
  for (const c of candidates) {
    const text = sledges[c.matchId];
    if (!text) continue; // no cached sledge yet → nothing to show
    events.push({
      type: 'sledge', window: 'post', matchId: c.matchId, at: c.at,
      emoji: c.loserEliminated ? '💀' : '🗣️',
      headline: c.loserEliminated
        ? `${c.winnerFriend} knocks ${c.loserFriend} out — ${c.winnerName} ${c.winnerScore}–${c.loserScore} ${c.loserName}`
        : `${c.winnerFriend} downs ${c.loserFriend} — ${c.winnerName} ${c.winnerScore}–${c.loserScore} ${c.loserName}`,
      detail: text,
    });
  }
  return events;
}

/**
 * Build the drama strip. `now` is injected for testability; `sledges` maps a finished match id to
 * its pre-generated (Claude) sledge line. Returns at most 5 events — most-recent results first,
 * then soonest upcoming games — so the strip reads as "what just happened" + "what's coming up".
 */
export function detectDrama(
  allMatches: Match[],
  leaderboard: FriendScore[],
  now: Date = new Date(),
  sledges: Record<string, string> = {},
): DramaEvent[] {
  const nowMs = now.getTime();
  const post = postGameEvents(recentDecisiveFriendClashes(allMatches, leaderboard, now), sledges);
  const pre = preGameEvents(allMatches, nowMs);
  // Balance the strip: up to 3 fresh results + up to 3 upcoming, capped at 5 overall.
  return [...post.slice(0, 3), ...pre.slice(0, 3)].slice(0, 5);
}
