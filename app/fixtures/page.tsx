import { fetchFixtures } from '@/lib/api/espn';
import MatchCard from '@/components/matches/MatchCard';
import { FRIENDS } from '@/lib/data/friends';
import { matchDayLabel } from '@/lib/utils/time';
import type { Match } from '@/types';

export const revalidate = 60;

function groupByDay(matches: Match[]): [string, Match[]][] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const label = matchDayLabel(m.utcDate);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(m);
  }
  return Array.from(map.entries());
}

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; friend?: string; stage?: string }>;
}) {
  const params = await searchParams;
  const allMatches = await fetchFixtures();

  const filtered = allMatches.filter((m) => {
    if (params.group && m.group !== params.group.toUpperCase()) return false;
    if (params.friend) {
      if (m.homeTeam.friendId !== params.friend && m.awayTeam.friendId !== params.friend)
        return false;
    }
    if (params.stage && m.stage !== params.stage) return false;
    return true;
  });

  const days = groupByDay(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fixtures</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          <a
            href="/fixtures"
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !params.friend && !params.group ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            All
          </a>
          {FRIENDS.map((f) => (
            <a
              key={f.id}
              href={`/fixtures?friend=${f.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors text-white`}
              style={{
                backgroundColor: params.friend === f.id ? f.colour : 'transparent',
                borderColor: f.colour,
                color: params.friend === f.id ? 'white' : f.colour,
              }}
            >
              {f.name}
            </a>
          ))}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No fixtures match your filter
        </div>
      ) : (
        <div className="space-y-8">
          {days.map(([day, matches]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {day}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
