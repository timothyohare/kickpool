import type { Metadata } from 'next';
import { fetchFixtures, fetchStandings } from '@/lib/api/espn';
import { buildBracket } from '@/lib/data/bracket';
import BracketView from '@/components/bracket/Bracket';
import LiveRefresh from '@/components/ui/LiveRefresh';
import { isMatchLive } from '@/lib/utils/time';

export const metadata: Metadata = {
  title: 'Knockout Bracket · KickPool',
  description: 'The 2026 World Cup knockout bracket as it fills in — see which friend owns each team.',
};

export default async function BracketPage() {
  const [allMatches, standings] = await Promise.all([fetchFixtures(), fetchStandings()]);

  const knockout = allMatches.filter((m) => m.stage !== 'GROUP_STAGE');
  const bracket = buildBracket(standings, knockout);
  const isLive = knockout.some((m) => isMatchLive(m.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Knockout Bracket</h1>
          <LiveRefresh isLive={isLive} intervalSeconds={30} />
        </div>
        <p className="text-xs text-gray-400">
          Teams fill in as they qualify · <span className="italic">italic *</span> = provisional (group not yet decided)
        </p>
      </div>

      <BracketView bracket={bracket} />
    </div>
  );
}
