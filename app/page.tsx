import { fetchTodaysMatches, fetchStandings } from '@/lib/api/espn';
import { calculateLeaderboard } from '@/lib/data/scoring';
import { fetchFixtures } from '@/lib/api/espn';
import MatchCard from '@/components/matches/MatchCard';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import Link from 'next/link';
import { matchDayLabel } from '@/lib/utils/time';

export const revalidate = 60;

export default async function HomePage() {
  const [todayMatches, allMatches, standings] = await Promise.all([
    fetchTodaysMatches(),
    fetchFixtures(),
    fetchStandings(),
  ]);

  const leaderboard = calculateLeaderboard(allMatches);
  const topThree = leaderboard.slice(0, 3);

  // Group today's matches by date label
  const upcoming = todayMatches.slice(0, 6);

  // Next matches if nothing today
  const nextMatches = upcoming.length === 0
    ? allMatches.filter((m) => m.status === 'STATUS_SCHEDULED').slice(0, 4)
    : upcoming;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">⚽</span>
          <div>
            <h1 className="text-2xl font-bold">KickPool</h1>
            <p className="text-gray-300 text-sm">FIFA World Cup 2026 · Friend Betting Pool</p>
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="bg-white/10 rounded-lg px-3 py-2">
            <div className="text-gray-300 text-xs">Pool</div>
            <div className="font-bold text-yellow-400">$400</div>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2">
            <div className="text-gray-300 text-xs">Players</div>
            <div className="font-bold">8 friends</div>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2">
            <div className="text-gray-300 text-xs">Countries</div>
            <div className="font-bold">48 teams</div>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2">
            <div className="text-gray-300 text-xs">Groups</div>
            <div className="font-bold">A – L</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {upcoming.length > 0 ? "Today's Matches" : 'Upcoming Matches'}
            </h2>
            <Link href="/fixtures" className="text-sm text-blue-600 hover:underline">
              All fixtures →
            </Link>
          </div>

          {nextMatches.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              No matches scheduled yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nextMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Leaderboard snapshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Pool Standings</h2>
            <Link href="/leaderboard" className="text-sm text-blue-600 hover:underline">
              Full table →
            </Link>
          </div>
          <Leaderboard scores={topThree} />

          {/* Groups quick links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Groups</h3>
            <div className="grid grid-cols-4 gap-2">
              {standings.map((s) => (
                <Link
                  key={s.group}
                  href={`/groups#group-${s.group}`}
                  className="bg-white border border-gray-200 rounded-lg text-center py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:shadow-sm transition-all"
                >
                  {s.group}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
