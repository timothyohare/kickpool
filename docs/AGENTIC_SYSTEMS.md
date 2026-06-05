# Agentic Systems Design
## KickPool — World Cup 2026 Betting Pool Tracker

**Version:** 1.0  
**Date:** June 2026  

---

## Overview

Three distinct agentic systems augment KickPool with autonomous, stateful AI behaviour that goes beyond one-shot predictions. Each agent runs on a different trigger pattern (event-driven, scheduled, continuous) and solves a different problem for the friend group. All agents use Claude claude-sonnet-4-6 via the Anthropic SDK and store state in DynamoDB.

---

## Agent 1: Match Pulse Agent — The Live Narrator

### Concept
The Match Pulse Agent is a real-time narrative engine that watches every live match and generates personalised commentary through the lens of the friend group. When Germany (Jake) scores against Ecuador (Rob), it doesn't just log a goal — it crafts a moment: *"Jake is doing a victory lap. Rob is now googling 'how to feign interest in Ecuador.'* It transforms a match feed into a friend-group story as it happens.

### Problem It Solves
Football is better with colour commentary. Raw scores are data; narrative is drama. The agent adds the social layer that turns watching the match into a shared experience even when friends aren't in the same room.

### Architecture

```
Score Change Event (60s poll detects goal/card/whistle)
        │
        ▼
   API Route: /api/agents/match-pulse
        │
        ▼
   MatchPulseAgent.run(matchId, event)
        │
   ┌────┴────────────────────────────────┐
   │  Step 1: Fetch match context        │
   │  - Current score, minute            │
   │  - Both teams, owning friends       │
   │  - Previous events in this match    │
   │  - Friend leaderboard impact        │
   └────┬────────────────────────────────┘
        │
   ┌────▼────────────────────────────────┐
   │  Step 2: Claude narration prompt    │
   │  - System: "You are a witty but     │
   │    fair football commentator for    │
   │    a group of 8 Australian mates"   │
   │  - Include friend names & stakes    │
   │  - Event type (goal/card/whistle)   │
   └────┬────────────────────────────────┘
        │
   ┌────▼────────────────────────────────┐
   │  Step 3: Generate narrative         │
   │  - Short form: push notification   │
   │    (< 120 chars)                   │
   │  - Long form: match detail page    │
   │    commentary (2-3 paragraphs)     │
   └────┬────────────────────────────────┘
        │
   ┌────▼────────────────────────────────┐
   │  Step 4: Persist + broadcast        │
   │  - Store in DynamoDB (match event   │
   │    timeline with narration)         │
   │  - Trigger browser push notif       │
   │  - Update match detail page         │
   └─────────────────────────────────────┘
```

### Trigger Pattern
- **Polling**: API route is called every 60 seconds during active match windows
- **Event detection**: Agent only activates on state changes (goal, yellow card, red card, half-time, full-time)
- **Quiet mode**: No polling between match windows (saves Claude API cost)

### Prompt Design

**System prompt:**
```
You are a witty, warm, and slightly irreverent football commentator for a group of 8 Australian mates 
watching the 2026 World Cup together via a betting pool website. Your commentary is personal — you know 
their names and which countries they're backing. Keep it short and punchy. Never be cruel. Reference 
the money stakes only lightly. Think group chat energy, not Sky Sports presenter.

Friend allocations this match:
- [homeTeam]: [friendName] is backing them
- [awayTeam]: [friendName] is backing them
```

**User prompt (goal event):**
```
GOAL — [minute]' [scorer] ([team])
Current score: [home] [homeScore]-[awayScore] [away]
This is the [N]th goal in the match.
Match context: [group/stage], [leaderboard impact sentence]

Write:
1. A push notification (under 120 chars, punchy)
2. A commentary paragraph (2-3 sentences, personality-driven)
```

### Example Output

*Goal: Germany 1-0 Ecuador, 23' — Müller*

**Push notification:**  
`⚽ Jake's Germany lead! Müller at 23'. Rob's Ecuador are wobbling. 🇩🇪1-0🇪🇨`

**Commentary:**  
*Thomas Müller has done it again — the old fox sniffing out the goal before Ecuador even realised the door was open. Jake is somewhere right now making a noise no adult should make. Rob, your Ecuador had looked solid until the 23rd minute happened. The good news: there's still 67 minutes for a comeback. The bad news: it's Germany.*

### State & Memory
The agent maintains a match narrative thread in DynamoDB keyed by `matchId`. Each event is appended so that later events can reference earlier ones ("After Müller's opener, Ecuador fought back..."). This creates a coherent match story, not just disconnected blurts.

### Cost Estimate
- Average 6 events per match × ~500 tokens per call × $0.003/1K tokens = ~$0.009 per match
- 104 matches total = ~$0.94 in Claude API calls for full tournament narration (extremely affordable)

---

## Agent 2: Friend Rivalry Intelligence Agent — The Storyline Weaver

### Concept
The Friend Rivalry Intelligence Agent analyses the entire tournament fixture list at the start of each group stage and before each knockout round to identify the most dramatically interesting head-to-head moments between friends. It builds a "rivalry narrative" — the story of the tournament through the lens of friend-vs-friend conflict — and keeps it updated as the tournament unfolds. It answers: *"Who does Tim need to beat to win the pool? When do those moments happen? And how is the drama building?"*

### Problem It Solves
In a 48-team tournament, not every match is obvious as interesting to a particular friend. The agent surfaces the hidden stakes: "This group has Dan's Brazil and Tim's Scotland — they play each other in match week 2, and whoever wins almost certainly advances while the other is probably out." Without the agent, you'd have to work this out yourself by cross-referencing the schedule.

### Architecture

```
Trigger: Tournament start + after each match day completes
        │
        ▼
   RivalryAgent.analyseFixtures(currentState)
        │
   ┌────┴──────────────────────────────────────────┐
   │  Phase 1: Structural analysis (deterministic) │
   │  - Map all fixtures: which friends clash?     │
   │  - Direct clashes: same group, friends differ │
   │  - Indirect: both need to win same game       │
   │  - Calculate: if X advances, Y is eliminated  │
   └────┬──────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────┐
   │  Phase 2: Claude rivalry narrative            │
   │  - Feed fixture map + current standings       │
   │  - Ask Claude to identify the 3 most drama-  │
   │    tic upcoming friend rivalries              │
   │  - Generate "story arc" for each             │
   └────┬──────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────┐
   │  Phase 3: Agentic loop — what-if analysis    │
   │  - For each top rivalry: run Claude tool use │
   │  - Tool: simulate_scenario(matchId, winner)  │
   │  - Agent calls tool iteratively to explore   │
   │    "if Brazil wins, then Scotland needs..."  │
   │  - Terminates when 3 levels deep or          │
   │    probability < 5%                          │
   └────┬──────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────┐
   │  Phase 4: Output                             │
   │  - "Rivalry Report": top 5 must-watch matches│
   │  - Friend-specific alerts: "Tim: your next  │
   │    big moment is Scotland vs Brazil Tue 8pm" │
   │  - Dashboard widget: "This week's rivalry"  │
   └───────────────────────────────────────────────┘
```

### Agentic Tool Use Pattern

This agent uses Claude's tool use (function calling) to run multi-step what-if analysis autonomously:

```typescript
const tools = [
  {
    name: 'get_current_standings',
    description: 'Get the current points table for a group',
    input_schema: {
      type: 'object',
      properties: { group: { type: 'string', enum: ['A','B','C','D','E','F','G','H','I','J','K','L'] } },
      required: ['group']
    }
  },
  {
    name: 'simulate_match_result',
    description: 'Calculate what happens to group standings if a specific team wins/draws/loses',
    input_schema: {
      type: 'object',
      properties: {
        matchId: { type: 'string' },
        result: { type: 'string', enum: ['home_win', 'draw', 'away_win'] }
      },
      required: ['matchId', 'result']
    }
  },
  {
    name: 'calculate_qualification_scenarios',
    description: 'Given a group state, determine what results a team needs to qualify',
    input_schema: {
      type: 'object',
      properties: {
        group: { type: 'string' },
        teamCode: { type: 'string' }
      },
      required: ['group', 'teamCode']
    }
  }
];

// Agentic loop
async function runRivalryAgent() {
  let messages = [{ role: 'user', content: rivalryAnalysisPrompt }];
  
  while (true) {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });
    
    if (response.stop_reason === 'end_turn') break;
    
    if (response.stop_reason === 'tool_use') {
      const toolResults = await executeToolCalls(response.content);
      messages = [...messages, 
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ];
    }
  }
  
  return extractRivalryReport(messages);
}
```

### Example Rivalry Report Output

```
🔥 TOP RIVALRIES — WEEK 2 GROUP STAGE

#1 MUST WATCH: Brazil vs Scotland (Group C, Wed Jun 18, 9pm AEST)
Dan's Brazil vs Tim's Scotland. Brazil are heavy favourites but Scotland 
pulled off the upset of the group stage in Week 1. If Scotland win, Tim 
overtakes Dan on the leaderboard. If Brazil win, Dan consolidates top spot. 
Stakes: 4 leaderboard points swing. Dan leads Tim by 2 points heading in.

#2 RIVALRY: Germany vs Ecuador (Group E, Thu Jun 19, 3am AEST)
Jake's Germany vs Rob's Ecuador. Germany haven't lost a group stage match 
since 2018. But Rob's Ecuador qualified comfortably from their last two 
tournaments. Jake is currently second; a Germany win locks up Group E 
and sends Jake to the top of the pool.

#3 WATCH: USA vs Turkey (Group D, Fri Jun 20, 6am AEST)
Hamish's USA vs Jake's Turkey. Jake already has Germany going well; 
a Turkey result here would give Jake two countries in the knockouts 
simultaneously. Hamish needs USA to win to stay in contention.

⚠️  TIM ALERT: Scotland need at least a draw in their next match or they 
are mathematically eliminated before they face Brazil.
```

### Trigger Schedule
- Run at tournament start (full fixture map analysis)
- Run after each match day (update with actual results)
- Run before each knockout round (reanalyse bracket scenarios)

---

## Agent 3: Tournament Oracle Agent — The Probability Engine

### Concept
The Tournament Oracle Agent runs a continuous Monte Carlo simulation of the entire remaining tournament, updating every friend's probability of winning the pool after each match result. It uses Claude to blend statistical match probabilities with qualitative reasoning about squad quality, momentum, and tournament context — then reruns thousands of simulated tournaments to calculate each friend's win probability distribution.

The result: a live "win probability" chart for each friend that shifts after every goal, every result, every elimination.

### Problem It Solves
The leaderboard shows current points, but not who is *likely to win*. A friend in third place with Argentina and Brazil still alive is in a far better position than the leader whose only remaining country is Uzbekistan. The Oracle makes this visible, instantly, after every match.

### Architecture

```
Trigger: After each match result (event-driven)
        │
        ▼
   OracleAgent.run(tournamentState)
        │
   ┌────┴──────────────────────────────────────────────────┐
   │  Phase 1: Generate match probability matrix           │
   │  For every possible upcoming match:                   │
   │  - Ask Claude to estimate win/draw/loss probabilities │
   │  - Use FIFA rankings, form, stage, momentum           │
   │  - Output: dict of matchId → {home, draw, away} probs │
   └────┬──────────────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────────────┐
   │  Phase 2: Monte Carlo simulation (TypeScript)         │
   │  Run 10,000 tournament simulations:                   │
   │  - For each match: sample result from prob matrix     │
   │  - Update standings → determine qualifiers           │
   │  - Continue through rounds to Final                  │
   │  - For each simulation: calculate friend scores       │
   │  - Track: who wins pool in each simulation            │
   └────┬──────────────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────────────┐
   │  Phase 3: Claude interprets results                   │
   │  Feed simulation output to Claude:                    │
   │  - "Boris wins in 23% of simulations, mostly because  │
   │    Belgium and Colombia both reach QF"                │
   │  - Generate narrative explanation per friend          │
   │  - Identify the single most important upcoming match  │
   │    (highest impact on simulation outcomes)            │
   └────┬──────────────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────────────┐
   │  Phase 4: Output                                      │
   │  - Oracle dashboard: win% bar chart per friend        │
   │  - "Swing match": the next match that shifts the most │
   │  - Per-friend narrative: why they're in/out of it    │
   │  - Historical win% chart (how it changed over time)  │
   └───────────────────────────────────────────────────────┘
```

### Monte Carlo Implementation

```typescript
// lib/claude/agents/oracle.ts

interface SimulationResult {
  friendWins: Record<string, number>; // friend → win count across simulations
  friendScoreDistribution: Record<string, number[]>;
  swingMatch: string; // matchId with highest impact
}

async function runMonteCarlo(
  matchProbabilities: Record<string, MatchProb>,
  remainingMatches: Match[],
  currentStandings: GroupStanding[],
  allocation: typeof FRIENDS,
  simulations = 10000
): Promise<SimulationResult> {
  const friendWins: Record<string, number> = {};
  const friendScores: Record<string, number[]> = {};
  
  for (let i = 0; i < simulations; i++) {
    const simResult = simulateTournament(
      matchProbabilities,
      remainingMatches,
      currentStandings
    );
    const scores = calculateFriendScores(simResult, allocation);
    const winner = scores.sort((a, b) => b.points - a.points)[0];
    friendWins[winner.friendId] = (friendWins[winner.friendId] ?? 0) + 1;
    scores.forEach(s => {
      friendScores[s.friendId] = [...(friendScores[s.friendId] ?? []), s.points];
    });
  }
  
  return {
    friendWins,
    friendScoreDistribution: friendScores,
    swingMatch: findHighestImpactMatch(matchProbabilities, remainingMatches)
  };
}

function simulateTournament(probs, matches, standings): SimMatch[] {
  const results: SimMatch[] = [];
  // Process matches in order; update standings as each group completes
  // to determine knockout bracket seedings
  for (const match of matches) {
    const prob = probs[match.id];
    const rand = Math.random();
    const winner = rand < prob.home ? 'home' : rand < prob.home + prob.draw ? 'draw' : 'away';
    results.push({ ...match, simulatedResult: winner });
  }
  return results;
}
```

### Claude Probability Generation Prompt

```
You are a football statistics analyst. For the following 2026 World Cup matches, 
provide win/draw/loss probability estimates as percentages that sum to 100.

Base your estimates on:
- FIFA world rankings (provided)
- Recent international form (last 10 matches)
- Tournament context (must-win? group leaders? knockout pressure?)
- Historical head-to-head
- Squad quality and key player availability

Format: JSON array of { matchId, homeWin, draw, awayWin }

Matches to analyse:
[list of upcoming matches with team details]
```

### Oracle Dashboard Display

```
┌─────────────────────────────────────────────────────┐
│  🔮 TOURNAMENT ORACLE — Updated 14 Jun, 11:32pm AEST│
│                                                     │
│  Win Probability (10,000 simulations)               │
│                                                     │
│  Tim     ██████████████████░░░░░░  38%  ↑+5%       │
│  Jake    ████████████░░░░░░░░░░░░  24%  ↑+3%       │
│  Boris   ████████░░░░░░░░░░░░░░░░  16%  ↓-2%       │
│  Dan     █████░░░░░░░░░░░░░░░░░░░  11%  ↓-4%       │
│  Hamish  ███░░░░░░░░░░░░░░░░░░░░░   6%  ─           │
│  Boomer  ██░░░░░░░░░░░░░░░░░░░░░░   3%  ─           │
│  Rob     █░░░░░░░░░░░░░░░░░░░░░░░   1%  ↓-1%       │
│  Ben     ░░░░░░░░░░░░░░░░░░░░░░░░   1%  ─           │
│                                                     │
│  ⚡ KEY SWING MATCH: Argentina vs France (QF)       │
│  Tim wins in 71% of simulations where Argentina    │
│  beats France. Jake's path relies on Germany vs    │
│  England going to extra time.                       │
│                                                     │
│  📖 BORIS NARRATIVE: Belgium's run to the QF has   │
│  kept Boris in contention, but Colombia's early    │
│  exit cost 8 points. Needs Belgium to reach SF.   │
└─────────────────────────────────────────────────────┘
```

### Trigger Pattern
- Run once per day at 00:01 AEST (full simulation refresh)
- Run within 5 minutes of each match completing (event-triggered)
- Stores probability history in DynamoDB for trend charting

### Cost Estimate
- Probability generation: 1 Claude call per match day × ~2,000 tokens = ~$0.006/day
- Narrative generation: ~1,000 tokens × 8 friends = ~$0.024 per run
- Monte Carlo runs in TypeScript (no LLM cost, pure computation)
- Total across 32-day tournament: ~$0.95 in Claude API costs

---

## Agent 4 (Bonus): The Pre-Match Dossier Agent — Deep Intelligence Briefing

### Concept
Two hours before each match, the Dossier Agent autonomously assembles a comprehensive pre-match intelligence briefing, pulling together recent news, injury reports (via search), historical statistics, and Claude's analysis into a shareable "match preview" document for the group. It operates as a fully autonomous research agent — given a match, it figures out what to look for and goes looking.

### Problem It Solves
Friends want context before big matches. Why is France favoured? What happened last time these teams met? Are there any key players out injured? Getting this normally requires Googling multiple sources. The Dossier Agent does it autonomously.

### Architecture

```typescript
// Agentic research loop with web search tools

const dossierTools = [
  {
    name: 'web_search',
    description: 'Search the web for current football news, injury reports, team form',
    input_schema: {
      properties: { query: { type: 'string' }, maxResults: { type: 'number' } }
    }
  },
  {
    name: 'get_head_to_head',
    description: 'Retrieve historical match results between two teams',
    input_schema: {
      properties: { team1: { type: 'string' }, team2: { type: 'string' } }
    }
  },
  {
    name: 'get_recent_form',
    description: 'Get the last 5 match results for a team',
    input_schema: {
      properties: { teamCode: { type: 'string' } }
    }
  },
  {
    name: 'finish_dossier',
    description: 'Signal that research is complete and write the final dossier',
    input_schema: {
      properties: { dossier: { type: 'string' } }
    }
  }
];
```

**Agent loop:**
1. Given: upcoming match + friend allocations
2. Searches for: "[TeamA] injury news 2026", "[TeamB] recent form", "head to head [TeamA] [TeamB]"
3. Calls tools iteratively (up to 8 tool calls)
4. Synthesises into a structured dossier
5. Persists to DynamoDB, renders on match detail page

### Output Format
- **One-liner**: "_France are heavy favourites but Morocco upset them in 2022 — history may repeat_"
- **Team forms** (last 5 results each)
- **Key matchups**: best vs best, tactical considerations
- **Injury watch**: any notable absences
- **Friend stakes**: what this result means for the pool
- **Oracle prediction**: win probabilities from Agent 3
- **The call**: Claude's predicted scoreline and rationale

---

## Implementation Priority

| Agent | Value | Complexity | Build Order |
|-------|-------|-----------|-------------|
| Match Pulse | High (immediate fun) | Low | 1st |
| Rivalry Intelligence | High (strategic context) | Medium | 2nd |
| Tournament Oracle | Very High (core feature) | High | 3rd |
| Pre-Match Dossier | Medium (nice to have) | High | 4th |

---

## Shared Infrastructure

All four agents share:

```typescript
// lib/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Shared agent runner with cost tracking
export async function runAgent(
  agentId: string,
  messages: Anthropic.MessageParam[],
  tools?: Anthropic.Tool[],
  maxIterations = 10
): Promise<{ content: string; toolCalls: number; estimatedCost: number }> {
  let iterCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  while (iterCount < maxIterations) {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });
    
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
    iterCount++;
    
    if (response.stop_reason === 'end_turn') {
      const cost = (totalInputTokens / 1000 * 0.003) + (totalOutputTokens / 1000 * 0.015);
      await logAgentRun(agentId, iterCount, cost);
      return {
        content: extractText(response.content),
        toolCalls: iterCount - 1,
        estimatedCost: cost
      };
    }
    
    if (response.stop_reason === 'tool_use') {
      const toolResults = await executeTools(response.content, tools);
      messages = [...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ];
    }
  }
  
  throw new Error(`Agent ${agentId} exceeded max iterations`);
}
```

**DynamoDB agent log table:**
```
PK: AGENT_RUN#{agentId}#{timestamp}
SK: METADATA
Attributes: { iterations, estimatedCost, duration, output }
```

This enables a simple "AI cost dashboard" showing how much each agent has spent over the tournament — useful for keeping the $80/month budget on track.
