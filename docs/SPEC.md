# Technical Specification
## KickPool — World Cup 2026 Betting Pool Tracker

**Version:** 1.0  
**Date:** June 2026  

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Amplify                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Next.js 14 (App Router)                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  Pages   │  │   API    │  │ Agentic  │              │   │
│  │  │ (React)  │  │  Routes  │  │ Workers  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐   ┌────────▼──────┐  ┌───────▼──────┐
   │DynamoDB  │   │ football-data │  │  Anthropic   │
   │(cache +  │   │  .org API     │  │  Claude API  │
   │ state)   │   │               │  │              │
   └──────────┘   └───────────────┘  └──────────────┘
        │
   ┌────▼─────────────────────┐
   │  REST Countries API      │
   │  Wikipedia API           │
   └──────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | SSR for SEO, API routes, image optimisation |
| Language | TypeScript 5.x | Type safety across data models |
| Styling | Tailwind CSS 3.x | Rapid responsive UI, country colour theming |
| State | Zustand (client) + React Query (server) | Lightweight; React Query handles cache/refetch |
| Database | AWS DynamoDB | Serverless, no cold-start cost, fast TTL |
| Deployment | AWS Amplify | Consistent with user's other sites |
| AI | Anthropic SDK (Claude claude-sonnet-4-6) | Best predictions quality |
| Testing | Vitest + React Testing Library | Fast unit/integration tests |

---

## 3. Repository Structure

```
kickpool/
├── amplify.yml                    # Amplify build config
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── CLAUDE.md
├── .env.local                     # never committed
│
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout, nav, fonts
│   ├── page.tsx                   # Home / dashboard
│   ├── globals.css
│   │
│   ├── groups/
│   │   ├── page.tsx               # All 12 groups overview
│   │   └── [group]/
│   │       └── page.tsx           # Individual group (A-L)
│   │
│   ├── fixtures/
│   │   ├── page.tsx               # Full fixture list
│   │   └── [matchId]/
│   │       └── page.tsx           # Match detail
│   │
│   ├── countries/
│   │   └── [countryCode]/
│   │       └── page.tsx           # Country card detail
│   │
│   ├── bracket/
│   │   └── page.tsx               # Knockout bracket
│   │
│   ├── leaderboard/
│   │   └── page.tsx               # Friend standings
│   │
│   ├── predictions/
│   │   └── page.tsx               # AI predictions hub
│   │
│   └── api/
│       ├── scores/
│       │   └── route.ts           # Proxy + cache live scores
│       ├── standings/
│       │   └── route.ts           # Group standings
│       ├── fixtures/
│       │   └── route.ts           # Fixture list
│       ├── country/
│       │   └── [code]/
│       │       └── route.ts       # Country detail
│       ├── predict/
│       │   └── route.ts           # Trigger Claude prediction
│       └── agents/
│           ├── match-pulse/
│           │   └── route.ts       # Match Pulse Agent webhook
│           ├── rivalry/
│           │   └── route.ts       # Rivalry Agent trigger
│           └── oracle/
│               └── route.ts       # Oracle Agent trigger
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── matches/
│   │   ├── MatchCard.tsx          # Fixture card with friend overlay
│   │   ├── LiveScore.tsx          # Polling score display
│   │   ├── MatchDetail.tsx        # Full match breakdown
│   │   └── GoalFeed.tsx           # Real-time goal events
│   │
│   ├── groups/
│   │   ├── GroupTable.tsx         # Standings table
│   │   ├── GroupCard.tsx          # Single group summary
│   │   └── GroupGrid.tsx          # All 12 groups layout
│   │
│   ├── countries/
│   │   ├── CountryCard.tsx        # Flag, colours, summary
│   │   ├── CountryDetail.tsx      # Full country page
│   │   ├── PlayerCard.tsx         # Key player card
│   │   └── FlagImage.tsx          # Accessible flag component
│   │
│   ├── bracket/
│   │   ├── Bracket.tsx            # Full knockout bracket
│   │   ├── BracketRound.tsx       # One round column
│   │   └── BracketMatch.tsx       # Single match slot
│   │
│   ├── leaderboard/
│   │   ├── Leaderboard.tsx        # Friend rankings
│   │   ├── FriendRow.tsx          # Single friend with countries
│   │   └── PointsBreakdown.tsx    # Expanded points detail
│   │
│   ├── predictions/
│   │   ├── PredictionCard.tsx     # Claude match prediction
│   │   ├── AccuracyTracker.tsx    # Prediction accuracy stats
│   │   └── OracleForecast.tsx     # Tournament outcome probabilities
│   │
│   └── ui/
│       ├── Badge.tsx              # Friend name badge
│       ├── FriendAvatar.tsx       # Coloured avatar per friend
│       ├── CountryFlag.tsx
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── Tooltip.tsx
│
├── lib/
│   ├── data/
│   │   ├── allocation.ts          # Friend-country mapping (static)
│   │   ├── friends.ts             # Friend profiles (name, colour)
│   │   └── scoring.ts             # Points calculation logic
│   │
│   ├── api/
│   │   ├── football-data.ts       # football-data.org client
│   │   ├── fifa.ts                # FIFA data client
│   │   ├── countries.ts           # REST Countries API client
│   │   └── wikipedia.ts           # Wikipedia API for players
│   │
│   ├── cache/
│   │   ├── dynamo.ts              # DynamoDB client wrapper
│   │   └── keys.ts                # Cache key constants
│   │
│   ├── claude/
│   │   ├── client.ts              # Anthropic SDK setup
│   │   ├── predict.ts             # Match prediction prompts
│   │   └── agents/
│   │       ├── match-pulse.ts     # Match Pulse Agent
│   │       ├── rivalry.ts         # Friend Rivalry Agent
│   │       └── oracle.ts          # Tournament Oracle Agent
│   │
│   └── utils/
│       ├── time.ts                # AEST conversion utilities
│       ├── flags.ts               # Flag URL helpers
│       └── format.ts              # Score, date formatting
│
├── types/
│   ├── match.ts
│   ├── team.ts
│   ├── standing.ts
│   ├── friend.ts
│   ├── prediction.ts
│   └── agent.ts
│
└── __tests__/
    ├── lib/
    │   ├── scoring.test.ts
    │   └── time.test.ts
    └── components/
        ├── GroupTable.test.tsx
        └── Leaderboard.test.tsx
```

---

## 4. Data Models

### 4.1 TypeScript Types

```typescript
// types/friend.ts
export interface Friend {
  id: string;          // 'dan', 'boris', 'tim', etc.
  name: string;        // 'Dan', 'Boris', 'Tim', etc.
  colour: string;      // hex, e.g. '#E63946' — unique per friend
  countries: string[]; // ISO 3166-1 alpha-3 codes
}

// types/team.ts
export interface Team {
  code: string;         // ISO alpha-3, e.g. 'BRA'
  name: string;         // 'Brazil'
  shortName: string;    // 'Brazil'
  flag: string;         // URL to flag SVG/PNG
  primaryColour: string;
  secondaryColour: string;
  group: string;        // 'A' through 'L'
  fifaRanking: number;
  coach: Coach;
  keyPlayers: Player[];
  friendId: string;     // 'dan'
}

export interface Coach {
  name: string;
  nationality: string;
  photoUrl?: string;
}

export interface Player {
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  club: string;
  photoUrl?: string;
  number?: number;
}

// types/match.ts
export type MatchStatus = 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED';

export interface Match {
  id: string;
  stage: TournamentStage;
  group?: string;           // 'A'–'L' for group matches
  utcDate: string;          // ISO datetime
  aestDate: string;         // Formatted AEST string
  status: MatchStatus;
  minute?: number;          // Match minute if in play
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score: Score;
  venue: string;
  city: string;
  prediction?: Prediction;
}

export interface TeamRef {
  code: string;
  name: string;
  flag: string;
  friendId: string;
  friendName: string;
}

export interface Score {
  home: number | null;
  away: number | null;
  winner?: 'HOME' | 'AWAY' | 'DRAW';
  halfTime?: { home: number; away: number };
}

export type TournamentStage =
  | 'GROUP_STAGE'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

// types/standing.ts
export interface GroupStanding {
  group: string;
  table: StandingRow[];
}

export interface StandingRow {
  position: number;
  team: TeamRef;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualified?: boolean;
}

// types/prediction.ts
export interface Prediction {
  matchId: string;
  generatedAt: string;
  homeWinProbability: number;   // 0-100
  drawProbability: number;
  awayWinProbability: number;
  predictedScore: { home: number; away: number };
  narrative: string;            // 2-3 paragraph Claude analysis
  keyFactors: string[];
  confidence: 'low' | 'medium' | 'high';
  actualOutcome?: 'correct' | 'incorrect';
}
```

### 4.2 DynamoDB Tables

**Table: `kickpool-scores-cache`**
```
PK: MATCH#{matchId}
SK: SCORE
TTL: 120 seconds (during match), 86400 (finished)
Attributes: { score, status, minute, events[] }
```

**Table: `kickpool-predictions`**
```
PK: MATCH#{matchId}
SK: PREDICTION
Attributes: { prediction JSON, generatedAt, cost }
```

**Table: `kickpool-agent-state`**
```
PK: AGENT#{agentId}
SK: STATE
Attributes: { lastRunAt, lastContext, outputHistory[] }
```

**Table: `kickpool-leaderboard-cache`**
```
PK: LEADERBOARD
SK: CURRENT
TTL: 300 seconds
Attributes: { friendScores[], computedAt }
```

---

## 5. API Design

### 5.1 Internal API Routes (Next.js)

#### `GET /api/scores`
Returns all live/today's matches with scores.
- Cache: 60s (in-play), 300s (scheduled/finished)
- Source: football-data.org → DynamoDB cache

**Response:**
```json
{
  "matches": [Match],
  "lastUpdated": "2026-06-15T08:32:00+10:00",
  "isStale": false
}
```

#### `GET /api/standings`
Returns all 12 group tables.
- Cache: 300s
- Source: football-data.org

**Response:**
```json
{
  "groups": [GroupStanding],
  "lastUpdated": "string"
}
```

#### `GET /api/fixtures?group=A&friend=dan&stage=GROUP_STAGE`
Filtered fixture list.

#### `GET /api/country/[code]`
Full country detail including players and coach.
- Cache: 3600s (player data doesn't change during tournament)

#### `POST /api/predict`
Triggers Claude prediction for a match.
```json
{ "matchId": "123456" }
```
- Idempotent: returns cached prediction if exists
- Rate limited: 1 request per match per 5 minutes

#### `POST /api/agents/match-pulse`
Webhook triggered by score change → runs Match Pulse Agent.

### 5.2 External APIs

#### football-data.org
- Base URL: `https://api.football-data.org/v4`
- Auth: `X-Auth-Token` header
- Key endpoints:
  - `GET /competitions/WC/matches` — all matches
  - `GET /competitions/WC/standings` — group tables
  - `GET /matches/{id}` — single match detail
  - `GET /teams/{id}` — team roster

#### REST Countries API
- Base URL: `https://restcountries.com/v3.1`
- `GET /alpha/{code}` — flag, colours, region

#### Anthropic Claude API
- Model: `claude-sonnet-4-6`
- Used for: predictions, Match Pulse narration, rivalry analysis, Monte Carlo commentary

---

## 6. Time Zone Handling

All external APIs return UTC. The app converts to AEST for display.

```typescript
// lib/utils/time.ts
import { format, toZonedTime } from 'date-fns-tz';

const AEST = 'Australia/Sydney';

export function toAEST(utcDateString: string): string {
  const zoned = toZonedTime(new Date(utcDateString), AEST);
  return format(zoned, "EEE d MMM, h:mm a 'AEST'", { timeZone: AEST });
}

export function toAESTShort(utcDateString: string): string {
  const zoned = toZonedTime(new Date(utcDateString), AEST);
  return format(zoned, 'HH:mm', { timeZone: AEST });
}
```

World Cup 2026 runs June–July 2026 (Australian winter), so AEST = UTC+10 with no DST.

---

## 7. Friend-Country Allocation (Static Data)

```typescript
// lib/data/allocation.ts
export const FRIENDS: Friend[] = [
  { id: 'dan',    name: 'Dan',    colour: '#E63946', countries: ['MEX','BIH','BRA','EGY','IRN','CPV'] },
  { id: 'boris',  name: 'Boris',  colour: '#2196F3', countries: ['RSA','BEL','NZL','NOR','COL','PAN'] },
  { id: 'tim',    name: 'Tim',    colour: '#4CAF50', countries: ['KOR','CZE','SCO','FRA','ARG','ALG'] },
  { id: 'boomer', name: 'Boomer', colour: '#FF9800', countries: ['CAN','QAT','IRQ','AUT','POR','URU'] },
  { id: 'rob',    name: 'Rob',    colour: '#9C27B0', countries: ['SUI','ECU','NED','UZB','CRO','GHA'] },
  { id: 'ben',    name: 'Ben',    colour: '#009688', countries: ['MAR','PRY','AUS','SEN','JOR','COD'] },
  { id: 'hamish', name: 'Hamish', colour: '#FF5722', countries: ['HAI','USA','JPN','SWE','TUN','ESP'] },
  { id: 'jake',   name: 'Jake',   colour: '#607D8B', countries: ['TUR','GER','CUW','CIV','KSA','ENG'] },
];

export const COUNTRY_TO_FRIEND: Record<string, string> = 
  FRIENDS.reduce((acc, f) => {
    f.countries.forEach(c => { acc[c] = f.id; });
    return acc;
  }, {} as Record<string, string>);
```

---

## 8. Points Calculation

```typescript
// lib/data/scoring.ts
// Points are per country. Exponential weighting ensures knockout rounds dominate.
// Pool: 8 × $50 = $400. Prizes for 1st and 2nd place only.
const STAGE_POINTS: Record<TournamentStage, number> = {
  GROUP_STAGE:    1,   // just for participating
  ROUND_OF_32:    4,   // advanced from group
  ROUND_OF_16:    8,
  QUARTER_FINAL:  15,
  SEMI_FINAL:     25,
  THIRD_PLACE:    30,  // still a semi-final performance
  FINAL:          40,  // runner-up
  // Champion gets FINAL points + WINNER_BONUS
};
const WINNER_BONUS = 30; // World Cup winner = 70 pts total — worth more than 6 group-stage advances

export function calculateFriendScores(
  matches: Match[],
  allocation: typeof FRIENDS
): FriendScore[] {
  // For each friend, find furthest stage each country reached
  // Sum points across all countries
  // Return sorted leaderboard
}
```

---

## 9. AI Integration

### 9.1 Match Prediction

```typescript
// lib/claude/predict.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generatePrediction(match: Match, homeTeam: Team, awayTeam: Team): Promise<Prediction> {
  const prompt = buildPredictionPrompt(match, homeTeam, awayTeam);
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return parsePredictionResponse(response.content[0].text, match.id);
}

function buildPredictionPrompt(match: Match, home: Team, away: Team): string {
  return `You are a football analyst predicting the outcome of a 2026 FIFA World Cup match.

Match: ${home.name} vs ${away.name}
Stage: ${match.stage}
Group: ${match.group ?? 'Knockout'}
Venue: ${match.venue}, ${match.city}
Home FIFA Ranking: ${home.fifaRanking}
Away FIFA Ranking: ${away.fifaRanking}
Home Coach: ${home.coach.name}
Away Coach: ${away.coach.name}
Home Key Players: ${home.keyPlayers.map(p => p.name).join(', ')}
Away Key Players: ${away.keyPlayers.map(p => p.name).join(', ')}

Provide a JSON response with:
{
  "homeWinProbability": <0-100>,
  "drawProbability": <0-100>,
  "awayWinProbability": <0-100>,
  "predictedScore": { "home": <int>, "away": <int> },
  "narrative": "<2-3 paragraphs analysing the match>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "confidence": "low|medium|high"
}`;
}
```

---

## 10. Deployment

### 10.1 `amplify.yml`

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### 10.2 Environment Variables (Amplify Console)

```
ANTHROPIC_API_KEY
FOOTBALL_DATA_API_KEY
DYNAMODB_TABLE_PREFIX=kickpool
AWS_REGION=ap-southeast-2
NEXT_PUBLIC_SITE_NAME=KickPool
NEXT_PUBLIC_POLL_INTERVAL_MS=60000
```

### 10.3 GitHub Actions (optional CI)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
```

---

## 11. Responsive Design Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | 375px+ | Single column, bottom nav |
| Tablet | 768px+ | Two column, side nav |
| Desktop | 1280px+ | Three column, full nav |

All match cards, group tables, and the bracket must be usable at 375px without horizontal scroll.

---

## 12. Error Handling & Graceful Degradation

| Failure | Behaviour |
|---------|-----------|
| Score API down | Show last cached score + "Last updated X min ago" banner |
| Claude API error | Show "Prediction unavailable" with retry button |
| Missing flag image | Show country code text as fallback |
| Missing player data | Show "Squad info unavailable" state |
| DynamoDB cold start | 500ms timeout then retry; never block render |

---

## 13. Testing Strategy

| Level | Tool | Coverage target |
|-------|------|----------------|
| Unit (scoring, time utils) | Vitest | 90%+ |
| Component | React Testing Library | Key components |
| Integration (API routes) | Vitest + MSW | Happy + error paths |
| E2E | Playwright | Smoke test on deploy |
