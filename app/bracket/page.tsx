import type { Metadata } from 'next';
import { fetchFixtures, fetchStandings } from '@/lib/api/espn';
import { fetchOdds } from '@/lib/api/odds';
import { buildBracket } from '@/lib/data/bracket';
import BracketView from '@/components/bracket/Bracket';
import LiveRefresh from '@/components/ui/LiveRefresh';
import { isMatchLive } from '@/lib/utils/time';

export const metadata: Metadata = {
  title: 'Knockout Bracket · KickPool',
  description: 'The 2026 World Cup knockout bracket as it fills in — see which friend owns each team.',
};

export default async function BracketPage() {
  // Fresher standings (60s) so a just-finished group reshuffles the R32 qualifier slots promptly.
  const [allMatches, standings, odds] = await Promise.all([
    fetchFixtures(),
    fetchStandings(60),
    fetchOdds(),
  ]);

  // Pass every match to the builder, not just stage-tagged knockouts: ESPN's scoreboard often
  // returns knockout games with no round label (so inferStage marks them GROUP_STAGE). The builder
  // attaches a fixture only when both resolved slots are that exact cross-group team-pair, so group
  // matches (always same-group) can never collide — relying on the label would drop real results.
  const bracket = buildBracket(standings, allMatches);
  // Poll while ANY game is live (group games decide who fills the bracket), mirroring /fixtures.
  const isLive = allMatches.some((m) => isMatchLive(m.status));

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

      <BracketView bracket={bracket} odds={odds} />
    </div>
  );
}
