import { fetchFixtures } from '@/lib/api/espn';
import { getAllPredictions } from '@/lib/data/predictionStore';
import type { Match, Prediction } from '@/types';
import PredictionTrigger from '@/components/predictions/PredictionTrigger';
import { toAEST } from '@/lib/utils/time';
import Image from 'next/image';

export const revalidate = 300;

export default async function PredictionsPage() {
  const [allMatches, cachedPredictions] = await Promise.all([
    fetchFixtures(),
    Promise.resolve(getAllPredictions()),
  ]);
  const upcoming = allMatches
    .filter((m) => m.status === 'STATUS_SCHEDULED')
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Predictions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Claude analyses each match and predicts the outcome.
        </p>
      </div>

      <div className="space-y-3">
        {upcoming.map((match) => (
          <MatchPredictionRow
            key={match.id}
            match={match}
            initialPrediction={cachedPredictions[match.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function MatchPredictionRow({ match, initialPrediction }: { match: Match; initialPrediction: Prediction | null }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-4">
        {/* Teams */}
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Image src={match.homeTeam.logo} alt={match.homeTeam.name} width={28} height={28} className="rounded-full border border-gray-100" unoptimized />
            <span className="font-semibold text-sm text-gray-900">{match.homeTeam.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full text-white text-[10px]"
              style={{ backgroundColor: match.homeTeam.friendColour }}>
              {match.homeTeam.friendName}
            </span>
          </div>
          <span className="text-gray-400 text-sm font-medium">vs</span>
          <div className="flex items-center gap-2">
            <Image src={match.awayTeam.logo} alt={match.awayTeam.name} width={28} height={28} className="rounded-full border border-gray-100" unoptimized />
            <span className="font-semibold text-sm text-gray-900">{match.awayTeam.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full text-white text-[10px]"
              style={{ backgroundColor: match.awayTeam.friendColour }}>
              {match.awayTeam.friendName}
            </span>
          </div>
        </div>

        {/* Date */}
        <div className="text-right text-xs text-gray-400 hidden sm:block">
          {toAEST(match.utcDate)}
        </div>
      </div>

      {/* Prediction trigger */}
      <div className="mt-3">
        <PredictionTrigger
          matchId={match.id}
          homeTeam={match.homeTeam.name}
          awayTeam={match.awayTeam.name}
          initialPrediction={initialPrediction}
        />
      </div>
    </div>
  );
}
