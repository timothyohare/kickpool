import { fetchFixtures } from '@/lib/api/espn';
import { calculateLeaderboard, STAGE_POINTS, PRIZE_POOL, BUY_IN, WINNER_BONUS } from '@/lib/data/scoring';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import Image from 'next/image';

export const revalidate = 120;

export default async function LeaderboardPage() {
  const allMatches = await fetchFixtures();
  const scores = calculateLeaderboard(allMatches);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pool Leaderboard</h1>
        <div className="text-right">
          <div className="text-sm text-gray-500">${BUY_IN} × 8 friends</div>
          <div className="text-xl font-bold text-yellow-600">${PRIZE_POOL} pool</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Leaderboard scores={scores} />
        </div>

        {/* Points guide */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-900 px-4 py-3">
              <h3 className="text-white font-bold text-sm">Points System</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {(Object.entries(STAGE_POINTS) as [string, number][]).map(([stage, pts]) => (
                <div key={stage} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-600">
                    {stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <span className="font-bold text-gray-900">{pts} pts</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 bg-yellow-50">
                <span className="text-sm font-semibold text-yellow-800">🏆 World Cup Winner</span>
                <span className="font-bold text-yellow-800">
                  {STAGE_POINTS['FINAL'] + WINNER_BONUS} pts
                </span>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              Points per country · Each friend has 6 countries
            </div>
          </div>

          {/* Friend country counts */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-900 px-4 py-3">
              <h3 className="text-white font-bold text-sm">Countries Alive</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {scores.map((s) => {
                const alive = s.countries.filter((c) => c.alive).length;
                const total = s.countries.length;
                return (
                  <div key={s.friendId} className="flex items-center gap-3 px-4 py-2.5">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.friendColour }}
                    />
                    <span className="text-sm font-medium text-gray-900 flex-1">{s.friendName}</span>
                    <div className="flex gap-1">
                      {s.countries.map((c) => (
                        <Image
                          key={c.abbr}
                          src={c.logo}
                          alt={c.abbr}
                          width={20}
                          height={20}
                          className={`rounded-full border ${c.alive ? 'border-green-300' : 'border-gray-100 opacity-30 grayscale'}`}
                          unoptimized
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{alive}/{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
