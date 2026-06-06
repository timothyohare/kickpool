import { fetchFixtures } from '@/lib/api/espn';
import { calculateLeaderboard, PRIZE_POOL, PRIZE_1, PRIZE_2 } from '@/lib/data/scoring';
import { detectDrama } from '@/lib/data/drama';
import MatchRow from '@/components/matches/MatchRow';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 60;

const TABS = [
  { label: 'Overview', href: '/' },
  { label: 'Matches', href: '/fixtures' },
  { label: 'Table', href: '/groups' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Predictions', href: '/predictions' },
];

export default async function HomePage() {
  const allMatches = await fetchFixtures();
  const leaderboard = calculateLeaderboard(allMatches);
  const drama = detectDrama(allMatches, leaderboard);

  // Live matches
  const live = allMatches.filter(
    (m) => m.status === 'STATUS_IN_PROGRESS' || m.status === 'STATUS_HALFTIME'
  );

  // Upcoming matches sorted chronologically (exclude finished and live)
  const upcoming = allMatches
    .filter((m) => m.status === 'STATUS_SCHEDULED' || m.status === 'STATUS_POSTPONED')
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 16);

  // Group upcoming by date string so we can show day headers
  const byDate = new Map<string, typeof upcoming>();
  for (const m of upcoming) {
    const key = new Date(m.utcDate).toISOString().slice(0, 10); // YYYY-MM-DD
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }

  return (
    <div className="space-y-4">
      {/* Tournament header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <span className="text-2xl">⚽</span>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-lg leading-tight">
              FIFA World Cup 2026™
            </h1>
            <p className="text-xs text-gray-500">11 June 2026 – 19 July 2026 · USA, Canada &amp; Mexico</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Friend Pool</div>
            <div className="font-bold text-yellow-600 text-lg">${PRIZE_POOL}</div>
          </div>
        </div>
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

      {/* Live strip */}
      {live.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Live Now</span>
          </div>
          <div className="space-y-1">
            {live.map((m) => <MatchRow key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {/* Drama strip */}
      {drama.length > 0 && (
        <div className="space-y-2">
          {drama.map((event, i) => (
            <div
              key={i}
              className={`rounded-xl border px-4 py-3 ${
                event.type === 'eliminated'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-tight">{event.emoji}</span>
                <div>
                  <div className={`font-semibold text-sm ${event.type === 'eliminated' ? 'text-red-800' : 'text-orange-800'}`}>
                    {event.headline}
                  </div>
                  <div className={`text-xs mt-0.5 ${event.type === 'eliminated' ? 'text-red-600' : 'text-orange-700'}`}>
                    {event.detail}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* LEFT: Upcoming matches */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Upcoming Matches</span>
            <Link href="/fixtures" className="text-xs text-blue-600 hover:underline">
              Full schedule →
            </Link>
          </div>

          <div className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
            {upcoming.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No upcoming matches</p>
            )}
            {Array.from(byDate.entries()).map(([date, matches]) => {
              const d = new Date(date + 'T00:00:00Z');
              const label = d.toLocaleDateString('en-AU', {
                weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
              });
              return (
                <div key={date}>
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {matches.map((m) => <MatchRow key={m.id} match={m} />)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            All times in Australian Eastern Time (AEST)
          </div>
        </div>

        {/* RIGHT: Pool standings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Prize header */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-yellow-900 text-sm">Pool Standings</div>
                  <div className="text-yellow-900 text-xs opacity-80">8 × $50 buy-in · ${PRIZE_POOL}</div>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <div className="font-bold text-yellow-900 text-lg">${PRIZE_1}</div>
                    <div className="text-yellow-900 text-[10px]">1st</div>
                  </div>
                  <div>
                    <div className="font-bold text-yellow-900 text-lg">${PRIZE_2}</div>
                    <div className="text-yellow-900 text-[10px]">2nd</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {leaderboard.map((friend, idx) => (
                <div key={friend.friendId} className={`px-4 py-3 ${idx < 2 ? 'bg-yellow-50/40' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm w-5 text-center text-gray-400 font-medium">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </span>
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: friend.friendColour }}
                    />
                    <span className="text-sm font-semibold text-gray-900 flex-1">{friend.friendName}</span>
                    <div className="flex gap-0.5">
                      {friend.countries.map((c) => (
                        <Image
                          key={c.abbr}
                          src={c.logo}
                          alt={c.abbr}
                          width={18}
                          height={18}
                          className={`rounded-full border ${c.alive ? 'border-green-300' : 'border-gray-100 opacity-30 grayscale'}`}
                          unoptimized
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{friend.points}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 text-center">
              <Link href="/leaderboard" className="text-xs text-blue-600 hover:underline">
                Full leaderboard →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
