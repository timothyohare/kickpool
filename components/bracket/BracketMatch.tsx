import Image from 'next/image';
import Link from 'next/link';
import type { BracketMatch, BracketSlot } from '@/lib/data/bracket';
import { isMatchLive, isMatchFinished, toAESTDate, toAESTTime } from '@/lib/utils/time';

interface Props {
  match: BracketMatch;
  /** When set, teams owned by this friend are highlighted so you can trace their path. */
  highlightFriendId?: string | null;
}

// Neutral crest for an undecided slot (mirrors ESPN's grey shield).
function Shield() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} className="flex-shrink-0 text-gray-300" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2 4 5v6c0 4.4 3.1 8.5 8 11 4.9-2.5 8-6.6 8-11V5l-8-3Z"
      />
    </svg>
  );
}

function SlotRow({
  slot,
  score,
  isWinner,
  decided,
  highlightFriendId,
}: {
  slot: BracketSlot;
  score: number | null;
  isWinner: boolean;
  decided: boolean;
  highlightFriendId?: string | null;
}) {
  if (slot.kind === 'placeholder') {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Shield />
        <span className="text-sm font-medium text-gray-400 tabular-nums">{slot.label}</span>
      </div>
    );
  }

  const highlighted = !!highlightFriendId && slot.team.friendId === highlightFriendId;
  // A decided match dims the loser; before a result both teams read normally.
  const dim = decided && !isWinner;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${highlighted ? 'bg-yellow-50' : ''}`}
      style={highlighted ? { boxShadow: `inset 3px 0 0 ${slot.team.friendColour}` } : undefined}
    >
      <Image
        src={slot.team.logo}
        alt={slot.team.name}
        width={22}
        height={22}
        className={`rounded-full border border-gray-100 flex-shrink-0 ${dim ? 'opacity-40' : ''}`}
        unoptimized
      />
      <span
        className={`text-sm leading-tight flex-1 ${isWinner ? 'font-bold text-gray-900' : 'font-medium'} ${
          dim ? 'text-gray-400' : 'text-gray-900'
        } ${slot.provisional ? 'italic' : ''}`}
        title={slot.provisional ? 'Provisional — group not yet decided' : undefined}
      >
        {slot.team.name}
        {slot.provisional && <span className="text-gray-300"> *</span>}
      </span>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
        style={{ backgroundColor: slot.team.friendColour }}
      >
        {slot.team.friendName}
      </span>
      {score != null && (
        <span className={`text-sm font-bold tabular-nums w-4 text-right ${dim ? 'text-gray-400' : 'text-gray-900'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function scoreFor(match: BracketMatch, slot: BracketSlot): number | null {
  if (slot.kind !== 'team' || !match.match) return null;
  const m = match.match;
  if (m.score.home == null && m.score.away == null) return null;
  return m.homeTeam.abbr === slot.team.abbr ? m.score.home : m.score.away;
}

export default function BracketMatchCard({ match, highlightFriendId }: Props) {
  const fixture = match.match;
  const live = fixture ? isMatchLive(fixture.status) : false;
  const finished = fixture ? isMatchFinished(fixture.status) : false;
  const decided = !!match.winnerAbbr;

  const winner = (s: BracketSlot) => s.kind === 'team' && s.team.abbr === match.winnerAbbr;

  const card = (
    <div
      className={`w-64 rounded-lg border bg-white overflow-hidden divide-y divide-gray-100 ${
        live ? 'border-green-400 ring-1 ring-green-300' : 'border-gray-200'
      } ${fixture ? 'hover:border-gray-400 transition-colors' : ''}`}
    >
      <div className="flex items-center justify-between px-3 py-1 bg-gray-50">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          {match.matchNo === 104 ? 'Final' : match.matchNo === 103 ? '3rd Place' : `Match ${match.matchNo}`}
        </span>
        {live ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {fixture?.minute ?? 'LIVE'}
          </span>
        ) : finished ? (
          <span className="text-[10px] font-semibold text-gray-400">FT</span>
        ) : fixture ? (
          <span className="text-[10px] text-gray-400">
            {toAESTDate(fixture.utcDate)} · {toAESTTime(fixture.utcDate)}
          </span>
        ) : null}
      </div>
      <SlotRow
        slot={match.home}
        score={scoreFor(match, match.home)}
        isWinner={winner(match.home)}
        decided={decided}
        highlightFriendId={highlightFriendId}
      />
      <SlotRow
        slot={match.away}
        score={scoreFor(match, match.away)}
        isWinner={winner(match.away)}
        decided={decided}
        highlightFriendId={highlightFriendId}
      />
    </div>
  );

  return fixture ? (
    <Link href={`/fixtures/${fixture.id}`} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
