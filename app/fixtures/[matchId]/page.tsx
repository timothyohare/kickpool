import { fetchFixtures } from '@/lib/api/espn';
import { fetchWCOdds, bestOdds } from '@/lib/api/odds';
import { getPrediction } from '@/lib/data/predictionStore';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { toAEST } from '@/lib/utils/time';
import FriendBadge from '@/components/ui/FriendBadge';
import PredictionTrigger from '@/components/predictions/PredictionTrigger';

export const revalidate = 60;

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const [allMatches, allOdds] = await Promise.all([
    fetchFixtures(),
    fetchWCOdds(),
  ]);
  const savedPrediction = getPrediction(matchId);

  const match = allMatches.find((m) => m.id === matchId);
  if (!match) notFound();

  // Try to find odds by team name match
  const matchOdds = allOdds.find(
    (o) =>
      o.homeTeam.toLowerCase().includes(match.homeTeam.name.toLowerCase().slice(0, 5)) ||
      o.awayTeam.toLowerCase().includes(match.awayTeam.name.toLowerCase().slice(0, 5))
  );
  const odds = matchOdds ? bestOdds(matchOdds) : null;

  const isLive = match.status === 'STATUS_IN_PROGRESS' || match.status === 'STATUS_HALFTIME';
  const isFinished = match.status === 'STATUS_FINAL';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Match header */}
      <div className={`rounded-2xl p-6 text-white ${isLive ? 'bg-gradient-to-br from-green-800 to-green-600' : 'bg-gradient-to-br from-gray-900 to-gray-700'}`}>
        {/* Stage / group */}
        <div className="text-center mb-4">
          <span className="text-sm font-medium opacity-80">
            {match.group ? `Group ${match.group}` : match.stage.replace(/_/g, ' ')}
          </span>
          {isLive && (
            <span className="ml-3 inline-flex items-center gap-1 text-green-300 font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE {match.minute}
            </span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            <Image src={match.homeTeam.logo} alt={match.homeTeam.name} width={64} height={64} className="rounded-full border-2 border-white/20 bg-white/10" unoptimized />
            <span className="font-bold text-center">{match.homeTeam.name}</span>
            <FriendBadge name={match.homeTeam.friendName} colour={match.homeTeam.friendColour} size="md" />
          </div>

          <div className="text-center">
            {isLive || isFinished ? (
              <div className="text-5xl font-black tabular-nums">
                {match.score.home ?? 0}
                <span className="text-white/50 mx-2">:</span>
                {match.score.away ?? 0}
              </div>
            ) : (
              <>
                <div className="text-sm opacity-70">{toAEST(match.utcDate)}</div>
                <div className="text-3xl font-bold mt-1">vs</div>
              </>
            )}
            {isFinished && <div className="text-sm opacity-70 mt-1">Full Time</div>}
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <Image src={match.awayTeam.logo} alt={match.awayTeam.name} width={64} height={64} className="rounded-full border-2 border-white/20 bg-white/10" unoptimized />
            <span className="font-bold text-center">{match.awayTeam.name}</span>
            <FriendBadge name={match.awayTeam.friendName} colour={match.awayTeam.friendColour} size="md" />
          </div>
        </div>

        {/* Venue */}
        <div className="text-center mt-4 text-sm opacity-60">{match.venue}</div>
      </div>

      {/* Odds */}
      {odds && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Best Available Odds</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">{match.homeTeam.name}</div>
              <div className="text-2xl font-bold text-gray-900">{odds.home.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Draw</div>
              <div className="text-2xl font-bold text-gray-900">{odds.draw.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">{match.awayTeam.name}</div>
              <div className="text-2xl font-bold text-gray-900">{odds.away.toFixed(2)}</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Best odds across 10+ bookmakers · For reference only</p>
        </div>
      )}

      {/* AI Prediction */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          🤖 AI Match Prediction
        </h3>
        <PredictionTrigger
          matchId={match.id}
          homeTeam={match.homeTeam.name}
          awayTeam={match.awayTeam.name}
          initialPrediction={savedPrediction}
        />
      </div>

      {/* Match info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Kick-off (AEST)</span>
          <span className="font-medium">{toAEST(match.utcDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Stage</span>
          <span className="font-medium">{match.stage.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Venue</span>
          <span className="font-medium">{match.venue}</span>
        </div>
        {match.group && (
          <div className="flex justify-between">
            <span className="text-gray-400">Group</span>
            <span className="font-medium">Group {match.group}</span>
          </div>
        )}
      </div>
    </div>
  );
}
