import { fetchFixtures, fetchStandings } from '@/lib/api/espn';
import { calculateLeaderboard } from '@/lib/data/scoring';
import { FRIENDS, normAbbr } from '@/lib/data/friends';
import type { Match, TournamentStage } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { toAEST } from '@/lib/utils/time';

export const revalidate = 120;

const STAGE_LABEL: Record<TournamentStage, string> = {
  GROUP_STAGE: 'Group Stage',
  ROUND_OF_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-Final',
  SEMI_FINAL: 'Semi-Final',
  THIRD_PLACE: '3rd Place',
  FINAL: 'Final',
};

const STAGE_ORDER: TournamentStage[] = [
  'GROUP_STAGE', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL',
];

function isKnockout(stage: TournamentStage) {
  return STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf('GROUP_STAGE');
}

export default async function MyTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ friend?: string }>;
}) {
  const { friend: friendParam } = await searchParams;
  const friendId = friendParam ?? 'tim';

  const selectedFriend = FRIENDS.find((f) => f.id === friendId) ?? FRIENDS.find((f) => f.id === 'tim')!;

  const [allMatches, standings] = await Promise.all([
    fetchFixtures(),
    fetchStandings().catch(() => []),
  ]);
  const leaderboard = calculateLeaderboard(allMatches);

  const friendScore = leaderboard.find((s) => s.friendId === selectedFriend.id);

  // Build next-match lookup per team abbr
  const nextMatchByTeam: Record<string, Match> = {};
  const scheduled = allMatches
    .filter((m) => m.status === 'STATUS_SCHEDULED' || m.status === 'STATUS_POSTPONED')
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  for (const m of scheduled) {
    const h = normAbbr(m.homeTeam.abbr);
    const a = normAbbr(m.awayTeam.abbr);
    if (!nextMatchByTeam[h]) nextMatchByTeam[h] = m;
    if (!nextMatchByTeam[a]) nextMatchByTeam[a] = m;
  }

  // Group position lookup: { abbr -> { position, group } }
  const groupPos: Record<string, { position: number; group: string; played: number }> = {};
  for (const gs of standings) {
    for (const row of gs.table) {
      groupPos[normAbbr(row.team.abbr)] = {
        position: row.position,
        group: gs.group,
        played: row.played,
      };
    }
  }

  const myCountries = friendScore?.countries ?? selectedFriend.countries.map((abbr) => ({
    abbr,
    name: abbr,
    logo: `https://a.espncdn.com/i/teamlogos/countries/500/${abbr.toLowerCase()}.png`,
    alive: false,
    furthestStage: null as TournamentStage | null,
    points: 0,
  }));

  // Count alive
  const aliveCount = myCountries.filter((c) => c.alive || nextMatchByTeam[c.abbr]).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header + friend selector */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">How am I doing?</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedFriend.name} · {aliveCount}/{myCountries.length} teams still in
          </p>
        </div>

        {/* Friend switcher */}
        <div className="flex gap-1.5 flex-wrap px-4 py-3">
          {FRIENDS.map((f) => (
            <Link
              key={f.id}
              href={`/my-teams?friend=${f.id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                f.id === selectedFriend.id
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
              style={f.id === selectedFriend.id ? { backgroundColor: f.colour, borderColor: f.colour } : {}}
            >
              {f.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Team cards */}
      <div className="space-y-3">
        {myCountries.map((country) => {
          const nextMatch = nextMatchByTeam[country.abbr];
          const pos = groupPos[country.abbr];
          const isAlive = country.alive || !!nextMatch;
          const reachedKnockout = country.furthestStage && isKnockout(country.furthestStage);
          const stage = country.furthestStage;

          return (
            <div
              key={country.abbr}
              className={`bg-white rounded-xl border overflow-hidden ${isAlive ? 'border-gray-200' : 'border-gray-100'}`}
            >
              <div className={`flex items-center gap-3 px-4 py-3 ${isAlive ? '' : 'opacity-50'}`}>
                {/* Flag */}
                <Image
                  src={country.logo}
                  alt={country.abbr}
                  width={40}
                  height={40}
                  className={`rounded-full border-2 ${isAlive ? 'border-green-300' : 'border-gray-200 grayscale'}`}
                  unoptimized
                />

                {/* Name + stage */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{country.name === country.abbr ? country.abbr : country.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    {stage ? (
                      <>
                        <span className={reachedKnockout ? 'text-green-600 font-medium' : ''}>
                          {STAGE_LABEL[stage]}
                        </span>
                        {pos && stage === 'GROUP_STAGE' && (
                          <span className="text-gray-400">· Group {pos.group} pos {pos.position} ({pos.played} played)</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">Not yet played</span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                {isAlive ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    Still in
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    Out
                  </span>
                )}
              </div>

              {/* Next match */}
              {nextMatch && (
                <Link
                  href={`/fixtures/${nextMatch.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xs text-gray-400">Next:</span>
                  <Image src={nextMatch.homeTeam.logo} alt={nextMatch.homeTeam.abbr} width={16} height={16} className="rounded-full" unoptimized />
                  <span className="text-xs font-medium text-gray-700">{nextMatch.homeTeam.name}</span>
                  <span className="text-xs text-gray-400">vs</span>
                  <Image src={nextMatch.awayTeam.logo} alt={nextMatch.awayTeam.abbr} width={16} height={16} className="rounded-full" unoptimized />
                  <span className="text-xs font-medium text-gray-700">{nextMatch.awayTeam.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{toAEST(nextMatch.utcDate)}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
