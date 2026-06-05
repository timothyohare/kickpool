import Image from 'next/image';
import Link from 'next/link';
import type { Match } from '@/types';
import FriendBadge from '@/components/ui/FriendBadge';
import { toAESTTime, toAESTDate, isMatchLive, isMatchFinished } from '@/lib/utils/time';

interface Props {
  match: Match;
}

export default function MatchCard({ match }: Props) {
  const live = isMatchLive(match.status);
  const finished = isMatchFinished(match.status);

  return (
    <Link href={`/fixtures/${match.id}`}>
      <div className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${live ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'}`}>
        {/* Date / status row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">
            {match.group ? `Group ${match.group}` : match.stage.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-1.5">
            {live && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {match.minute ?? 'LIVE'}
              </span>
            )}
            {!live && !finished && (
              <span className="text-xs text-gray-600">
                {toAESTDate(match.utcDate)} · {toAESTTime(match.utcDate)} AEST
              </span>
            )}
            {finished && <span className="text-xs font-semibold text-gray-700">FT</span>}
          </div>
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between gap-3">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <Image
              src={match.homeTeam.logo}
              alt={match.homeTeam.name}
              width={48}
              height={48}
              className="rounded-full border border-gray-100 bg-gray-50"
              unoptimized
            />
            <span className="text-sm font-semibold text-center text-gray-900 leading-tight">
              {match.homeTeam.name}
            </span>
            <FriendBadge name={match.homeTeam.friendName} colour={match.homeTeam.friendColour} />
          </div>

          {/* Score */}
          <div className="text-center min-w-[60px]">
            {finished || live ? (
              <div className="text-2xl font-bold tabular-nums text-gray-900">
                {match.score.home ?? 0}
                <span className="text-gray-400 mx-1">:</span>
                {match.score.away ?? 0}
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-400">vs</div>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <Image
              src={match.awayTeam.logo}
              alt={match.awayTeam.name}
              width={48}
              height={48}
              className="rounded-full border border-gray-100 bg-gray-50"
              unoptimized
            />
            <span className="text-sm font-semibold text-center text-gray-900 leading-tight">
              {match.awayTeam.name}
            </span>
            <FriendBadge name={match.awayTeam.friendName} colour={match.awayTeam.friendColour} />
          </div>
        </div>

        {/* Venue */}
        <div className="mt-3 text-center text-xs text-gray-400 truncate">{match.venue}</div>
      </div>
    </Link>
  );
}
