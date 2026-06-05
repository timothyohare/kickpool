import type { TournamentStage, FriendScore, Match } from '@/types';
import { FRIENDS, getFriendForCountry, normAbbr } from './friends';

export const STAGE_POINTS: Record<TournamentStage, number> = {
  GROUP_STAGE: 1,
  ROUND_OF_32: 4,
  ROUND_OF_16: 8,
  QUARTER_FINAL: 15,
  SEMI_FINAL: 25,
  THIRD_PLACE: 30,
  FINAL: 40,
};
export const WINNER_BONUS = 30; // champion = 70 total

export const PRIZE_POOL = 400;
export const ENTRIES = 8;
export const BUY_IN = 50;
export const PRIZE_1 = 250;
export const PRIZE_2 = 150;

export function stagePoints(stage: TournamentStage, isWinner = false): number {
  return STAGE_POINTS[stage] + (isWinner ? WINNER_BONUS : 0);
}

export function calculateLeaderboard(matches: Match[]): FriendScore[] {
  // Determine the furthest stage each team reached
  const teamFurthest: Record<string, { stage: TournamentStage; isWinner: boolean }> = {};

  const stageOrder: TournamentStage[] = [
    'GROUP_STAGE',
    'ROUND_OF_32',
    'ROUND_OF_16',
    'QUARTER_FINAL',
    'SEMI_FINAL',
    'THIRD_PLACE',
    'FINAL',
  ];

  for (const match of matches) {
    const homeAbbr = normAbbr(match.homeTeam.abbr);
    const awayAbbr = normAbbr(match.awayTeam.abbr);
    const stage = match.stage;

    for (const abbr of [homeAbbr, awayAbbr]) {
      const current = teamFurthest[abbr];
      if (
        !current ||
        stageOrder.indexOf(stage) > stageOrder.indexOf(current.stage)
      ) {
        teamFurthest[abbr] = { stage, isWinner: false };
      }
    }

    // Mark the winner of the final
    if (match.stage === 'FINAL' && match.status === 'STATUS_FINAL') {
      const homeScore = match.score.home ?? 0;
      const awayScore = match.score.away ?? 0;
      if (homeScore !== awayScore) {
        const winnerAbbr = homeScore > awayScore ? normAbbr(match.homeTeam.abbr) : normAbbr(match.awayTeam.abbr);
        if (teamFurthest[winnerAbbr]) teamFurthest[winnerAbbr].isWinner = true;
      }
    }
  }

  // All teams at minimum earn GROUP_STAGE points if they appear in any match
  for (const abbr of Object.keys(teamFurthest)) {
    if (!teamFurthest[abbr]) teamFurthest[abbr] = { stage: 'GROUP_STAGE', isWinner: false };
  }

  const scores: FriendScore[] = FRIENDS.map((friend) => {
    const countryDetails = friend.countries.map((abbr) => {
      const result = teamFurthest[abbr];
      const pts = result ? stagePoints(result.stage, result.isWinner) : 0;
      return {
        abbr,
        name: abbr,
        logo: `https://a.espncdn.com/i/teamlogos/countries/500/${abbr.toLowerCase()}.png`,
        alive: result ? result.stage !== 'GROUP_STAGE' : false,
        furthestStage: result?.stage ?? null,
        points: pts,
      };
    });

    return {
      friendId: friend.id,
      friendName: friend.name,
      friendColour: friend.colour,
      points: countryDetails.reduce((sum, c) => sum + c.points, 0),
      countries: countryDetails,
    };
  });

  return scores.sort((a, b) => b.points - a.points);
}

