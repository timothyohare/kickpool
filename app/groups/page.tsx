import { fetchStandings, fetchFixtures } from '@/lib/api/espn';
import GroupTable from '@/components/groups/GroupTable';
import MatchCard from '@/components/matches/MatchCard';

export default async function GroupsPage() {
  const [standings, allMatches] = await Promise.all([
    fetchStandings(),
    fetchFixtures(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Group Stage</h1>
      <p className="text-gray-500 text-sm">Top 2 from each group advance. Best 8 third-place teams also qualify.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {standings.map((standing) => {
          const groupMatches = allMatches
            .filter((m) => m.group === standing.group)
            .slice(0, 3);

          return (
            <div key={standing.group} id={`group-${standing.group}`} className="space-y-3">
              <GroupTable standing={standing} />
              {groupMatches.length > 0 && (
                <div className="space-y-2">
                  {groupMatches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
