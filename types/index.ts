export type TournamentStage =
  | 'GROUP_STAGE'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

export type MatchStatus =
  | 'STATUS_SCHEDULED'
  | 'STATUS_IN_PROGRESS'
  | 'STATUS_HALFTIME'
  | 'STATUS_FINAL'
  | 'STATUS_POSTPONED';

export interface Friend {
  id: string;
  name: string;
  colour: string;
  countries: string[]; // ESPN abbreviations
}

export interface TeamRef {
  abbr: string;
  name: string;
  logo: string;
  friendId: string;
  friendName: string;
  friendColour: string;
}

export interface Score {
  home: number | null;
  away: number | null;
}

export interface Match {
  id: string;
  stage: TournamentStage;
  group?: string;
  utcDate: string;
  status: MatchStatus;
  minute?: string;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score: Score;
  venue: string;
  city: string;
}

export interface StandingRow {
  position: number;
  team: TeamRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupStanding {
  group: string;
  table: StandingRow[];
}

export interface Prediction {
  matchId: string;
  generatedAt: string;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  predictedScore: { home: number; away: number };
  narrative: string;
  keyFactors: string[];
  confidence: 'low' | 'medium' | 'high';
}

// Monte-Carlo tournament odds for one team, sourced from the FifaWorldCupMonteCarloSim project.
export interface TeamOdds {
  abbr: string;
  champion: number;
  runnerUp: number;
  reachFinal: number;
  reachSemi: number;
  escapeGroup: number;
}

export interface OddsSnapshot {
  generatedAt: string;
  sims: number;
  /** True when the snapshot is older than the max age — callers hide the numbers. */
  stale: boolean;
  byAbbr: Record<string, TeamOdds>;
}

export interface FriendScore {
  friendId: string;
  friendName: string;
  friendColour: string;
  points: number;
  countries: {
    abbr: string;
    name: string;
    logo: string;
    alive: boolean;
    furthestStage: TournamentStage | null;
    points: number;
  }[];
}
