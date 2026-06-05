import { fetchStandings, fetchFixtures } from '@/lib/api/espn';
import { calculateLeaderboard } from '@/lib/data/scoring';
import MatchRow from '@/components/matches/MatchRow';
import CompactGroupTable from '@/components/groups/CompactGroupTable';
import Link from 'next/link';
import Image from 'next/image';
import type { Match, GroupStanding } from '@/types';
import { PRIZE_POOL } from '@/lib/data/scoring';

export const revalidate = 60;

const TABS = [
  { label: 'Overview', href: '/' },
  { label: 'Matches', href: '/fixtures' },
  { label: 'Table', href: '/groups' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Predictions', href: '/predictions' },
];

export default async function HomePage() {
  const [allMatches, standings] = await Promise.all([
    fetchFixtures(),
    fetchStandings(),
  ]);

  const leaderboard = calculateLeaderboard(allMatches);

  // Group stage matches only, grouped by group letter
  const groupMatches = allMatches.filter((m) => m.stage === 'GROUP_STAGE');
  const byGroup = new Map<string, Match[]>();
  for (const m of groupMatches) {
    const g = m.group ?? '?';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(m);
  }

  // Show first 3 matches per group (upcoming or live first)
  const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const displayGroups = groupLetters
    .filter((g) => byGroup.has(g))
    .map((g) => ({ group: g, matches: byGroup.get(g)!.slice(0, 3) }));

  // Right panel: rotate through first 4 groups for overview
  const tableGroups = standings.slice(0, 4);

  // Live or today's matches for the top strip
  const liveOrToday = allMatches
    .filter((m) => m.status === 'STATUS_IN_PROGRESS' || m.status === 'STATUS_HALFTIME')
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Tournament header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <span className="text-2xl">⚽</span>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-lg leading-tight">
              FIFA World Cup 2026™
            </h1>
            <p className="text-xs text-gray-500">11 June 2026 – 19 July 2026 · USA, Canada & Mexico</p>
          </div>
          {/* Pool badge */}
          <div className="text-right">
            <div className="text-xs text-gray-500">Friend Pool</div>
            <div className="font-bold text-yellow-600 text-lg">${PRIZE_POOL}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab, i) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                i === 0
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Live matches strip */}
      {liveOrToday.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Live Now</span>
          </div>
          <div className="space-y-1">
            {liveOrToday.map((m) => <MatchRow key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {/* Main two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* LEFT: Matches panel */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Matches · Group Stage</span>
            <Link href="/fixtures" className="text-xs text-blue-600 hover:underline">
              Full schedule →
            </Link>
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {displayGroups.map(({ group, matches }) => (
              <div key={group}>
                {/* Group label */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Group {group}
                  </span>
                  <Link href={`/groups#group-${group}`} className="text-[10px] text-blue-500 hover:underline">
                    Table →
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {matches.map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            All times in Australian Eastern Time (AEST)
          </div>
        </div>

        {/* RIGHT: Table + Leaderboard */}
        <div className="lg:col-span-2 space-y-4">

          {/* Group tables panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-900 text-sm">Table</span>
              <Link href="/groups" className="text-xs text-blue-600 hover:underline">
                All groups →
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {tableGroups.map((standing) => (
                <CompactGroupTable key={standing.group} standing={standing} />
              ))}
            </div>
          </div>

          {/* Pool leaderboard panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <span className="font-semibold text-gray-900 text-sm">Pool Standings</span>
                <span className="ml-2 text-xs text-yellow-600 font-semibold">${PRIZE_POOL}</span>
              </div>
              <Link href="/leaderboard" className="text-xs text-blue-600 hover:underline">
                Full table →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {leaderboard.map((friend, idx) => (
                <div key={friend.friendId} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="text-sm w-4 text-center text-gray-400 font-medium">{idx + 1}</span>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: friend.friendColour }}
                  />
                  <span className="text-sm font-medium text-gray-900 flex-1">{friend.friendName}</span>
                  {/* Country flags */}
                  <div className="flex gap-0.5">
                    {friend.countries.map((c) => (
                      <Image
                        key={c.abbr}
                        src={c.logo}
                        alt={c.abbr}
                        width={16}
                        height={16}
                        className={`rounded-full border ${c.alive ? 'border-green-300' : 'border-gray-100 opacity-30 grayscale'}`}
                        unoptimized
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8 text-right">{friend.points}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-500">
                <span>🥇 1st: <span className="font-semibold text-gray-700">$280</span></span>
                <span>🥈 2nd: <span className="font-semibold text-gray-700">$120</span></span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
