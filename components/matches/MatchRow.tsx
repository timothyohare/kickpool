import Image from 'next/image';
import Link from 'next/link';
import type { Match } from '@/types';
import { toAESTDate, toAESTTime, isMatchLive, isMatchFinished } from '@/lib/utils/time';

interface Props {
  match: Match;
}

export default function MatchRow({ match }: Props) {
  const live = isMatchLive(match.status);
  const finished = isMatchFinished(match.status);
  const hasScore = live || finished;

  return (
    <Link href={`/fixtures/${match.id}`} className="block hover:bg-blue-50/40 transition-colors">
      <div className="flex items-center gap-3 px-4 py-2.5">

        {/* Home team */}
        <div className="flex items-center gap-2 w-[42%]">
          <Image
            src={match.homeTeam.logo}
            alt={match.homeTeam.name}
            width={22}
            height={22}
            className="rounded-full border border-gray-100 flex-shrink-0"
            unoptimized
          />
          <span className="text-sm text-gray-900 font-medium leading-tight">{match.homeTeam.name}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0 hidden sm:inline"
            style={{ backgroundColor: match.homeTeam.friendColour }}
          >
            {match.homeTeam.friendName}
          </span>
        </div>

        {/* Centre: score or datetime */}
        <div className="flex-shrink-0 w-[16%] text-center">
          {hasScore ? (
            <div className="flex items-center justify-center gap-1">
              {live && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
              <span className={`text-sm font-bold tabular-nums ${live ? 'text-green-700' : 'text-gray-900'}`}>
                {match.score.home ?? 0}–{match.score.away ?? 0}
              </span>
            </div>
          ) : (
            <>
              <div className="text-[10px] text-gray-400 leading-tight">{toAESTDate(match.utcDate)}</div>
              <div className="text-xs font-semibold text-gray-700 leading-tight">{toAESTTime(match.utcDate)}</div>
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 w-[42%] justify-end">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0 hidden sm:inline"
            style={{ backgroundColor: match.awayTeam.friendColour }}
          >
            {match.awayTeam.friendName}
          </span>
          <span className="text-sm text-gray-900 font-medium leading-tight text-right">{match.awayTeam.name}</span>
          <Image
            src={match.awayTeam.logo}
            alt={match.awayTeam.name}
            width={22}
            height={22}
            className="rounded-full border border-gray-100 flex-shrink-0"
            unoptimized
          />
        </div>

      </div>
    </Link>
  );
}
